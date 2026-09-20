import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CornerUpLeft, Inbox, Send, Users, X } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../lib/auth";
import { CaixaEstado, OrdemServico, CAIXA_ESTADO_COLORS, CAIXA_ESTADO_LABEL, Usuario } from "../lib/types";
import { Badge, Btn, Card, EmptyState, Field, inputCls, SkeletonLista, StatusOSBadge, fmtData, fmtDataHora } from "../components/ui";

export default function CaixaOuvidorias() {
  usePageTitle("Caixa de Ouvidorias");
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [items, setItems] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const ehOuvidoria = useMemo(
    () =>
      usuario?.vinculos?.some(
        (v) => v.unidade_sigla.toUpperCase() === "OUV" || v.unidade_sigla.toLowerCase().includes("ouvidoria")
      ) ?? false,
    [usuario]
  );

  const [distribuindo, setDistribuindo] = useState<OrdemServico | null>(null);
  const [auditoresDisponiveis, setAuditoresDisponiveis] = useState<Usuario[]>([]);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    setLoading(true);
    api
      .get<OrdemServico[]>("/os/caixa-ouvidorias")
      .then(setItems)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  function abrirDistribuicao(o: OrdemServico) {
    setDistribuindo(o);
    setSelecionados([]);
    setErro("");
    if (auditoresDisponiveis.length === 0) {
      api
        .get<Usuario[]>("/usuarios")
        .then((l) => setAuditoresDisponiveis(l.filter((u) => u.perfil?.codigo === "auditor_campo" && u.ativo)))
        .catch((e) => setErro(e.message));
    }
  }

  async function devolverOuvidoria(o: OrdemServico) {
    const ok = window.confirm(
      "Devolver esta manifestação à Ouvidoria? O responsável não é alterado (caixa de qualidade)."
    );
    if (!ok) return;
    try {
      await api.post(`/os/${o.id}/caixa`, { decisao: "devolver_ouvidoria", auditores: [] });
      carregar();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function redistribuir() {
    if (!distribuindo) return;
    setErro("");
    if (selecionados.length === 0) return setErro("Selecione ao menos um auditor");
    setEnviando(true);
    try {
      await api.post(`/os/${distribuindo.id}/caixa`, {
        decisao: "redistribuir",
        auditores: selecionados.map((id) => ({ usuario_id: id })),
      });
      setDistribuindo(null);
      setSelecionados([]);
      carregar();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Caixa de Ouvidorias</h1>
        <p className="text-sm text-slate-500">
          {ehOuvidoria
            ? "Resoluções devolvidas pela qualidade — acompanhe o ciclo de cada manifestação."
            : "Manifestações encaminhadas à sua unidade: distribua aos auditores ou devolva à Ouvidoria."}
        </p>
      </div>

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonLista n={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox size={24} />}
            titulo={ehOuvidoria ? "Nenhuma devolução em aberto" : "Caixa vazia"}
            descricao={
              ehOuvidoria
                ? "Quando a qualidade devolver uma manifestação, ela aparecerá aqui."
                : "As manifestações da Ouvidoria encaminhadas à sua unidade aparecerão aqui."
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((o) => {
              const emCaixa = o.caixa_estado === "na_caixa" || o.caixa_estado === "aguardando_qualidade";
              return (
                <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button
                    onClick={() => navigate(`/os/${o.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand-800">{o.codigo ?? `#${o.numero}`}</span>
                      {o.caixa_estado && (
                        <Badge text={CAIXA_ESTADO_LABEL[o.caixa_estado as CaixaEstado]} color={CAIXA_ESTADO_COLORS[o.caixa_estado as CaixaEstado]} />
                      )}
                      <StatusOSBadge status={o.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.tema}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      {o.ra && <span>RA {o.ra}</span>}
                      {o.responsavel_sigla && <span>Responsável: {o.responsavel_sigla}</span>}
                      <span>Prazo: {fmtData(o.prazo_data)}</span>
                      <span>{fmtDataHora(o.criado_em)}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {emCaixa ? (
                      <>
                        <Btn variant="secondary" onClick={() => abrirDistribuicao(o)}>
                          <Send size={15} /> Distribuir
                        </Btn>
                        <Btn variant="secondary" onClick={() => devolverOuvidoria(o)}>
                          <CornerUpLeft size={15} /> Devolver à Ouvidoria
                        </Btn>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users size={14} />
                        {o.auditores.filter((a) => a.ativo).length} auditor(es) ativo(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {distribuindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDistribuindo(null)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800">Distribuir manifestação</h2>
              <button onClick={() => setDistribuindo(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 font-mono text-sm text-brand-800">{distribuindo.codigo}</p>
            <p className="text-sm text-slate-600">{distribuindo.tema}</p>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {auditoresDisponiveis.map((u) => {
                const ativo = selecionados.includes(u.id);
                return (
                  <label key={u.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${ativo ? "border-brand-500 bg-brand-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={() =>
                        setSelecionados((prev) =>
                          ativo ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                        )
                      }
                      className="mt-0.5 h-4 w-4 accent-brand-800"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{u.nome}</p>
                      <p className="truncate text-xs text-slate-400">
                        {u.vinculos.map((v) => `${v.unidade_sigla} · ${v.cargo}`).join(" | ") || "sem vínculo"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {erro && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Btn type="button" variant="secondary" onClick={() => setDistribuindo(null)}>
                Cancelar
              </Btn>
              <Btn onClick={redistribuir} disabled={enviando}>
                <ArrowRight size={16} /> {enviando ? "Distribuindo…" : "Enviar aos auditores"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}