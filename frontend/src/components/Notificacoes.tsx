import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { OrdemServico } from "../lib/types";
import { StatusOSBadge, fmtData } from "./ui";

const ATIVOS = ["criada", "vinculada", "em_execucao", "devolvida", "desarquivada"];

interface Alerta {
  os: OrdemServico;
  dias: number;
}

export default function Notificacoes() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<OrdemServico[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<OrdemServico[]>("/os/minhas")
      .then(setOs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const hoje = new Date();
  const alertas: Alerta[] = os
    .filter((o) => ATIVOS.includes(o.status) && o.prazo_data)
    .map((o) => ({
      os: o,
      dias: Math.ceil((new Date(o.prazo_data!).getTime() - hoje.getTime()) / 864e5),
    }))
    .filter((a) => a.dias <= 3)
    .sort((a, b) => a.dias - b.dias);

  const total = alertas.length;
  const atrasadas = alertas.filter((a) => a.dias < 0).length;

  function abrir(id: number) {
    setOpen(false);
    navigate(`/os/${id}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell size={19} />
        {total > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              atrasadas > 0 ? "bg-rose-600" : "bg-gold text-brand-950"
            }`}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-rise-in absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notificações</p>
            {total > 0 && (
              <span className="text-xs font-medium text-slate-400">{total} pendência(s)</span>
            )}
          </div>

          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 size={22} className="text-brand-700" />
              <p className="text-sm text-slate-500">Nenhuma pendência de prazo. Tudo em dia.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {alertas.map(({ os: o, dias }) => (
                <button
                  key={o.id}
                  onClick={() => abrir(o.id)}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-brand-50/60"
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      dias < 0 ? "bg-rose-100 text-rose-700" : "bg-gold/15 text-gold-dark"
                    }`}
                  >
                    {dias < 0 ? <AlertTriangle size={16} /> : <CalendarClock size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      OS #{o.numero}
                      <StatusOSBadge status={o.status} />
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{o.tema}</p>
                    <p className={`mt-0.5 text-xs font-medium ${dias < 0 ? "text-rose-600" : "text-gold-dark"}`}>
                      {dias < 0 ? `Atrasada há ${-dias} dia(s)` : dias === 0 ? "Vence hoje" : `Vence em ${dias} dia(s)`}
                      {" · "}
                      {fmtData(o.prazo_data)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setOpen(false);
              navigate("/os?vencendo=1");
            }}
            className="block w-full border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-brand-800 transition hover:bg-slate-100"
          >
            Ver todas as OS com prazo
          </button>
        </div>
      )}
    </div>
  );
}