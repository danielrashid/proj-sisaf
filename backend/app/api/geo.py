import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.models import (
    AcaoFiscal,
    AutoInfracao,
    CamadaGeo,
    Estabelecimento,
    OrdemServico,
    Reincidencia,
    StatusOS,
)
from app.schemas.schemas import (
    GeoProxima,
    HistoricoEstabelecimento,
    AcaoFiscalOut,
    AutoInfracaoOut,
)

router = APIRouter(tags=["geo"])

STATUS_ATIVOS = [
    StatusOS.criada,
    StatusOS.vinculada,
    StatusOS.em_execucao,
    StatusOS.devolvida,
    StatusOS.desarquivada,
]


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@router.get("/geo/camadas")
def listar_camadas(db: Session = Depends(get_db), _=Depends(get_current_user)):
    camadas = db.scalars(select(CamadaGeo).where(CamadaGeo.ativo.is_(True))).all()
    return [
        {"id": c.id, "nome": c.nome, "tipo": c.tipo, "geojson": c.geojson}
        for c in camadas
    ]


@router.get("/geo/os-proximas", response_model=list[GeoProxima])
def os_proximas(
    latitude: float,
    longitude: float,
    raio: float = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(OrdemServico).where(
        OrdemServico.latitude.is_not(None),
        OrdemServico.longitude.is_not(None),
        OrdemServico.status.in_(STATUS_ATIVOS),
    )
    result = []
    for os_ in db.scalars(stmt):
        dist = _haversine(latitude, longitude, float(os_.latitude), float(os_.longitude))
        if dist <= raio:
            result.append(
                GeoProxima(
                    os_id=os_.id,
                    numero=os_.numero,
                    tema=os_.tema,
                    status=os_.status,
                    distancia_m=round(dist, 1),
                    latitude=float(os_.latitude),
                    longitude=float(os_.longitude),
                )
            )
    result.sort(key=lambda x: x.distancia_m)
    return result


@router.get("/estabelecimentos/{cnpj}/historico", response_model=HistoricoEstabelecimento)
def historico_estabelecimento(
    cnpj: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    estab = db.scalar(select(Estabelecimento).where(Estabelecimento.cnpj == cnpj))

    acoes = db.scalars(
        select(AcaoFiscal)
        .join(AutoInfracao, AutoInfracao.acao_id == AcaoFiscal.id)
        .where(AutoInfracao.cnpj == cnpj)
        .options(selectinload(AcaoFiscal.auditor))
    ).all()
    autos = db.scalars(select(AutoInfracao).where(AutoInfracao.cnpj == cnpj)).all()
    reinc = db.scalars(select(Reincidencia).where(Reincidencia.cnpj == cnpj)).all()

    return HistoricoEstabelecimento(
        cnpj=cnpj,
        razao_social=estab.razao_social if estab else None,
        acoes=[AcaoFiscalOut.model_validate(a) for a in acoes],
        autos=[AutoInfracaoOut.model_validate(ai) for ai in autos],
        reincidencias=[
            {"id": r.id, "natureza": r.natureza, "ocorrencia": r.numero_ocorrencia}
            for r in reinc
        ],
    )