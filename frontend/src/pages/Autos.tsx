import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileWarning } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { AutoInfracaoLista } from "../lib/types";
import { Badge, Card, SkeletonLista, STATUS_COLORS, fmtData, fmtMoeda } from "../components/ui";

export default function Autos() {
  usePageTitle("Autos de Infração");
  const navigate = useNavigate();
  const [autos, setAutos] = useState<AutoInfracaoLista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AutoInfracaoLista[]>("/autos")
      .then(setAutos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Autos de Infração</h1>
        <p className="text-sm text-slate-500">
          Integração: na vida real, o AI segue para o sistema tributário e o SISAF recebe o status (pago/não pago).
        </p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonLista n={6} />
        ) : autos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
            <FileWarning size={28} />
            <p className="text-sm">Nenhum auto de infração registrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-5 py-3">OS</th>
                  <th className="px-5 py-3">Natureza</th>
                  <th className="px-5 py-3">Estabelecimento</th>
                  <th className="px-5 py-3">Valor</th>
                  <th className="px-5 py-3">Prazo pagamento</th>
                  <th className="px-5 py-3">Reincidência</th>
                  <th className="px-5 py-3">Status AI</th>
                  <th className="px-5 py-3">Tributário</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {autos.map((ai) => (
                  <tr
                    key={ai.id}
                    onClick={() => navigate(`/os/${ai.os_id}`)}
                    className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-brand-50/50"
                  >
                    <td className="px-5 py-3">
                      <span className="inline-block rounded-lg bg-brand-50 px-2 py-0.5 font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
                        #{ai.os_numero}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-slate-600">
                      <p className="truncate font-medium">{ai.natureza}</p>
                      <p className="text-xs text-slate-400">{ai.tema}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {ai.razao_social ?? "Pessoa física"}
                      {ai.cnpj && <p className="text-xs text-slate-400">CNPJ {ai.cnpj}</p>}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{fmtMoeda(ai.valor_total)}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtData(ai.prazo_pagamento)}</td>
                    <td className="px-5 py-3">
                      {ai.reincidente ? (
                        <Badge text="REINCIDENTE" color="bg-rose-600 text-white ring-rose-600" />
                      ) : (
                        <Badge text="Primeira ocorrência" />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge text={ai.status} color={STATUS_COLORS[ai.status]} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge text={ai.status_tributario} color={STATUS_COLORS[ai.status_tributario]} />
                    </td>
                    <td className="px-2 py-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700">
                      <ChevronRight size={16} />
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