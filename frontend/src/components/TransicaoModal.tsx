import { useState } from "react";
import { ArrowRight, CornerUpLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { OrdemServico, StatusOS, STATUS_TRANSICAO_LABEL, TRANSICOES } from "../lib/types";
import { Btn, Modal, StatusOSBadge } from "./ui";

const RETORNO: StatusOS[] = ["devolvida", "arquivada", "desarquivada"];

export default function TransicaoModal({
  os,
  modo,
  onClose,
  onDone,
}: {
  os: OrdemServico | null;
  modo: "tramitar" | "retornar";
  onClose: () => void;
  onDone: () => void;
}) {
  const [enviando, setEnviando] = useState<StatusOS | null>(null);
  const [erro, setErro] = useState("");

  if (!os) return null;

  const permitidas = TRANSICOES[os.status] ?? [];
  const opcoes =
    modo === "tramitar"
      ? permitidas.filter((s) => s !== "cancelada")
      : permitidas.filter((s) => RETORNO.includes(s));

  async function executar(status: StatusOS) {
    if (!os) return;
    setErro("");
    setEnviando(status);
    try {
      await api.post(`/os/${os.id}/transicao`, { status });
      onDone();
      onClose();
    } catch (err: any) {
      setErro(err.message || "Não foi possível concluir a tramitação");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <Modal
      open
      title={modo === "tramitar" ? "Tramitar documento" : "Retornar documento"}
      onClose={onClose}
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-sm font-semibold text-slate-700">OS #{os.numero}</span>
        <StatusOSBadge status={os.status} />
        <span className="ml-auto truncate text-xs text-slate-400">{os.tema}</span>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {modo === "tramitar" ? "Encaminhar para" : "Retornar para"}
      </p>

      {opcoes.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhuma tramitação disponível para o status atual desta OS.
        </p>
      ) : (
        <div className="space-y-2">
          {opcoes.map((s) => (
            <button
              key={s}
              disabled={enviando !== null}
              onClick={() => executar(s)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50/50 disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                {modo === "tramitar" ? <ArrowRight size={16} className="text-brand-700" /> : <CornerUpLeft size={16} className="text-rose-500" />}
                {STATUS_TRANSICAO_LABEL[s]}
              </span>
              {enviando === s ? (
                <Loader2 size={16} className="animate-spin text-slate-400" />
              ) : (
                <StatusOSBadge status={s} />
              )}
            </button>
          ))}
        </div>
      )}

      {erro && (
        <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{erro}</p>
      )}

      <div className="mt-5 flex justify-end">
        <Btn variant="secondary" onClick={onClose}>
          Cancelar
        </Btn>
      </div>
    </Modal>
  );
}