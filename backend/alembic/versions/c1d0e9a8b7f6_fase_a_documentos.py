"""fase A: catalogo de tipos de documento, status de documento e tramite

Revision ID: c1d0e9a8b7f6
Revises: f8a3c1d2e9b7
Create Date: 2026-09-18 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d0e9a8b7f6'
down_revision: Union[str, None] = 'f8a3c1d2e9b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NOVOS_TIPOS_ACAO = (
    "embargo",
    "intimacao_demolitoria",
    "infracao_teo",
    "laudo_descumprimento_embargo",
    "laudo_habitese",
    "relatorio_acao_fiscal",
    "relatorio_interno",
    "relatorio_operacional",
    "relatorio_pre_operacional",
    "termo_constatacao_infracao",
    "termo_constatacao_irregularidade",
    "termo_morador_situacao_rua",
    "termo_retencao_volume",
)

# chave, nome, categoria, prefixo, numero_do_tablet, usa_auto_infracao,
# usa_medida, usa_itens_apreensao, usa_morador_sit_rua, ativo, ordem
TIPOS_DOCUMENTO = (
    ("auto_infracao", "Auto de Infração", "auto", None, True, True, False, False, False, True, 1),
    ("infracao_teo", "Auto de Infração por TEO", "auto", None, True, True, False, False, False, True, 2),
    ("interdicao", "Auto de Interdição", "auto", None, True, False, True, False, False, True, 3),
    ("embargo", "Auto de Embargo", "auto", None, True, False, True, False, False, True, 4),
    ("intimacao_demolitoria", "Intimação Demolitória", "auto", None, True, False, True, False, False, True, 5),
    ("notificacao", "Notificação", "auto", None, True, False, False, False, False, True, 6),
    ("apreensao", "Auto de Apreensão", "auto", None, True, False, False, True, False, True, 7),
    ("termo_constatacao_irregularidade", "Termo de Constatação de Irregularidade", "termo", "TIR", False, False, False, False, False, True, 8),
    ("termo_constatacao_infracao", "Termo de Constatação de Infração", "termo", "TIF", False, False, False, False, False, True, 9),
    ("termo_retencao_volume", "Termo de Retenção de Volume", "termo", "TRV", False, False, False, True, False, True, 10),
    ("termo_morador_situacao_rua", "Termo de Morador em Situação de Rua", "termo", "TMR", False, False, False, False, True, True, 11),
    ("laudo_descumprimento_embargo", "Laudo de Descumprimento de Embargo", "laudo", "LDE", False, False, False, False, False, True, 12),
    ("laudo_habitese", "Laudo de Habite-se", "laudo", "LHB", False, False, False, False, False, True, 13),
    ("relatorio_acao_fiscal", "Relatório de Ação Fiscal", "relatorio", "REL", False, False, False, False, False, True, 14),
    ("relatorio_pre_operacional", "Relatório Pré-operacional", "relatorio", "REL", False, False, False, False, False, True, 15),
    ("relatorio_operacional", "Relatório Operacional", "relatorio", "REL", False, False, False, False, False, True, 16),
    ("relatorio_interno", "Relatório Interno", "relatorio", "REL", False, False, False, False, False, True, 17),
    ("relatorio_tecnico", "Relatório Técnico (legado)", "relatorio", None, False, False, False, False, False, False, 18),
    ("outro", "Outro (legado)", "relatorio", None, False, False, False, False, False, False, 19),
)


def upgrade() -> None:
    for valor in NOVOS_TIPOS_ACAO:
        op.execute(f"ALTER TYPE tipo_acao ADD VALUE IF NOT EXISTS '{valor}'")

    op.create_table(
        "tipos_documento",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("chave", sa.String(length=60), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column(
            "categoria",
            sa.Enum("auto", "termo", "laudo", "relatorio", name="categoria_documento"),
            nullable=False,
        ),
        sa.Column("prefixo", sa.String(length=10), nullable=True),
        sa.Column("numero_do_tablet", sa.Boolean(), nullable=False),
        sa.Column("usa_auto_infracao", sa.Boolean(), nullable=False),
        sa.Column("usa_medida", sa.Boolean(), nullable=False),
        sa.Column("usa_itens_apreensao", sa.Boolean(), nullable=False),
        sa.Column("usa_morador_sit_rua", sa.Boolean(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chave"),
    )

    op.create_table(
        "tramites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("acao_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("autorizado_por_id", sa.Integer(), nullable=True),
        sa.Column("acao", sa.String(length=60), nullable=False),
        sa.Column("de_status", sa.String(length=40), nullable=True),
        sa.Column("para_status", sa.String(length=40), nullable=True),
        sa.Column("justificativa", sa.Text(), nullable=True),
        sa.Column("dados", sa.JSON(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["acao_id"], ["acoes_fiscais.id"], ),
        sa.ForeignKeyConstraint(["autorizado_por_id"], ["usuarios.id"], ),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tramites_acao_id", "tramites", ["acao_id"])
    op.create_index("ix_tramites_criado_em", "tramites", ["criado_em"])

    op.create_table(
        "itens_apreensao",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("acao_id", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(length=200), nullable=False),
        sa.Column("quantidade", sa.String(length=60), nullable=True),
        sa.Column("custodiante", sa.String(length=150), nullable=True),
        sa.Column("local_guarda", sa.String(length=150), nullable=True),
        sa.ForeignKeyConstraint(["acao_id"], ["acoes_fiscais.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_itens_apreensao_acao_id", "itens_apreensao", ["acao_id"])

    op.create_table(
        "termo_morador_sit_rua",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("acao_id", sa.Integer(), nullable=False),
        sa.Column("nome_completo", sa.String(length=150), nullable=False),
        sa.Column("documento", sa.String(length=30), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=True),
        sa.Column("endereco_habitual", sa.String(length=200), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["acao_id"], ["acoes_fiscais.id"], ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("acao_id"),
    )

    op.add_column(
        "acoes_fiscais",
        sa.Column("tipo_documento_id", sa.Integer(), nullable=True),
    )
    sa.Enum(
        "rascunho", "emitido", "aguardando_avaliacao", "devolvido", "juntado",
        name="status_documento",
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "mantida", "liberada", "cumprida",
        name="medida_status",
    ).create(op.get_bind(), checkfirst=True)
    op.add_column(
        "acoes_fiscais",
        sa.Column(
            "status_documento",
            sa.Enum("rascunho", "emitido", "aguardando_avaliacao", "devolvido", "juntado", name="status_documento"),
            nullable=False,
            server_default="rascunho",
        ),
    )
    op.add_column(
        "acoes_fiscais",
        sa.Column("codigo_documento", sa.String(length=60), nullable=True),
    )
    op.add_column(
        "acoes_fiscais",
        sa.Column(
            "medida_status",
            sa.Enum("mantida", "liberada", "cumprida", name="medida_status"),
            nullable=True,
        ),
    )
    op.add_column("acoes_fiscais", sa.Column("justificativa", sa.Text(), nullable=True))
    op.add_column("acoes_fiscais", sa.Column("dados_edicao_pendente", sa.JSON(), nullable=True))
    op.add_column("acoes_fiscais", sa.Column("emitido_em", sa.DateTime(), nullable=True))
    op.add_column("acoes_fiscais", sa.Column("juntado_em", sa.DateTime(), nullable=True))
    op.create_foreign_key(
        "fk_acoes_fiscais_tipo_documento_id",
        "acoes_fiscais",
        "tipos_documento",
        ["tipo_documento_id"],
        ["id"],
    )
    op.create_index("uq_acoes_codigo_documento", "acoes_fiscais", ["codigo_documento"], unique=True)

    tipos = sa.table(
        "tipos_documento",
        sa.column("chave", sa.String),
        sa.column("nome", sa.String),
        sa.column("categoria", sa.Enum("auto", "termo", "laudo", "relatorio", name="categoria_documento")),
        sa.column("prefixo", sa.String),
        sa.column("numero_do_tablet", sa.Boolean),
        sa.column("usa_auto_infracao", sa.Boolean),
        sa.column("usa_medida", sa.Boolean),
        sa.column("usa_itens_apreensao", sa.Boolean),
        sa.column("usa_morador_sit_rua", sa.Boolean),
        sa.column("ativo", sa.Boolean),
        sa.column("ordem", sa.Integer),
    )
    op.bulk_insert(tipos, [
        {
            "chave": c, "nome": n, "categoria": cat, "prefixo": p,
            "numero_do_tablet": t, "usa_auto_infracao": ai, "usa_medida": m,
            "usa_itens_apreensao": it, "usa_morador_sit_rua": mor,
            "ativo": at, "ordem": o,
        }
        for (c, n, cat, p, t, ai, m, it, mor, at, o) in TIPOS_DOCUMENTO
    ])

    op.execute(
        sa.text(
            "UPDATE acoes_fiscais SET tipo_documento_id = ("
            "SELECT t.id FROM tipos_documento t WHERE t.chave = acoes_fiscais.tipo::text)"
        )
    )
    op.execute(
        sa.text("UPDATE acoes_fiscais SET status_documento = 'emitido' WHERE status_documento = 'rascunho'")
    )


def downgrade() -> None:
    op.drop_index("uq_acoes_codigo_documento", table_name="acoes_fiscais")
    op.drop_constraint("fk_acoes_fiscais_tipo_documento_id", "acoes_fiscais", type_="foreignkey")
    op.drop_column("acoes_fiscais", "juntado_em")
    op.drop_column("acoes_fiscais", "emitido_em")
    op.drop_column("acoes_fiscais", "dados_edicao_pendente")
    op.drop_column("acoes_fiscais", "justificativa")
    op.drop_column("acoes_fiscais", "medida_status")
    op.drop_column("acoes_fiscais", "codigo_documento")
    op.drop_column("acoes_fiscais", "status_documento")
    op.drop_column("acoes_fiscais", "tipo_documento_id")
    op.drop_table("termo_morador_sit_rua")
    op.drop_table("itens_apreensao")
    op.drop_table("tramites")
    op.drop_table("tipos_documento")
    # Valores de enum tipo_acao não podem ser removidos (limitação do PostgreSQL).