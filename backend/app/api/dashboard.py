from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.models import (
    AutoInfracao,
    Especialidade,
    OrdemServico,
    OSFrente,
    StatusAI,
    StatusOS,
)
from app.schemas.schemas import ResumoDashboard

router = APIRouter(tags=["dashboard"])

ATIVOS = [
    StatusOS.criada,
    StatusOS.vinculada,
    StatusOS.em_execucao,
    StatusOS.devolvida,
    StatusOS.desarquivada,
]


@router.get("/dashboard/resumo", response_model=ResumoDashboard)
def resumo(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total = db.scalar(select(func.count(OrdemServico.id))) or 0

    por_status = dict(
        db.execute(
            select(OrdemServico.status, func.count(OrdemServico.id)).group_by(
                OrdemServico.status
            )
        ).all()
    )
    por_status = {k.value: v for k, v in por_status.items()}

    por_esp = dict(
        db.execute(
            select(OSFrente.especialidade_id, func.count(OSFrente.os_id)).group_by(
                OSFrente.especialidade_id
            )
        ).all()
    )
    siglas = {
        e.id: e.sigla
        for e in db.execute(select(Especialidade.id, Especialidade.sigla)).all()
    }

    vencendo = 0
    limite = date.today() + timedelta(days=3)
    for os_ in db.scalars(
        select(OrdemServico).where(
            OrdemServico.prazo_data.is_not(None),
            OrdemServico.status.in_(ATIVOS),
        )
    ):
        if os_.prazo_data <= limite:
            vencendo += 1

    autos_ativos = (
        db.scalar(
            select(func.count(AutoInfracao.id)).where(
                AutoInfracao.status.in_([StatusAI.lavrado, StatusAI.encaminhado])
            )
        )
        or 0
    )

    valor_estimado = float(
        db.scalar(
            select(func.coalesce(func.sum(AutoInfracao.valor_total), 0)).where(
                AutoInfracao.status.in_([StatusAI.lavrado, StatusAI.encaminhado])
            )
        )
    )

    por_origem = dict(
        db.execute(
            select(OrdemServico.origem, func.count(OrdemServico.id)).group_by(
                OrdemServico.origem
            )
        ).all()
    )
    por_origem = {k.value: v for k, v in por_origem.items()}

    return ResumoDashboard(
        total=total,
        por_status=por_status,
        por_especialidade={siglas.get(k, str(k)): v for k, v in por_esp.items()},
        por_origem=por_origem,
        vencendo=vencendo,
        autos_ativos=autos_ativos,
        valor_estimado=valor_estimado,
    )