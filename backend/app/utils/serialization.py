from datetime import date, datetime
from typing import Any
from uuid import UUID


def sanitize_for_json(obj: Any) -> Any:  # noqa: PLR0911
    """
    Recursively sanitize an object to make it JSON serializable.
    Converts datetime, date, UUID, and other common non-serializable types to strings.
    """
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(i) for i in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, bytes):
        import base64
        return base64.b64encode(obj).decode("utf-8")
    # Handle pandas/numpy types if they exist without requiring them as dependencies
    elif hasattr(obj, "isoformat") and callable(obj.isoformat):
        return obj.isoformat()
    elif hasattr(obj, "item") and callable(obj.item):  # numpy types
        return obj.item()
    elif hasattr(obj, "__dict__"):
        return sanitize_for_json(obj.__dict__)

    # Check if it's a pandas Timestamp or similar by class name to avoid hard dependency
    class_name = obj.__class__.__name__
    if class_name in ["Timestamp", "Timedelta"]:
        return str(obj)

    try:
        # Final fallback for anything else - if it's not serializable, str() it
        import json  # noqa: PLC0415

        json.dumps(obj)
        return obj
    except (TypeError, OverflowError):
        return str(obj)
