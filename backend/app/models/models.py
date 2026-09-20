import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrigemOS(str, enum.Enum):
    ouvidoria = "ouvidoria"
    excepcional = "excepcional"
    sei = "sei"
    programacao = "programacao"


class CaixaEstado(str, enum.Enum):
    na_caixa = "na_caixa"
    distribuida = "distribuida"
    aguardando_qualidade = "aguardando_qualidade"
    devolvida_ouvidoria = "devolvida_ouvidoria"


class StatusOS(str, enum.Enum):
    rascunho = "rascunho"
    criada = "criada"
    vinculada = "vinculada"
    em_execucao = "em_execucao"
    devolvida = "devolvida"
    concluida = "concluida"
    arquivada = "arquivada"
    desarquivada = "desarquivada"
    cancelada = "cancelada"


class TipoAcao(str, enum.Enum):
    auto_infracao = "auto_infracao"
    infracao_teo = "infracao_teo"
    notificacao = "notificacao"
    interdicao = "interdicao"
    embargo = "embargo"
    intimacao_demolitoria = "intimacao_demolitoria"
    apreensao = "apreensao"
    termo_constatacao_irregularidade = "termo_constatacao_irregularidade"
    termo_constatacao_infracao = "termo_constatacao_infracao"
    termo_retencao_volume = "termo_retencao_volume"
    termo_morador_situacao_rua = "termo_morador_situacao_rua"
    laudo_descumprimento_embargo = "laudo_descumprimento_embargo"
    laudo_habitese = "laudo_habitese"
    relatorio_acao_fiscal = "relatorio_acao_fiscal"
    relatorio_pre_operacional = "relatorio_pre_operacional"
    relatorio_operacional = "relatorio_operacional"
    relatorio_interno = "relatorio_interno"
    relatorio_tecnico = "relatorio_tecnico"
    outro = "outro"


class CategoriaDocumento(str, enum.Enum):
    auto = "auto"
    termo = "termo"
    laudo = "laudo"
    relatorio = "relatorio"


class StatusDocumento(str, enum.Enum):
    rascunho = "rascunho"
    emitido = "emitido"
    aguardando_avaliacao = "aguardando_avaliacao"
    devolvido = "devolvido"
    juntado = "juntado"


class MedidaStatus(str, enum.Enum):
    mantida = "mantida"
    liberada = "liberada"
    cumprida = "cumprida"


class StatusAI(str, enum.Enum):
    lavrado = "lavrado"
    encaminhado = "encaminhado"
    julgado = "julgado"
    anulado = "anulado"
    arquivado = "arquivado"


class StatusTributario(str, enum.Enum):
    pendente = "pendente"
    enviado = "enviado"
    pago = "pago"
    nao_pago = "nao_pago"
    cancelado = "cancelado"


class Perfil(Base):
    __tablename__ = "perfis"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nivel: Mapped[int] = mapped_column(Integer, default=1)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="perfil")
    permissoes: Mapped[list["Permissao"]] = relationship(
        secondary="perfil_permissoes", back_populates="perfis"
    )


class Permissao(Base):
    __tablename__ = "permissoes"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(60), unique=True)
    nome: Mapped[str] = mapped_column(String(120))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    perfis: Mapped[list["Perfil"]] = relationship(
        secondary="perfil_permissoes", back_populates="permissoes"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary="usuario_permissoes", back_populates="permissoes"
    )

    @property
    def perfil_ids(self) -> list[int]:
        return sorted(p.id for p in self.perfis)

    @property
    def usuario_ids(self) -> list[int]:
        return sorted(u.id for u in self.usuarios)


class PerfilPermissao(Base):
    __tablename__ = "perfil_permissoes"
    perfil_id: Mapped[int] = mapped_column(
        ForeignKey("perfis.id"), primary_key=True
    )
    permissao_id: Mapped[int] = mapped_column(
        ForeignKey("permissoes.id"), primary_key=True
    )


class UsuarioPermissao(Base):
    __tablename__ = "usuario_permissoes"
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), primary_key=True
    )
    permissao_id: Mapped[int] = mapped_column(
        ForeignKey("permissoes.id"), primary_key=True
    )


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    cpf: Mapped[str | None] = mapped_column(String(11), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(150), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    pesquisa_ilimitada: Mapped[bool] = mapped_column(Boolean, default=False)
    perfil_id: Mapped[int] = mapped_column(ForeignKey("perfis.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    perfil: Mapped["Perfil"] = relationship(back_populates="usuarios")
    vinculos: Mapped[list["VinculoFuncional"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    permissoes: Mapped[list["Permissao"]] = relationship(
        secondary="usuario_permissoes", back_populates="usuarios"
    )

    @property
    def permissao_codigos(self) -> list[str]:
        codigos = {p.codigo for p in self.perfil.permissoes}
        codigos.update(p.codigo for p in self.permissoes)
        return sorted(codigos)


class Unidade(Base):
    __tablename__ = "unidades"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    sigla: Mapped[str] = mapped_column(String(20), unique=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    unidade_pai_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades.id"), nullable=True
    )

    pai: Mapped["Unidade | None"] = relationship(
        foreign_keys=[unidade_pai_id], remote_side=[id]
    )
    filhas: Mapped[list["Unidade"]] = relationship(
        foreign_keys=[unidade_pai_id], back_populates="pai"
    )
    especialidades: Mapped[list["UnidadeEspecialidade"]] = relationship(
        back_populates="unidade", cascade="all, delete-orphan"
    )
    vinculos: Mapped[list["VinculoFuncional"]] = relationship(back_populates="unidade")


class Especialidade(Base):
    __tablename__ = "especialidades"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    sigla: Mapped[str] = mapped_column(String(20), unique=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    unidades: Mapped[list["UnidadeEspecialidade"]] = relationship(
        back_populates="especialidade"
    )


class UnidadeEspecialidade(Base):
    __tablename__ = "unidades_especialidades"
    id: Mapped[int] = mapped_column(primary_key=True)
    unidade_id: Mapped[int] = mapped_column(ForeignKey("unidades.id"))
    especialidade_id: Mapped[int] = mapped_column(ForeignKey("especialidades.id"))
    __table_args__ = (UniqueConstraint("unidade_id", "especialidade_id"),)

    unidade: Mapped["Unidade"] = relationship(back_populates="especialidades")
    especialidade: Mapped["Especialidade"] = relationship(back_populates="unidades")


class VinculoFuncional(Base):
    __tablename__ = "vinculos_funcionais"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    unidade_id: Mapped[int] = mapped_column(ForeignKey("unidades.id"))
    especialidade_id: Mapped[int] = mapped_column(ForeignKey("especialidades.id"))
    cargo: Mapped[str] = mapped_column(String(100))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    usuario: Mapped["Usuario"] = relationship(back_populates="vinculos")
    unidade: Mapped["Unidade"] = relationship(back_populates="vinculos")
    especialidade: Mapped["Especialidade"] = relationship()

    @property
    def unidade_sigla(self) -> str:
        return self.unidade.sigla

    @property
    def especialidade_sigla(self) -> str:
        return self.especialidade.sigla


class ProgramacaoFiscal(Base):
    __tablename__ = "programacoes_fiscais"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    fundamentacao_legal: Mapped[str] = mapped_column(Text)
    tema: Mapped[str] = mapped_column(String(200))
    ra: Mapped[str | None] = mapped_column(String(80), nullable=True)
    raio_geo: Mapped[float] = mapped_column(Numeric(8, 1), default=100.0)
    unidade_id: Mapped[int] = mapped_column(ForeignKey("unidades.id"))
    criado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    unidade: Mapped["Unidade"] = relationship()
    criado_por: Mapped["Usuario"] = relationship()
    ordenes: Mapped[list["OrdemServico"]] = relationship(back_populates="pfo")

    @property
    def unidade_sigla(self) -> str:
        return self.unidade.sigla

    @property
    def criado_por_nome(self) -> str:
        return self.criado_por.nome


class OsUnidadeEvento(Base):
    __tablename__ = "os_unidade_eventos"
    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"))
    unidade_id: Mapped[int] = mapped_column(ForeignKey("unidades.id"))
    papel: Mapped[str] = mapped_column(String(30), default="responsavel")
    criado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    os: Mapped["OrdemServico"] = relationship(back_populates="unidade_eventos")
    unidade: Mapped["Unidade"] = relationship()


class OrdemServico(Base):
    __tablename__ = "ordens_servico"
    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True, autoincrement=False)
    codigo: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True)
    origem: Mapped[OrigemOS] = mapped_column(Enum(OrigemOS, name="origem_os"))
    tema: Mapped[str] = mapped_column(String(200))
    ra: Mapped[str | None] = mapped_column(String(80), nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(14), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    raio_geo: Mapped[float] = mapped_column(Numeric(8, 1), default=50.0)
    prazo_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    fundamentacao_legal: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[StatusOS] = mapped_column(
        Enum(StatusOS, name="status_os"), default=StatusOS.criada
    )
    caixa_estado: Mapped[str | None] = mapped_column(String(40), nullable=True)
    unidade_responsavel_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades.id"), nullable=True
    )
    pfo_id: Mapped[int | None] = mapped_column(
        ForeignKey("programacoes_fiscais.id"), nullable=True
    )
    criado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    frentes: Mapped[list["OSFrente"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )
    auditores: Mapped[list["OSAuditor"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )
    acoes: Mapped[list["AcaoFiscal"]] = relationship(back_populates="os")
    pfo: Mapped["ProgramacaoFiscal | None"] = relationship(back_populates="ordenes")
    unidade_responsavel: Mapped["Unidade | None"] = relationship()
    unidade_eventos: Mapped[list["OsUnidadeEvento"]] = relationship(
        back_populates="os", cascade="all, delete-orphan"
    )

    @property
    def responsavel_sigla(self) -> str | None:
        return self.unidade_responsavel.sigla if self.unidade_responsavel else None


class OSFrente(Base):
    __tablename__ = "os_frentes"
    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"))
    especialidade_id: Mapped[int] = mapped_column(ForeignKey("especialidades.id"))
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = (UniqueConstraint("os_id", "especialidade_id"),)

    os: Mapped["OrdemServico"] = relationship(back_populates="frentes")
    especialidade: Mapped["Especialidade"] = relationship()


class OSAuditor(Base):
    __tablename__ = "os_auditores"
    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    frente_id: Mapped[int | None] = mapped_column(
        ForeignKey("os_frentes.id"), nullable=True
    )
    atribuido_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    data_atribuicao: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    retornado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fechado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("os_id", "usuario_id", "frente_id"),)

    os: Mapped["OrdemServico"] = relationship(back_populates="auditores")
    usuario: Mapped["Usuario"] = relationship(foreign_keys=[usuario_id])
    frente: Mapped["OSFrente | None"] = relationship()


class TipoDocumento(Base):
    __tablename__ = "tipos_documento"
    id: Mapped[int] = mapped_column(primary_key=True)
    chave: Mapped[str] = mapped_column(String(60), unique=True)
    nome: Mapped[str] = mapped_column(String(120))
    categoria: Mapped[CategoriaDocumento] = mapped_column(
        Enum(CategoriaDocumento, name="categoria_documento")
    )
    prefixo: Mapped[str | None] = mapped_column(String(10), nullable=True)
    numero_do_tablet: Mapped[bool] = mapped_column(Boolean, default=False)
    usa_auto_infracao: Mapped[bool] = mapped_column(Boolean, default=False)
    usa_medida: Mapped[bool] = mapped_column(Boolean, default=False)
    usa_itens_apreensao: Mapped[bool] = mapped_column(Boolean, default=False)
    usa_morador_sit_rua: Mapped[bool] = mapped_column(Boolean, default=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class AcaoFiscal(Base):
    __tablename__ = "acoes_fiscais"
    id: Mapped[int] = mapped_column(primary_key=True)
    os_id: Mapped[int] = mapped_column(ForeignKey("ordens_servico.id"))
    auditor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    tipo: Mapped[TipoAcao] = mapped_column(Enum(TipoAcao, name="tipo_acao"))
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    tipo_documento_id: Mapped[int | None] = mapped_column(
        ForeignKey("tipos_documento.id"), nullable=True
    )
    status_documento: Mapped[StatusDocumento] = mapped_column(
        Enum(StatusDocumento, name="status_documento"),
        default=StatusDocumento.rascunho,
    )
    codigo_documento: Mapped[str | None] = mapped_column(String(60), nullable=True)
    medida_status: Mapped[MedidaStatus | None] = mapped_column(
        Enum(MedidaStatus, name="medida_status"), nullable=True
    )
    justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    dados_edicao_pendente: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    emitido_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    juntado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    os: Mapped["OrdemServico"] = relationship(back_populates="acoes")
    auditor: Mapped["Usuario"] = relationship()
    tipo_documento: Mapped["TipoDocumento | None"] = relationship()
    auto_infracao: Mapped["AutoInfracao | None"] = relationship(
        back_populates="acao", uselist=False, cascade="all, delete-orphan"
    )
    tramites: Mapped[list["Tramite"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan"
    )
    itens_apreensao: Mapped[list["ItensApreensao"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan"
    )
    termo_morador: Mapped["TermoMoradorSitRua | None"] = relationship(
        back_populates="acao_documento", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def auditor_nome(self) -> str:
        return self.auditor.nome


class AutoInfracao(Base):
    __tablename__ = "autos_infracao"
    id: Mapped[int] = mapped_column(primary_key=True)
    acao_id: Mapped[int] = mapped_column(ForeignKey("acoes_fiscais.id"), unique=True)
    cnpj: Mapped[str | None] = mapped_column(String(14), nullable=True)
    razao_social: Mapped[str | None] = mapped_column(String(200), nullable=True)
    natureza: Mapped[str] = mapped_column(String(200))
    item_legislacao: Mapped[str | None] = mapped_column(String(200), nullable=True)
    valor_total: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    prazo_pagamento: Mapped[date | None] = mapped_column(Date, nullable=True)
    prazo_recurso: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[StatusAI] = mapped_column(
        Enum(StatusAI, name="status_ai"), default=StatusAI.lavrado
    )
    status_tributario: Mapped[StatusTributario] = mapped_column(
        Enum(StatusTributario, name="status_tributario"),
        default=StatusTributario.pendente,
    )
    reincidente: Mapped[bool] = mapped_column(Boolean, default=False)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    acao: Mapped["AcaoFiscal"] = relationship(back_populates="auto_infracao")
    reincidencias: Mapped[list["Reincidencia"]] = relationship(
        back_populates="auto", cascade="all, delete-orphan"
    )


class Reincidencia(Base):
    __tablename__ = "reincidencias"
    id: Mapped[int] = mapped_column(primary_key=True)
    ai_id: Mapped[int] = mapped_column(ForeignKey("autos_infracao.id"))
    cnpj: Mapped[str]
    natureza: Mapped[str] = mapped_column(String(200))
    numero_ocorrencia: Mapped[int] = mapped_column(Integer, default=1)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    auto: Mapped["AutoInfracao"] = relationship(back_populates="reincidencias")


class Tramite(Base):
    __tablename__ = "tramites"
    id: Mapped[int] = mapped_column(primary_key=True)
    acao_id: Mapped[int] = mapped_column(ForeignKey("acoes_fiscais.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    autorizado_por_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True
    )
    acao: Mapped[str] = mapped_column(String(60))
    de_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    para_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    dados: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    documento: Mapped["AcaoFiscal"] = relationship(back_populates="tramites")
    usuario: Mapped["Usuario"] = relationship(foreign_keys=[usuario_id])
    autorizado_por: Mapped["Usuario | None"] = relationship(
        foreign_keys=[autorizado_por_id]
    )

    @property
    def autorizado_por_nome(self) -> str | None:
        return self.autorizado_por.nome if self.autorizado_por else None

    @property
    def usuario_nome(self) -> str:
        return self.usuario.nome


class ItensApreensao(Base):
    __tablename__ = "itens_apreensao"
    id: Mapped[int] = mapped_column(primary_key=True)
    acao_id: Mapped[int] = mapped_column(ForeignKey("acoes_fiscais.id"))
    descricao: Mapped[str] = mapped_column(String(200))
    quantidade: Mapped[str | None] = mapped_column(String(60), nullable=True)
    custodiante: Mapped[str | None] = mapped_column(String(150), nullable=True)
    local_guarda: Mapped[str | None] = mapped_column(String(150), nullable=True)

    documento: Mapped["AcaoFiscal"] = relationship(back_populates="itens_apreensao")


class TermoMoradorSitRua(Base):
    __tablename__ = "termo_morador_sit_rua"
    id: Mapped[int] = mapped_column(primary_key=True)
    acao_id: Mapped[int] = mapped_column(
        ForeignKey("acoes_fiscais.id"), unique=True
    )
    nome_completo: Mapped[str] = mapped_column(String(150))
    documento: Mapped[str | None] = mapped_column(String(30), nullable=True)
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    endereco_habitual: Mapped[str | None] = mapped_column(String(200), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    acao_documento: Mapped["AcaoFiscal"] = relationship(back_populates="termo_morador")


class Estabelecimento(Base):
    __tablename__ = "estabelecimentos"
    id: Mapped[int] = mapped_column(primary_key=True)
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)
    razao_social: Mapped[str] = mapped_column(String(200))
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LogAuditoria(Base):
    __tablename__ = "log_auditoria"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True
    )
    entidade: Mapped[str] = mapped_column(String(80))
    entidade_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    acao: Mapped[str] = mapped_column(String(120))
    dados: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(250), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CamadaGeo(Base):
    __tablename__ = "camadas_geo"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    tipo: Mapped[str] = mapped_column(String(40))  # lotes_registrados | lotes_ocupados | ra
    geojson: Mapped[dict] = mapped_column(JSON)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())