import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  FileWarning,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ResultadoBusca } from "../lib/types";
import { Badge, fmtData } from "./ui";

type Modo = "limitada" | "ilimitada";

export default function PesquisaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const podeIlimitada = !!usuario?.pesquisa_ilimitada;

  const [q, setQ] = useState("");
  const [modo, setModo] = useState<Modo>("limitada");
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) {
      setQ("");
      setResultado(null);
      setErro("");
      return;
    }
  }, [open]);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) {
      setResultado(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErro("");
    const timer = setTimeout(() => {
      api
        .get<ResultadoBusca>(
          `/busca/raiz?q=${encodeURIComponent(termo)}&modo=${modo}`
        )
        .then(setResultado)
        .catch((err: any) => {
          setResultado(null);
          setErro(err.message || "Falha na busca");
        })
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [q, modo]);

  if (!open) return null;

  const total = resultado
    ? resultado.os.length +
      resultado.estabelecimentos.length +
      resultado.autos.length +
      resultado.usuarios.length
    : 0;

  function ir(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full flex-col bg-white shadow-2xl sm:mx-auto sm:my-6 sm:h-[min(90vh,640px)] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
                <Search size={16} />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Pesquisa geral</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por CNPJ, CPF, nome, tema de OS, endereço…"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-10 text-sm sm:text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Limpar"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setModo("limitada")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  modo === "limitada"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <ShieldCheck size={15} /> Limitada (LGPD)
              </button>
              <button
                onClick={() => podeIlimitada && setModo("ilimitada")}
                disabled={!podeIlimitada}
                title={
                  podeIlimitada
                    ? "Pesquisa ilimitada"
                    : "Sem permissão — solicite ao administrador"
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  modo === "ilimitada"
                    ? "bg-white text-slate-800 shadow-sm"
                    : podeIlimitada
                      ? "text-slate-500 hover:text-slate-700"
                      : "cursor-not-allowed text-slate-300"
                }`}
              >
                {podeIlimitada ? (
                  <Search size={15} />
                ) : (
                  <Lock size={15} />
                )}
                Ilimitada
              </button>
            </div>
            {!podeIlimitada && (
              <span className="hidden text-xs text-slate-400 sm:block">
                sem permissão
              </span>
            )}
          </div>

          {modo === "limitada" && q.trim().length >= 2 && (
            <p className="mt-2 text-xs text-slate-400">
              Resultados protegidos pela LGPD: CPF/CNPJ e endereços mascarados.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 size={18} className="animate-spin" /> Buscando…
            </div>
          )}

          {!loading && erro && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>
          )}

          {!loading && !erro && q.trim().length < 2 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
              <Search size={28} />
              <p className="text-sm">Digite ao menos 2 caracteres para pesquisar.</p>
            </div>
          )}

          {!loading && !erro && q.trim().length >= 2 && !total && (
            <div className="py-10 text-center text-slate-400">
              <p className="text-sm">Nenhum resultado para "{q.trim()}".</p>
            </div>
          )}

          {resultado && resultado.os.length > 0 && (
            <Seção titulo={`Ordens de serviço (${resultado.os.length})`}>
              {resultado.os.map((o) => (
                <button
                  key={`os-${o.id}`}
                  onClick={() => ir(`/os/${o.id}`)}
                  className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">#{o.numero}</span>
                    <span className="truncate text-sm text-slate-600">{o.tema}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <Badge text={o.status} color="bg-slate-100 text-slate-600 ring-slate-300" />
                    {o.cnpj && <span className="tabular-nums">{o.cnpj}</span>}
                    {o.prazo_data && <span>Prazo: {fmtData(o.prazo_data)}</span>}
                  </span>
                </button>
              ))}
            </Seção>
          )}

          {resultado && resultado.estabelecimentos.length > 0 && (
            <Seção titulo={`Estabelecimentos (${resultado.estabelecimentos.length})`}>
              {resultado.estabelecimentos.map((e) => (
                <button
                  key={`est-${e.id}`}
                  onClick={() => ir("/estabelecimentos")}
                  className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-sky-50"
                >
                  <span className="flex items-center gap-2">
                    <Store size={15} className="text-slate-400" />
                    <span className="truncate text-sm font-medium text-slate-700">{e.razao_social}</span>
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    CNPJ {e.cnpj}
                    {e.endereco && ` · ${e.endereco}`}
                  </span>
                </button>
              ))}
            </Seção>
          )}

          {resultado && resultado.autos.length > 0 && (
            <Seção titulo={`Autos de infração (${resultado.autos.length})`}>
              {resultado.autos.map((a) => (
                <button
                  key={`auto-${a.id}`}
                  onClick={() => ir(`/os/${a.os_id}`)}
                  className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-rose-50"
                >
                  <span className="flex items-center gap-2">
                    <FileWarning size={15} className="text-rose-500" />
                    <span className="truncate text-sm text-slate-700">{a.natureza}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    OS #{a.os_numero} {a.razao_social ? `· ${a.razao_social}` : ""} ·{" "}
                    <Badge text={a.status} color="bg-slate-100 text-slate-600 ring-slate-300" />
                  </span>
                </button>
              ))}
            </Seção>
          )}

          {resultado && resultado.usuarios.length > 0 && (
            <Seção titulo={`Usuários (${resultado.usuarios.length})`}>
              {resultado.usuarios.map((u) => (
                <button
                  key={`usr-${u.id}`}
                  onClick={() => ir("/admin")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserRound size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{u.nome}</p>
                    <p className="text-xs text-slate-400">
                      {u.perfil} · {u.email}
                    </p>
                  </div>
                  {u.cpf && <span className="text-xs tabular-nums text-slate-400">{u.cpf}</span>}
                </button>
              ))}
            </Seção>
          )}

          {!loading && !erro && q.trim().length >= 2 && total > 0 && modo === "ilimitada" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">
              <Building2 size={15} />
              Pesquisa ilimitada registrada no log de auditoria (LGPD).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Seção({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {children}
      </div>
    </div>
  );
}