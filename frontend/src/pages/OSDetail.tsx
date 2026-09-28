import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CornerUpLeft,
  FileWarning,
  FolderDown,
  FolderOpen,
  History,
  MapPin,
  Plus,
  Send,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../lib/auth";
import {
  AcaoFiscal,
  CaixaEstado,
  MedidaStatus,
  OrdemServico,
  ORIGENS,
  ORIGEM_SIGLA,
  StatusOS,
  STATUS_DOCUMENTO_COLORS,
  STATUS_DOCUMENTO_LABEL,
  MEDIDA_STATUS_LABEL,
  CATEGORIA_DOCUMENTO_COLORS,
  CATEGORIA_DOCUMENTO_LABEL,
  CAIXA_ESTADO_COLORS,
  CAIXA_ESTADO_LABEL,
  TipoAcao,
  TipoDocumento,
  RegiaoOut,
} from "../lib/types";
import {
  Badge,
  Btn,
  Card,
  Field,
  Modal,
  STATUS_COLORS,
  StatusOSBadge,
  fmtData,
  fmtDataHora,
  fmtMoeda,
  inputCls,
} from "../components/ui";
import MapView from "../components/MapView";

const TRANSICOES: Record<string, StatusOS[]> = {
  criada: ["vinculada"],
  vinculada: ["em_execucao"],
  em_execucao: ["devolvida"],
  devolvida: ["em_execucao", "concluida", "vinculada"],
  concluida: ["arquivada"],
  arquivada: ["desarquivada"],
  desarquivada: ["em_execucao"],
};

const LABEL_TRANSICAO: Record<string, string> = {
  vincula: "Vincular auditores",
  em_execucao: "Mover para execução",
  devolvida: "Devolver ao gestor",
  concluida: "Concluir OS",
  arquivada: "Arquivar",
  desarquivada: "Desarquivar",
  cancelada: "Cancelar OS",
};

const TRAMITE_LABEL: Record<string, string> = {
  emitir: "Emitido",
  edicao_solicitada: "Edição solicitada",
  edicao_aprovada: "Edição aprovada",
  edicao_rejeitada: "Edição rejeitada",
  juntar: "Juntado ao processo",
};
const TRAMITE_COR: Record<string, string> = {
  emitir: "bg-brand-600",
  edicao_solicitada: "bg-gold",
  edicao_aprovada: "bg-emerald-500",
  edicao_rejeitada: "bg-rose-500",
  juntar: "bg-slate-400",
};

type ItemApreensaoForm = {
  descricao: string;
  quantidade: string;
  custodiante: string;
  local_guarda: string;
};

type FormDoc = {
  tipo: TipoAcao;
  titulo: string;
  descricao: string;
  id_regiao: number | "";
  latitude: string;
  longitude: string;
  cnpj: string;
  razao: string;
  natureza: string;
  itemLegislacao: string;
  valor: string;
  prazoPag: string;
  prazoRec: string;
  medida: MedidaStatus;
  itens: ItemApreensaoForm[];
  morador: {
    nome_completo: string;
    documento: string;
    data_inicio: string;
    endereco_habitual: string;
    observacoes: string;
  };
  justificativa: string;
};

const FALLBACK_TIPOS: Pick<TipoDocumento, "chave" | "nome">[] = [
  { chave: "notificacao", nome: "Notificação" },
  { chave: "interdicao", nome: "Termo de Interdição" },
  { chave: "apreensao", nome: "Auto de Apreensão" },
  { chave: "relatorio_acao_fiscal", nome: "Relatório de Ação Fiscal" },
];

const FORM_VAZIO: FormDoc = {
  tipo: "notificacao",
  titulo: "",
  descricao: "",
  id_regiao: "",
  latitude: "",
  longitude: "",
  cnpj: "",
  razao: "",
  natureza: "",
  itemLegislacao: "",
  valor: "",
  prazoPag: "",
  prazoRec: "",
  medida: "mantida",
  itens: [{ descricao: "", quantidade: "", custodiante: "", local_guarda: "" }],
  morador: {
    nome_completo: "",
    documento: "",
    data_inicio: "",
    endereco_habitual: "",
    observacoes: "",
  },
  justificativa: "",
};

export default function OSDetail() {
  usePageTitle("Detalhes da OS");
  const { id } = useParams();
  const osId = Number(id);
  const { usuario } = useAuth();
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [proximas, setProximas] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<TipoDocumento[]>([]);
  const [regioes, setRegioes] = useState<RegiaoOut[]>([]);
  const [form, setForm] = useState<FormDoc>(FORM_VAZIO);
  const [numeroAuto, setNumeroAuto] = useState("");
  const [erro, setErro] = useState("");

  const [modalAcao, setModalAcao] = useState(false);
  const [modalEmitir, setModalEmitir] = useState(false);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalAvaliar, setModalAvaliar] = useState(false);
  const [docAlvo, setDocAlvo] = useState<AcaoFiscal | null>(null);

  function carregar() {
    api.get<OrdemServico>(`/os/${osId}`).then(setOs).catch(console.error);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    api.get<TipoDocumento[]>("/tipos-documento").then(setCatalog).catch(console.error);
  }, []);

  useEffect(() => {
    api.get<RegiaoOut[]>("/regioes").then(setRegioes).catch(console.error);
  }, []);

  useEffect(() => {
    if (os?.latitude && os?.longitude) {
      api
        .get<any[]>(
          `/geo/os-proximas?latitude=${os.latitude}&longitude=${os.longitude}&raio=${os.raio_geo || 50}`
        )
        .then(setProximas)
        .catch(console.error);
    }
  }, [os?.latitude, os?.longitude, os?.raio_geo]);

  const ehAuditor = useMemo(
    () => os?.auditores.some((a) => a.usuario_id === usuario?.id && a.ativo) ?? false,
    [os, usuario]
  );
  const podeGerir = (usuario?.perfil?.nivel ?? 1) >= 2;
  const podeAvaliar = (usuario?.perfil?.nivel ?? 0) >= 3;

  if (!os)
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <Card className="space-y-3 p-6">
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        </Card>
        <Card className="h-72 animate-pulse bg-slate-100" />
      </div>
    );

  const vencendo =
    os.prazo_data &&
    os.status !== "arquivada" &&
    new Date(os.prazo_data) <= new Date(new Date().getTime() + 3 * 864e5);

  async function transicionar(status: string) {
    if (status === "cancelada") {
      const ok = window.confirm("Cancelar esta OS?");
      if (!ok) return;
    }
    try {
      await api.post(`/os/${osId}/transicao`, { status });
      carregar();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  const transicoes = TRANSICOES[os.status] ?? [];
  const podeAcao = ehAuditor || podeGerir || os.status === "em_execucao";

  function tdDe(doc: AcaoFiscal): TipoDocumento | undefined {
    return (
      doc.tipo_documento ??
      catalog.find((c) => c.chave === doc.tipo)
    );
  }

  function abrirCriar() {
    setForm(
      Object.assign({}, FORM_VAZIO, {
        id_regiao: os?.ra ? regioes.find((r) => r.nome === os.ra)?.id ?? "" : "",
        latitude: os?.latitude != null ? String(os.latitude) : "",
        longitude: os?.longitude != null ? String(os.longitude) : "",
      })
    );
    setErro("");
    setModalAcao(true);
  }

  function abrirEmitir(doc: AcaoFiscal) {
    setDocAlvo(doc);
    setNumeroAuto("");
    setErro("");
    setModalEmitir(true);
  }

  function abrirEdicao(doc: AcaoFiscal) {
    setDocAlvo(doc);
    const ai = doc.auto_infracao;
    setForm({
      tipo: doc.tipo,
      titulo: doc.titulo,
      descricao: doc.descricao ?? "",
      id_regiao: doc.id_regiao ?? "",
      latitude: doc.latitude != null ? String(doc.latitude) : "",
      longitude: doc.longitude != null ? String(doc.longitude) : "",
      cnpj: ai?.cnpj ?? os?.cnpj ?? "",
      razao: ai?.razao_social ?? "",
      natureza: ai?.natureza ?? "",
      itemLegislacao: ai?.item_legislacao ?? "",
      valor: ai?.valor_total != null ? String(ai.valor_total) : "",
      prazoPag: ai?.prazo_pagamento ?? "",
      prazoRec: ai?.prazo_recurso ?? "",
      medida: doc.medida_status ?? "mantida",
      itens:
        doc.itens_apreensao && doc.itens_apreensao.length > 0
          ? doc.itens_apreensao.map((i) => ({
              descricao: i.descricao,
              quantidade: i.quantidade ?? "",
              custodiante: i.custodiante ?? "",
              local_guarda: i.local_guarda ?? "",
            }))
          : [{ descricao: "", quantidade: "", custodiante: "", local_guarda: "" }],
      morador: {
        nome_completo: doc.termo_morador?.nome_completo ?? "",
        documento: doc.termo_morador?.documento ?? "",
        data_inicio: doc.termo_morador?.data_inicio ?? "",
        endereco_habitual: doc.termo_morador?.endereco_habitual ?? "",
        observacoes: doc.termo_morador?.observacoes ?? "",
      },
      justificativa: "",
    });
    setErro("");
    setModalEdicao(true);
  }

  function abrirAvaliar(doc: AcaoFiscal) {
    setDocAlvo(doc);
    setForm({ ...FORM_VAZIO, justificativa: "" });
    setErro("");
    setModalAvaliar(true);
  }

  function setCampo<K extends keyof FormDoc>(k: K, v: FormDoc[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function montarDados(): Record<string, any> {
    const td = catalog.find((c) => c.chave === form.tipo);
    const p: Record<string, any> = {
      tipo: form.tipo,
      titulo: form.titulo,
      descricao: form.descricao.trim() || null,
      id_regiao: form.id_regiao === "" ? null : form.id_regiao,
      latitude:
        form.latitude.trim() !== ""
          ? parseFloat(form.latitude)
          : (os?.latitude ?? null),
      longitude:
        form.longitude.trim() !== ""
          ? parseFloat(form.longitude)
          : (os?.longitude ?? null),
    };
    if (td?.usa_auto_infracao) {
      p.auto_infracao = {
        cnpj: form.cnpj.replace(/\D/g, "") || null,
        razao_social: form.razao.trim() || null,
        natureza: form.natureza,
        item_legislacao: form.itemLegislacao.trim() || null,
        valor_total: form.valor ? parseFloat(form.valor) : null,
        prazo_pagamento: form.prazoPag || null,
        prazo_recurso: form.prazoRec || null,
        observacoes: null,
      };
    }
    if (td?.usa_itens_apreensao) {
      p.itens_apreensao = form.itens
        .filter((i) => i.descricao.trim())
        .map((i) => ({
          descricao: i.descricao.trim(),
          quantidade: i.quantidade.trim() || null,
          custodiante: i.custodiante.trim() || null,
          local_guarda: i.local_guarda.trim() || null,
        }));
    }
    if (td?.usa_morador_sit_rua) {
      p.termo_morador = {
        nome_completo: form.morador.nome_completo,
        documento: form.morador.documento.trim() || null,
        data_inicio: form.morador.data_inicio || null,
        endereco_habitual: form.morador.endereco_habitual.trim() || null,
        observacoes: form.morador.observacoes.trim() || null,
      };
    }
    if (td?.usa_medida) p.medida_status = form.medida;
    return p;
  }

  async function criarAcao(e: FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/os/${osId}/acoes`, montarDados());
      setModalAcao(false);
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function emitirDoc() {
    setErro("");
    if (!docAlvo) return;
    try {
      const td = tdDe(docAlvo);
      await api.post(
        `/acoes/${docAlvo.id}/emitir`,
        td?.numero_do_tablet ? { numero_auto: numeroAuto.trim() } : {}
      );
      setModalEmitir(false);
      setDocAlvo(null);
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!docAlvo) return;
    try {
      const dados = montarDados();
      if (docAlvo.status_documento === "rascunho") {
        await api.put(`/acoes/${docAlvo.id}`, dados);
      } else {
        await api.post(`/acoes/${docAlvo.id}/edicao`, {
          ...dados,
          justificativa: form.justificativa,
        });
      }
      setModalEdicao(false);
      setDocAlvo(null);
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function avaliar(decisao: "aprovar" | "rejeitar") {
    setErro("");
    if (!docAlvo) return;
    try {
      await api.post(`/acoes/${docAlvo.id}/avaliar`, {
        decisao,
        parecer: form.justificativa.trim() || null,
      });
      setModalAvaliar(false);
      setDocAlvo(null);
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function juntar(doc: AcaoFiscal) {
    const ok = window.confirm(
      "Juntar este documento ao processo? A partir daí fica somente leitura."
    );
    if (!ok) return;
    setErro("");
    try {
      await api.post(`/acoes/${doc.id}/juntar`, {});
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function retornarOrigem() {
    const ok = window.confirm(
      "Retornar esta OS à origem? Você será desvinculado(a) dela (as ações fiscais continuam vinculadas a você)."
    );
    if (!ok) return;
    setErro("");
    try {
      await api.post(`/os/${osId}/retornar`, {});
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function fecharPasta() {
    const ok = window.confirm(
      "Fechar sua pasta nesta PFO? Você deixa de acompanhá-la (registro pessoal — não desvincula os demais)."
    );
    if (!ok) return;
    setErro("");
    try {
      await api.post(`/os/${osId}/fechar-pasta`, {});
      carregar();
    } catch (err: any) {
      setErro(err.message);
    }
  }

  function renderCamposExtensao(td: TipoDocumento | undefined) {
    if (!td) return null;
    return (
      <>
        {td.usa_medida && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Situação da medida">
              <select
                value={form.medida}
                onChange={(e) => setCampo("medida", e.target.value as MedidaStatus)}
                className={inputCls}
              >
                {(Object.keys(MEDIDA_STATUS_LABEL) as MedidaStatus[]).map((m) => (
                  <option key={m} value={m}>
                    {MEDIDA_STATUS_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {td.usa_itens_apreensao && (
          <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-indigo-800">
                Itens apreendidos / retidos
              </h4>
              <Btn
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    itens: [
                      ...f.itens,
                      { descricao: "", quantidade: "", custodiante: "", local_guarda: "" },
                    ],
                  }))
                }
              >
                <Plus size={14} /> Item
              </Btn>
            </div>
            {form.itens.map((item, idx) => (
              <div key={idx} className="grid gap-3 rounded-lg border border-indigo-100 bg-white p-3 md:grid-cols-4">
                <Field label="Item">
                  <input
                    value={item.descricao}
                    onChange={(e) =>
                      setForm((f) => {
                        const it = [...f.itens];
                        it[idx] = { ...it[idx], descricao: e.target.value };
                        return { ...f, itens: it };
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Quantidade">
                  <input
                    value={item.quantidade}
                    onChange={(e) =>
                      setForm((f) => {
                        const it = [...f.itens];
                        it[idx] = { ...it[idx], quantidade: e.target.value };
                        return { ...f, itens: it };
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Custodiante">
                  <input
                    value={item.custodiante}
                    onChange={(e) =>
                      setForm((f) => {
                        const it = [...f.itens];
                        it[idx] = { ...it[idx], custodiante: e.target.value };
                        return { ...f, itens: it };
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Local de guarda">
                  <div className="flex gap-2">
                    <input
                      value={item.local_guarda}
                      onChange={(e) =>
                        setForm((f) => {
                          const it = [...f.itens];
                          it[idx] = { ...it[idx], local_guarda: e.target.value };
                          return { ...f, itens: it };
                        })
                      }
                      className={inputCls}
                    />
                    {form.itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
                        }
                        className="shrink-0 rounded-lg border border-slate-200 px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Remover item"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </Field>
              </div>
            ))}
          </div>
        )}
        {td.usa_morador_sit_rua && (
          <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
            <h4 className="text-sm font-semibold text-teal-800">Dados do morador em situação de rua</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome completo">
                <input
                  value={form.morador.nome_completo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morador: { ...f.morador, nome_completo: e.target.value } }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Documento">
                <input
                  value={form.morador.documento}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morador: { ...f.morador, documento: e.target.value } }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Desde (data)">
                <input
                  type="date"
                  value={form.morador.data_inicio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morador: { ...f.morador, data_inicio: e.target.value } }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Endereço habitual / referência">
                <input
                  value={form.morador.endereco_habitual}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morador: { ...f.morador, endereco_habitual: e.target.value } }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Observações">
              <textarea
                value={form.morador.observacoes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, morador: { ...f.morador, observacoes: e.target.value } }))
                }
                rows={2}
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </>
    );
  }

  function renderDoc(a: AcaoFiscal) {
    const td = tdDe(a);
    const ehAutor = a.auditor_id === usuario?.id;
    const podeOperar = ehAutor || podeGerir;
    const nomeTipo = td?.nome ?? a.tipo;
    const corTipo = td ? CATEGORIA_DOCUMENTO_COLORS[td.categoria] : "bg-slate-100 text-slate-600 ring-slate-300";
    const pendente = a.dados_edicao_pendente;
    const regiaoNome =
      a.regiao_nome ?? (a.id_regiao != null ? regioes.find((r) => r.id === a.id_regiao)?.nome : undefined);
    return (
      <div key={a.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge text={nomeTipo} color={corTipo} />
            {td && (
              <Badge
                text={CATEGORIA_DOCUMENTO_LABEL[td.categoria]}
                color="bg-slate-100 text-slate-500 ring-slate-200"
              />
            )}
            <p className="font-medium text-slate-700">{a.titulo}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {a.codigo_documento && (
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                {a.codigo_documento}
              </span>
            )}
            <Badge
              text={STATUS_DOCUMENTO_LABEL[a.status_documento]}
              color={STATUS_DOCUMENTO_COLORS[a.status_documento]}
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {fmtDataHora(a.criado_em)} · {a.auditor_nome}
          {a.emitido_em && a.status_documento !== "rascunho" && ` · Emitido em ${fmtData(a.emitido_em)}`}
        </p>
        {(regiaoNome || a.latitude != null) && (
          <p className="mt-1 text-xs text-slate-400">
            {regiaoNome && <span className="font-medium text-slate-500">{regiaoNome}</span>}
            {a.latitude != null && a.longitude != null && (
              <span> · {a.latitude.toFixed(6)}, {a.longitude.toFixed(6)}</span>
            )}
          </p>
        )}
        {a.descricao && <p className="mt-2 text-sm text-slate-600">{a.descricao}</p>}

        {a.auto_infracao && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <FileWarning size={16} className="text-rose-600" />
              <span className="font-semibold text-rose-700">{a.auto_infracao.natureza}</span>
              {a.auto_infracao.reincidente && (
                <Badge text="REINCIDENTE" color="bg-rose-600 text-white ring-rose-600" />
              )}
              <Badge text={`AI: ${a.auto_infracao.status}`} color={STATUS_COLORS[a.auto_infracao.status]} />
              <Badge
                text={`Tributário: ${a.auto_infracao.status_tributario}`}
                color={STATUS_COLORS[a.auto_infracao.status_tributario]}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>Valor: <strong>{fmtMoeda(a.auto_infracao.valor_total)}</strong></span>
              <span>Pagar até: {fmtData(a.auto_infracao.prazo_pagamento)}</span>
              <span>Impugnar até: {fmtData(a.auto_infracao.prazo_recurso)}</span>
              {a.auto_infracao.cnpj && <span>CNPJ: {a.auto_infracao.cnpj}</span>}
              {a.auto_infracao.cnpj && a.auto_infracao.razao_social && <span>· {a.auto_infracao.razao_social}</span>}
            </div>
          </div>
        )}

        {a.medida_status && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2 py-1 text-xs font-medium text-gold-dark ring-1 ring-inset ring-gold/40">
            Medida: {MEDIDA_STATUS_LABEL[a.medida_status]}
          </span>
        )}

        {a.itens_apreensao && a.itens_apreensao.length > 0 && (
          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-indigo-700">Itens apreendidos / retidos</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {a.itens_apreensao.map((i) => (
                <li key={i.id} className="flex flex-wrap gap-2">
                  <span className="font-medium">{i.descricao}</span>
                  {i.quantidade && <span className="text-slate-500">{i.quantidade}</span>}
                  {i.custodiante && <span className="text-slate-500">· {i.custodiante}</span>}
                  {i.local_guarda && <span className="text-slate-500">· {i.local_guarda}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.termo_morador && (
          <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-teal-700">Morador em situação de rua</p>
            <p className="mt-1 text-slate-700">
              <strong>{a.termo_morador.nome_completo}</strong>
              {a.termo_morador.documento && <span> · {a.termo_morador.documento}</span>}
              {a.termo_morador.data_inicio && <span> · desde {fmtData(a.termo_morador.data_inicio)}</span>}
            </p>
            {a.termo_morador.endereco_habitual && (
              <p className="mt-0.5 text-slate-600">{a.termo_morador.endereco_habitual}</p>
            )}
            {a.termo_morador.observacoes && (
              <p className="mt-0.5 text-slate-500">{a.termo_morador.observacoes}</p>
            )}
          </div>
        )}

        {a.status_documento === "aguardando_avaliacao" && pendente && (
          <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-dark">
            Edição enviada — aguardando avaliação do diretor.
            {pendente.titulo && pendente.titulo !== a.titulo && (
              <> Nova versão do título: <strong>{pendente.titulo}</strong>.</>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {a.status_documento === "rascunho" && podeOperar && (
            <>
              <Btn variant="secondary" onClick={() => abrirEdicao(a)}>
                Editar rascunho
              </Btn>
              <Btn onClick={() => abrirEmitir(a)}>
                <Send size={14} /> Emitir
              </Btn>
            </>
          )}
          {a.status_documento === "emitido" && (
            <>
              {ehAutor && (
                <Btn variant="secondary" onClick={() => abrirEdicao(a)}>
                  Solicitar edição
                </Btn>
              )}
              {podeOperar && (
                <Btn variant="secondary" onClick={() => juntar(a)}>
                  <History size={14} /> Juntar ao processo
                </Btn>
              )}
            </>
          )}
          {a.status_documento === "devolvido" && ehAutor && (
            <Btn variant="secondary" onClick={() => abrirEdicao(a)}>
              Editar e reenviar
            </Btn>
          )}
          {a.status_documento === "aguardando_avaliacao" && podeAvaliar && (
            <Btn onClick={() => abrirAvaliar(a)}>Avaliar edição</Btn>
          )}
          {(a.tramites?.length ?? 0) > 0 && (
            <details className="group ml-auto flex items-center">
              <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
                <span className="inline-flex items-center gap-1">
                  <History size={14} /> Histórico ({a.tramites!.length})
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="mt-2 w-full space-y-2 rounded-lg bg-slate-50 p-3">
                {a.tramites!.map((t) => (
                  <div key={t.id} className="flex gap-2 text-xs text-slate-600">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TRAMITE_COR[t.acao] ?? "bg-slate-400"}`} />
                    <div>
                      <p>
                        <span className="font-medium text-slate-700">
                          {TRAMITE_LABEL[t.acao] ?? t.acao}
                        </span>{" "}
                        {t.de_status && <span className="text-slate-400">({t.de_status} → {t.para_status})</span>}
                        {" "}· {fmtDataHora(t.criado_em)} · {t.usuario_nome}
                        {t.autorizado_por_nome && <span className="text-slate-400"> · autorizada por {t.autorizado_por_nome}</span>}
                      </p>
                      {t.justificativa && <p className="italic text-slate-500">{t.justificativa}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/os" className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <StatusOSBadge status={os.status} />
      </div>

      {vencendo && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={18} />
          Prazo de atendimento {os.prazo_data! <= new Date().toISOString().slice(0, 10) ? "estourado" : "próximo de vencer"} em {fmtData(os.prazo_data)}.
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
                OS #{os.numero}
              </p>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                {os.codigo ?? `${ORIGEM_SIGLA[os.origem]}-…`}
              </span>
              <span className="text-xs text-slate-400">· {ORIGENS[os.origem]}</span>
              {os.caixa_estado && (
                <Badge
                  text={CAIXA_ESTADO_LABEL[os.caixa_estado as CaixaEstado]}
                  color={CAIXA_ESTADO_COLORS[os.caixa_estado as CaixaEstado]}
                />
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">{os.tema}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {os.ra && <span className="flex items-center gap-1"><MapPin size={14} /> RA {os.ra}</span>}
              {os.endereco && <span>{os.endereco}</span>}
              {os.cnpj && <span>CNPJ: {os.cnpj}</span>}
              <span>Prazo: {fmtData(os.prazo_data)}</span>
              <span>Raio geo: {os.raio_geo} m</span>
              {os.responsavel_sigla && <span>Responsável: {os.responsavel_sigla}</span>}
            </div>
            {os.pfo && (
              <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-800">
                  <FolderOpen size={14} /> PFO de referência
                </p>
                <p className="mt-1 font-mono text-xs font-medium text-brand-700">
                  {os.pfo.codigo}
                </p>
                <p className="mt-0.5 text-slate-700">{os.pfo.tema}</p>
                {os.fundamentacao_legal && (
                  <p className="mt-1 text-xs text-slate-500">{os.fundamentacao_legal}</p>
                )}
              </div>
            )}
            {!os.pfo && os.fundamentacao_legal && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wide text-slate-400">Fundamentação legal: </span>
                {os.fundamentacao_legal}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {os.frentes.map((f) => (
                <Badge key={f.id} text={`Módulo ${f.especialidade.sigla}`} color="bg-brand-100 text-brand-800 ring-brand-300" title={f.especialidade.nome} />
              ))}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-slate-400">Criada em {fmtDataHora(os.criado_em)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Fluxo:</span>
          {podeGerir && os.auditores.length === 0 && os.status === "criada" && (
            <Btn variant="secondary" onClick={() => transicionar("vinculada")}>
              {LABEL_TRANSICAO.vinculada}
            </Btn>
          )}
          {transicoes.map((t) => (
            <Btn key={t} onClick={() => transicionar(t)}>
              {LABEL_TRANSICAO[t] ?? t}
            </Btn>
          ))}
          <Btn variant="danger" onClick={() => transicionar("cancelada")}>
            Cancelar
          </Btn>
          {["ouvidoria", "excepcional", "sei"].includes(os.origem) && ehAuditor && (
            <Btn variant="secondary" onClick={retornarOrigem} title="Desvincula você desta OS e devolve ao gestor">
              <CornerUpLeft size={16} /> Retornar à origem
            </Btn>
          )}
          {os.origem === "programacao" && ehAuditor && (
            <Btn variant="secondary" onClick={fecharPasta} title="Fecha sua pasta desta PFO (registro pessoal)">
              <FolderDown size={16} /> Fechar minha pasta
            </Btn>
          )}
          {podeAcao && (
            <Btn variant="secondary" onClick={abrirCriar}>
              <Plus size={16} /> Registrar ação fiscal
            </Btn>
          )}
        </div>
        {erro && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700">Auditores vinculados</h2>
          {os.auditores.filter((a) => a.ativo).map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">{a.usuario?.nome}</p>
              <p className="text-xs text-slate-400">
                {a.usuario?.vinculos.map((v) => `${v.unidade_sigla} · ${v.cargo}`).join(" | ")}
              </p>
              {a.frente_id && (
                <p className="mt-1 text-xs text-brand-800">
                  Frente: {os.frentes.find((f) => f.id === a.frente_id)?.especialidade.sigla}
                </p>
              )}
            </div>
          ))}
          <h2 className="pt-2 text-sm font-semibold text-slate-700">Ações na região (raio {os.raio_geo} m)</h2>
          {proximas.map((p) => (
            <div key={p.os_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <Link to={`/os/${p.os_id}`} className="text-slate-600 hover:text-brand-700">
                OS #{p.numero}
              </Link>
              <span className="text-xs text-slate-400">{p.distancia_m} m</span>
            </div>
          ))}
          {proximas.length === 0 && <p className="text-xs text-slate-400">Nenhuma outra ação no raio.</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Localização e cruzamento geo</h2>
          {os.latitude && os.longitude ? (
            <div className="h-72">
              <MapView
                marcadores={
                  os.latitude && os.longitude
                    ? [{ lat: os.latitude, lng: os.longitude, label: `OS #${os.numero} — ${os.tema}` }]
                    : []
                }
                circulos={
                  os.latitude && os.longitude
                    ? [{ lat: os.latitude, lng: os.longitude, raio: os.raio_geo || 50 }]
                    : []
                }
              />
            </div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-slate-400">
              <MapPin size={24} />
              <p className="text-sm">Esta OS não possui coordenadas geográficas.</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Documentos lavrados na OS</h2>
          <span className="text-xs text-slate-400">
            Rascunho → Emitido → Juntado · Edição pós-emissão com justificativa validada pelo diretor
          </span>
        </div>
        <div className="space-y-3 px-5 pb-5">
          {os.acoes.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">
              Nenhum documento registrado ainda. Clique em "Registrar ação fiscal".
            </p>
          )}
          {os.acoes.map(renderDoc)}
        </div>
      </Card>

      <Modal open={modalAcao} title="Registrar documento" onClose={() => setModalAcao(false)} wide>
        <form onSubmit={criarAcao} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tipo de documento">
              <select
                value={form.tipo}
                onChange={(e) => setCampo("tipo", e.target.value as TipoAcao)}
                className={inputCls}
              >
                {(catalog.length > 0 ? catalog : FALLBACK_TIPOS)
                  .filter((t) => (t as TipoDocumento).ativo !== false)
                  .map((t) => (
                    <option key={t.chave} value={t.chave}>
                      {t.nome ?? t.chave}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Título">
              <input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Região (RA)">
              <select
                value={form.id_regiao}
                onChange={(e) =>
                  setCampo("id_regiao", e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputCls}
              >
                <option value="">— Sem região —</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.sigla ? `${r.sigla} — ` : ""}{r.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Latitude">
              <input
                value={form.latitude}
                onChange={(e) => setCampo("latitude", e.target.value)}
                className={inputCls}
                placeholder={os?.latitude != null ? String(os.latitude) : "-15.7942290"}
              />
            </Field>
            <Field label="Longitude">
              <input
                value={form.longitude}
                onChange={(e) => setCampo("longitude", e.target.value)}
                className={inputCls}
                placeholder={os?.longitude != null ? String(os.longitude) : "-47.8821660"}
              />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea value={form.descricao} onChange={(e) => setCampo("descricao", e.target.value)} rows={2} className={inputCls} />
          </Field>

          {catalog.find((c) => c.chave === form.tipo)?.usa_auto_infracao && (
            <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <h4 className="text-sm font-semibold text-rose-700">Dados da autuação</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CNPJ" hint="vazio = pessoa física">
                  <input value={form.cnpj} onChange={(e) => setCampo("cnpj", e.target.value)} className={inputCls} placeholder="21384917000113" />
                </Field>
                <Field label="Razão social">
                  <input value={form.razao} onChange={(e) => setCampo("razao", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Natureza da infração" hint="usada no cálculo de reincidência (CNPJ × natureza)">
                <input value={form.natureza} onChange={(e) => setCampo("natureza", e.target.value)} className={inputCls} />
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Valor (R$)">
                  <input value={form.valor} onChange={(e) => setCampo("valor", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Prazo pagamento">
                  <input type="date" value={form.prazoPag} onChange={(e) => setCampo("prazoPag", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Prazo impugnação">
                  <input type="date" value={form.prazoRec} onChange={(e) => setCampo("prazoRec", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {renderCamposExtensao(catalog.find((c) => c.chave === form.tipo))}

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setModalAcao(false)}>Cancelar</Btn>
            <Btn type="submit"><ChevronRight size={16} /> Registrar documento</Btn>
          </div>
        </form>
      </Modal>

      <Modal
        open={modalEmitir}
        title={docAlvo && tdDe(docAlvo)?.numero_do_tablet ? "Emitir auto (número do tablet)" : "Emitir documento"}
        onClose={() => setModalEmitir(false)}
      >
        {docAlvo && (
          <div className="space-y-4">
            {tdDe(docAlvo)?.numero_do_tablet ? (
              <Field label="Número lavrado no tablet" hint="Autos vêm numerados do tablet — o sistema não gera">
                <input
                  value={numeroAuto}
                  onChange={(e) => setNumeroAuto(e.target.value)}
                  className={inputCls}
                  placeholder="EX: AI-2026-0001"
                  autoFocus
                />
              </Field>
            ) : (
              <p className="text-sm text-slate-600">
                A numeração será gerada pelo sistema:{" "}
                <span className="font-mono text-brand-800">
                  {tdDe(docAlvo)?.prefixo}-{String.fromCharCode(65 + new Date().getFullYear() - 2026)}-ID-XXXXXX-SIGLA
                </span>{" "}
                (prefixo + ano + usuário + sequência + especialidade).
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setModalEmitir(false)}>Cancelar</Btn>
              <Btn onClick={emitirDoc}>Confirmar emissão</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalEdicao}
        title={docAlvo?.status_documento === "rascunho" ? "Editar rascunho" : "Edição pós-emissão (validada pelo diretor)"}
        onClose={() => setModalEdicao(false)}
        wide
      >
        <form onSubmit={salvarEdicao} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título">
              <input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Região (RA)">
              <select
                value={form.id_regiao}
                onChange={(e) =>
                  setCampo("id_regiao", e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputCls}
              >
                <option value="">— Sem região —</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.sigla ? `${r.sigla} — ` : ""}{r.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Latitude">
              <input
                value={form.latitude}
                onChange={(e) => setCampo("latitude", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Longitude">
              <input
                value={form.longitude}
                onChange={(e) => setCampo("longitude", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea value={form.descricao} onChange={(e) => setCampo("descricao", e.target.value)} rows={2} className={inputCls} />
          </Field>

          {catalog.find((c) => c.chave === form.tipo)?.usa_auto_infracao && (
            <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <h4 className="text-sm font-semibold text-rose-700">Dados da autuação</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CNPJ" hint="vazio = pessoa física">
                  <input value={form.cnpj} onChange={(e) => setCampo("cnpj", e.target.value)} className={inputCls} placeholder="21384917000113" />
                </Field>
                <Field label="Razão social">
                  <input value={form.razao} onChange={(e) => setCampo("razao", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Natureza da infração">
                <input value={form.natureza} onChange={(e) => setCampo("natureza", e.target.value)} className={inputCls} />
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Valor (R$)">
                  <input value={form.valor} onChange={(e) => setCampo("valor", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Prazo pagamento">
                  <input type="date" value={form.prazoPag} onChange={(e) => setCampo("prazoPag", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Prazo impugnação">
                  <input type="date" value={form.prazoRec} onChange={(e) => setCampo("prazoRec", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {renderCamposExtensao(catalog.find((c) => c.chave === form.tipo))}

          {docAlvo?.status_documento !== "rascunho" && (
            <Field label="Justificativa (obrigatória)" hint="O diretor da unidade avaliará esta justificativa">
              <textarea
                value={form.justificativa}
                onChange={(e) => setCampo("justificativa", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setModalEdicao(false)}>Cancelar</Btn>
            <Btn type="submit">
              <ChevronRight size={16} />
              {docAlvo?.status_documento === "rascunho" ? "Salvar rascunho" : "Enviar para avaliação"}
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal open={modalAvaliar} title="Avaliar edição" onClose={() => setModalAvaliar(false)}>
        {docAlvo && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-dark">
              <p className="font-medium">{docAlvo.titulo}</p>
              {docAlvo.dados_edicao_pendente?.titulo && (
                <p>Proposta de título: <strong>{docAlvo.dados_edicao_pendente.titulo}</strong></p>
              )}
              {docAlvo.dados_edicao_pendente?.descricao && (
                <p className="mt-1">Proposta de descrição: {docAlvo.dados_edicao_pendente.descricao}</p>
              )}
            </div>
            <Field label="Parecer">
              <textarea
                value={form.justificativa}
                onChange={(e) => setCampo("justificativa", e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Parecer do diretor (opcional)"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="danger" onClick={() => avaliar("rejeitar")}>
                <X size={16} /> Rejeitar (devolver)
              </Btn>
              <Btn onClick={() => avaliar("aprovar")}>
                <ChevronRight size={16} /> Aprovar
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}