"""Admin — cadastros (usuários, unidades, permissões) configuráveis

Revision ID: e4d2f9b6a8c1
Revises: d2e5f9a1c4b8
Create Date: 2026-09-18

Regras aplicadas:
- permissões passam a ter ativo/inativo (base de permissões pelo admin).
"""

import sqlalchemy as sa
from alembic import op

revision = "e4d2f9b6a8c1"
down_revision = "d2e5f9a1c4b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "permissoes",
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("permissoes", "ativo")