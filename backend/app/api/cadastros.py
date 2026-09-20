from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, registrar_log
from app.database import get_db
from app.models.models import (
    Especialidade,
    Unidade,
    UnidadeEspecialidade,
    Usuario,
    VinculoFuncional,
)
from app.schemas.schemas import (
    EspecialidadeOut,
    PesquisaPermissaoIn,
    UnidadeOut,
    UsuarioOut,
)

router = APIRouter(tags=["cadastros"])


@router.get("/especialidades", response_model=list[EspecialidadeOut])
def listar_especialidades(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(select(Especialidade).order_by(Especialidade.sigla)).all()


@router.get("/unidades", response_model=list[UnidadeOut])
def listar_unidades(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(
        select(Unidade)
        .options(
            selectinload(Unidade.especialidades).selectinload(
                UnidadeEspecialidade.especialidade
            )
        )
        .order_by(Unidade.sigla)
    ).all()


@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(
        select(Usuario)
        .options(
            selectinload(Usuario.perfil),
            selectinload(Usuario.vinculos)
            .selectinload(VinculoFuncional.unidade),
            selectinload(Usuario.vinculos)
            .selectinload(VinculoFuncional.especialidade),
        )
        .order_by(Usuario.nome)
    ).all()


@router.put("/usuarios/{usuario_id}/pesquisa", response_model=UsuarioOut)
def alterar_permissao_pesquisa(
    usuario_id: int,
    body: PesquisaPermissaoIn,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    if solicitante.perfil.nivel < 5:
        raise HTTPException(
            403,
            "Apenas chefe de unidade e acima concedem a permissão de pesquisa ilimitada",
        )
    alvo = db.get(Usuario, usuario_id)
    if not alvo:
        raise HTTPException(404, "Usuário não encontrado")
    alvo.pesquisa_ilimitada = body.pesquisa_ilimitada
    registrar_log(
        db,
        solicitante.id,
        "usuario",
        alvo.id,
        "alterar_permissao_pesquisa",
        {"pesquisa_ilimitada": body.pesquisa_ilimitada},
        request=request,
    )
    db.commit()
    db.refresh(alvo)
    return alvo