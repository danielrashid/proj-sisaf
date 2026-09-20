import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, ClipboardList, Plus, Search, Timer } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { Especialidade, OrdemServico, ORIGENS, STATUS_OS_VALUES } from "../lib/types";
import { Badge, Card, StatusOSBadge, fmtData, inputCls, SkeletonLista, STATUS_COLORS } from "../components/ui";

export default function OSList() {
  usePageTitle("Ordens de Serviço");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [os, setOs] = useState<OrdemServico[]>([]);
  const [esp, setEsp] = useState<Especialidade[]>([]);
  const [status, setStatus] = useState("");
  const [origem, setOrigem] = useState("");
  const [espId, setEspId] = useState("");
  const [q, setQ] = useState("");
  const [vencendo, setVencendo] = useState(searchParams.get("vencendo") === "1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Especialidade[]>("/especialidades").then(setEsp).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (origem) params.set("origem", origem);
    if (espId) params.set("especialidade_id", espId);
    if (q) params.set("q", q);
    if (vencendo) params.set("prazo_dias", "3");
    api
      .get<OrdemServico[]>(`/os?${params.toString()}`)
      .then(setOs)
      .finally(() => setLoading(false));
  }, [status, origem, espId, q, vencendo]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ordens de Serviço</h1>
          <p className="text-sm text-slate-500">{os.length} registro(s)</p>
        </div>
        <Link to="/os/nova">
          <span className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-900">
            <Plus size={16} /> Nova OS
          </span>
        </Link>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tema, CNPJ, endereço…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-44`}>
          <option value="">Todos os status</option>
          {STATUS_OS_VALUES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={`${inputCls} w-44`}>
          <option value="">Todas as origens</option>
          {Object.entries(ORIGENS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={espId} onChange={(e) => setEspId(e.target.value)} className={`${inputCls} w-48`}>
          <option value="">Todas especialidades</option>
          {esp.map((e) => (
            <option key={e.id} value={e.id}>Módulo {e.sigla}</option>
          ))}
        </select>
        <button
          onClick={() => setVencendo((v) => !v)}
          aria-pressed={vencendo}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
            vencendo
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-200"
          }`}
        >
          <Timer size={15} /> Vencendo em 3 dias
        </button>
        {vencendo && (
          <button
            onClick={() => setVencendo(false)}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Limpar
          </button>
        )}
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonLista n={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3">OS</th>
                  <th className="px-5 py-3">Tema</th>
                  <th className="px-5 py-3">Especialidades</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Auditores</th>
                  <th className="px-5 py-3">Prazo</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {os.map((o) => (
                  <tr
                    key={o.id}
                    className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-brand-50/50"
                    onClick={() => navigate(`/os/${o.id}`)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-mono text-sm font-semibold text-slate-700">{o.codigo ?? `#${o.numero}`}</p>
                    </td>
                    <td className="max-w-xs px-5 py-3">
                      <p className="truncate font-medium text-slate-600">{o.tema}</p>
                      {o.endereco && <p className="text-xs text-slate-400">{o.endereco}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {o.frentes.map((f) => (
                          <Badge
                            key={f.id}
                            text={f.especialidade.sigla}
                            color="bg-brand-50 text-brand-800 ring-brand-300"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{ORIGENS[o.origem]}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {o.auditores.filter((a) => a.ativo).length}
                    </td>
                    <td className={`px-5 py-3 ${o.prazo_data && new Date(o.prazo_data) <= new Date(new Date().getTime() + 3 * 864e5) && o.status !== "arquivada" ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                      {fmtData(o.prazo_data)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusOSBadge status={o.status} />
                    </td>
                    <td className="px-2 py-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
                {os.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
                        <ClipboardList size={28} />
                        <p className="text-sm">Nenhuma OS encontrada com os filtros atuais.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-400">
        Legenda de status:{" "}
        {Object.entries(STATUS_COLORS).slice(0, 8).map(([k]) => k).join(" · ")}
      </p>
    </div>
  );
}