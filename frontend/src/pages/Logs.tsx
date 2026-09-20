import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { LogAuditoria } from "../lib/types";
import { Badge, Card, SkeletonLista, fmtDataHora } from "../components/ui";

export default function Logs() {
  usePageTitle("Log de Auditoria");
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LogAuditoria[]>("/log?limite=200")
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Log de Auditoria</h1>
        <p className="text-sm text-slate-500">
          Trilha imutável de cada passo do auditor e das transições da OS (RN-14).
        </p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonLista n={8} />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
            <ScrollText size={28} />
            <p className="text-sm">Nenhum registro no log de auditoria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Entidade</th>
                  <th className="px-5 py-3">Ação</th>
                  <th className="px-5 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{fmtDataHora(l.criado_em)}</td>
                    <td className="px-5 py-2.5 text-slate-600">#{l.usuario_id ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <Badge text={l.entidade.replace("_", " ")} />
                      {l.entidade_id && <span className="ml-1 text-xs text-slate-400">id {l.entidade_id}</span>}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-slate-700">{l.acao}</td>
                    <td className="max-w-sm px-5 py-2.5">
                      {l.dados ? (
                        <pre className="max-h-20 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-500">
                          {JSON.stringify(l.dados)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}