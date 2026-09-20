import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  ClipboardCheck,
  ClipboardList,
  FileWarning,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Plus,
} from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { OrdemServico, ResumoDashboard } from "../lib/types";
import { Badge, Card, fmtMoeda } from "../components/ui";
import MapView from "../components/MapView";

const ATIVOS = ["criada", "vinculada", "em_execucao", "devolvida", "desarquivada"];

type Categoria = "atrasada" | "em_andamento" | "concluida" | "outros";

const CATEGORIA_BADGE: Record<Categoria, string> = {
  atrasada: "bg-rose-100 text-rose-800 ring-rose-300",
  em_andamento: "bg-amber-100 text-amber-800 ring-amber-300",
  concluida: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  outros: "bg-slate-100 text-slate-500 ring-slate-300",
};

const CATEGORIA_LABEL: Record<Categoria, string> = {
  atrasada: "Atrasada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  outros: "Outra",
};

const MAPA_CORES: Record<Categoria, string> = {
  atrasada: "#dc2626",
  em_andamento: "#f59e0b",
  concluida: "#16a34a",
  outros: "#94a3b8",
};

const LEGENDA = [
  { cor: MAPA_CORES.atrasada, label: "Atrasada" },
  { cor: MAPA_CORES.em_andamento, label: "Em andamento" },
  { cor: MAPA_CORES.concluida, label: "Concluída" },
];

const CENTRO_DF: [number, number] = [-15.79, -47.89];

const ACOES_RAPIDAS = [
  { rotulo: "Novo Auto de Infração", icone: FileWarning, to: "/os", sub: "Escolha a OS" },
  { rotulo: "Nova Notificação", icone: Bell, to: "/os", sub: "Escolha a OS" },
  { rotulo: "Registrar Vistoria", icone: ClipboardCheck, to: "/os", sub: "Escolha a OS" },
  { rotulo: "Relatório Georreferenciado", icone: MapIcon, to: "/geo", sub: "Mapa e camadas" },
];

export default function Dashboard() {
  usePageTitle("Painel");
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [os, setOs] = useState<OrdemServico[]>([]);
  const [mapaExpandido, setMapaExpandido] = useState(false);

  useEffect(() => {
    api.get<ResumoDashboard>("/dashboard/resumo").then(setResumo).catch(console.error);
    api.get<OrdemServico[]>("/os?q=").then(setOs).catch(console.error);
  }, []);

  const hoje = useMemo(() => new Date(), []);

  function dias(o: OrdemServico): number | null {
    if (!o.prazo_data) return null;
    return Math.ceil((new Date(o.prazo_data).getTime() - hoje.getTime()) / 864e5);
  }

  function categoria(o: OrdemServico): Categoria {
    if (o.status === "concluida" || o.status === "arquivada") return "concluida";
    if (!ATIVOS.includes(o.status)) return "outros";
    const d = dias(o);
    if (d !== null && d < 0) return "atrasada";
    return "em_andamento";
  }

  const ativas = os.filter((o) => ATIVOS.includes(o.status));
  const dentroPrazo = ativas.filter((o) => {
    const d = dias(o);
    return d === null || d >= 0;
  }).length;
  const pctDentroPrazo = ativas.length ? Math.round((dentroPrazo / ativas.length) * 100) : 0;
  const atrasadas = ativas.filter((o) => dias(o) !== null && (dias(o) ?? 0) < 0).length;
  const vencendo3 = ativas.filter((o) => {
    const d = dias(o);
    return d !== null && d >= 0 && d <= 3;
  }).length;

  const recentes = os.filter((o) => categoria(o) !== "outros").slice(0, 8);

  const marcadores = os
    .filter(
      (o) =>
        o.latitude !== null && o.longitude !== null && o.latitude !== undefined && o.longitude !== undefined && categoria(o) !== "outros"
    )
    .map((o) => ({
      lat: o.latitude as number,
      lng: o.longitude as number,
      label: `OS #${o.numero} — ${o.tema}`,
      color: MAPA_CORES[categoria(o)],
    }));

  function textoPrazo(o: OrdemServico) {
    if (categoria(o) === "concluida") {
      return { texto: o.prazo_data ? `Concluída em ${o.prazo_data.slice(0, 10)}` : "Concluída", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    }
    const d = dias(o);
    if (d === null) return { texto: "Sem prazo", cls: "bg-slate-100 text-slate-500 ring-slate-200" };
    if (d < 0) return { texto: `Atrasado ${Math.abs(d)}d`, cls: "bg-rose-100 text-rose-700 ring-rose-300 font-semibold" };
    if (d === 0) return { texto: "Vence hoje", cls: "bg-rose-100 text-rose-700 ring-rose-300 font-semibold" };
    if (d <= 3) return { texto: `Vence em ${d}d`, cls: "bg-amber-100 text-amber-700 ring-amber-300 font-semibold" };
    return { texto: `Vence em ${d}d`, cls: "bg-slate-100 text-slate-500 ring-slate-200" };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Fiscalização</h1>
          <p className="text-sm text-slate-500">Foco operacional, vencimentos e geofiscalização no DF</p>
        </div>
        <Link
          to="/os/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          <Plus size={16} /> Nova OS
        </Link>
      </div>

      {/* GRID RESPONSIVO
        Desktop (>1024px): 2 colunas — tabela/KPIs à esquerda (2/3), mapa/atalhos à direita (1/3).
        Tablet (768-1023px): coluna única; bloco do mapa/atalhos fica abaixo do bloco da tabela.
        Mobile (<767px): tudo em 1 coluna com 100% de largura. */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna esquerda (maior) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Foco Operacional */}
          <Card className="p-0">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-700">Foco Operacional — Ordens de Serviço</h2>
                <p className="text-xs text-slate-400">Prioridade por prazo e situação</p>
              </div>
              <Link to="/os" className="flex items-center gap-1 text-sm font-medium text-brand-800 hover:text-brand-900">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {/* scroll horizontal automático no mobile (<767px) */}
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-2.5">ID</th>
                    <th className="px-5 py-2.5">Tipo</th>
                    <th className="px-5 py-2.5">Estabelecimento</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((o) => {
                    const c = categoria(o);
                    const pz = textoPrazo(o);
                    const estab = o.cnpj ? o.cnpj : o.ra ? `RA ${o.ra}` : o.endereco ?? "—";
                    return (
                      <tr key={o.id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <Link to={`/os/${o.id}`} className="font-semibold text-brand-800 hover:text-brand-900">
                            #{o.numero}
                          </Link>
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
                            {o.frentes.length === 0 && <span className="text-slate-400">—</span>}
                          </div>
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3 text-slate-600" title={estab}>
                          {estab}
                          {o.acoes.length > 0 && (
                            <span className="ml-1.5 text-xs text-slate-400">({o.acoes.length} ações)</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Badge text={CATEGORIA_LABEL[c]} color={CATEGORIA_BADGE[c]} />
                        </td>
                        <td className="px-5 py-3">
                          <Badge text={pz.texto} color={pz.cls} />
                        </td>
                      </tr>
                    );
                  })}
                  {recentes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                        Nenhuma ordem de serviço encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* KPIs / Métricas */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-brand-50 p-2 text-brand-800">
                  <ClipboardList size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">OS Ativas</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-brand-900">{ativas.length}</p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Dentro do prazo</span>
                  <span className="font-semibold text-brand-800">{pctDentroPrazo}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-brand-600"
                    style={{ width: `${pctDentroPrazo}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card className="flex flex-col p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-gold/15 p-2 text-gold-dark">
                  <FileWarning size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próximos Vencimentos</span>
              </div>
              <p className={`mt-3 text-3xl font-bold ${atrasadas > 0 ? "text-rose-600" : "text-gold-dark"}`}>
                {atrasadas + vencendo3}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold text-rose-600">{atrasadas}</span> atrasadas ·{" "}
                <span className="font-semibold text-gold-dark">{vencendo3}</span> vencendo em 3 dias
              </p>
            </Card>

            <Card className="flex flex-col p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <FileWarning size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valores Estimados</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-800">{fmtMoeda(resumo?.valor_estimado ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {resumo?.autos_ativos ?? 0} autos de infração ativos (lavrados/enviados)
              </p>
            </Card>
          </div>
        </div>

        {/* Coluna direita (menor) */}
        <div className="space-y-6">
          {/* Painel expandido: cobre o conteúdo abaixo da navbar */}
          {mapaExpandido ? (
            <div className="fixed inset-x-0 bottom-0 isolate z-40 min-h-0 bg-slate-100 p-3 sm:p-5" style={{ top: "var(--header-h)" }}>
              <Card className="flex h-full flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-semibold text-slate-700">Geofiscalização no DF</h2>
                    <p className="text-xs text-slate-400">Cobrindo todo o painel — a navegação continua disponível acima</p>
                  </div>
                  <button
                    onClick={() => setMapaExpandido(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-800"
                    title="Recolher mapa"
                    aria-label="Recolher mapa"
                  >
                    <Minimize2 size={16} /> Recolher
                  </button>
                </div>
                <div className="relative isolate min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
                  <MapView marcadores={marcadores} center={CENTRO_DF} zoom={11} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {LEGENDA.map((l) => (
                    <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: l.cor }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-700">Geofiscalização no DF</h2>
                  <p className="text-xs text-slate-400">Fiscalizações por status no território</p>
                </div>
                <button
                  onClick={() => setMapaExpandido(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-800"
                  title="Expandir: cobre o painel abaixo"
                  aria-label="Expandir mapa"
                >
                  <Maximize2 size={16} /> Expandir
                </button>
              </div>
              {/* Mapa: altura fixa de ~250px no mobile para não dominar a tela; cresce em telas maiores */}
              <div className="relative isolate h-64 overflow-hidden rounded-xl border border-slate-200 md:h-80 lg:h-72">
                <MapView marcadores={marcadores} center={CENTRO_DF} zoom={11} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {LEGENDA.map((l) => (
                  <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: l.cor }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <Link
                to="/geo"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-800 hover:text-brand-900"
              >
                <MapIcon size={14} /> Abrir georreferenciamento completo
              </Link>
            </Card>
          )}

          {/* Ações Rápidas */}
          <Card className="p-4">
            <h2 className="text-[15px] font-semibold text-slate-700">Ações Rápidas</h2>
            <p className="text-xs text-slate-400">Atalhos para as operações mais frequentes</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {ACOES_RAPIDAS.map((a) => (
                <Link
                  key={a.rotulo}
                  to={a.to}
                  className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-3 transition hover:border-brand-400 hover:bg-brand-50/40"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-800 transition group-hover:bg-brand-800 group-hover:text-white">
                    <a.icone size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium leading-tight text-slate-700 group-hover:text-brand-900">
                      {a.rotulo}
                    </span>
                    <span className="block text-xs text-slate-400">{a.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}