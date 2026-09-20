import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FolderTree, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { ProgramacaoFiscal } from "../lib/types";
import { Btn, Card, EmptyState, Field, inputCls, Spinner, fmtDataHora } from "../components/ui";

export default function Programacoes() {
  usePageTitle("Programações Fiscais");
  const navigate = useNavigate();
  const [pfos, setPfos] = useState<ProgramacaoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  const [fmt, setFmt] = useState("");
  const [tema, setTema] = useState("");
  const [ra, setRa] = useState("");
  const [raio, setRaio] = useState("100");

  function carregar() {
    setLoading(true);
    api
      .get<ProgramacaoFiscal[]>("/programacoes")
      .then(setPfos)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  function abrir() {
    setFmt("");
    setTema("");
    setRa("");
    setRaio("100");
    setErro("");
    setCriando(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!fmt.trim()) return setErro("Informe a fundamentação legal");
    if (!tema.trim()) return setErro("Informe o tema da programação");
    setLoading(true);
    try {
      const pfo = await api.post<ProgramacaoFiscal>("/programacoes", {
        fundamentacao_legal: fmt.trim(),
        tema: tema.trim(),
        ra: ra.trim() || null,
        raio_geo: parseFloat(raio) || 100,
      });
      setCriando(false);
      setPfos((prev) => [pfo, ...prev]);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programações Fiscais (PFO)</h1>
          <p className="text-sm text-slate-500">
            Documentos-pai: fundamentação legal, tema e raio definem o escopo das OS tipo PFO.
          </p>
        </div>
        <Btn onClick={abrir}>
          <Plus size={16} /> Nova PFO
        </Btn>
      </div>

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-400">Carregando…</div>
        ) : pfos.length === 0 ? (
          <EmptyState
            icon={<FolderTree size={24} />}
            titulo="Nenhuma PFO registrada"
            descricao="Crie a primeira programação para abrir OS tipo PFO a partir dela."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {pfos.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <button
                  onClick={() => navigate(`/os/nova?origem=programacao&pfo=${p.id}`)}
                  className="min-w-0 flex-1 text-left"
                  title="Abrir OS tipo PFO a partir desta programação"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-brand-800">{p.codigo}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {p.unidade_sigla}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.tema}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    {p.ra && <span>RA {p.ra}</span>}
                    <span>Raio {p.raio_geo} m</span>
                    {p.criado_por_nome && <span>por {p.criado_por_nome}</span>}
                    <span>{fmtDataHora(p.criado_em)}</span>
                  </div>
                </button>
                <Btn variant="secondary" onClick={() => navigate(`/os/nova?origem=programacao&pfo=${p.id}`)}>
                  <ArrowRight size={15} /> Abrir OS
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      {criando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCriando(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Nova PFO</h2>
              <button onClick={() => setCriando(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={salvar} className="mt-4 space-y-4">
              <Field label="Fundamentação legal" hint="Base normativa da programação do exercício">
                <textarea
                  value={fmt}
                  onChange={(e) => setFmt(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Art. X do Código de Fiscalização do DF…"
                />
              </Field>
              <Field label="Tema">
                <input value={tema} onChange={(e) => setTema(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="RA (opcional)" hint="vazio = pode cobrir uma RA inteira ou o DF">
                  <input value={ra} onChange={(e) => setRa(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Raio geo (m)">
                  <input value={raio} onChange={(e) => setRaio(e.target.value)} className={inputCls} />
                </Field>
              </div>
              {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</p>}
              <div className="flex justify-end gap-2">
                <Btn type="button" variant="secondary" onClick={() => setCriando(false)}>
                  Cancelar
                </Btn>
                <Btn type="submit" disabled={loading}>
                  {loading ? <Spinner size={16} /> : <Plus size={16} />} {loading ? "Criando…" : "Criar PFO"}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}