import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import {
  CategoriaDocumento,
  MinhaAcao,
  RegiaoOut,
  STATUS_DOCUMENTO_COLORS,
  STATUS_DOCUMENTO_LABEL,
  StatusDocumento,
  TIPO_ACAO_LABEL,
  TipoDocumento,
} from "../lib/types";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  SkeletonLista,
  STATUS_COLORS,
  fmtData,
  fmtMoeda,
  inputCls,
} from "../components/ui";

const TABS: { id: CategoriaDocumento | ""; label: string; cor: string }[] = [
  { id: "", label: "Todos", cor: "bg-slate-400" },
  { id: "auto", label: "Autos", cor: "bg-rose-500" },
  { id: "termo", label: "Termos", cor: "bg-indigo-500" },
  { id: "laudo", label: "Laudos", cor: "bg-teal-500" },
  { id: "relatorio", label: "Relatórios", cor: "bg-sky-500" },
];

const STATUS_DOCS: StatusDocumento[] = [
  "rascunho",
  "emitido",
  "aguardando_avaliacao",
  "devolvido",
  "juntado",
];

export default function Autos() {
  usePageTitle("Autos");
  const navigate = useNavigate();
  const [docs, setDocs] = useState<MinhaAcao[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [regioes, setRegioes] = useState<RegiaoOut[]>([]);
  const [categoria, setCategoria] = useState<CategoriaDocumento | "">("");
  const [tipoSel, setTipoSel] = useState("");
  const [idRegiaoSel, setIdRegiaoSel] = useState("");
  const [statusDocSel, setStatusDocSel] = useState("");
  const [deSel, setDeSel] = useState("");
  const [ateSel, setAteSel] = useState("");
  const [qSel, setQSel] = useState("");
  const [loading, setLoading] = useState(true);

  const tiposDaCategoria = useMemo(
    () => (categoria ? tipos.filter((t) => t.categoria === categoria) : tipos),
    [categoria, tipos]
  );

  useEffect(() => {
    api.get<TipoDocumento[]>("/tipos-documento").then(setTipos).catch(() => []);
    api.get<RegiaoOut[]>("/regioes").then(setRegioes).catch(() => []);
  }, []);

  function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (tipoSel) params.set("tipo_documento_id", tipoSel);
    if (idRegiaoSel) params.set("id_regiao", idRegiaoSel);
    if (statusDocSel) params.set("status_documento", statusDocSel);
    if (deSel) params.set("de", deSel);
    if (ateSel) params.set("ate", ateSel);
    if (qSel.trim()) params.set("q", qSel.trim());
    const query = params.toString();
    api
      .get<MinhaAcao[]>(query ? `/acoes/minhas?${query}` : "/acoes/minhas")
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setTipoSel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, tipoSel, idRegiaoSel, statusDocSel, deSel, ateSel, qSel]);

  function nomeTipo(a: MinhaAcao): string {
    return a.tipo_documento?.nome ?? TIPO_ACAO_LABEL[a.tipo] ?? a.tipo;
  }

  function CorCategoria(a: MinhaAcao): string {
    const cat = a.tipo_documento?.categoria;
    return cat === "auto"
      ? "bg-rose-100 text-rose-800 ring-rose-300"
      : cat === "termo"
        ? "bg-indigo-100 text-indigo-800 ring-indigo-300"
        : cat === "laudo"
          ? "bg-teal-100 text-teal-800 ring-teal-300"
          : "bg-sky-100 text-sky-800 ring-sky-300";
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="text-center text-2xl font-bold text-slate-800">Ações Fiscais</h1>
        <div className="rounded-2xl bg-gold px-4 py-3 shadow-sm">
          <div className="flex flex-wrap justify-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.id || "todos"}
                onClick={() => setCategoria(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  categoria === t.id
                    ? "bg-brand-800 text-white shadow"
                    : "bg-slate-600/25 text-slate-800 hover:bg-slate-600/40"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.cor}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Tipo de documento">
            <select value={tipoSel} onChange={(e) => setTipoSel(e.target.value)} className={inputCls}>
              <option value="">Todos os tipos</option>
              {tiposDaCategoria.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Região">
            <select value={idRegiaoSel} onChange={(e) => setIdRegiaoSel(e.target.value)} className={inputCls}>
              <option value="">Todas as regiões</option>
              {regioes.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status do documento">
            <select value={statusDocSel} onChange={(e) => setStatusDocSel(e.target.value)} className={inputCls}>
              <option value="">Todos os status</option>
              {STATUS_DOCS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_DOCUMENTO_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="De">
            <input type="date" value={deSel} onChange={(e) => setDeSel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Até">
            <input type="date" value={ateSel} onChange={(e) => setAteSel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Buscar">
            <input
              type="text"
              value={qSel}
              onChange={(e) => setQSel(e.target.value)}
              placeholder="Título, descrição..."
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonLista n={6} />
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            titulo="Nenhum documento encontrado"
            descricao="Nesta guia aparecem os documentos que você lavrou. Registre uma ação fiscal em uma OS para vê-los aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3">Número</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Detalhe</th>
                  <th className="px-5 py-3">Valor</th>
                  <th className="px-5 py-3">Região</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Criado</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {docs.map((a) => {
                  const ai = a.auto_infracao;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/acoes/${a.id}`)}
                      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-brand-50/50"
                    >
                      <td className="px-5 py-3">
                        {a.codigo_documento ? (
                          <span className="font-mono font-semibold text-slate-700">{a.codigo_documento}</span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Sem número (rascunho)</span>
                        )}
                      </td>
                      <td className="max-w-xs px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge text={nomeTipo(a)} color={CorCategoria(a)} />
                        </div>
                        <p className="mt-1 truncate font-medium text-slate-700">{a.titulo}</p>
                        <p className="text-xs text-slate-400">
                          OS #{a.os_numero}
                          {a.os_tema ? ` · ${a.os_tema}` : ""}
                        </p>
                      </td>
                      <td className="max-w-xs px-5 py-3 text-slate-500">
                        {ai ? (
                          <>
                            <p className="truncate font-medium text-slate-600">{ai.natureza}</p>
                            {ai.razao_social && <p className="truncate text-xs"> {ai.razao_social}</p>}
                            {ai.cnpj && <p className="text-xs text-slate-400">CNPJ {ai.cnpj}</p>}
                            {ai.prazo_pagamento && (
                              <p className="text-xs text-slate-400">Pagar até {fmtData(ai.prazo_pagamento)}</p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <Badge text={`AI: ${ai.status}`} color={STATUS_COLORS[ai.status]} />
                              <Badge
                                text={`Trib: ${ai.status_tributario}`}
                                color={STATUS_COLORS[ai.status_tributario]}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="line-clamp-2">{a.descricao || "—"}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {ai && ai.valor_total != null ? fmtMoeda(ai.valor_total) : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{a.regiao_nome ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Badge
                          text={STATUS_DOCUMENTO_LABEL[a.status_documento]}
                          color={STATUS_DOCUMENTO_COLORS[a.status_documento]}
                        />
                        {a.emitido_em && (
                          <p className="mt-0.5 text-xs text-slate-400">Emitido {fmtData(a.emitido_em)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{fmtData(a.criado_em)}</td>
                      <td className="px-2 py-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}