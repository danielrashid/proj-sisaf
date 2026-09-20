from app.database import SessionLocal
from app.models.models import (
    Perfil,
    PerfilPermissao,
    Permissao,
    UsuarioPermissao,
)
from sqlalchemy import func, select

db = SessionLocal()
print("perfil_permissoes:", db.execute(select(func.count()).select_from(PerfilPermissao)).scalar())
print("usuario_permissoes:", db.execute(select(func.count()).select_from(UsuarioPermissao)).scalar())
perm = db.query(Permissao).filter_by(codigo="caixa_ouvidorias").first()
print("permissao caixa_ouvidorias id:", perm.id if perm else None, "ativo:", perm.ativo if perm else None)
if perm:
    print("  perfis:", [(p.codigo) for p in perm.perfis])
adm = db.query(Perfil).filter_by(codigo="admin").first()
print("admin id:", adm.id, "permissoes:", [(p.codigo) for p in adm.permissoes])
