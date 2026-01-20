class AppError(Exception):
    def __init__(self, message: str, original_error: Exception = None):  # noqa: RUF013
        super().__init__(message)
        self.original_error = original_error


class ConnectorError(AppError):
    pass


class ConfigurationError(ConnectorError):
    pass


class ConnectionFailedError(ConnectorError):
    pass


class AuthenticationError(ConnectionFailedError):
    pass


class SchemaDiscoveryError(ConnectorError):
    pass


class DataTransferError(AppError):
    pass


class PipelineExecutionError(AppError):
    pass


class TransformationError(AppError):
    pass


class NotFoundError(AppError):
    pass


class ForbiddenError(AppError):
    pass
