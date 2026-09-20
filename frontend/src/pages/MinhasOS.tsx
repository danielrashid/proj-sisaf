import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  CornerUpLeft,
  FileText,
  FileWarning,
  Filter,
  Package,
  Plus,
  Shield,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../lib/auth";
import {
  MinhaAcao,
  OrdemServico,
  StatusOS,
  TIPO_ACAO_LABEL,
  TipoAcao,
  STATUS_OS_LABEL,
  STATUS_OS_VALUES,
} from "../lib/types";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  SkeletonLista,
  StatusOSBadge,
  STATUS_COLORS,
  fmtDataHora,
  inputCls,
} from "../components/ui";
import TransicaoModal from "../components/TransicaoModal";

const ATIVOS = ["criada", "vinculada", "em_execucao", "devolvida", "desarquivada"];

type Categoria = "andamento" | "vencendo" | "atrasado" | "concluido" | "outros";

const CHIPS: { id: Categoria | "todos"; label: string; dot: string; ativo: string }[] = [
  { id: "todos", label: "Todos", dot: "bg-slate-400", ativo: "bg-slate-700 text-white ring-slate-700" },
  { id: "andamento", label: "Em andamento", dot: "bg-brand-600", ativo: "bg-brand-800 text-white ring-brand-800" },
  { id: "vencendo", label: "Vencendo", dot: "bg-gold", ativo: "bg-gold text-brand-950 ring-gold" },
  { id: "atrasado", label: "Atrasado", dot: "bg-rose-500", ativo: "bg-rose-600 text-white ring-rose-600" },
  { id: "concluido", label: "Concluído", dot: "bg-emerald-500", ativo: "bg-emerald-600 text-white ring-emerald-600" },
];

const ICON_TIPO: Record<string, ReactNode> = {
  auto_infracao: <FileWarning size={16} className="text-rose-500" />,
  notificacao: <FileText size={16} className="text-brand-600" />,
  relatorio_tecnico: <FileText size={16} className="text-brand-700" />,
  interdicao: <Shield size={16} className="text-gold-dark" />,
  apreensao: <Package size={16} className="text-slate-500" />,
};

export default function MinhasOS() {
  usePageTitle("Início");
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [os, setOs] = useState<OrdemServico[]>([]);
  const [acoes, setAcoes] = useState<MinhaAcao[]>([]);
  const [loading, setLoading] = useState(true);

  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [transicao, setTransicao] = useState<"tramitar" | "retornar" | null>(null);

  const [chip, setChip] = useState<Categoria | "todos">("todos");
  const [situacao, setSituacao] = useState<StatusOS | "">("");
  const [tipoDoc, setTipoDoc] = useState<TipoAcao | "">("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  function carregar() {
    setLoading(true);
    Promise.all([
      api.get<OrdemServico[]>("/os/minhas").catch(() => []),
      api.get<MinhaAcao[]>("/acoes/minhas").catch(() => []),
    ])
      .then(([osList, acoesList]) => {
        setOs(osList);
        setAcoes(acoesList);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  const nome = usuario?.nome.split(" ")[0] ?? "";
  const hoje = useMemo(() => new Date(), []);
  const podeCriar = (usuario?.perfil?.nivel ?? 0) >= 2;

  function diasPrazo(o: OrdemServico): number | null {
    if (!o.prazo_data) return null;
    return Math.ceil((new Date(o.prazo_data).getTime() - hoje.getTime()) / 864e5);
  }

  function categoria(o: OrdemServico): Categoria {
    if (o.status === "concluida" || o.status === "arquivada") return "concluido";
    if (ATIVOS.includes(o.status)) {
      const d = diasPrazo(o);
      if (d !== null && d < 0) return "atrasado";
      if (d !== null && d <= 3) return "vencendo";
      return "andamento";
    }
    return "outros";
  }

  const priorizadas = useMemo(
    () =>
      [...os].sort((a, b) => {
        const da = diasPrazo(a) ?? 1e9;
        const db = diasPrazo(b) ?? 1e9;
        if (da !== db) return da - db;
        return (b.numero ?? 0) - (a.numero ?? 0);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [os]
  );

  const contadores = useMemo(() => {
    const c: Record<string, number> = { todos: os.length, andamento: 0, vencendo: 0, atrasado: 0, concluido: 0, outros: 0 };
    for (const o of os) c[categoria(o)] = (c[categoria(o)] ?? 0) + 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os]);

  const filtrosAtivos = chip !== "todos" || !!situacao || !!tipoDoc || !!de || !!ate;

  const osFiltradas = priorizadas.filter((o) => {
    if (chip !== "todos" && categoria(o) !== chip) return false;
    if (situacao && o.status !== situacao) return false;
    if (tipoDoc && !o.acoes.some((a) => a.tipo === tipoDoc)) return false;
    const p = o.prazo_data?.slice(0, 10) ?? "";
    if (de && (!p || p < de)) return false;
    if (ate && (!p || p > ate)) return false;
    return true;
  });

  const acoesFiltradas = acoes.filter((a) => {
    if (tipoDoc && a.tipo !== tipoDoc) return false;
    const d = a.criado_em.slice(0, 10);
    if (de && d < de) return false;
    if (ate && d > ate) return false;
    return true;
  });

  const osSelecionada = os.find((o) => o.id === selecionadaId) ?? null;

  function limparFiltros() {
    setChip("todos");
    setSituacao("");
    setTipoDoc("");
    setDe("");
    setAte("");
  }

  function chipPrazo(o: OrdemServico) {
    const d = diasPrazo(o);
    if (d === null) return null;
    if (d < 0) return { texto: `Atrasada há ${-d}d`, cls: "bg-rose-600 text-white ring-rose-600" };
    if (d === 0) return { texto: "Vence hoje", cls: "bg-rose-100 text-rose-800 ring-rose-300" };
    if (d <= 3) return { texto: `Vence em ${d}d`, cls: "bg-gold/15 text-gold-dark ring-gold/40" };
    return { texto: `Vence em ${d}d`, cls: "bg-slate-100 text-slate-500 ring-slate-200" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Olá, {nome}</h1>
        <p className="text-sm text-slate-500">Priorize suas ordens de serviço e veja as ações recentes.</p>
      </div>

      {/* Pasta de Trabalho / Ações Fiscais */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pasta de trabalho</p>
            <h2 className="text-lg font-bold text-brand-800">Ordens de Serviço</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {podeCriar && (
              <Btn onClick={() => navigate("/os/nova")}>
                <Plus size={16} /> Nova OS
              </Btn>
            )}
            <Btn
              variant="secondary"
              disabled={!osSelecionada}
              onClick={() => setTransicao("tramitar")}
              title="Selecione uma OS na lista para tramitar"
            >
              <ArrowRight size={16} /> Tramitar
            </Btn>
            <Btn
              variant="secondary"
              disabled={!osSelecionada}
              onClick={() => setTransicao("retornar")}
              title="Selecione uma OS na lista para retornar"
            >
              <CornerUpLeft size={16} /> Retornar Documento
            </Btn>
          </div>
        </div>

        {osSelecionada && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800">
            OS #{osSelecionada.numero} selecionada
            <button onClick={() => setSelecionadaId(null)} className="text-brand-700 hover:text-brand-900">
              <X size={13} />
            </button>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {CHIPS.map((c) => {
            const ativo = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                  ativo ? c.ativo : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ativo ? "bg-white/70" : c.dot}`} />
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    ativo ? "bg-white/20" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {contadores[c.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo de documento">
            <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value as TipoAcao | "")} className={inputCls}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_ACAO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação">
            <select value={situacao} onChange={(e) => setSituacao(e.target.value as StatusOS | "")} className={inputCls}>
              <option value="">Todas as situações</option>
              {STATUS_OS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_OS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prazo — de">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Prazo — até">
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {filtrosAtivos && (
          <button
            onClick={limparFiltros}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600"
          >
            <X size={13} /> Limpar filtros
          </button>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              Minhas ordens de serviço
              <span className="text-xs font-medium text-slate-400">({osFiltradas.length})</span>
            </h2>
            <button
              onClick={() => navigate("/os")}
              className="flex items-center gap-1 text-sm font-medium text-brand-800 hover:text-brand-900"
            >
              Ver todas <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <Card className="p-0">
              <SkeletonLista n={5} />
            </Card>
          ) : osFiltradas.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Filter size={20} />}
                titulo={filtrosAtivos ? "Nenhuma OS para os filtros aplicados" : "Nenhuma OS vinculada a você"}
                descricao={
                  filtrosAtivos
                    ? "Ajuste os filtros acima para ver outros resultados."
                    : "Quando uma OS for atribuída à sua unidade, ela aparecerá aqui."
                }
                action={
                  filtrosAtivos ? (
                    <button onClick={limparFiltros} className="text-sm font-medium text-brand-800 hover:text-brand-900">
                      Limpar filtros
                    </button>
                  ) : (
                    <button onClick={() => navigate("/os")} className="text-sm font-medium text-brand-800 hover:text-brand-900">
                      Ver todas as OS
                    </button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {osFiltradas.slice(0, 8).map((o) => {
                const cp = chipPrazo(o);
                const sel = o.id === selecionadaId;
                return (
                  <Card
                    key={o.id}
                    className={`p-4 transition ${
                      sel
                        ? "border-brand-400 ring-2 ring-brand-500/60"
                        : "hover:border-brand-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setSelecionadaId(sel ? null : o.id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          sel ? "border-brand-600 bg-brand-600" : "border-slate-300 hover:border-brand-400"
                        }`}
                        title={sel ? "Desmarcar OS" : "Selecionar OS"}
                        aria-pressed={sel}
                      >
                        {sel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </button>

                      <button onClick={() => navigate(`/os/${o.id}`)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800">{o.codigo ?? `OS #${o.numero}`}</p>
                          <StatusOSBadge status={o.status} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.tema}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {o.frentes.map((f) => (
                            <Badge
                              key={f.id}
                              text={f.especialidade.sigla}
                              color="bg-brand-50 text-brand-800 ring-brand-300"
                            />
                          ))}
                          <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-slate-400">
                            <Users size={13} /> {o.auditores.filter((a) => a.ativo).length}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                            <FileText size={13} /> {o.acoes.length}
                          </span>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {cp && <Badge text={cp.texto} color={cp.cls} />}
                        <ChevronRight size={17} className="text-slate-300" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Ações fiscais recentes
            <span className="ml-1 text-xs font-medium text-slate-400">({acoesFiltradas.length})</span>
          </h2>
          {loading ? (
            <Card className="p-0">
              <SkeletonLista n={5} />
            </Card>
          ) : acoesFiltradas.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FileText size={20} />}
                titulo={filtrosAtivos ? "Nenhuma ação para os filtros aplicados" : "Você ainda não registrou ações fiscais"}
                descricao={
                  filtrosAtivos
                    ? "Ajuste os filtros acima para ver outros resultados."
                    : "Ao abrir uma OS, registre notificações, autos de infração e demais ações."
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {acoesFiltradas.slice(0, 8).map((a) => (
                <Card key={a.id} className="p-4 transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => navigate(`/os/${a.os_id}`)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {ICON_TIPO[a.tipo] ?? null}
                          <p className="truncate text-sm font-medium text-slate-700">{a.titulo}</p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <Badge text={TIPO_ACAO_LABEL[a.tipo]} color="bg-slate-100 text-slate-600 ring-slate-300" />
                          <span className="truncate">
                            OS #{a.os_numero} · {a.os_tema}
                          </span>
                          {a.auto_infracao && (
                            <Badge text={`AI ${a.auto_infracao.status}`} color={STATUS_COLORS[a.auto_infracao.status]} />
                          )}
                          <span className="ml-auto shrink-0">{fmtDataHora(a.criado_em)}</span>
                        </div>
                      </div>
                    </button>
                    <ChevronRight size={17} className="mt-0.5 shrink-0 text-slate-300" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <TransicaoModal
        os={osSelecionada}
        modo={transicao ?? "tramitar"}
        onClose={() => setTransicao(null)}
        onDone={carregar}
      />
    </div>
  );
}