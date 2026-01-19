from typing import Any, Dict, List
from .base import OSDUBaseClient

class OSDUFileService(OSDUBaseClient):
    """
    File and Dataset services implementation.
    """
    
    # --- File Service ---
    def get_upload_url(self) -> Dict[str, Any]:
        """GET api/file/v2/files/uploadURL"""
        return self._get("api/file/v2/files/uploadURL").json()

    def get_file_upload_url(self) -> Dict[str, Any]:
        """Alias for get_upload_url to match frontend naming."""
        return self.get_upload_url()

    def get_download_url(self, file_id: str, expiry_time: str = "2H") -> str:
        """GET api/file/v2/files/{id}/downloadURL"""
        params = {"expiryTime": expiry_time}
        resp = self._get(f"api/file/v2/files/{file_id}/downloadURL", params=params).json()
        # Handle various OSDU response key casings
        return resp.get("SignedUrl") or resp.get("SignedURL") or resp.get("signedUrl") or ""

    def get_file_download_url(self, file_id: str, **kwargs) -> str:
        """Alias for get_download_url to match frontend naming."""
        return self.get_download_url(file_id, **kwargs)

    def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """GET api/file/v2/files/{id}/metadata"""
        return self._get(f"api/file/v2/files/{file_id}/metadata").json()

    def register_file_metadata(self, metadata: Dict[str, Any]) -> str:
        """POST api/file/v2/files/metadata"""
        return self._post("api/file/v2/files/metadata", json=metadata).json().get("id")

    def register_file(self, metadata: Dict[str, Any], **kwargs) -> str:
        """Wrapper for register_file_metadata to match frontend naming."""
        return self.register_file_metadata(metadata)

    def upload_file(self, file_content: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """
        Server-side upload proxy to bypass browser CORS.
        1. Fetches upload URL
        2. Uploads binary content via server-side PUT
        3. Registers metadata with OSDU
        Returns the registered FileID.
        """
        # 1. Get Upload Instructions
        upload_info = self.get_file_upload_url()
        file_id = upload_info.get("FileID")
        location = upload_info.get("Location", {})
        signed_url = location.get("SignedURL")
        file_source = location.get("FileSource")

        if not signed_url:
            raise ValueError("Could not obtain signed upload URL from OSDU")

        # 2. Perform Binary PUT from Server
        import requests
        headers = {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": content_type
        }
        resp = requests.put(signed_url, data=file_content, headers=headers)
        resp.raise_for_status()

        # 3. Register Metadata
        metadata = {
            "kind": "osdu:wks:dataset--File.Generic:1.0.0",
            "acl": {
                "viewers": self.config.get("default_viewers", []),
                "owners": self.config.get("default_owners", [])
            },
            "legal": {
                "legaltags": self.config.get("default_legal_tags", []),
                "otherRelevantDataCountries": ["US"]
            },
            "data": {
                "DatasetProperties": {
                    "FileSourceInfo": {
                        "FileSource": file_source,
                        "Name": filename,
                        "FileSize": str(len(file_content))
                    }
                }
            }
        }
        
        # If partition defaults aren't found, try to infer or use placeholders
        # In a real scenario, these should be passed or configured
        if not metadata["acl"]["viewers"]:
            metadata["acl"] = {"viewers": [f"data.default.viewers@{self.partition_id}.dataservices.com"], "owners": [f"data.default.owners@{self.partition_id}.dataservices.com"]}
        if not metadata["legal"]["legaltags"]:
            metadata["legal"]["legaltags"] = [f"{self.partition_id}-default-legal"]

        self.register_file_metadata(metadata)
        return file_id

    def delete_file_metadata(self, file_id: str):
        """DELETE api/file/v2/files/{id}/metadata"""
        self._delete(f"api/file/v2/files/{file_id}/metadata")

    def download_file(self, file_id: str) -> bytes:
        """
        Directly fetches file content bytes using a signed URL.
        """
        signed_url = self.get_download_url(file_id)
        if not signed_url:
            raise ValueError(f"Could not resolve download URL for file {file_id}")
        
        import requests
        resp = requests.get(signed_url)
        resp.raise_for_status()
        return resp.content

    # --- Dataset Service ---
    def get_retrieval_instructions(self, dataset_ids: List[str]) -> Dict[str, Any]:
        """POST api/dataset/v1/retrievalInstructions"""
        payload = {"datasetRegistryIds": dataset_ids}
        return self._post("api/dataset/v1/retrievalInstructions", json=payload).json()

    def get_dataset_url(self, dataset_registry_id: str) -> str:
        """
        Resolves a signed download URL for a specific Dataset Registry ID.
        Uses Dataset Service retrievalInstructions.
        """
        resp = self.get_retrieval_instructions([dataset_registry_id])
        delivery = resp.get("delivery", [])
        if not delivery:
            return ""
        
        # Extract signed URL from retrieval properties
        props = delivery[0].get("retrievalProperties", {})
        return props.get("signedUrl") or props.get("SignedUrl") or props.get("SignedURL") or ""

    def get_storage_instructions(self, kind: str) -> Dict[str, Any]:
        """GET api/dataset/v1/storageInstructions"""
        return self._get("api/dataset/v1/storageInstructions", params={"kind": kind}).json()

    def register_dataset(self, datasets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """POST api/dataset/v1/registerDataset"""
        payload = {"datasetRegistries": datasets}
        return self._post("api/dataset/v1/registerDataset", json=payload).json()