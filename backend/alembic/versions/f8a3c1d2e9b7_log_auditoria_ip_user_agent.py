"""adiciona ip_address e user_agent no log_auditoria

Revision ID: f8a3c1d2e9b7
Revises: e7f2a4b6c8d0
Create Date: 2026-09-17 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f8a3c1d2e9b7'
down_revision: Union[str, None] = 'e7f2a4b6c8d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('log_auditoria', sa.Column('ip_address', sa.String(45), nullable=True))
    op.add_column('log_auditoria', sa.Column('user_agent', sa.String(250), nullable=True))
    op.create_index('ix_log_auditoria_criado_em', 'log_auditoria', ['criado_em'])
    op.create_index('ix_log_auditoria_usuario_id', 'log_auditoria', ['usuario_id'])
    op.create_index('ix_log_auditoria_entidade', 'log_auditoria', ['entidade'])


def downgrade() -> None:
    op.drop_index('ix_log_auditoria_entidade', 'log_auditoria')
    op.drop_index('ix_log_auditoria_usuario_id', 'log_auditoria')
    op.drop_index('ix_log_auditoria_criado_em', 'log_auditoria')
    op.drop_column('log_auditoria', 'user_agent')
    op.drop_column('log_auditoria', 'ip_address')
