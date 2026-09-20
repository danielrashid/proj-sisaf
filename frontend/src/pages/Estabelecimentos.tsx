import { useState } from "react";
import { Search, Store } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { Historico } from "../lib/types";
import { Badge, Btn, Card, Field, STATUS_COLORS, fmtData, inputCls, maskCNPJ } from "../components/ui";
import { TIPO_ACAO_LABEL, STATUS_AI_LABEL } from "../lib/types";

export default function Estabelecimentos() {
  usePageTitle("Estabelecimentos");
  const [cnpj, setCnpj] = useState("");
  const [hist, setHist] = useState<Historico | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = cnpj.replace(/\D/g, "");
    if (limpo.length < 8) return setErro("Informe o CNPJ (ao menos 8 dígitos)");
    setErro("");
    setLoading(true);
    try {
      const h = await api.get<Historico>(`/estabelecimentos/${limpo}/historico`);
      setHist(h);
    } catch (err: any) {
      setErro(err.message || "Não encontrado");
      setHist(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Estabelecimentos</h1>
        <p className="text-sm text-slate-500">
          Histórico de ações do estabelecimento por CNPJ — base para aplicação de penalidades mais severas (reincidência).
        </p>
      </div>

      <Card className="max-w-2xl p-4">
        <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
          <Field label="CNPJ" hint="tente 12345678000190 (Padaria Estrela do Cerrado)">
            <input
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              className={`${inputCls} w-56`}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>
          <Btn type="submit" disabled={loading}>
            <Search size={16} /> {loading ? "Consultando…" : "Consultar histórico"}
          </Btn>
        </form>
        {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}
      </Card>

      {hist && (
        <>
          <Card className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
              <Store size={22} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{hist.razao_social ?? "Pessoa física"}</p>
              <p className="text-sm text-slate-500">CNPJ {hist.cnpj}</p>
            </div>
            {hist.reincidencias.length > 0 && (
              <div className="ml-auto">
                <Badge text={`${hist.reincidencias.length} natureza(s) reincidente(s)`} color="bg-rose-600 text-white ring-rose-600" />
              </div>
            )}
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="overflow-hidden">
              <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                Ações fiscais vinculadas
              </h2>
              <div className="divide-y divide-slate-100">
                {hist.acoes.length === 0 && <p className="p-5 text-sm text-slate-400">Nenhuma ação registrada.</p>}
                {hist.acoes.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Badge text={TIPO_ACAO_LABEL[a.tipo]} color="bg-sky-100 text-sky-800 ring-sky-300" />
                      <p className="font-medium text-slate-700">{a.titulo}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{fmtData(a.criado_em)} · {a.auditor_nome}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                Autos de Infração e reincidências
              </h2>
              <div className="divide-y divide-slate-100">
                {hist.autos.length === 0 && <p className="p-5 text-sm text-slate-400">Nenhum auto registrado.</p>}
                {hist.autos.map((ai) => (
                  <div key={ai.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-700">{ai.natureza}</p>
                      {ai.reincidente ? (
                        <Badge text="REINCIDENTE" color="bg-rose-600 text-white ring-rose-600" />
                      ) : (
                        <Badge text="1ª ocorrência" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <Badge text={`AI ${STATUS_AI_LABEL[ai.status]}`} color={STATUS_COLORS[ai.status]} />
                      <Badge text={`Tributário: ${ai.status_tributario}`} color={STATUS_COLORS[ai.status_tributario]} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}