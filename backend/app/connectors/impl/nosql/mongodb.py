from typing import Any, Dict, List, Optional, Iterator, Union
import pandas as pd
from pymongo import MongoClient, UpdateOne
from app.connectors.base import BaseConnector
from app.core.errors import (
    ConfigurationError, 
    ConnectionFailedError, 
    DataTransferError, 
    SchemaDiscoveryError
)
from app.core.logging import get_logger
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = get_logger(__name__)

class MongoConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    connection_string: Optional[str] = Field(None, description="MongoDB Connection String (URI)")
    host: Optional[str] = Field("localhost", description="Host")
    port: int = Field(27017, description="Port")
    username: Optional[str] = Field(None, description="Username")
    password: Optional[str] = Field(None, description="Password")
    database: str = Field(..., description="Database Name")
    auth_source: str = Field("admin", description="Authentication Database")

class MongoDBConnector(BaseConnector):
    """
    Robust Connector for MongoDB.
    """

    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[MongoConfig] = None
        self._client: Optional[MongoClient] = None
        self._db = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = MongoConfig.model_validate(self.config)
            if not self._config_model.connection_string and not self._config_model.host:
                 raise ValueError("Either 'connection_string' or 'host' must be provided.")
        except Exception as e:
            raise ConfigurationError(f"Invalid MongoDB configuration: {e}")

    def connect(self) -> None:
        if self._client:
            return

        try:
            if self._config_model.connection_string:
                self._client = MongoClient(self._config_model.connection_string, serverSelectionTimeoutMS=5000)
            else:
                params = {
                    "host": self._config_model.host,
                    "port": self._config_model.port,
                    "username": self._config_model.username,
                    "password": self._config_model.password,
                    "authSource": self._config_model.auth_source,
                    "serverSelectionTimeoutMS": 5000
                }
                # Remove None values
                params = {k: v for k, v in params.items() if v is not None}
                self._client = MongoClient(**params)
            
            # Verify connection
            self._client.admin.command('ping')
            self._db = self._client[self._config_model.database]
            logger.info("mongodb_connected", database=self._config_model.database)
            
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to MongoDB: {e}")

    def disconnect(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            collections = self._db.list_collection_names()
            if pattern:
                collections = [c for c in collections if pattern.lower() in c.lower()]

            if not include_metadata:
                return [
                    {
                        "name": c, 
                        "fully_qualified_name": f"{self._config_model.database}.{c}",
                        "type": "collection"
                    } 
                    for c in collections
                ]

            enriched = []
            for col_name in collections:
                fqn = f"{self._config_model.database}.{col_name}"
                try:
                    stats = self._db.command("collstats", col_name)
                    enriched.append({
                        "name": col_name,
                        "fully_qualified_name": fqn,
                        "type": "collection",
                        "row_count": stats.get('count', 0),
                        "size_bytes": stats.get('size', 0),
                    })
                except Exception:
                    enriched.append({
                        "name": col_name, 
                        "fully_qualified_name": fqn,
                        "type": "collection"
                    })
            return enriched
        except Exception as e:
            raise DataTransferError(f"Failed to discover MongoDB collections: {e}")

    def infer_schema(self, asset: str, sample_size: int = 1000, **kwargs) -> Dict[str, Any]:
        self.connect()
        try:
            collection = self._db[asset]
            cursor = collection.find().limit(sample_size)
            records = list(cursor)
            
            if not records:
                 return {"asset": asset, "columns": [], "status": "empty"}

            # Simple inference using first 100 records for type diversity
            df = pd.DataFrame(records)
            if '_id' in df.columns:
                df['_id'] = df['_id'].astype(str)
                
            columns = [{"name": col, "type": str(dtype)} for col, dtype in df.dtypes.items()]
            return {"asset": asset, "columns": columns, "inferred_from": len(records)}
        except Exception as e:
            raise SchemaDiscoveryError(f"MongoDB schema inference failed: {e}")

    def read_batch(
        self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        
        custom_query = kwargs.get("query")
        incremental_filter = kwargs.get("incremental_filter")
        
        if custom_query:
            import json
            try:
                q_obj = json.loads(custom_query)
                collection_name = q_obj.get("collection")
                if not collection_name:
                     raise ValueError("MongoDB query JSON must specify 'collection'.")
                
                # Merge incremental filter into existing filter
                query_filter = q_obj.get("filter", {})
                if incremental_filter and isinstance(incremental_filter, dict):
                    for col, val in incremental_filter.items():
                        query_filter[col] = {"$gt": val}

                collection = self._db[collection_name]
                cursor = collection.find(query_filter, q_obj.get("projection"))
                
                if offset:
                    cursor = cursor.skip(offset)
                elif q_obj.get("offset"):
                    cursor = cursor.skip(q_obj.get("offset"))
                
                if limit:
                    cursor = cursor.limit(limit)
                elif q_obj.get("limit"):
                    cursor = cursor.limit(q_obj.get("limit"))
            except Exception as e:
                raise DataTransferError(f"Invalid MongoDB query: {e}")
        else:
            collection = self._db[asset]
            # Merge incremental filter into kwargs filter
            query_filter = kwargs.get("filter", {}).copy()
            if incremental_filter and isinstance(incremental_filter, dict):
                for col, val in incremental_filter.items():
                    query_filter[col] = {"$gt": val}

            cursor = collection.find(query_filter, kwargs.get("projection"))
            if offset:
                cursor = cursor.skip(offset)
            if limit:
                cursor = cursor.limit(limit)

        chunksize = kwargs.get("chunksize", kwargs.get("batch_size", 5000))
        batch = []
        for doc in cursor:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            batch.append(doc)
            if len(batch) >= chunksize:
                yield pd.DataFrame(batch)
                batch = []
        if batch:
            yield pd.DataFrame(batch)

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        self.connect()
        import json
        try:
            # For MongoDB, we expect a JSON string that might contain 'collection', 'filter', 'projection', etc.
            # Example: { "collection": "users", "filter": { "age": { "$gt": 20 } } }
            q_obj = json.loads(query)
            collection_name = q_obj.get("collection")
            if not collection_name:
                raise ValueError("MongoDB query JSON must specify 'collection'.")
            
            collection = self._db[collection_name]
            cursor = collection.find(q_obj.get("filter", {}), q_obj.get("projection"))
            
            if offset:
                cursor = cursor.skip(offset)
            elif q_obj.get("offset"):
                cursor = cursor.skip(q_obj.get("offset"))
            
            if limit:
                cursor = cursor.limit(limit)
            elif q_obj.get("limit"):
                cursor = cursor.limit(q_obj.get("limit"))
            
            results = []
            for doc in cursor:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                results.append(doc)
            return results
        except Exception as e:
            raise DataTransferError(f"MongoDB query failed: {e}")

    def write_batch(
        self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs
    ) -> int:
        self.connect()
        collection = self._db[asset]
        
        # Normalize mode
        clean_mode = mode.lower()
        if clean_mode == "replace":
            clean_mode = "overwrite"

        if clean_mode == "overwrite":
             collection.drop()
             
        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data
            
        total = 0
        try:
            for df in data_iter:
                if df.empty:
                    continue
                records = df.to_dict(orient="records")
                
                if clean_mode == "upsert":
                    # Get primary key for upsert logic
                    pk = kwargs.get("primary_key") or self.config.get("primary_key") or "_id"
                    
                    bulk_ops = []
                    for record in records:
                        if pk in record:
                            bulk_ops.append(
                                UpdateOne({pk: record[pk]}, {"$set": record}, upsert=True)
                            )
                        else:
                            # Fallback to insert if PK missing in record (less ideal for bulk)
                            collection.insert_one(record)
                            total += 1
                    
                    if bulk_ops:
                        result = collection.bulk_write(bulk_ops, ordered=False)
                        total += (result.upserted_count + result.modified_count + result.matched_count)
                else:
                    # Default append
                    result = collection.insert_many(records)
                    total += len(result.inserted_ids)
            return total
        except Exception as e:
            raise DataTransferError(f"MongoDB write failed: {e}")