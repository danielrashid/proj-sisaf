import uuid
from typing import Callable

import structlog
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import verificar_token
from app.database import get_db
from app.models.models import LogAuditoria, Usuario

bearer = HTTPBearer(auto_error=False)

logger = structlog.get_logger("sisaf.auth")


def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    if not cred:
        raise HTTPException(401, "Autenticação necessária")
    payload = verificar_token(cred.credentials)
    if not payload:
        raise HTTPException(401, "Token inválido ou expirado")
    user = db.get(Usuario, payload.get("sub"))
    if not user or not user.ativo:
        raise HTTPException(401, "Usuário não encontrado ou inativo")
    return user


def registrar_log(
    db: Session,
    usuario_id: int | None,
    entidade: str,
    entidade_id: int | None,
    acao: str,
    dados: dict | None = None,
    *,
    request: Request | None = None,
) -> None:
    ip_address = None
    user_agent = None
    if request and request.client:
        ip_address = request.client.host
        user_agent = (request.headers.get("user-agent") or "")[:250]

    log_entry = LogAuditoria(
        usuario_id=usuario_id,
        entidade=entidade,
        entidade_id=entidade_id,
        acao=acao,
        dados=dados,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log_entry)
    db.flush()

    logger.info(
        "audit",
        entidade=entidade,
        entidade_id=entidade_id,
        acao=acao,
        usuario_id=usuario_id,
        ip=ip_address,
    )
