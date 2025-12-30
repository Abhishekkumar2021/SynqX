import pandas as pd
from typing import Dict, Any, List, Optional, Iterator, Union
from app.connectors.base import BaseConnector
from app.core.errors import ConfigurationError
import json

# Note: We'll assume the user will install google-api-python-client and google-auth
# If not present, we will catch ImportError during usage
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_LIBS_INSTALLED = True
except ImportError:
    GOOGLE_LIBS_INSTALLED = False

class GoogleSheetsConnector(BaseConnector):
    """
    Connector for Google Sheets.
    Supports reading from and writing to specific sheets within a spreadsheet.
    """

    def validate_config(self) -> None:
        if not GOOGLE_LIBS_INSTALLED:
            raise ConfigurationError(
                "Google API libraries not installed. Please install 'google-api-python-client' and 'google-auth'."
            )
        
        if not self.config.get("spreadsheet_id"):
            raise ConfigurationError("spreadsheet_id is required for Google Sheets connector.")
        
        auth_type = self.config.get("auth_type", "service_account")
        if auth_type == "service_account":
            if not self.config.get("service_account_json"):
                raise ConfigurationError("service_account_json is required for service_account auth_type.")
        elif auth_type == "api_key":
            if not self.config.get("api_key"):
                raise ConfigurationError("api_key is required for api_key auth_type.")
        else:
            raise ConfigurationError(f"Unsupported auth_type: {auth_type}")

    def connect(self) -> None:
        auth_type = self.config.get("auth_type", "service_account")
        spreadsheet_id = self.config["spreadsheet_id"]
        
        try:
            if auth_type == "service_account":
                sa_info = self.config["service_account_json"]
                if isinstance(sa_info, str):
                    sa_info = json.loads(sa_info)
                
                credentials = service_account.Credentials.from_service_account_info(
                    sa_info,
                    scopes=['https://www.googleapis.com/auth/spreadsheets']
                )
                self.service = build('sheets', 'v4', credentials=credentials)
            else: # api_key
                self.service = build('sheets', 'v4', developerKey=self.config["api_key"])
            
            self.spreadsheet_id = spreadsheet_id
        except Exception as e:
            raise ConfigurationError(f"Failed to connect to Google Sheets API: {str(e)}")

    def disconnect(self) -> None:
        if hasattr(self, 'service'):
            self.service.close()

    def test_connection(self) -> bool:
        try:
            self.connect()
            # Try to get spreadsheet metadata to verify access
            self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            return True
        except Exception:
            return False
        finally:
            self.disconnect()

    def discover_assets(self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs) -> List[Dict[str, Any]]:
        """
        In Google Sheets, 'assets' are individual sheets (tabs) within the spreadsheet.
        """
        self.connect()
        try:
            spreadsheet = self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            sheets = spreadsheet.get('sheets', [])
            
            assets = []
            for sheet in sheets:
                name = sheet['properties']['title']
                if pattern and pattern.lower() not in name.lower():
                    continue
                
                assets.append({
                    "name": name,
                    "fully_qualified_name": f"{self.spreadsheet_id}.{name}",
                    "asset_type": "sheet",
                    "metadata": sheet['properties'] if include_metadata else {}
                })
            return assets
        finally:
            self.disconnect()

    def infer_schema(self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs) -> Dict[str, Any]:
        """
        Infers schema by reading the header row and a sample of data.
        """
        df = next(self.read_batch(asset, limit=sample_size))
        
        schema = {
            "asset": asset,
            "columns": []
        }
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            # Map pandas dtypes to generic types
            if "int" in dtype:
                stype = "integer"
            elif "float" in dtype:
                stype = "float"
            elif "bool" in dtype:
                stype = "boolean"
            elif "datetime" in dtype:
                stype = "datetime"
            else:
                stype = "string"
                
            schema["columns"].append({
                "name": col,
                "type": stype,
                "native_type": dtype
            })
            
        return schema

    def read_batch(self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs) -> Iterator[pd.DataFrame]:
        """
        Reads a sheet as a DataFrame.
        Note: Currently reads the whole sheet then applies limit/offset.
        """
        self.connect()
        try:
            # Format: 'SheetName!A:Z'
            range_name = f"{asset}"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                yield pd.DataFrame()
                return

            header = values[0]
            data = values[1:]
            
            df = pd.DataFrame(data, columns=header)
            
            if offset:
                df = df.iloc[offset:]
            if limit:
                df = df.iloc[:limit]
                
            yield df
        finally:
            self.disconnect()

    def write_batch(self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs) -> int:
        """
        Writes data to a sheet.
        """
        self.connect()
        try:
            if isinstance(data, pd.DataFrame):
                df = data
            else:
                df = pd.concat(list(data))

            # Convert all to strings for simple writing to Sheets
            values = [df.columns.values.tolist()] + df.values.tolist()
            
            body = {
                'values': values
            }
            
            if mode == "overwrite":
                # Clear existing content first
                self.service.spreadsheets().values().clear(
                    spreadsheetId=self.spreadsheet_id,
                    range=asset
                ).execute()
                
                self.service.spreadsheets().values().update(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{asset}!A1",
                    valueInputOption='RAW',
                    body=body
                ).execute()
            else: # append
                # For append, we don't include headers if sheet already has content
                # But Sheets 'append' API is smart. However, for consistency:
                sheet_data = self.service.spreadsheets().values().get(
                    spreadsheetId=self.spreadsheet_id, range=f"{asset}!A1:A1"
                ).execute().get('values', [])
                
                if sheet_data:
                    body['values'] = df.values.tolist()

                self.service.spreadsheets().values().append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{asset}!A1",
                    valueInputOption='RAW',
                    body=body
                ).execute()
                
            return len(df)
        finally:
            self.disconnect()

    def execute_query(self, query: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Not directly supported for Google Sheets in a standard SQL way.
        Could implement a basic filter/selector if needed.
        """
        raise NotImplementedError("SQL queries are not supported for Google Sheets connector.")
