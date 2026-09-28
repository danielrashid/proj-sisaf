"""Cadastros administrativos: usuários, unidades e base de permissões.

Regras de acesso:
- nível >= 5: gerência de usuários (criar/editar, ativo, vínculos, permissões);
- nível >= 6: estrutura (unidades) e base de permissões (catálogo + perfil x permissão);
- toda alteração é registrada no log de auditoria.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, registrar_log
from app.core.security import hash_senha
from app.database import get_db
from app.models.models import (
    Especialidade,
    Orgao,
    Perfil,
    Permissao,
    Unidade,
    UnidadeEspecialidade,
    Usuario,
    UsuarioPermissao,
    VinculoFuncional,
)
from app.schemas.schemas import (
    OrgaoCreate,
    OrgaoOut,
    OrgaoUpdate,
    PerfilOut,
    PermissaoCreate,
    PermissaoOut,
    PermissaoUpdate,
    PerfilPermissoesIn,
    UnidadeCreate,
    UnidadeOut,
    UnidadeUpdate,
    UsuarioAdminCreate,
    UsuarioAdminUpdate,
    UsuarioOut,
    VinculoAdminIn,
)

router = APIRouter(prefix="/admin", tags=["admin"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _nivel(solicitante: Usuario, minimo: int, o_que: str = "essa ação") -> None:
    if (solicitante.perfil.nivel if solicitante.perfil else 0) < minimo:
        raise HTTPException(
            403, f"Apenas quem tem nível {minimo} ou mais pode {o_que}"
        )


def _cpf_digitos(cpf: str | None) -> str | None:
    if cpf is None:
        return None
    digitos = re.sub(r"\D", "", cpf)
    return digitos or None


def _validar_perfil(db: Session, perfil_id: int) -> Perfil:
    perfil = db.get(Perfil, perfil_id)
    if not perfil:
        raise HTTPException(404, "Perfil não encontrado")
    return perfil


def _validar_tipo_usuario(tipo_usuario: str) -> str:
    if tipo_usuario not in ("servidor", "externo"):
        raise HTTPException(
            400, "Tipo de usuário deve ser 'servidor' (DF-LEGAL) ou 'externo'"
        )
    return tipo_usuario


def _validar_externo_perfil(perfil: Perfil, tipo_usuario: str) -> None:
    if tipo_usuario == "externo" and perfil.nivel > 1:
        raise HTTPException(
            400,
            "Usuário externo só pode ter perfil de pesquisa limitada (nível 1)",
        )


def _validar_orgao_id(db: Session, orgao_id: int | None) -> None:
    if orgao_id is not None and not db.get(Orgao, orgao_id):
        raise HTTPException(404, "Órgão não encontrado")


def _validar_permissao_ids(db: Session, ids: list[int]) -> None:
    if not ids:
        return
    existentes = set(
        db.scalars(select(Permissao.id).where(Permissao.id.in_(ids))).all()
    )
    faltantes = [i for i in ids if i not in existentes]
    if faltantes:
        raise HTTPException(404, f"Permissões não encontradas: {faltantes}")


def _validar_vinculos(db: Session, vinculos: list[VinculoAdminIn]) -> list[VinculoFuncional]:
    itens = []
    for v in vinculos:
        if not db.get(Unidade, v.unidade_id):
            raise HTTPException(404, f"Unidade não encontrada: {v.unidade_id}")
        if not db.get(Especialidade, v.especialidade_id):
            raise HTTPException(404, f"Especialidade não encontrada: {v.especialidade_id}")
        itens.append(
            VinculoFuncional(
                unidade_id=v.unidade_id,
                especialidade_id=v.especialidade_id,
                cargo=v.cargo.strip() or "Servidor",
                ativo=v.ativo,
            )
        )
    return itens


def _serializar_usuario(db: Session, usuario: Usuario) -> UsuarioOut:
    return UsuarioOut.model_validate(
        db.scalars(
            select(Usuario)
            .options(
                selectinload(Usuario.perfil),
                selectinload(Usuario.orgao),
                selectinload(Usuario.vinculos).selectinload(VinculoFuncional.unidade),
                selectinload(Usuario.vinculos).selectinload(VinculoFuncional.especialidade),
            )
            .where(Usuario.id == usuario.id)
        ).one()
    )


def _serializar_unidade(db: Session, unidade: Unidade) -> UnidadeOut:
    return UnidadeOut.model_validate(
        db.scalars(
            select(Unidade)
            .options(
                selectinload(Unidade.especialidades).selectinload(
                    UnidadeEspecialidade.especialidade
                )
            )
            .where(Unidade.id == unidade.id)
        ).one()
    )


# ----------------------------------------------------------------------------- #
# Perfis e base de permissões
# ----------------------------------------------------------------------------- #


@router.get("/perfis", response_model=list[PerfilOut])
def listar_perfis(
    db: Session = Depends(get_db), solicitante: Usuario = Depends(get_current_user)
):
    _nivel(solicitante, 5, "acessar a base de cadastros")
    return db.scalars(select(Perfil).order_by(Perfil.nivel, Perfil.nome)).all()


@router.get("/permissoes", response_model=list[PermissaoOut])
def listar_permissoes(
    db: Session = Depends(get_db), solicitante: Usuario = Depends(get_current_user)
):
    _nivel(solicitante, 5, "acessar a base de permissões")
    return db.scalars(
        select(Permissao)
        .options(
            selectinload(Permissao.perfis),
            selectinload(Permissao.usuarios),
        )
        .order_by(Permissao.codigo)
    ).all()


@router.post("/permissoes", response_model=PermissaoOut)
def criar_permissao(
    body: PermissaoCreate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "criar permissões")
    codigo = body.codigo.strip().lower().replace(" ", "_")
    if not codigo or not re.match(r"^[a-z0-9_]{2,60}$", codigo):
        raise HTTPException(400, "Código inválido (minúsculas, números e _)")
    if db.query(Permissao).filter(Permissao.codigo == codigo).first():
        raise HTTPException(409, "Código de permissão já cadastrado")
    perm = Permissao(codigo=codigo, nome=body.nome.strip())
    db.add(perm)
    db.flush()
    registrar_log(
        db, solicitante.id, "permissao", perm.id, "criar_permissao",
        {"codigo": codigo, "nome": perm.nome}, request=request,
    )
    db.commit()
    db.refresh(perm)
    return perm


@router.patch("/permissoes/{permissao_id}", response_model=PermissaoOut)
def editar_permissao(
    permissao_id: int,
    body: PermissaoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "editar permissões")
    perm = db.get(Permissao, permissao_id)
    if not perm:
        raise HTTPException(404, "Permissão não encontrada")
    alteracoes: dict[str, str] = {}
    if body.nome is not None and body.nome.strip() != perm.nome:
        perm.nome = body.nome.strip()
        alteracoes["nome"] = perm.nome
    if body.ativo is not None and body.ativo != perm.ativo:
        perm.ativo = body.ativo
        alteracoes["ativo"] = "ativo" if perm.ativo else "inativo"
    if not alteracoes:
        raise HTTPException(400, "Nenhuma alteração informada")
    registrar_log(
        db, solicitante.id, "permissao", perm.id, "editar_permissao",
        alteracoes, request=request,
    )
    db.commit()
    db.refresh(perm)
    return perm


@router.put("/permissoes/{permissao_id}/perfis", response_model=PermissaoOut)
def definir_perfis_da_permissao(
    permissao_id: int,
    body: PerfilPermissoesIn,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "configurar perfis de permissão")
    perm = db.get(Permissao, permissao_id)
    if not perm:
        raise HTTPException(404, "Permissão não encontrada")
    ids = sorted(set(body.perfil_ids))
    existentes = set(db.scalars(select(Perfil.id).where(Perfil.id.in_(ids))).all())
    if set(ids) - existentes:
        raise HTTPException(404, "Há perfis inexistentes na lista")
    perm.perfis = [db.get(Perfil, i) for i in ids]
    db.flush()
    registrar_log(
        db, solicitante.id, "permissao", perm.id, "definir_perfis",
        {"perfil_ids": ids}, request=request,
    )
    db.commit()
    db.refresh(perm)
    return perm


# ----------------------------------------------------------------------------- #
# Unidades
# ----------------------------------------------------------------------------- #


@router.post("/unidades", response_model=UnidadeOut)
def criar_unidade(
    body: UnidadeCreate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "criar unidades")
    sigla = body.sigla.strip().upper()
    nome = body.nome.strip()
    if not sigla or len(sigla) > 20:
        raise HTTPException(400, "Informe uma sigla válida (até 20 caracteres)")
    if len(nome) < 3:
        raise HTTPException(400, "Informe o nome da unidade")
    if db.query(Unidade).filter(Unidade.sigla == sigla, Unidade.unidade_pai_id == body.unidade_pai_id).first():
        raise HTTPException(409, "Sigla de unidade já cadastrada para esta unidade-pai")
    if body.unidade_pai_id and not db.get(Unidade, body.unidade_pai_id):
        raise HTTPException(404, "Unidade-pai não encontrada")
    unidade = Unidade(
        nome=nome, sigla=sigla, unidade_pai_id=body.unidade_pai_id, ativo=body.ativo
    )
    db.add(unidade)
    db.flush()
    for esp_id in body.especialidade_ids:
        if db.get(Especialidade, esp_id):
            db.add(UnidadeEspecialidade(unidade_id=unidade.id, especialidade_id=esp_id))
    registrar_log(
        db, solicitante.id, "unidade", unidade.id, "criar_unidade",
        {"sigla": sigla, "nome": nome, "pai": body.unidade_pai_id}, request=request,
    )
    db.commit()
    return _serializar_unidade(db, unidade)


@router.patch("/unidades/{unidade_id}", response_model=UnidadeOut)
def editar_unidade(
    unidade_id: int,
    body: UnidadeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "editar unidades")
    unidade = db.get(Unidade, unidade_id)
    if not unidade:
        raise HTTPException(404, "Unidade não encontrada")
    alteracoes: dict[str, str] = {}

    if body.sigla is not None:
        sigla = body.sigla.strip().upper()
        if not sigla or len(sigla) > 20:
            raise HTTPException(400, "Informe uma sigla válida (até 20 caracteres)")
        if sigla != unidade.sigla and db.query(Unidade).filter(Unidade.sigla == sigla, Unidade.unidade_pai_id == unidade.unidade_pai_id).first():
            raise HTTPException(409, "Sigla de unidade já cadastrada para esta unidade-pai")
        unidade.sigla = sigla
        alteracoes["sigla"] = sigla

    if body.nome is not None:
        if len(body.nome.strip()) < 3:
            raise HTTPException(400, "Informe o nome da unidade")
        unidade.nome = body.nome.strip()
        alteracoes["nome"] = unidade.nome

    if "unidade_pai_id" in body.model_fields_set:
        novo_pai = body.unidade_pai_id
        if novo_pai == unidade.id:
            raise HTTPException(400, "Uma unidade não pode ser pai dela mesma")
        if novo_pai:
            if not db.get(Unidade, novo_pai):
                raise HTTPException(404, "Unidade-pai não encontrada")
            if novo_pai in _descendentes(db, unidade.id):
                raise HTTPException(400, "Não é possível mover para uma unidade descendente")
        # verificar se a sigla já existe no novo pai
        if db.query(Unidade).filter(Unidade.sigla == unidade.sigla, Unidade.unidade_pai_id == novo_pai).first():
            raise HTTPException(409, "Sigla de unidade já cadastrada para esta unidade-pai")
        unidade.unidade_pai_id = novo_pai
        alteracoes["pai"] = str(novo_pai)

    if body.ativo is not None and body.ativo != unidade.ativo:
        unidade.ativo = body.ativo
        alteracoes["ativo"] = "ativo" if unidade.ativo else "inativo"

    if body.especialidade_ids is not None:
        ids = sorted(set(body.especialidade_ids))
        unidade.especialidades = [
            e for e in unidade.especialidades if e.especialidade_id in ids
        ]
        existentes = {e.especialidade_id for e in unidade.especialidades}
        novos = [i for i in ids if i not in existentes and db.get(Especialidade, i)]
        for esp_id in novos:
            unidade.especialidades.append(
                UnidadeEspecialidade(unidade_id=unidade.id, especialidade_id=esp_id)
            )
        alteracoes["especialidades"] = str(len(ids))

    if not alteracoes:
        raise HTTPException(400, "Nenhuma alteração informada")
    registrar_log(
        db, solicitante.id, "unidade", unidade.id, "editar_unidade",
        alteracoes, request=request,
    )
    db.commit()
    return _serializar_unidade(db, unidade)


def _descendentes(db: Session, unidade_id: int) -> list[int]:
    """IDs de todas as filhas (recursivo) da unidade — evita ciclos no organograma."""
    ids: list[int] = []
    fronteira = [unidade_id]
    while fronteira:
        atual = fronteira.pop()
        filhos = db.scalars(
            select(Unidade.id).where(Unidade.unidade_pai_id == atual)
        ).all()
        for f in filhos:
            ids.append(f)
            fronteira.append(f)
    return ids


# ----------------------------------------------------------------------------- #
# Órgãos
# ----------------------------------------------------------------------------- #


@router.get("/orgaos", response_model=list[OrgaoOut])
def listar_orgaos(
    db: Session = Depends(get_db), solicitante: Usuario = Depends(get_current_user)
):
    _nivel(solicitante, 5, "acessar o cadastro de órgãos")
    return db.scalars(select(Orgao).order_by(Orgao.nome)).all()


@router.post("/orgaos", response_model=OrgaoOut)
def criar_orgao(
    body: OrgaoCreate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "criar órgãos")
    nome = body.nome.strip()
    if len(nome) < 2:
        raise HTTPException(400, "Informe o nome do órgão")
    if db.query(Orgao).filter(Orgao.nome.ilike(nome)).first():
        raise HTTPException(409, "Órgão já cadastrado")
    orgao = Orgao(nome=nome)
    db.add(orgao)
    db.flush()
    registrar_log(
        db, solicitante.id, "orgao", orgao.id, "criar_orgao", {"nome": nome},
        request=request,
    )
    db.commit()
    db.refresh(orgao)
    return orgao


@router.patch("/orgaos/{orgao_id}", response_model=OrgaoOut)
def editar_orgao(
    orgao_id: int,
    body: OrgaoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 6, "editar órgãos")
    orgao = db.get(Orgao, orgao_id)
    if not orgao:
        raise HTTPException(404, "Órgão não encontrado")
    alteracoes: dict[str, str] = {}
    if body.nome is not None and body.nome.strip() != orgao.nome:
        nome = body.nome.strip()
        if len(nome) < 2:
            raise HTTPException(400, "Informe o nome do órgão")
        if db.query(Orgao).filter(Orgao.nome.ilike(nome)).first():
            raise HTTPException(409, "Órgão já cadastrado")
        orgao.nome = nome
        alteracoes["nome"] = nome
    if body.ativo is not None and body.ativo != orgao.ativo:
        orgao.ativo = body.ativo
        alteracoes["ativo"] = "ativo" if orgao.ativo else "inativo"
    if not alteracoes:
        raise HTTPException(400, "Nenhuma alteração informada")
    registrar_log(
        db, solicitante.id, "orgao", orgao.id, "editar_orgao", alteracoes,
        request=request,
    )
    db.commit()
    db.refresh(orgao)
    return orgao


# ----------------------------------------------------------------------------- #
# Usuários
# ----------------------------------------------------------------------------- #


@router.post("/usuarios", response_model=UsuarioOut)
def criar_usuario(
    body: UsuarioAdminCreate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 5, "cadastrar usuários")
    if len(body.nome.strip()) < 3:
        raise HTTPException(400, "Informe o nome completo")
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "E-mail inválido")
    if db.query(Usuario).filter(Usuario.email == email).first():
        raise HTTPException(409, "E-mail já cadastrado")
    cpf = _cpf_digitos(body.cpf)
    if not cpf:
        raise HTTPException(400, "O CPF é obrigatório no cadastro")
    if db.query(Usuario).filter(Usuario.cpf == cpf).first():
        raise HTTPException(409, "CPF já cadastrado")
    if len(body.senha) < 6:
        raise HTTPException(400, "A senha deve ter ao menos 6 caracteres")
    perfil = _validar_perfil(db, body.perfil_id)
    tipo_usuario = _validar_tipo_usuario(body.tipo_usuario)
    _validar_externo_perfil(perfil, tipo_usuario)
    _validar_orgao_id(db, body.orgao_id)
    _validar_permissao_ids(db, body.permissao_ids)
    vinculos = [] if tipo_usuario == "externo" else _validar_vinculos(db, body.vinculos)
    if tipo_usuario == "servidor" and not vinculos:
        raise HTTPException(400, "Usuário DF-LEGAL precisa de ao menos um vínculo funcional")

    usuario = Usuario(
        nome=body.nome.strip(),
        email=email,
        cpf=cpf,
        senha_hash=hash_senha(body.senha),
        perfil=perfil,
        ativo=body.ativo,
        telefone=(body.telefone or "").strip() or None,
        matricula=(body.matricula or "").strip() or None,
        tipo_usuario=tipo_usuario,
        orgao_id=body.orgao_id,
    )
    db.add(usuario)
    db.flush()
    usuario.vinculos.extend(vinculos)
    for pid in body.permissao_ids:
        db.add(UsuarioPermissao(usuario_id=usuario.id, permissao_id=pid))
    registrar_log(
        db, solicitante.id, "usuario", usuario.id, "criar_usuario",
        {"nome": usuario.nome, "email": email, "perfil": perfil.codigo,
         "tipo_usuario": tipo_usuario, "vinculos": len(vinculos),
         "permissao_ids": body.permissao_ids},
        request=request,
    )
    db.commit()
    return _serializar_usuario(db, usuario)


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
def editar_usuario(
    usuario_id: int,
    body: UsuarioAdminUpdate,
    request: Request,
    db: Session = Depends(get_db),
    solicitante: Usuario = Depends(get_current_user),
):
    _nivel(solicitante, 5, "editar usuários")
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado")
    alteracoes: dict[str, str] = {}

    if body.nome is not None:
        if len(body.nome.strip()) < 3:
            raise HTTPException(400, "Informe o nome completo")
        usuario.nome = body.nome.strip()
        alteracoes["nome"] = usuario.nome

    if body.email is not None:
        email = body.email.strip().lower()
        if not EMAIL_RE.match(email):
            raise HTTPException(400, "E-mail inválido")
        outro = db.query(Usuario).filter(
            Usuario.email == email, Usuario.id != usuario.id
        ).first()
        if outro:
            raise HTTPException(409, "E-mail já cadastrado para outro usuário")
        usuario.email = email
        alteracoes["email"] = email

    if body.cpf is not None or "cpf" in body.model_fields_set:
        raise HTTPException(400, "O CPF é imutável após o cadastro")

    if body.senha:
        if len(body.senha) < 6:
            raise HTTPException(400, "A senha deve ter ao menos 6 caracteres")
        usuario.senha_hash = hash_senha(body.senha)
        alteracoes["senha"] = "alterada"

    if body.perfil_id is not None and body.perfil_id != usuario.perfil_id:
        perfil = _validar_perfil(db, body.perfil_id)
        tipo_usuario = _validar_tipo_usuario(usuario.tipo_usuario)
        _validar_externo_perfil(perfil, tipo_usuario)
        usuario.perfil = perfil
        alteracoes["perfil"] = perfil.codigo

    if body.ativo is not None and body.ativo != usuario.ativo:
        usuario.ativo = body.ativo
        alteracoes["ativo"] = "ativo" if usuario.ativo else "inativo"

    if body.tipo_usuario is not None and body.tipo_usuario != usuario.tipo_usuario:
        tipo_usuario = _validar_tipo_usuario(body.tipo_usuario)
        if tipo_usuario == "externo":
            _validar_externo_perfil(usuario.perfil, tipo_usuario)
        if tipo_usuario == "servidor" and not usuario.vinculos:
            raise HTTPException(
                400, "Usuário DF-LEGAL precisa de ao menos um vínculo funcional"
            )
        usuario.tipo_usuario = tipo_usuario
        alteracoes["tipo_usuario"] = tipo_usuario

    if "telefone" in body.model_fields_set:
        telefone = (body.telefone or "").strip() or None
        if telefone != usuario.telefone:
            usuario.telefone = telefone
            alteracoes["telefone"] = telefone or "—"

    if "matricula" in body.model_fields_set:
        matricula = (body.matricula or "").strip() or None
        if matricula != usuario.matricula:
            usuario.matricula = matricula
            alteracoes["matricula"] = matricula or "—"

    if "orgao_id" in body.model_fields_set:
        _validar_orgao_id(db, body.orgao_id)
        if body.orgao_id != usuario.orgao_id:
            usuario.orgao_id = body.orgao_id
            alteracoes["orgao"] = str(body.orgao_id or "—")

    if body.vinculos is not None:
        vinculos = _validar_vinculos(db, body.vinculos)
        usuario.vinculos = vinculos
        alteracoes["vinculos"] = str(len(vinculos))

    if body.permissao_ids is not None:
        _validar_permissao_ids(db, body.permissao_ids)
        usuario.permissoes = [
            db.get(Permissao, i) for i in sorted(set(body.permissao_ids))
        ]
        alteracoes["permissao_ids"] = str(len(body.permissao_ids))

    if not alteracoes:
        raise HTTPException(400, "Nenhuma alteração informada")
    registrar_log(
        db, solicitante.id, "usuario", usuario.id, "editar_usuario",
        alteracoes, request=request,
    )
    db.commit()
    return _serializar_usuario(db, usuario)