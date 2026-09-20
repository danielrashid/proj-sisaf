from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, registrar_log
from app.database import get_db
from app.models.models import (
    AcaoFiscal,
    AutoInfracao,
    OrdemServico,
    Usuario,
    Estabelecimento,
)
from app.schemas.schemas import ResultadoBusca

router = APIRouter(prefix="/busca", tags=["busca"])

LIMITE_LIMITADA = 10
LIMITE_ILIMITADA = 25


def _mascarar_docs(v: str | None) -> str | None:
    if not v:
        return None
    digitos = "".join(ch for ch in v if ch.isdigit())
    if len(digitos) == 11:
        return f"***.***.***-{digitos[-2:]}"
    if len(digitos) == 14:
        return f"**.***.***/****-{digitos[-2:]}"
    return "*" * len(v)


def _filtro_ilike(col, q: str):
    return col.ilike(f"%{q}%")


def _buscar_os(db: Session, q: str, limit: int, multar: bool):
    stmt = (
        select(OrdemServico)
        .where(
            or_(
                _filtro_ilike(OrdemServico.tema, q),
                _filtro_ilike(OrdemServico.cnpj, q),
                _filtro_ilike(OrdemServico.endereco, q),
                _filtro_ilike(OrdemServico.ra, q),
            )
        )
        .order_by(OrdemServico.numero.desc())
        .limit(limit)
    )
    return [
        {
            "id": o.id,
            "numero": o.numero,
            "tema": o.tema,
            "ra": o.ra,
            "cnpj": None if multar else o.cnpj,
            "endereco": None if multar else o.endereco,
            "status": o.status,
            "prazo_data": o.prazo_data,
        }
        for o in db.scalars(stmt)
    ]


def _buscar_estabelecimentos(db: Session, q: str, limit: int, multar: bool):
    stmt = (
        select(Estabelecimento)
        .where(
            or_(
                _filtro_ilike(Estabelecimento.cnpj, q),
                _filtro_ilike(Estabelecimento.razao_social, q),
                _filtro_ilike(Estabelecimento.endereco, q),
            )
        )
        .order_by(Estabelecimento.razao_social)
        .limit(limit)
    )
    return [
        {
            "id": e.id,
            "cnpj": _mascarar_docs(e.cnpj) if multar else e.cnpj,
            "razao_social": e.razao_social,
            "endereco": None if multar else e.endereco,
        }
        for e in db.scalars(stmt)
    ]


def _buscar_autos(db: Session, q: str, limit: int, multar: bool):
    stmt = (
        select(AutoInfracao)
        .where(
            or_(
                _filtro_ilike(AutoInfracao.cnpj, q),
                _filtro_ilike(AutoInfracao.razao_social, q),
                _filtro_ilike(AutoInfracao.natureza, q),
            )
        )
        .options(selectinload(AutoInfracao.acao).selectinload(AcaoFiscal.os))
        .order_by(AutoInfracao.id.desc())
        .limit(limit)
    )
    return [
        {
            "id": ai.id,
            "os_id": ai.acao.os_id,
            "os_numero": ai.acao.os.numero,
            "cnpj": _mascarar_docs(ai.cnpj) if multar else ai.cnpj,
            "razao_social": ai.razao_social,
            "natureza": ai.natureza,
            "status": ai.status,
        }
        for ai in db.scalars(stmt)
    ]


def _buscar_usuarios(db: Session, q: str, limit: int):
    digitos = "".join(ch for ch in q if ch.isdigit())
    condicoes = [_filtro_ilike(Usuario.nome, q)]
    if digitos:
        condicoes.append(Usuario.cpf.ilike(f"%{digitos}%"))
    stmt = (
        select(Usuario)
        .where(or_(*condicoes))
        .order_by(Usuario.nome)
        .limit(limit)
    )
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "cpf": u.cpf,
            "email": u.email,
            "perfil": u.perfil.codigo,
        }
        for u in db.scalars(stmt)
    ]


@router.get("/raiz", response_model=ResultadoBusca)
def buscar_raiz(
    request: Request,
    q: str = Query("", min_length=1),
    modo: str = Query("limitada", pattern="^(limitada|ilimitada)$"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ilimitada_autorizada = bool(usuario.pesquisa_ilimitada)
    ilimitada = modo == "ilimitada"

    if ilimitada and not ilimitada_autorizada:
        raise HTTPException(
            403,
            "Você não possui permissão para pesquisa ilimitada (LGPD). Solicite ao administrador.",
        )

    termo = q.strip()
    if not termo:
        return ResultadoBusca(modo=modo, autorizada_ilimitada=ilimitada_autorizada)

    multar = not ilimitada
    limite = LIMITE_ILIMITADA if ilimitada else LIMITE_LIMITADA

    resultado = ResultadoBusca(
        modo=modo,
        autorizada_ilimitada=ilimitada_autorizada,
        os=_buscar_os(db, termo, limite, multar),
        estabelecimentos=_buscar_estabelecimentos(db, termo, limite, multar),
        autos=_buscar_autos(db, termo, limite, multar),
        usuarios=_buscar_usuarios(db, termo, limite) if ilimitada else [],
    )

    registrar_log(
        db,
        usuario.id,
        "busca",
        None,
        f"buscar_{modo}",
        {"q": termo, "modo": modo, "resultados": len(resultado.os)
            + len(resultado.estabelecimentos)
            + len(resultado.autos)
            + len(resultado.usuarios)},
        request=request,
    )
    db.commit()

    return resultado