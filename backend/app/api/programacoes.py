from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.codigos import gerar_codigo_os
from app.core.deps import get_current_user, registrar_log
from app.database import get_db
from app.models.models import OrdemServico, OrigemOS, ProgramacaoFiscal, Usuario
from app.schemas.schemas import ProgramacaoCreate, ProgramacaoFiscalOut

router = APIRouter(prefix="/programacoes", tags=["programacoes"])

OPTIONS = (
    selectinload(ProgramacaoFiscal.unidade),
    selectinload(ProgramacaoFiscal.criado_por),
)


def _pode_criar_pfo(usuario: Usuario) -> bool:
    """Subsecretário(a) (>=6) ou chefia com vínculo ativo (>=3)."""
    if usuario.perfil.nivel >= 6:
        return True
    vinculo_ok = usuario.perfil.nivel >= 3 and any(v.ativo for v in usuario.vinculos)
    return vinculo_ok


@router.get("", response_model=list[ProgramacaoFiscalOut])
def listar_pfos(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.scalars(
        select(ProgramacaoFiscal)
        .options(*OPTIONS)
        .order_by(ProgramacaoFiscal.criado_em.desc())
    ).all()


@router.get("/{pfo_id}", response_model=ProgramacaoFiscalOut)
def detalhar_pfo(
    pfo_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    pfo = db.scalar(
        select(ProgramacaoFiscal).where(ProgramacaoFiscal.id == pfo_id).options(*OPTIONS)
    )
    if not pfo:
        raise HTTPException(404, "PFO não encontrada")
    return pfo


@router.post("", response_model=ProgramacaoFiscalOut, status_code=201)
def criar_pfo(
    body: ProgramacaoCreate,
    request: Request,
    db: Session = Depends(get_db),
    criador: Usuario = Depends(get_current_user),
):
    if not _pode_criar_pfo(criador):
        raise HTTPException(
            403, "Apenas Subsecretário(a) ou Chefia cria PFO"
        )
    vinculos = [v for v in criador.vinculos if v.ativo]
    if not vinculos:
        raise HTTPException(400, "Usuário sem vínculo funcional ativo")

    unidade = vinculos[0].unidade
    # O código PFO nasce emitido: não há fluxo de rascunho para o documento pai.
    pfo = ProgramacaoFiscal(
        codigo=gerar_codigo_os(
            db, OrigemOS.programacao, unidade.sigla, date.today().year
        ),
        fundamentacao_legal=body.fundamentacao_legal,
        tema=body.tema,
        ra=body.ra,
        raio_geo=body.raio_geo,
        unidade_id=unidade.id,
        criado_por_id=criador.id,
    )
    db.add(pfo)
    db.flush()
    registrar_log(
        db, criador.id, "programacao_fiscal", pfo.id, "criar_pfo",
        {"codigo": pfo.codigo, "tema": pfo.tema, "unidade": unidade.sigla},
        request=request,
    )
    db.commit()
    return ProgramacaoFiscalOut.model_validate(pfo)