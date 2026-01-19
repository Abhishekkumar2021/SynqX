from typing import Any, Dict, List
from .base import OSDUBaseClient

class OSDURefService(OSDUBaseClient):
    """
    Reference Data services (CRS, Unit).
    """
    
    # --- CRS Conversion Service ---
    def convert_trajectory(self, trajectory: Dict[str, Any], target_crs: str) -> Dict[str, Any]:
        payload = {"trajectory": trajectory, "targetCRS": target_crs}
        return self._post("api/crs/converter/v2/convertTrajectory", json=payload).json()

    def get_crs_catalog(self) -> List[Dict[str, Any]]:
        return self._get("api/crs/catalog/v2/crs").json().get("crs", [])

    # --- Unit Service ---
    def list_units(self) -> List[Dict[str, Any]]:
        return self._get("api/unit/v3/unit").json().get("units", [])

    def convert_units(self, from_unit: str, to_unit: str, value: float) -> float:
        params = {"fromUnit": from_unit, "toUnit": to_unit, "value": value}
        return self._get("api/unit/v3/unit/convert", params=params).json().get("value")