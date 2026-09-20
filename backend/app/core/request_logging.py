import socket
import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger("sisaf.access")
HOST = socket.gethostname()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request/response with structured context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        start = time.perf_counter()

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
            host=HOST,
        )

        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id

        log_fn = logger.info if response.status_code < 500 else logger.error
        log_fn(
            "http_request",
            status=response.status_code,
            duration_ms=duration_ms,
            user_agent=request.headers.get("user-agent", "")[:120],
        )

        return response
