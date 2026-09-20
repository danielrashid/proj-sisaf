"""Fase B — origem, PFO, caixa de ouvidorias e permissões

Revision ID: d2e5f9a1c4b8
Revises: c1d0e9a8b7f6
Create Date: 2026-09-18

Regras aplicadas:
- codigo de OS por origem (OUV/PFO/SEI/ECP), backfill dos registros existentes;
- hierarquia de unidades (unidade_pai_id) e evento doc>unidade (caixa/ouvidoria);
- ProgramacaoFiscal (documento pai, nasce emitido);
- permissões separadas de perfil (PerfilPermissao/UsuarioPermissao);
- os_auditores: retornado_em (desvincula da pasta) e fechado_em (pasta PFO).
"""

import datetime

import sqlalchemy as sa
from alembic import op

revision = "d2e5f9a1c4b8"
down_revision = "c1d0e9a8b7f6"
branch_labels = None
depends_on = None

SIGLAS_ESPECIAIS = {"SEINT": "SNT", "UFOPE": "UFO"}


def _letra(ano: int) -> str:
    return chr(ord("A") + (ano - 2026))


def _backfill_codigo(bind) -> None:
    unidades = dict(bind.execute(sa.text("select id, sigla from unidades")).fetchall())

    primeiro_vinculo: dict[int, str | None] = {}
    for uid, und in bind.execute(
        sa.text(
            "select u.id, v.unidade_id from usuarios u "
            "join vinculos_funcionais v on v.usuario_id = u.id "
            "where v.ativo order by v.id"
        )
    ).fetchall():
        if uid not in primeiro_vinculo:
            primeiro_vinculo[uid] = unidades.get(und)

    ano = datetime.date.today().year
    letra = _letra(ano)
    linhas = bind.execute(
        sa.text("select id, origem, criado_por_id from ordens_servico order by id")
    ).fetchall()
    for os_id, origem, criador_id in linhas:
        if origem == "ouvidoria":
            prefixo, largura, com_sigla = "OUV", 6, False
        elif origem == "programacao":
            prefixo, largura, com_sigla = "PFO", 3, True
        elif origem == "sei":
            prefixo, largura, com_sigla = "SEI", 6, True
        else:
            prefixo, largura, com_sigla = "ECP", 6, True

        sigla_raw = primeiro_vinculo.get(criador_id)
        sigla = (
            SIGLAS_ESPECIAIS.get(sigla_raw, sigla_raw) if sigla_raw else None
        )
        if com_sigla and not sigla:
            com_sigla = False

        padrao = f"{prefixo}-{letra}-%"
        if com_sigla:
            padrao = f"{prefixo}-{letra}-%-{sigla}"
        seq = (
            bind.execute(
                sa.text("select count(*) from ordens_servico where codigo like :p"),
                {"p": padrao},
            ).fetchone()[0]
            + 1
        )
        base = f"{prefixo}-{letra}-{seq:0{largura}d}"
        codigo = f"{base}-{sigla}" if com_sigla else base
        bind.execute(
            sa.text("update ordens_servico set codigo = :c where id = :i"),
            {"c": codigo, "i": os_id},
        )


def upgrade() -> None:
    op.add_column(
        "unidades", sa.Column("unidade_pai_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_unidades_pai", "unidades", "unidades",
        ["unidade_pai_id"], ["id"],
    )

    op.add_column(
        "ordens_servico",
        sa.Column("codigo", sa.String(40), nullable=True),
    )
    op.create_index(
        "uq_ordens_servico_codigo",
        "ordens_servico",
        ["codigo"],
        unique=True,
    )
    op.add_column(
        "ordens_servico",
        sa.Column("fundamentacao_legal", sa.Text(), nullable=True),
    )
    op.add_column(
        "ordens_servico",
        sa.Column("caixa_estado", sa.String(40), nullable=True),
    )
    op.add_column(
        "ordens_servico",
        sa.Column("unidade_responsavel_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "ordens_servico", sa.Column("pfo_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_os_unidade_responsavel", "ordens_servico", "unidades",
        ["unidade_responsavel_id"], ["id"],
    )

    op.add_column(
        "os_auditores",
        sa.Column("retornado_em", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "os_auditores", sa.Column("fechado_em", sa.DateTime(), nullable=True)
    )

    op.create_table(
        "programacoes_fiscais",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("codigo", sa.String(40), nullable=False),
        sa.Column("fundamentacao_legal", sa.Text(), nullable=False),
        sa.Column("tema", sa.String(200), nullable=False),
        sa.Column("ra", sa.String(80), nullable=True),
        sa.Column("raio_geo", sa.Numeric(8, 1), nullable=False),
        sa.Column("unidade_id", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("criado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("criado_em", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_programacoes_codigo", "programacoes_fiscais", ["codigo"]
    )
    op.create_foreign_key(
        "fk_os_pfo", "ordens_servico", "programacoes_fiscais",
        ["pfo_id"], ["id"],
    )

    op.create_table(
        "permissoes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("codigo", sa.String(60), nullable=False),
        sa.Column("nome", sa.String(120), nullable=False),
    )
    op.create_unique_constraint("uq_permissoes_codigo", "permissoes", ["codigo"])

    op.create_table(
        "perfil_permissoes",
        sa.Column("perfil_id", sa.Integer(), sa.ForeignKey("perfis.id"), primary_key=True),
        sa.Column("permissao_id", sa.Integer(), sa.ForeignKey("permissoes.id"), primary_key=True),
    )
    op.create_table(
        "usuario_permissoes",
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), primary_key=True),
        sa.Column("permissao_id", sa.Integer(), sa.ForeignKey("permissoes.id"), primary_key=True),
    )

    op.create_table(
        "os_unidade_eventos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("os_id", sa.Integer(), sa.ForeignKey("ordens_servico.id"), nullable=False),
        sa.Column("unidade_id", sa.Integer(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("papel", sa.String(30), nullable=False),
        sa.Column("criado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("criado_em", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    bind = op.get_bind()
    _backfill_codigo(bind)


def downgrade() -> None:
    op.drop_table("os_unidade_eventos")
    op.drop_table("usuario_permissoes")
    op.drop_table("perfil_permissoes")
    op.drop_table("permissoes")
    op.drop_table("programacoes_fiscais")

    op.drop_column("os_auditores", "fechado_em")
    op.drop_column("os_auditores", "retornado_em")

    op.drop_constraint("fk_os_pfo", "ordens_servico", type_="foreignkey")
    op.drop_constraint("fk_os_unidade_responsavel", "ordens_servico", type_="foreignkey")
    op.drop_column("ordens_servico", "pfo_id")
    op.drop_column("ordens_servico", "unidade_responsavel_id")
    op.drop_column("ordens_servico", "caixa_estado")
    op.drop_column("ordens_servico", "fundamentacao_legal")
    op.drop_index("uq_ordens_servico_codigo", table_name="ordens_servico")
    op.drop_column("ordens_servico", "codigo")

    op.drop_constraint("fk_unidades_pai", "unidades", type_="foreignkey")
    op.drop_column("unidades", "unidade_pai_id")