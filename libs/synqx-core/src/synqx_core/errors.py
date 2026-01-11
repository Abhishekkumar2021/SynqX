class AppError(Exception):
    """Base exception for the application."""
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error

class ConnectorError(AppError):
    """Base exception for connector-related errors."""
    pass

class ConfigurationError(ConnectorError):
    """Raised when connector configuration is invalid."""
    pass

class ConnectionFailedError(ConnectorError):
    """Raised when connection to the external system fails."""
    pass

class AuthenticationError(ConnectionFailedError):
    """Raised when authentication fails."""
    pass

class SchemaDiscoveryError(ConnectorError):
    """Raised when schema discovery fails."""
    pass

class DataTransferError(AppError):
    """Raised when data transfer between connectors fails."""
    pass

class PipelineExecutionError(AppError):
    """Raised when a pipeline execution fails and may be eligible for retry."""
    pass

class TransformationError(AppError):
    """Raised during data transformation operations."""
    pass

class NotFoundError(AppError):
    """Raised when a requested resource is not found."""
    pass

class ForbiddenError(AppError):
    """Raised when a user lacks permission to access a resource."""
    pass
