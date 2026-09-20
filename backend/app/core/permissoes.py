"""Perfis e permissões (Fase B).

Permissões podem vir do perfil (perfil_permissoes) ou de concessão direta ao
usuário (usuario_permissoes) — ex.: dar 'caixa_ouvidorias' a um atendente.
"""

from sqlalchemy.orm import Session

from app.models.models import Usuario


def usuario_tem_permissao(db: Session, usuario: Usuario, codigo: str) -> bool:
    return codigo in usuario.permissao_codigos