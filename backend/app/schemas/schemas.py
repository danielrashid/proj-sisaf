from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    CategoriaDocumento,
    MedidaStatus,
    OrigemOS,
    StatusAI,
    StatusDocumento,
    StatusOS,
    StatusTributario,
    TipoAcao,
)


class PerfilOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    codigo: str
    nivel: int


class EspecialidadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    sigla: str
    descricao: str | None = None


class UnidadeEspecialidadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    especialidade: EspecialidadeOut


class UnidadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    sigla: str
    unidade_pai_id: int | None = None
    ativo: bool = True
    especialidades: list[UnidadeEspecialidadeOut] = []


class PermissaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nome: str
    ativo: bool = True
    perfil_ids: list[int] = Field(default_factory=list)
    usuario_ids: list[int] = Field(default_factory=list)


class PermissaoCreate(BaseModel):
    codigo: str
    nome: str


class PermissaoUpdate(BaseModel):
    nome: str | None = None
    ativo: bool | None = None


class PerfilPermissoesIn(BaseModel):
    perfil_ids: list[int] = []


class UnidadeCreate(BaseModel):
    nome: str
    sigla: str
    unidade_pai_id: int | None = None
    ativo: bool = True
    especialidade_ids: list[int] = []


class UnidadeUpdate(BaseModel):
    nome: str | None = None
    sigla: str | None = None
    unidade_pai_id: int | None = None
    ativo: bool | None = None
    especialidade_ids: list[int] | None = None


class VinculoAdminIn(BaseModel):
    unidade_id: int
    especialidade_id: int
    cargo: str
    ativo: bool = True


class UsuarioAdminCreate(BaseModel):
    nome: str
    email: str
    cpf: str | None = None
    senha: str
    perfil_id: int
    ativo: bool = True
    vinculos: list[VinculoAdminIn] = []
    permissao_ids: list[int] = []
    telefone: str | None = None
    matricula: str | None = None
    tipo_usuario: str = "servidor"
    orgao_id: int | None = None


class UsuarioAdminUpdate(BaseModel):
    nome: str | None = None
    email: str | None = None
    cpf: str | None = None
    senha: str | None = None
    perfil_id: int | None = None
    ativo: bool | None = None
    vinculos: list[VinculoAdminIn] | None = None
    permissao_ids: list[int] | None = None
    telefone: str | None = None
    matricula: str | None = None
    tipo_usuario: str | None = None
    orgao_id: int | None = None


class VinculoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    unidade_id: int
    unidade_sigla: str
    especialidade_id: int
    especialidade_sigla: str
    cargo: str
    ativo: bool


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int
    nome: str
    email: str
    cpf: str | None = None
    ativo: bool
    perfil_id: int
    pesquisa_ilimitada: bool = False
    telefone: str | None = None
    matricula: str | None = None
    tipo_usuario: str = "servidor"
    orgao_id: int | None = None
    orgao_nome: str | None = None
    perfil: PerfilOut | None = None
    vinculos: list[VinculoOut] = []
    permissoes: list[str] = Field(default_factory=list, validation_alias="permissao_codigos")


class OrgaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    ativo: bool = True


class OrgaoCreate(BaseModel):
    nome: str


class OrgaoUpdate(BaseModel):
    nome: str | None = None
    ativo: bool | None = None


class LoginIn(BaseModel):
    cpf: str
    senha: str


class PerfilUpdateIn(BaseModel):
    nome: str | None = None
    email: str | None = None
    senha_atual: str | None = None
    senha_nova: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class PesquisaPermissaoIn(BaseModel):
    pesquisa_ilimitada: bool


class OSFrenteIn(BaseModel):
    especialidade_id: int
    descricao: str | None = None


class OSAuditorCreate(BaseModel):
    os_id: int | None = None  # preenchido implicitamente no endpoint
    usuario_id: int
    frente_id: int | None = None


class OSCreate(BaseModel):
    origem: OrigemOS
    tema: str
    ra: str | None = None
    cnpj: str | None = None
    endereco: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    raio_geo: float = 50.0
    prazo_data: date | None = None
    descricao: str | None = None
    frentes: list[OSFrenteIn]
    auditores: list[dict] = []  # [{usuario_id, frente_id?}]
    unidade_responsavel_id: int | None = None
    pfo_id: int | None = None


class OSTransicao(BaseModel):
    status: StatusOS


class OSFrenteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    especialidade: EspecialidadeOut
    descricao: str | None = None


class OSAuditorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    usuario_id: int
    usuario: UsuarioOut | None = None
    frente_id: int | None = None
    ativo: bool


class ProgramacaoFiscalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    fundamentacao_legal: str
    tema: str
    ra: str | None = None
    raio_geo: float
    unidade_id: int
    unidade_sigla: str | None = None
    criado_por_id: int
    criado_por_nome: str | None = None
    criado_em: datetime


class ProgramacaoCreate(BaseModel):
    fundamentacao_legal: str
    tema: str
    ra: str | None = None
    raio_geo: float = 100.0


class OuvidoriaDecisao(BaseModel):
    decisao: str  # devolver_ouvidoria | redistribuir
    auditores: list[OSAuditorCreate] = []


class OrdemServicoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: int
    codigo: str | None = None
    origem: OrigemOS
    tema: str
    ra: str | None = None
    cnpj: str | None = None
    endereco: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    raio_geo: float
    prazo_data: date | None = None
    descricao: str | None = None
    fundamentacao_legal: str | None = None
    status: StatusOS
    caixa_estado: str | None = None
    unidade_responsavel_id: int | None = None
    responsavel_sigla: str | None = None
    pfo_id: int | None = None
    pfo: ProgramacaoFiscalOut | None = None
    criado_em: datetime
    frentes: list[OSFrenteOut] = []
    auditores: list[OSAuditorOut] = []
    acoes: list["AcaoFiscalOut"] = []


class AcaoFiscalCreate(BaseModel):
    tipo: TipoAcao
    titulo: str
    descricao: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    id_regiao: int | None = None


class AutoInfracaoCreate(BaseModel):
    cnpj: str | None = None
    razao_social: str | None = None
    natureza: str
    item_legislacao: str | None = None
    valor_total: float | None = None
    prazo_pagamento: date | None = None
    prazo_recurso: date | None = None
    observacoes: str | None = None


class ItensApreensaoIn(BaseModel):
    descricao: str
    quantidade: str | None = None
    custodiante: str | None = None
    local_guarda: str | None = None


class TermoMoradorSitRuaIn(BaseModel):
    nome_completo: str
    documento: str | None = None
    data_inicio: date | None = None
    endereco_habitual: str | None = None
    observacoes: str | None = None


class RegiaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    sigla: str | None = None


class TipoDocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chave: str
    nome: str
    categoria: CategoriaDocumento
    prefixo: str | None = None
    numero_do_tablet: bool
    usa_auto_infracao: bool
    usa_medida: bool
    usa_itens_apreensao: bool
    usa_morador_sit_rua: bool
    ativo: bool
    ordem: int


class AutoInfracaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    acao_id: int
    cnpj: str | None = None
    razao_social: str | None = None
    natureza: str
    item_legislacao: str | None = None
    valor_total: float | None = None
    prazo_pagamento: date | None = None
    prazo_recurso: date | None = None
    status: StatusAI
    status_tributario: StatusTributario
    reincidente: bool
    observacoes: str | None = None


class AutoInfracaoLista(AutoInfracaoOut):
    os_id: int
    os_numero: int
    tema: str


class TramiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    usuario_id: int
    usuario_nome: str | None = None
    autorizado_por_id: int | None = None
    autorizado_por_nome: str | None = None
    acao: str
    de_status: str | None = None
    para_status: str | None = None
    justificativa: str | None = None
    dados: dict | None = None
    criado_em: datetime


class ItensApreensaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    acao_id: int
    descricao: str
    quantidade: str | None = None
    custodiante: str | None = None
    local_guarda: str | None = None


class TermoMoradorSitRuaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    acao_id: int
    nome_completo: str
    documento: str | None = None
    data_inicio: date | None = None
    endereco_habitual: str | None = None
    observacoes: str | None = None


class AcaoFiscalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    os_id: int
    auditor_id: int
    auditor_nome: str | None = None
    tipo: TipoAcao
    titulo: str
    descricao: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    id_regiao: int | None = None
    regiao_nome: str | None = None
    status_documento: StatusDocumento
    codigo_documento: str | None = None
    medida_status: MedidaStatus | None = None
    justificativa: str | None = None
    dados_edicao_pendente: dict | None = None
    emitido_em: datetime | None = None
    juntado_em: datetime | None = None
    criado_em: datetime
    tipo_documento: TipoDocumentoOut | None = None
    auto_infracao: AutoInfracaoOut | None = None
    itens_apreensao: list[ItensApreensaoOut] = []
    termo_morador: TermoMoradorSitRuaOut | None = None
    tramites: list[TramiteOut] = []


class MinhaAcaoOut(AcaoFiscalOut):
    os_numero: int | None = None
    os_tema: str | None = None
    os_status: StatusOS | None = None


class LogAuditoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    usuario_id: int | None = None
    entidade: str
    entidade_id: int | None = None
    acao: str
    dados: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    criado_em: datetime


class HistoricoEstabelecimento(BaseModel):
    cnpj: str
    razao_social: str | None = None
    acoes: list[AcaoFiscalOut] = []
    autos: list[AutoInfracaoOut] = []
    reincidencias: list[dict] = []


class ResumoDashboard(BaseModel):
    total: int
    por_status: dict[str, int]
    por_especialidade: dict[str, int]
    por_origem: dict[str, int]
    vencendo: int
    autos_ativos: int
    valor_estimado: float


class GeoProxima(BaseModel):
    os_id: int
    numero: int
    tema: str
    status: StatusOS
    distancia_m: float
    latitude: float
    longitude: float


class BuscaOSItem(BaseModel):
    id: int
    numero: int
    tema: str
    ra: str | None = None
    cnpj: str | None = None
    endereco: str | None = None
    status: StatusOS
    prazo_data: date | None = None


class BuscaEstabelecimentoItem(BaseModel):
    id: int
    cnpj: str
    razao_social: str
    endereco: str | None = None


class BuscaAutoItem(BaseModel):
    id: int
    os_id: int
    os_numero: int
    cnpj: str | None = None
    razao_social: str | None = None
    natureza: str
    status: StatusAI


class BuscaUsuarioItem(BaseModel):
    id: int
    nome: str
    cpf: str | None = None
    email: str | None = None
    perfil: str | None = None


class ResultadoBusca(BaseModel):
    modo: str
    autorizada_ilimitada: bool
    os: list[BuscaOSItem] = []
    estabelecimentos: list[BuscaEstabelecimentoItem] = []
    autos: list[BuscaAutoItem] = []
    usuarios: list[BuscaUsuarioItem] = []


OrdemServicoOut.model_rebuild()
AcaoFiscalOut.model_rebuild()