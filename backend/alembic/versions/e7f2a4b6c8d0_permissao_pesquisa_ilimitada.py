"""permissao pesquisa ilimitada

Revision ID: e7f2a4b6c8d0
Revises: 9d56c03d314f
Create Date: 2026-09-16 09:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7f2a4b6c8d0'
down_revision: Union[str, None] = '9d56c03d314f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column(
            'pesquisa_ilimitada',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('usuarios', 'pesquisa_ilimitada')