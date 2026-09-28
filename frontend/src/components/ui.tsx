import { createContext, ReactNode, useContext, useState } from "react";
import { Loader2, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { STATUS_OS_LABEL, StatusOS } from "../lib/types";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounterRef = { current: 0 };

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = ++idCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  const styles = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-brand-600 text-white",
  };
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };
  const Icon = icons[toast.type];

  return (
    <div
      className={`pointer-events-auto animate-slide-in flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg min-w-[280px] max-w-md ${styles[toast.type]}`}
      onClick={() => onClose(toast.id)}
    >
      <Icon size={20} className="shrink-0" />
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export const STATUS_COLORS: Record<string, string> = {
  criada: "bg-sky-100 text-sky-800 ring-sky-300",
  vinculada: "bg-indigo-100 text-indigo-800 ring-indigo-300",
  em_execucao: "bg-amber-100 text-amber-800 ring-amber-300",
  devolvida: "bg-violet-100 text-violet-800 ring-violet-300",
  concluida: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  arquivada: "bg-slate-200 text-slate-700 ring-slate-300",
  desarquivada: "bg-cyan-100 text-cyan-800 ring-cyan-300",
  cancelada: "bg-rose-100 text-rose-800 ring-rose-300",
  rascunho: "bg-gray-100 text-gray-700 ring-gray-300",
  lavrado: "bg-rose-100 text-rose-800 ring-rose-300",
  encaminhado: "bg-amber-100 text-amber-800 ring-amber-300",
  julgado: "bg-indigo-100 text-indigo-800 ring-indigo-300",
  anulado: "bg-slate-200 text-slate-700 ring-slate-300",
  pago: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  nao_pago: "bg-rose-100 text-rose-800 ring-rose-300",
  pendente: "bg-slate-100 text-slate-600 ring-slate-300",
  enviado: "bg-sky-100 text-sky-800 ring-sky-300",
};

export function Badge({
  text,
  color = "bg-slate-100 text-slate-700 ring-slate-300",
  title,
  className = "",
  onClick,
}: {
  text: ReactNode;
  color?: string;
  title?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <span
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition ${color} ${className}`}
    >
      {text}
    </span>
  );
}

export function StatusOSBadge({ status }: { status: StatusOS }) {
  return <Badge text={STATUS_OS_LABEL[status]} color={STATUS_COLORS[status]} />;
}

export function Card({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "text-brand-800",
  sub,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
  sub?: string;
  onClick?: () => void;
}) {
  const tone = accent.replace("text-", "");
  const cls = onClick
    ? "cursor-pointer transition hover:border-brand-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-none"
    : "";
  return (
    <Card className={`p-4 sm:p-5 ${cls}`}>
      <button onClick={onClick} disabled={!onClick} className={`w-full text-left ${onClick ? "" : "cursor-default"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
            <p className={`mt-1 text-2xl font-semibold sm:text-3xl ${accent}`}>{value}</p>
            {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
          </div>
          {icon && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}/10`}>
              {icon}
            </div>
          )}
        </div>
      </button>
    </Card>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-brand-800 text-white hover:bg-brand-900 disabled:bg-brand-300",
    secondary:
      "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:cursor-not-allowed active:scale-[0.98] ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function SkeletonLista({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse px-5 py-4">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  titulo,
  descricao,
  action,
  className = "",
}: {
  icon?: ReactNode;
  titulo: string;
  descricao?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center ${className}`}>
      {icon && <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{titulo}</p>
      {descricao && <p className="max-w-sm text-xs text-slate-400">{descricao}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`animate-rise-in max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export function fmtData(d?: string): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function fmtDataHora(d?: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMoeda(v?: number): string {
  if (v === undefined || v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function masckCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}