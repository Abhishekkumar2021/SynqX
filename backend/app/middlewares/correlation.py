import uuid
from starlette.types import ASGIApp, Scope, Receive, Send
from structlog.contextvars import bind_contextvars, clear_contextvars


class CorrelationMiddleware:
    def __init__(self, app: ASGIApp, header_name: str = "X-Correlation-ID"):
        self.app = app
        self.header_name = header_name

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract correlation ID from headers
        headers = dict(scope.get("headers", []))
        correlation_id = str(uuid.uuid4())
        
        header_name_bytes = self.header_name.lower().encode("latin-1")
        for name, value in headers.items():
            if name == header_name_bytes:
                correlation_id = value.decode("latin-1")
                break

        bind_contextvars(correlation_id=correlation_id)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_headers.append(
                    (self.header_name.encode("latin-1"), correlation_id.encode("latin-1"))
                )
                message["headers"] = response_headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            clear_contextvars()
