"""Guia Autos: Região Administrativa (RA) e filtros por documento

Revision ID: 4f6a8c2d1e9b
Revises: e4d2f9b6a8c1
Create Date: 2026-09-20

Regras aplicadas:
- catálogo `regioes` (33 RAs do DF) — o tablet manda `id_regiao` na ação fiscal;
- FK nullable `id_regiao` em `acoes_fiscais` (nem toda ação tem RA preenchida
  no tablet; a busca geo cruza lat/long com a região);
- GET /acoes/minhas passa a suportar filtros por categoria/categoria_documento,
  tipo_documento_id, data (de/até), id_regiao, status_documento e texto (q).
"""

from alembic import op
import sqlalchemy as sa

revision = "4f6a8c2d1e9b"
down_revision = "e4d2f9b6a8c1"
branch_labels = None
depends_on = None

# 33 RAs do Distrito Federal (ordem oficial).
REGIOES = [
    ("Plano Piloto", "Plano Piloto"),
    ("Gama", "Gama"),
    ("Taguatinga", "Taguatinga"),
    ("Brazlândia", "Brazlândia"),
    ("Sobradinho", "Sobradinho"),
    ("Planaltina", "Planaltina"),
    ("Paranoá", "Paranoá"),
    ("Núcleo Bandeirante", "Núcleo Bandeirante"),
    ("Ceilândia", "Ceilândia"),
    ("Guará", "Guará"),
    ("Cruzeiro", "Cruzeiro"),
    ("Samambaia", "Samambaia"),
    ("Santa Maria", "Santa Maria"),
    ("São Sebastião", "São Sebastião"),
    ("Recanto das Emas", "Recanto das Emas"),
    ("Lago Sul", "Lago Sul"),
    ("Riacho Fundo", "Riacho Fundo"),
    ("Lago Norte", "Lago Norte"),
    ("Candangolândia", "Candangolândia"),
    ("Águas Claras", "Águas Claras"),
    ("Riacho Fundo II", "Riacho Fundo II"),
    ("Sudoeste/Octogonal", "Sudoeste/Octogonal"),
    ("Varjão", "Varjão"),
    ("Park Way", "Park Way"),
    ("SCIA/Estrutural", "SCIA/Estrutural"),
    ("Sobradinho II", "Sobradinho II"),
    ("Jardim Botânico", "Jardim Botânico"),
    ("Itapoã", "Itapoã"),
    ("SIA", "SIA"),
    ("Vicente Pires", "Vicente Pires"),
    ("Fercal", "Fercal"),
    ("Sol Nascente/Pôr do Sol", "Sol Nascente/Pôr do Sol"),
    ("Arniqueira", "Arniqueira"),
]


def upgrade() -> None:
    op.create_table(
        "regioes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("sigla", sa.String(20), nullable=True),
    )
    op.create_unique_constraint("uq_regioes_nome", "regioes", ["nome"])

    regioes = sa.table(
        "regioes",
        sa.column("nome", sa.String),
        sa.column("sigla", sa.String),
    )
    op.bulk_insert(
        regioes,
        [
            {"nome": nome, "sigla": f"RA{i:02d}"}
            for i, (nome, _) in enumerate(REGIOES, start=1)
        ],
    )

    op.add_column(
        "acoes_fiscais",
        sa.Column("id_regiao", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_acoes_fiscais_id_regiao",
        "acoes_fiscais",
        "regioes",
        ["id_regiao"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_acoes_fiscais_id_regiao", "acoes_fiscais", type_="foreignkey"
    )
    op.drop_column("acoes_fiscais", "id_regiao")
    op.drop_table("regioes")
