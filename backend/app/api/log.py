from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.models import LogAuditoria
from app.schemas.schemas import LogAuditoriaOut

router = APIRouter(tags=["log"])


@router.get("/log", response_model=list[LogAuditoriaOut])
def listar_log(
    entidade: str | None = None,
    acao: str | None = None,
    usuario_id: int | None = None,
    ip: str | None = None,
    desde: str | None = None,
    limite: int = 100,
    pagina: int = 1,
    offset_id: int | None = Query(None, description="Página por cursor (id do último registro)" ),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(LogAuditoria).order_by(LogAuditoria.criado_em.desc())

    if entidade:
        stmt = stmt.where(LogAuditoria.entidade == entidade)
    if acao:
        stmt = stmt.where(LogAuditoria.acao == acao)
    if usuario_id:
        stmt = stmt.where(LogAuditoria.usuario_id == usuario_id)
    if ip:
        stmt = stmt.where(LogAuditoria.ip_address == ip)
    if desde:
        stmt = stmt.where(LogAuditoria.criado_em >= desde)
    if offset_id:
        stmt = stmt.where(LogAuditoria.id < offset_id)

    stmt = stmt.limit(max(1, min(limite, 500))).offset((max(1, pagina) - 1) * max(1, min(limite, 500)))
    return db.scalars(stmt).all()