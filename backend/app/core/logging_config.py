import logging
import sys

import structlog


def setup_logging(environment: str = "development") -> None:
    """Configures structlog for both console (dev) and JSON (prod)."""

    renderer = (
        structlog.processors.JSONRenderer()
        if environment == "production"
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Our own RequestLoggingMiddleware replaces uvicorn's per-request access log
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)