import re

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.deps import get_current_user, registrar_log
from app.core.security import criar_token, hash_senha, verifica_senha
from app.database import get_db
from app.models.models import Usuario
from app.schemas.schemas import LoginIn, PerfilUpdateIn, TokenOut, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])

logger = structlog.get_logger("sisaf.auth")

limiter = Limiter(key_func=get_remote_address, default_limits=[])


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)):
    ident = body.cpf.strip()
    user = None
    if "@" in ident:
        user = db.query(Usuario).filter(Usuario.email == ident.lower().strip()).first()
    else:
        digits = re.sub(r"\D", "", ident)
        if digits:
            user = db.query(Usuario).filter(Usuario.cpf == digits).first()
        if not user and ident:
            user = db.query(Usuario).filter(Usuario.email == ident.lower()).first()

    if not user or not verifica_senha(body.senha, user.senha_hash):
        registrar_log(
            db,
            user.id if user else None,
            "usuario",
            user.id if user else None,
            "login_falhou",
            request=request,
        )
        db.commit()
        logger.warning("login_falhou", motivo="credenciais")
        raise HTTPException(401, "Credenciais inválidas")

    if not user.ativo:
        registrar_log(
            db, user.id, "usuario", user.id, "login_falhou",
            {"motivo": "usuario_inativo"}, request=request,
        )
        db.commit()
        raise HTTPException(403, "Usuário inativo")

    token = criar_token({"sub": user.id})
    registrar_log(db, user.id, "usuario", user.id, "login", request=request)
    db.commit()
    return TokenOut(access_token=token, usuario=UsuarioOut.model_validate(user))


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.patch("/me", response_model=UsuarioOut)
def atualizar_me(
    body: PerfilUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    alteracoes: dict[str, str] = {}

    if body.nome is not None:
        nome = body.nome.strip()
        if len(nome) < 3:
            raise HTTPException(400, "Informe o nome completo")
        usuario.nome = nome
        alteracoes["nome"] = nome

    if body.email is not None:
        email = body.email.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise HTTPException(400, "E-mail inválido")
        existe = (
            db.query(Usuario)
            .filter(Usuario.email == email, Usuario.id != usuario.id)
            .first()
        )
        if existe:
            raise HTTPException(409, "E-mail já cadastrado para outro usuário")
        usuario.email = email
        alteracoes["email"] = email

    if body.senha_nova:
        if not body.senha_atual or not verifica_senha(body.senha_atual, usuario.senha_hash):
            raise HTTPException(400, "Senha atual incorreta")
        if len(body.senha_nova) < 6:
            raise HTTPException(400, "A nova senha deve ter ao menos 6 caracteres")
        usuario.senha_hash = hash_senha(body.senha_nova)
        alteracoes["senha"] = "alterada"

    if not alteracoes:
        raise HTTPException(400, "Nenhuma alteração informada")

    registrar_log(
        db, usuario.id, "usuario", usuario.id, "perfil_atualizado",
        alteracoes, request=request,
    )
    db.commit()
    db.refresh(usuario)
    logger.info("perfil_atualizado", usuario_id=usuario.id, campos=list(alteracoes))
    return usuario


def criar_usuario_usado_pelo_seed(
    db: Session, nome: str, email: str, senha: str, perfil_id: int, cpf: str | None = None
) -> Usuario:
    user = Usuario(
        nome=nome, email=email, cpf=cpf, senha_hash=hash_senha(senha), perfil_id=perfil_id
    )
    db.add(user)
    return user