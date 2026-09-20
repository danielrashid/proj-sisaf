from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi.errors import RateLimitExceeded
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import acoes, admin, auth, busca, cadastros, dashboard, geo, log, os, programacoes, sistema
from app.config import settings
from app.core.logging_config import setup_logging
from app.core.request_logging import RequestLoggingMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

setup_logging(settings.environment)

app = FastAPI(title="SISAF", version="0.2.0")

app.state.limiter = auth.limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Muitas tentativas em pouco tempo. Aguarde alguns minutos."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        h.strip()
        for h in settings.allowed_hosts.split(",")
        if h.strip()
    ],
)
app.add_middleware(
    SecurityHeadersMiddleware, enable_hsts=settings.is_production
)
app.add_middleware(RequestLoggingMiddleware)

for router in (
    auth.router,
    cadastros.router,
    admin.router,
    os.router,
    acoes.router,
    programacoes.router,
    geo.router,
    log.router,
    dashboard.router,
    busca.router,
    sistema.router,
):
    app.include_router(router)

Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=False,
).instrument(app).expose(app, endpoint="/metrics")


@app.get("/")
def root():
    return {"aplicacao": "SISAF", "docs": "/docs", "metrics": "/metrics"}