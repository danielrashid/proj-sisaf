"""orgaos + campos adicionais de usuario (telefone, matricula, tipo_usuario, orgao)

Revision ID: b3e9c2a1d4f7
Revises: 4f6a8c2d1e9b
Create Date: 2026-09-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3e9c2a1d4f7'
down_revision: Union[str, None] = '4f6a8c2d1e9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'orgaos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('ativo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('criado_em', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('nome', name='ux_orgaos_nome'),
    )

    op.add_column('usuarios', sa.Column('telefone', sa.String(30), nullable=True))
    op.add_column('usuarios', sa.Column('matricula', sa.String(30), nullable=True))
    op.add_column(
        'usuarios',
        sa.Column(
            'tipo_usuario',
            sa.String(20),
            server_default='servidor',
            nullable=False,
        ),
    )
    op.add_column('usuarios', sa.Column('orgao_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_usuarios_orgao_id', 'usuarios', 'orgaos', ['orgao_id'], ['id']
    )
    op.create_index('ix_usuarios_orgao_id', 'usuarios', ['orgao_id'])


def downgrade() -> None:
    op.drop_index('ix_usuarios_orgao_id', 'usuarios')
    op.drop_constraint('fk_usuarios_orgao_id', 'usuarios', type_='foreignkey')
    op.drop_column('usuarios', 'orgao_id')
    op.drop_column('usuarios', 'tipo_usuario')
    op.drop_column('usuarios', 'matricula')
    op.drop_column('usuarios', 'telefone')
    op.drop_table('orgaos')