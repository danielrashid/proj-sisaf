export type Origem = "ouvidoria" | "excepcional" | "sei" | "programacao";
export type StatusOS =
  | "rascunho"
  | "criada"
  | "vinculada"
  | "em_execucao"
  | "devolvida"
  | "concluida"
  | "arquivada"
  | "desarquivada"
  | "cancelada";
export type TipoAcao =
  | "auto_infracao"
  | "infracao_teo"
  | "notificacao"
  | "interdicao"
  | "embargo"
  | "intimacao_demolitoria"
  | "apreensao"
  | "termo_constatacao_irregularidade"
  | "termo_constatacao_infracao"
  | "termo_retencao_volume"
  | "termo_morador_situacao_rua"
  | "laudo_descumprimento_embargo"
  | "laudo_habitese"
  | "relatorio_acao_fiscal"
  | "relatorio_pre_operacional"
  | "relatorio_operacional"
  | "relatorio_interno"
  | "relatorio_tecnico"
  | "outro";
export type StatusAI = "lavrado" | "encaminhado" | "julgado" | "anulado" | "arquivado";
export type StatusTrib = "pendente" | "enviado" | "pago" | "nao_pago" | "cancelado";
export type StatusDocumento =
  | "rascunho"
  | "emitido"
  | "aguardando_avaliacao"
  | "devolvido"
  | "juntado";
export type MedidaStatus = "mantida" | "liberada" | "cumprida";
export type CategoriaDocumento = "auto" | "termo" | "laudo" | "relatorio";

export const ORIGENS: Record<Origem, string> = {
  ouvidoria: "Ouvidoria",
  excepcional: "Excepcional",
  sei: "Processo SEI",
  programacao: "Programação fiscal",
};

export const ORIGEM_SIGLA: Record<Origem, string> = {
  ouvidoria: "OUV",
  excepcional: "ECP",
  sei: "SEI",
  programacao: "PFO",
};

export type CaixaEstado =
  | "na_caixa"
  | "aguardando_qualidade"
  | "devolvida_ouvidoria"
  | "distribuida";

export const CAIXA_ESTADO_LABEL: Record<CaixaEstado, string> = {
  na_caixa: "Na caixa",
  aguardando_qualidade: "Aguardando qualidade",
  devolvida_ouvidoria: "Devolvida à Ouvidoria",
  distribuida: "Distribuída",
};

export const CAIXA_ESTADO_COLORS: Record<CaixaEstado, string> = {
  na_caixa: "bg-gold/15 text-gold-dark ring-gold/40",
  aguardando_qualidade: "bg-amber-100 text-amber-800 ring-amber-300",
  devolvida_ouvidoria: "bg-sky-100 text-sky-800 ring-sky-300",
  distribuida: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  rascunho: "Rascunho",
  criada: "Criada",
  vinculada: "Vinculada",
  em_execucao: "Em execução",
  devolvida: "Devolvida",
  concluida: "Concluída",
  arquivada: "Arquivada",
  desarquivada: "Desarquivada",
  cancelada: "Cancelada",
};

export const STATUS_OS_VALUES: StatusOS[] = [
  "rascunho",
  "criada",
  "vinculada",
  "em_execucao",
  "devolvida",
  "concluida",
  "arquivada",
  "desarquivada",
  "cancelada",
];

export const TRANSICOES: Record<StatusOS, StatusOS[]> = {
  rascunho: ["criada", "cancelada"],
  criada: ["vinculada", "cancelada"],
  vinculada: ["em_execucao", "cancelada"],
  em_execucao: ["devolvida", "cancelada"],
  devolvida: ["em_execucao", "concluida", "vinculada", "cancelada"],
  concluida: ["arquivada"],
  arquivada: ["desarquivada"],
  desarquivada: ["em_execucao", "cancelada"],
  cancelada: [],
};

export const STATUS_TRANSICAO_LABEL: Record<StatusOS, string> = {
  rascunho: "Manter como rascunho",
  criada: "Registrar a OS",
  vinculada: "Vincular documento",
  em_execucao: "Colocar em execução",
  devolvida: "Devolver / retornar",
  concluida: "Concluir",
  arquivada: "Arquivar",
  desarquivada: "Desarquivar",
  cancelada: "Cancelar",
};

export const TIPO_ACAO_LABEL: Record<TipoAcao, string> = {
  auto_infracao: "Auto de Infração",
  infracao_teo: "Auto de Infração por TEO",
  notificacao: "Notificação",
  interdicao: "Auto de Interdição",
  embargo: "Auto de Embargo",
  intimacao_demolitoria: "Intimação Demolitória",
  apreensao: "Auto de Apreensão",
  termo_constatacao_irregularidade: "Termo de Constatação de Irregularidade",
  termo_constatacao_infracao: "Termo de Constatação de Infração",
  termo_retencao_volume: "Termo de Retenção de Volume",
  termo_morador_situacao_rua: "Termo de Morador em Situação de Rua",
  laudo_descumprimento_embargo: "Laudo de Descumprimento de Embargo",
  laudo_habitese: "Laudo de Habite-se",
  relatorio_acao_fiscal: "Relatório de Ação Fiscal",
  relatorio_pre_operacional: "Relatório Pré-operacional",
  relatorio_operacional: "Relatório Operacional",
  relatorio_interno: "Relatório Interno",
  relatorio_tecnico: "Relatório Técnico (legado)",
  outro: "Outro",
};

export const STATUS_DOCUMENTO_LABEL: Record<StatusDocumento, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  aguardando_avaliacao: "Aguardando avaliação",
  devolvido: "Devolvido",
  juntado: "Juntado ao processo",
};

export const STATUS_DOCUMENTO_COLORS: Record<StatusDocumento, string> = {
  rascunho: "bg-slate-100 text-slate-600 ring-slate-300",
  emitido: "bg-brand-100 text-brand-800 ring-brand-300",
  aguardando_avaliacao: "bg-gold/15 text-gold-dark ring-gold/40",
  devolvido: "bg-rose-100 text-rose-800 ring-rose-300",
  juntado: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

export const MEDIDA_STATUS_LABEL: Record<MedidaStatus, string> = {
  mantida: "Mantida",
  liberada: "Liberada",
  cumprida: "Cumprida",
};

export const CATEGORIA_DOCUMENTO_LABEL: Record<CategoriaDocumento, string> = {
  auto: "Auto",
  termo: "Termo",
  laudo: "Laudo",
  relatorio: "Relatório",
};

export const CATEGORIA_DOCUMENTO_COLORS: Record<CategoriaDocumento, string> = {
  auto: "bg-rose-100 text-rose-800 ring-rose-300",
  termo: "bg-indigo-100 text-indigo-800 ring-indigo-300",
  laudo: "bg-teal-100 text-teal-800 ring-teal-300",
  relatorio: "bg-sky-100 text-sky-800 ring-sky-300",
};

export const STATUS_AI_LABEL: Record<StatusAI, string> = {
  lavrado: "Lavrado",
  encaminhado: "Encaminhado",
  julgado: "Julgado",
  anulado: "Anulado",
  arquivado: "Arquivado",
};

export const STATUS_TRIB_LABEL: Record<StatusTrib, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  pago: "Pago",
  nao_pago: "Não pago",
  cancelado: "Cancelado",
};

export interface Perfil {
  id: number;
  nome: string;
  codigo: string;
  nivel: number;
}

export interface Especialidade {
  id: number;
  nome: string;
  sigla: string;
  descricao?: string;
}

export interface UnidadeEspecialidade {
  id: number;
  especialidade: Especialidade;
}

export interface Unidade {
  id: number;
  nome: string;
  sigla: string;
  unidade_pai_id?: number;
  ativo: boolean;
  especialidades: UnidadeEspecialidade[];
}

export interface Permissao {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
  perfil_ids: number[];
  usuario_ids: number[];
}

export interface VinculoAdmin {
  unidade_id: number;
  especialidade_id: number;
  cargo: string;
  ativo: boolean;
}

export interface Vinculo {
  id: number;
  unidade_id: number;
  unidade_sigla: string;
  especialidade_id: number;
  especialidade_sigla: string;
  cargo: string;
  ativo: boolean;
}

export interface Orgao {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  ativo: boolean;
  perfil_id: number;
  pesquisa_ilimitada: boolean;
  telefone?: string;
  matricula?: string;
  tipo_usuario: "servidor" | "externo";
  orgao_id?: number;
  orgao_nome?: string;
  perfil?: Perfil;
  vinculos: Vinculo[];
  permissoes?: string[];
}

export interface AutoInfracao {
  id: number;
  acao_id: number;
  cnpj?: string;
  razao_social?: string;
  natureza: string;
  item_legislacao?: string;
  valor_total?: number;
  prazo_pagamento?: string;
  prazo_recurso?: string;
  status: StatusAI;
  status_tributario: StatusTrib;
  reincidente: boolean;
  observacoes?: string;
}

export interface AutoInfracaoLista extends AutoInfracao {
  os_id: number;
  os_numero: number;
  tema: string;
}

export type TipoDocumento = {
  id: number;
  chave: string;
  nome: string;
  categoria: CategoriaDocumento;
  prefixo?: string;
  numero_do_tablet: boolean;
  usa_auto_infracao: boolean;
  usa_medida: boolean;
  usa_itens_apreensao: boolean;
  usa_morador_sit_rua: boolean;
  ativo: boolean;
  ordem: number;
};

export interface ItensApreensao {
  id: number;
  acao_id: number;
  descricao: string;
  quantidade?: string;
  custodiante?: string;
  local_guarda?: string;
}

export interface TermoMoradorSitRua {
  id: number;
  acao_id: number;
  nome_completo: string;
  documento?: string;
  data_inicio?: string;
  endereco_habitual?: string;
  observacoes?: string;
}

export interface Tramite {
  id: number;
  usuario_id: number;
  usuario_nome?: string;
  autorizado_por_id?: number;
  autorizado_por_nome?: string;
  acao: string;
  de_status?: string;
  para_status?: string;
  justificativa?: string;
  dados?: any;
  criado_em: string;
}

export interface AcaoFiscal {
  id: number;
  os_id: number;
  auditor_id: number;
  auditor_nome?: string;
  tipo: TipoAcao;
  titulo: string;
  descricao?: string;
  latitude?: number;
  longitude?: number;
  id_regiao?: number | null;
  regiao_nome?: string | null;
  status_documento: StatusDocumento;
  codigo_documento?: string;
  medida_status?: MedidaStatus;
  justificativa?: string;
  dados_edicao_pendente?: any;
  emitido_em?: string;
  juntado_em?: string;
  criado_em: string;
  tipo_documento?: TipoDocumento;
  auto_infracao?: AutoInfracao;
  itens_apreensao?: ItensApreensao[];
  termo_morador?: TermoMoradorSitRua;
  tramites?: Tramite[];
}

export interface OSFrente {
  id: number;
  especialidade: Especialidade;
  descricao?: string;
}

export interface OSAuditor {
  id: number;
  usuario_id: number;
  usuario?: Usuario;
  frente_id?: number;
  ativo: boolean;
}

export interface ProgramacaoFiscal {
  id: number;
  codigo: string;
  fundamentacao_legal: string;
  tema: string;
  ra?: string;
  raio_geo: number;
  unidade_id: number;
  unidade_sigla?: string;
  criado_por_id: number;
  criado_por_nome?: string;
  criado_em: string;
}

export interface OrdemServico {
  id: number;
  numero: number;
  codigo?: string;
  origem: Origem;
  tema: string;
  ra?: string;
  cnpj?: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  raio_geo: number;
  prazo_data?: string;
  descricao?: string;
  fundamentacao_legal?: string;
  status: StatusOS;
  caixa_estado?: CaixaEstado;
  unidade_responsavel_id?: number;
  responsavel_sigla?: string;
  pfo_id?: number;
  pfo?: ProgramacaoFiscal;
  criado_em: string;
  frentes: OSFrente[];
  auditores: OSAuditor[];
  acoes: AcaoFiscal[];
}

export type OuvidoriaDecisao = {
  decisao: "devolver_ouvidoria" | "redistribuir";
  auditores: { os_id?: number; usuario_id: number; frente_id?: number }[];
};

export interface ResumoDashboard {
  total: number;
  por_status: Record<string, number>;
  por_especialidade: Record<string, number>;
  por_origem: Record<string, number>;
  vencendo: number;
  autos_ativos: number;
  valor_estimado: number;
}

export interface GeoProxima {
  os_id: number;
  numero: number;
  tema: string;
  status: StatusOS;
  distancia_m: number;
  latitude: number;
  longitude: number;
}

export interface Camada {
  id: number;
  nome: string;
  tipo: string;
  geojson: any;
}

export interface Historico {
  cnpj: string;
  razao_social?: string;
  acoes: AcaoFiscal[];
  autos: AutoInfracao[];
  reincidencias: { id: number; natureza: string; ocorrencia: number }[];
}

export interface RegiaoOut {
  id: number;
  nome: string;
  sigla?: string | null;
}

export interface MinhaAcao extends AcaoFiscal {
  os_numero: number;
  os_tema?: string;
  os_status?: StatusOS;
  regiao_nome?: string | null;
}

export interface BuscaItemOS {
  id: number;
  numero: number;
  tema: string;
  ra?: string;
  cnpj?: string;
  endereco?: string;
  status: StatusOS;
  prazo_data?: string;
}

export interface BuscaItemEstabelecimento {
  id: number;
  cnpj: string;
  razao_social: string;
  endereco?: string;
}

export interface BuscaItemAuto {
  id: number;
  os_id: number;
  os_numero: number;
  cnpj?: string;
  razao_social?: string;
  natureza: string;
  status: StatusAI;
}

export interface BuscaItemUsuario {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  perfil?: string;
}

export interface ResultadoBusca {
  modo: "limitada" | "ilimitada";
  autorizada_ilimitada: boolean;
  os: BuscaItemOS[];
  estabelecimentos: BuscaItemEstabelecimento[];
  autos: BuscaItemAuto[];
  usuarios: BuscaItemUsuario[];
}

export interface LogAuditoria {
  id: number;
  usuario_id?: number;
  entidade: string;
  entidade_id?: number;
  acao: string;
  dados?: any;
  criado_em: string;
}