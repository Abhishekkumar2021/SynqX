from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import hashlib
import json
import time
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, func, distinct

from app.models.connections import Connection, Asset, AssetSchemaVersion
from app.models.pipelines import Pipeline, PipelineVersion, PipelineNode
from app.models.execution import Job, PipelineRun
from app.models.enums import ConnectorType, JobStatus, AssetType
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionUpdate,
    AssetCreate,
    AssetUpdate,
    ConnectionTestResponse,
    AssetDiscoverResponse,
    SchemaDiscoveryResponse,
    ConnectionImpactRead,
    ConnectionUsageStatsRead,
)
from app.core.errors import AppError
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.core.logging import get_logger
from app.core.cache import cache
from app.services.dependency_service import DependencyService

logger = get_logger(__name__)


class ConnectionService:

    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create_connection(self, connection_create: ConnectionCreate, user_id: int, workspace_id: Optional[int] = None) -> Connection:
        try:
            encrypted_config = VaultService.encrypt_config(connection_create.config)
            connection = Connection(
                name=connection_create.name,
                connector_type=connection_create.connector_type,
                config_encrypted=encrypted_config,
                description=connection_create.description,
                tags=connection_create.tags,
                max_concurrent_connections=connection_create.max_concurrent_connections,
                connection_timeout_seconds=connection_create.connection_timeout_seconds,
                health_status="unknown",
                user_id=user_id,
                workspace_id=workspace_id,
                created_by=str(user_id)
            )
            self.db_session.add(connection)
            self.db_session.flush()
            test_result = self._test_connection_internal(connection)
            connection.health_status = (
                "healthy" if test_result["success"] else "unhealthy"
            )
            connection.last_test_at = datetime.now(timezone.utc)
            connection.error_message = (
                None if test_result["success"] else test_result["message"]
            )
            self.db_session.commit()
            self.db_session.refresh(connection)
            
            # Invalidate list cache (pattern based or just simple TTL expiration)
            # For simplicity, we let lists expire naturally or could implement pattern invalidation
            # cache.delete_pattern("connections:list:*") 
            
            return connection
        except IntegrityError:
            self.db_session.rollback()
            raise AppError(
                f"Connection with name '{connection_create.name}' already exists"
            )
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to create connection: {str(e)}")

    def get_connection(self, connection_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Optional[Connection]:
        query = self.db_session.query(Connection).filter(
            and_(Connection.id == connection_id, Connection.deleted_at.is_(None))
        )
        if workspace_id is not None:
            query = query.filter(Connection.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Connection.user_id == user_id)
        return query.first()

    def list_connections(
        self,
        connector_type: Optional[ConnectorType] = None,
        health_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> Tuple[List[Connection], int]:
        
        # Cache Key Generation
        key_parts = [
            f"type={connector_type.value if connector_type else 'all'}",
            f"status={health_status or 'all'}",
            f"limit={limit}",
            f"offset={offset}",
            f"user={user_id or 'all'}",
            f"ws={workspace_id or 'all'}"
        ]
        cache_key = f"connections:list:{':'.join(key_parts)}"
        
        # Try Cache
        # (Skipping for now due to complex ORM objects, but key is ready)

        query = self.db_session.query(Connection).filter(Connection.deleted_at.is_(None))
        if workspace_id is not None:
            query = query.filter(Connection.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Connection.user_id == user_id)
            
        if connector_type:
            query = query.filter(Connection.connector_type == connector_type)
        if health_status:
            query = query.filter(Connection.health_status == health_status)
            
        total = query.count()
        items = query.order_by(Connection.created_at.desc()).limit(limit).offset(offset).all()
        
        return items, total
        cache_key = f"connections:list:{':'.join(key_parts)}"
        
        # Try Cache (We need to cache Pydantic-ready dicts, but this returns ORM objects)
        # This is the friction point. Service returns ORM objects. 
        # If we return dicts, the API layer (Pydantic) usually handles it fine via from_attributes=True? 
        # No, from_attributes expects objects attributes.
        # We will skip caching implementation in Service layer to avoid ORM detaching hell.
        # Instead, we should implement caching in the API Endpoint layer where we have Pydantic models.
        
        query = self.db_session.query(Connection).filter(
            Connection.deleted_at.is_(None)
        )
        if user_id is not None:
            query = query.filter(Connection.user_id == user_id)

        if connector_type:
            query = query.filter(Connection.connector_type == connector_type)
        if health_status:
            query = query.filter(Connection.health_status == health_status)
        total = query.count()
        items = (
            query.order_by(Connection.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    def update_connection(
        self, connection_id: int, connection_update: ConnectionUpdate, user_id: Optional[int] = None, workspace_id: Optional[int] = None
    ) -> Connection:
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        try:
            if connection_update.name is not None:
                connection.name = connection_update.name
            if connection_update.description is not None:
                connection.description = connection_update.description
            if connection_update.tags is not None:
                connection.tags = connection_update.tags
            if connection_update.max_concurrent_connections is not None:
                connection.max_concurrent_connections = (
                    connection_update.max_concurrent_connections
                )
            if connection_update.connection_timeout_seconds is not None:
                connection.connection_timeout_seconds = (
                    connection_update.connection_timeout_seconds
                )
            if connection_update.config is not None:
                encrypted = VaultService.encrypt_config(connection_update.config)
                connection.config_encrypted = encrypted
                test_result = self._test_connection_internal(connection)
                connection.health_status = (
                    "healthy" if test_result["success"] else "unhealthy"
                )
                connection.last_test_at = datetime.now(timezone.utc)
                connection.error_message = (
                    None if test_result["success"] else test_result["message"]
                )
            connection.updated_at = datetime.now(timezone.utc)
            if user_id:
                connection.updated_by = str(user_id)
                
            self.db_session.commit()
            self.db_session.refresh(connection)
            
            # Invalidate specific cache (if we were caching single items)
            # cache.delete(f"connection:{connection_id}")
            
            return connection
        except IntegrityError:
            self.db_session.rollback()
            raise AppError("Connection name already exists")
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to update connection: {str(e)}")

    def delete_connection(self, connection_id: int, hard_delete: bool = False, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> bool:
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        try:
            if hard_delete:
                self.db_session.delete(connection)
            else:
                connection.deleted_at = datetime.now(timezone.utc)
                connection.health_status = "deleted"
                if user_id:
                    connection.deleted_by = str(user_id)
            self.db_session.commit()
            
            # cache.delete(f"connection:{connection_id}")
            
            return True
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to delete connection: {str(e)}")

    def test_connection(
        self, connection_id: int, custom_config: Optional[Dict[str, Any]] = None, user_id: Optional[int] = None, workspace_id: Optional[int] = None
    ) -> ConnectionTestResponse:
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        if custom_config:
            temp = Connection(
                connector_type=connection.connector_type,
                config_encrypted=VaultService.encrypt_config(custom_config),
            )
            result = self._test_connection_internal(temp)
        else:
            result = self._test_connection_internal(connection)
            connection.health_status = "healthy" if result["success"] else "unhealthy"
            connection.last_test_at = datetime.now(timezone.utc)
            connection.error_message = None if result["success"] else result["message"]
            self.db_session.commit()

        return ConnectionTestResponse(**result)

    def get_environment_info(self, connection_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Dict[str, Any]:
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        try:
            # 1. Get System Tools & General Info from Connector
            config = VaultService.get_connector_config(connection)
            # Inject execution context if available (though for general info it might not be strictly needed, 
            # but CustomScriptConnector uses it to check node versions etc)
            dep_service = DependencyService(self.db_session, connection_id)
            
            # We can't easily inject execution_context into config passed to Factory 
            # because Factory instantiates the class. We can update config dict.
            # But wait, CustomScriptConnector's get_environment_info logic for node/ruby 
            # relies on execution_context being set in __init__.
            
            # Let's get generic system info
            connector = ConnectorFactory.get_connector(
                connection.connector_type.value, config
            )
            
            sys_info = {}
            if hasattr(connector, "get_environment_info"):
                # This returns system-level python ver, pandas ver, and tools like jq/curl
                sys_info = connector.get_environment_info()

            # 2. Get Managed Environment Info from DependencyService
            # This covers isolated environments for Python, Node, Ruby, etc.
            
            env_info = {
                "base_path": sys_info.get("base_path"),
                "available_tools": sys_info.get("available_tools", {}),
                "installed_packages": {}, # Default for Python (system)
                "npm_packages": {},
                "initialized_languages": []
            }

            # Merge System Python info if no isolated env
            if sys_info.get("python_version"):
                env_info["python_version"] = sys_info["python_version"]
                env_info["platform"] = sys_info.get("platform")
                env_info["pandas_version"] = sys_info.get("pandas_version")
                env_info["numpy_version"] = sys_info.get("numpy_version")
                env_info["installed_packages"] = sys_info.get("installed_packages", {})

            # Check Database for Managed Environments
            languages = ["python", "node"]
            for lang in languages:
                env = dep_service.get_environment(lang)
                if env and env.status == "ready":
                    env_info["initialized_languages"].append(lang)
                    
                    # Override/Set versions from managed envs
                    if lang == "python":
                        env_info["python_version"] = f"{env.version} (Isolated)"
                        env_info["installed_packages"] = env.packages or {}
                    elif lang == "node":
                        env_info["node_version"] = f"{env.version} (Isolated)"
                        env_info["npm_packages"] = env.packages or {}

            # If not isolated, fallback to system detection from connector for these langs
            if "node" not in env_info["initialized_languages"] and sys_info.get("node_version"):
                env_info["node_version"] = sys_info["node_version"]
                env_info["npm_packages"] = sys_info.get("npm_packages", {})
                
            return env_info

        except Exception as e:
            logger.error(f"Error fetching environment info for connection {connection_id}: {e}")
            raise AppError(f"Failed to fetch environment info: {str(e)}")

    def _test_connection_internal(self, connection: Connection) -> Dict[str, Any]:
        start = time.time()
        try:
            config = VaultService.get_connector_config(connection)
            
            # Inject Execution Context for Custom Script
            if connection.connector_type == ConnectorType.CUSTOM_SCRIPT:
                dep_service = DependencyService(self.db_session, connection.id)
                # We need to gather contexts for all relevant languages
                # For simplicity, we get context for the configured language if possible, 
                # or merge all. CustomScriptConnector checks specific keys.
                # Let's merge python, node etc.
                exec_ctx = {}
                exec_ctx.update(dep_service.get_execution_context("python"))
                exec_ctx.update(dep_service.get_execution_context("node"))
                
                config["execution_context"] = exec_ctx

            connector = ConnectorFactory.get_connector(
                connection.connector_type.value, config
            )
            with connector.session() as session:
                session.test_connection()
            latency = (time.time() - start) * 1000
            return {
                "success": True,
                "message": "Connection successful",
                "latency_ms": round(latency, 2),
                "details": {"connector_type": connection.connector_type.value},
            }
        except Exception as e:
            latency = (time.time() - start) * 1000
            return {
                "success": False,
                "message": str(e),
                "latency_ms": round(latency, 2),
                "details": {"error_type": type(e).__name__},
            }

    def create_asset(self, asset_create: AssetCreate, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Asset:
        # verifying connection ownership
        connection = self.get_connection(asset_create.connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {asset_create.connection_id} not found")

        try:
            asset = Asset(
                connection_id=asset_create.connection_id,
                name=asset_create.name,
                asset_type=asset_create.asset_type,
                fully_qualified_name=asset_create.fully_qualified_name,
                is_source=asset_create.is_source,
                is_destination=asset_create.is_destination,
                is_incremental_capable=asset_create.is_incremental_capable,
                description=asset_create.description,
                tags=asset_create.tags,
                schema_metadata=asset_create.schema_metadata,
                row_count_estimate=asset_create.row_count_estimate,
                size_bytes_estimate=asset_create.size_bytes_estimate,
                workspace_id=workspace_id or connection.workspace_id,
                created_by=str(user_id) if user_id else None
            )
            self.db_session.add(asset)
            self.db_session.commit()
            self.db_session.refresh(asset)
            return asset
        except IntegrityError:
            self.db_session.rollback()
            raise AppError(
                f"Asset with name '{asset_create.name}' already exists for this connection"
            )
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to create asset: {str(e)}")

    def get_asset(self, asset_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Optional[Asset]:
        query = self.db_session.query(Asset).join(Connection).filter(and_(Asset.id == asset_id, Asset.deleted_at.is_(None)))
        if workspace_id is not None:
            query = query.filter(Connection.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Connection.user_id == user_id)
        return query.first()

    def list_assets(
        self,
        connection_id: Optional[int] = None,
        asset_type: Optional[AssetType] = None,
        is_source: Optional[bool] = None,
        is_destination: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> Tuple[List[Asset], int]:

        query = self.db_session.query(Asset).join(Connection).filter(Asset.deleted_at.is_(None))

        if workspace_id is not None:
            query = query.filter(Connection.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Connection.user_id == user_id)
        if connection_id:
            query = query.filter(Asset.connection_id == connection_id)
        if asset_type:
            query = query.filter(Asset.asset_type == asset_type)
        if is_source is not None:
            query = query.filter(Asset.is_source == is_source)
        if is_destination is not None:
            query = query.filter(Asset.is_destination == is_destination)

        total = query.count()
        items = (
            query.order_by(Asset.created_at.desc()).limit(limit).offset(offset).all()
        )
        return items, total

    def update_asset(self, asset_id: int, asset_update: AssetUpdate, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Asset:
        asset = self.get_asset(asset_id, user_id=user_id, workspace_id=workspace_id)
        if not asset:
            raise AppError(f"Asset {asset_id} not found")

        try:
            update_data = asset_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(asset, key, value)
            
            asset.updated_at = datetime.now(timezone.utc)
            if user_id:
                asset.updated_by = str(user_id)
                
            self.db_session.commit()
            self.db_session.refresh(asset)
            return asset
        except IntegrityError:
            self.db_session.rollback()
            raise AppError("Asset name already exists for this connection")
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to update asset: {str(e)}")

    def bulk_create_assets(
        self,
        connection_id: int,
        assets_to_create: List[Any], # Using Any to avoid circular import with schemas, will be AssetBulkCreateItem
        user_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        success_count = 0
        fail_count = 0
        failures = []
        
        # Get existing asset names for this connection to prevent duplicates efficiently
        existing_assets = {
            r[0] for r in self.db_session.query(Asset.name).filter(
                Asset.connection_id == connection_id
            ).all()
        }

        for asset_data in assets_to_create:
            name = asset_data.name
            if name in existing_assets:
                fail_count += 1
                failures.append({"name": name, "reason": "Asset with this name already exists."})
                continue
            
            try:
                # Create a complete Asset model from the Pydantic item
                asset = Asset(
                    connection_id=connection_id,
                    **asset_data.model_dump(),
                    workspace_id=workspace_id or connection.workspace_id,
                    created_by=str(user_id) if user_id else None
                )
                self.db_session.add(asset)
                # Add to set to prevent duplicate additions in the same bulk run
                existing_assets.add(name)
                success_count += 1
            except Exception as e:
                # This part will now only catch unexpected errors during object creation
                fail_count += 1
                failures.append({"name": name, "reason": f"An unexpected error occurred: {str(e)}"})

        if success_count > 0:
            try:
                self.db_session.commit()
            except IntegrityError as e:
                # This could happen in a race condition if another process created an asset
                # after our initial check. The robust solution would be to retry, but for now,
                # we'll just fail the batch. A more advanced implementation would use SAVEPOINTs.
                self.db_session.rollback()
                logger.error(f"Bulk asset creation failed on commit: {e}", exc_info=True)
                raise AppError("Failed to commit assets due to a conflict. Please try again.")
        
        return {
            "successful_creates": success_count,
            "failed_creates": fail_count,
            "total_requested": len(assets_to_create),
            "failures": failures,
        }

    def delete_asset(self, asset_id: int, hard_delete: bool = False, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> bool:
        asset = self.get_asset(asset_id, user_id=user_id, workspace_id=workspace_id)
        if not asset:
            raise AppError(f"Asset {asset_id} not found")

        try:
            if hard_delete:
                self.db_session.delete(asset)
            else:
                asset.deleted_at = datetime.now(timezone.utc)
                if user_id:
                    asset.deleted_by = str(user_id)
            self.db_session.commit()
            return True
        except Exception as e:
            self.db_session.rollback()
            raise AppError(f"Failed to delete asset: {str(e)}")

    def discover_assets(
        self,
        connection_id: int,
        include_metadata: bool = False,
        pattern: Optional[str] = None,
        user_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> AssetDiscoverResponse:
        
        # Check cache
        cache_key = f"discovery:{connection_id}:{include_metadata}:{pattern}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return AssetDiscoverResponse(**cached_result)

        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found")

        try:
            config = VaultService.get_connector_config(connection)
            connector = ConnectorFactory.get_connector(
                connection.connector_type.value, config
            )

            with connector.session() as session:
                discovered = session.discover_assets(
                    pattern=pattern,
                    include_metadata=include_metadata
                )

            connection.last_schema_discovery_at = datetime.now(timezone.utc)
            self.db_session.commit()
            
            response = AssetDiscoverResponse(
                discovered_count=len(discovered),
                assets=discovered,
                message=f"Successfully discovered {len(discovered)} assets",
            )
            
            # Cache the expensive discovery result for 10 minutes
            cache.set(cache_key, response.model_dump(), ttl=600)
            
            return response
        except Exception as e:
            raise AppError(f"Failed to discover assets: {str(e)}")

    def discover_schema(
        self, asset_id: int, sample_size: int = 1000, force_refresh: bool = False, user_id: Optional[int] = None, workspace_id: Optional[int] = None
    ) -> SchemaDiscoveryResponse:
        asset = self.get_asset(asset_id, user_id=user_id, workspace_id=workspace_id)
        if not asset:
            raise AppError(f"Asset {asset_id} not found")

        try:
            config = VaultService.get_connector_config(asset.connection)
            connector = ConnectorFactory.get_connector(
                asset.connection.connector_type.value, config
            )

            asset_identifier = asset.fully_qualified_name or asset.name
            with connector.session() as session:
                schema = session.infer_schema(asset_identifier, sample_size=sample_size)

            schema_json = json.dumps(schema, sort_keys=True)
            schema_hash = hashlib.sha256(schema_json.encode()).hexdigest()

            latest = (
                self.db_session.query(AssetSchemaVersion)
                .filter(AssetSchemaVersion.asset_id == asset_id)
                .order_by(AssetSchemaVersion.version.desc())
                .first()
            )

            if latest and latest.schema_hash != schema_hash:
                breaking = self._detect_breaking_changes(latest.json_schema, schema)
                next_version = latest.version + 1
            elif not latest:
                breaking = False
                next_version = 1
            else:
                return SchemaDiscoveryResponse(
                    success=True,
                    schema_version=latest.version,
                    is_breaking_change=False,
                    message="Schema unchanged",
                    discovered_schema=schema,
                )

            schema_version = AssetSchemaVersion(
                asset_id=asset_id,
                version=next_version,
                json_schema=schema,
                schema_hash=schema_hash,
                is_breaking_change=breaking,
                discovered_at=datetime.now(timezone.utc),
            )

            self.db_session.add(schema_version)
            asset.current_schema_version = next_version
            asset.schema_metadata = schema
            self.db_session.commit()

            return SchemaDiscoveryResponse(
                success=True,
                schema_version=next_version,
                is_breaking_change=breaking,
                message=f"Schema version {next_version} created",
                discovered_schema=schema,
            )
        except Exception as e:
            self.db_session.rollback()
            return SchemaDiscoveryResponse(
                success=False, message=f"Failed to discover schema: {str(e)}"
            )

    def get_sample_data(
        self, asset_id: int, limit: int = 100, user_id: Optional[int] = None, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        asset = self.get_asset(asset_id, user_id=user_id, workspace_id=workspace_id)
        if not asset:
            raise AppError(f"Asset {asset_id} not found")

        try:
            config = VaultService.get_connector_config(asset.connection)
            connector = ConnectorFactory.get_connector(
                asset.connection.connector_type.value, config
            )

            asset_identifier = asset.fully_qualified_name or asset.name
            with connector.session() as session:
                rows = session.fetch_sample(asset_identifier, limit=limit)

            return {
                "asset_id": asset_id,
                "rows": rows,
                "count": len(rows)
            }
        except Exception as e:
            raise AppError(f"Failed to fetch sample data: {str(e)}")

    def _detect_breaking_changes(
        self, old_schema: Dict[str, Any], new_schema: Dict[str, Any]
    ) -> bool:
        old_cols = {c["name"]: c for c in old_schema.get("columns", [])}
        new_cols = {c["name"]: c for c in new_schema.get("columns", [])}

        for name, col in old_cols.items():
            if name not in new_cols:
                return True
            if col.get("type") != new_cols[name].get("type"):
                return True
        return False

    def get_connection_impact(self, connection_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> ConnectionImpactRead:
        # Validate connection exists and user has access
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found.")

        # Query to find distinct pipelines that use assets from this connection
        # A pipeline uses a connection if any of its nodes refer to an asset belonging to that connection
        pipeline_count_query = self.db_session.query(func.count(distinct(Pipeline.id))). \
            join(PipelineVersion, Pipeline.id == PipelineVersion.pipeline_id). \
            join(PipelineNode, PipelineVersion.id == PipelineNode.pipeline_version_id). \
            join(Asset, or_(PipelineNode.source_asset_id == Asset.id, PipelineNode.destination_asset_id == Asset.id)). \
            filter(Asset.connection_id == connection_id) # Only count non-deleted pipelines

        if workspace_id is not None:
            pipeline_count_query = pipeline_count_query.filter(Pipeline.workspace_id == workspace_id)
        elif user_id is not None:
            pipeline_count_query = pipeline_count_query.filter(Pipeline.user_id == user_id)

        pipeline_count = pipeline_count_query.scalar()

        return ConnectionImpactRead(pipeline_count=int(pipeline_count or 0))

    def get_connection_usage_stats(self, connection_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> ConnectionUsageStatsRead:
        # Validate connection exists and user has access
        connection = self.get_connection(connection_id, user_id=user_id, workspace_id=workspace_id)
        if not connection:
            raise AppError(f"Connection {connection_id} not found.")

        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)

        # Base query for jobs related to this connection
        # A job is related if its pipeline uses any asset from this connection
        base_job_query = self.db_session.query(Job, PipelineRun). \
            join(Pipeline, Job.pipeline_id == Pipeline.id). \
            join(PipelineVersion, Pipeline.id == PipelineVersion.pipeline_id). \
            join(PipelineNode, PipelineVersion.id == PipelineNode.pipeline_version_id). \
            join(Asset, or_(PipelineNode.source_asset_id == Asset.id, PipelineNode.destination_asset_id == Asset.id)). \
            join(PipelineRun, Job.id == PipelineRun.job_id). \
            filter(Asset.connection_id == connection_id)
        
        if workspace_id is not None:
            base_job_query = base_job_query.filter(Pipeline.workspace_id == workspace_id)
        elif user_id is not None:
            base_job_query = base_job_query.filter(Pipeline.user_id == user_id)

        # Filter for jobs that have actually completed (SUCCESS or FAILED)
        completed_jobs_filter = Job.status.in_([JobStatus.SUCCESS, JobStatus.FAILED])

        # 24h stats
        results_24h = base_job_query.filter(Job.completed_at >= last_24h, completed_jobs_filter).all()
        jobs_24h = [job for job, run in results_24h]
        pipeline_runs_24h = [run for job, run in results_24h]

        total_runs_24h = len(jobs_24h)
        successful_runs_24h = len([j for j in jobs_24h if j.status == JobStatus.SUCCESS])
        
        sync_success_rate = (successful_runs_24h / total_runs_24h * 100) if total_runs_24h > 0 else 0.0

        total_latency_seconds = sum([r.duration_seconds for r in pipeline_runs_24h if r.duration_seconds is not None])
        average_latency_ms = (total_latency_seconds / total_runs_24h * 1000) if total_runs_24h > 0 else None

        # Last 7 days runs count (any status, just for total activity)
        # Using a distinct count of job IDs to avoid overcounting if a job has multiple related pipeline nodes
        # Fix Cartesian product warning by explicitly selecting Job columns in subquery
        subq = base_job_query.with_entities(Job.id, Job.completed_at).subquery()
        last_7d_runs_count = self.db_session.query(func.count(distinct(subq.c.id))). \
            filter(subq.c.completed_at >= last_7d).scalar()


        # Data Extracted (GB) - Currently not explicitly tracked per connection/job in this system
        # A placeholder value is used. Future enhancement would involve detailed metrics.
        data_extracted_gb_24h = 0.0 # Placeholder

        return ConnectionUsageStatsRead(
            sync_success_rate=round(float(sync_success_rate), 2),
            average_latency_ms=round(float(average_latency_ms), 2) if average_latency_ms is not None else None,
            data_extracted_gb_24h=float(data_extracted_gb_24h),
            last_24h_runs=int(total_runs_24h),
            last_7d_runs=int(last_7d_runs_count or 0)
        )
