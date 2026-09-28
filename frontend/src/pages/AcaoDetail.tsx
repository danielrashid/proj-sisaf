import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  FileWarning,
  MapPin,
  PackageSearch,
  UserRound,
} from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import {
  AcaoFiscal,
  CATEGORIA_DOCUMENTO_COLORS,
  CATEGORIA_DOCUMENTO_LABEL,
  MedidaStatus,
  OrdemServico,
  RegiaoOut,
  STATUS_DOCUMENTO_COLORS,
  STATUS_DOCUMENTO_LABEL,
  TIPO_ACAO_LABEL,
} from "../lib/types";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  STATUS_COLORS,
  fmtData,
  fmtDataHora,
  fmtMoeda,
} from "../components/ui";

const MEDIDA_LABEL: Record<MedidaStatus, string> = {
  mantida: "Mantida",
  liberada: "Liberada",
  cumprida: "Cumprida",
};

const TRAMITE_LABEL: Record<string, string> = {
  emitir: "Emitido",
  edicao_solicitada: "Edição solicitada",
  edicao_aprovada: "Edição aprovada",
  edicao_rejeitada: "Edição rejeitada",
  juntar: "Juntado ao processo",
};

export default function AcaoDetail() {
  usePageTitle("Documento");
  const { id } = useParams();
  const acaoId = Number(id);
  const navigate = useNavigate();
  const [acao, setAcao] = useState<AcaoFiscal | null>(null);
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [regioes, setRegioes] = useState<RegiaoOut[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get<RegiaoOut[]>("/regioes").then(setRegioes).catch(() => []);
  }, []);

  useEffect(() => {
    if (!acaoId) return;
    api
      .get<AcaoFiscal>(`/acoes/${acaoId}`)
      .then((a) => {
        setAcao(a);
        return api.get<OrdemServico>(`/os/${a.os_id}`);
      })
      .then(setOs)
      .catch((e: any) => setErro(e.message));
  }, [acaoId]);

  if (erro)
    return (
      <div className="space-y-5">
        <EmptyState
          icon={<FileWarning size={22} />}
          titulo="Documento não encontrado"
          descricao={erro}
          action={
            <Btn variant="secondary" onClick={() => navigate("/autos")}>
              <ArrowLeft size={16} /> Voltar
            </Btn>
          }
        />
      </div>
    );

  if (!acao)
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <Card className="space-y-3 p-6">
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        </Card>
      </div>
    );

  const td = acao.tipo_documento;
  const nomeTipo = td?.nome ?? TIPO_ACAO_LABEL[acao.tipo] ?? acao.tipo;
  const regiaoNome =
    acao.regiao_nome ??
    (acao.id_regiao != null ? regioes.find((r) => r.id === acao.id_regiao)?.nome : undefined);
  const ai = acao.auto_infracao;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="ghost" onClick={() => navigate("/autos")}>
            <ArrowLeft size={16} /> Autos
          </Btn>
          <Badge text={nomeTipo} color={td ? CATEGORIA_DOCUMENTO_COLORS[td.categoria] : "bg-slate-100 text-slate-600 ring-slate-300"} />
          {td && (
            <Badge
              text={CATEGORIA_DOCUMENTO_LABEL[td.categoria]}
              color="bg-slate-100 text-slate-500 ring-slate-200"
            />
          )}
          <Badge
            text={STATUS_DOCUMENTO_LABEL[acao.status_documento]}
            color={STATUS_DOCUMENTO_COLORS[acao.status_documento]}
          />
        </div>
        <span className="font-mono text-sm font-semibold text-slate-700">
          {acao.codigo_documento ?? "Sem número (rascunho)"}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{acao.titulo}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {fmtDataHora(acao.criado_em)} · {acao.auditor_nome}
              {acao.emitido_em && acao.status_documento !== "rascunho" && (
                <> · Emitido em {fmtDataHora(acao.emitido_em)}</>
              )}
              {acao.juntado_em && <> · Juntado em {fmtDataHora(acao.juntado_em)}</>}
            </p>
          </div>

          {acao.descricao && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm text-slate-600">{acao.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={12} /> Região
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">{regiaoNome ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={12} /> Latitude
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {acao.latitude != null ? acao.latitude.toFixed(6) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={12} /> Longitude
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {acao.longitude != null ? acao.longitude.toFixed(6) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <CalendarDays size={12} /> Medida
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {acao.medida_status ? MEDIDA_LABEL[acao.medida_status] : "—"}
              </p>
            </div>
          </div>

          {ai && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <FileWarning size={16} className="text-rose-600" />
                <span className="text-sm font-semibold text-rose-700">Autuação</span>
                {ai.reincidente && <Badge text="REINCIDENTE" color="bg-rose-600 text-white ring-rose-600" />}
                <Badge text={`Status: ${ai.status}`} color={STATUS_COLORS[ai.status]} />
                <Badge text={`Tributário: ${ai.status_tributario}`} color={STATUS_COLORS[ai.status_tributario]} />
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-rose-700">Natureza da infração</p>
                  <p className="mt-1 text-sm text-slate-700">{ai.natureza}</p>
                  {ai.item_legislacao && (
                    <p className="mt-1 text-xs text-slate-500">Item de legislação: {ai.item_legislacao}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-rose-700">Estabelecimento</p>
                  <p className="mt-1 text-sm text-slate-700">{ai.razao_social ?? "Pessoa física"}</p>
                  {ai.cnpj && <p className="mt-1 font-mono text-xs text-slate-500">CNPJ {ai.cnpj}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Valor</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{fmtMoeda(ai.valor_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pagar até</p>
                  <p className="mt-1 text-sm text-slate-700">{fmtData(ai.prazo_pagamento)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Impugnar até</p>
                  <p className="mt-1 text-sm text-slate-700">{fmtData(ai.prazo_recurso)}</p>
                </div>
              </div>
              {ai.observacoes && <p className="mt-3 text-sm text-slate-600">{ai.observacoes}</p>}
            </div>
          )}

          {acao.itens_apreensao && acao.itens_apreensao.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
                <PackageSearch size={16} /> Itens apreendidos / retidos
              </p>
              <ul className="mt-3 space-y-2">
                {acao.itens_apreensao.map((i) => (
                  <li key={i.id} className="rounded-lg border border-indigo-100 bg-white p-3 text-sm">
                    <span className="font-medium text-slate-700">{i.descricao}</span>
                    {i.quantidade && <span className="text-slate-500"> · Qtd: {i.quantidade}</span>}
                    {(i.custodiante || i.local_guarda) && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {i.custodiante && <>Custodiante: {i.custodiante}</>}
                        {i.custodiante && i.local_guarda && " · "}
                        {i.local_guarda && <>Guarda: {i.local_guarda}</>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acao.termo_morador && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
              <p className="text-sm font-semibold text-teal-800">Morador em situação de rua</p>
              <p className="mt-1 text-sm text-slate-700">
                <strong>{acao.termo_morador.nome_completo}</strong>
                {acao.termo_morador.documento && <span> · {acao.termo_morador.documento}</span>}
                {acao.termo_morador.data_inicio && <span> · desde {fmtData(acao.termo_morador.data_inicio)}</span>}
              </p>
              {acao.termo_morador.endereco_habitual && (
                <p className="mt-0.5 text-sm text-slate-600">{acao.termo_morador.endereco_habitual}</p>
              )}
              {acao.termo_morador.observacoes && (
                <p className="mt-0.5 text-sm text-slate-500">{acao.termo_morador.observacoes}</p>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-brand-700" />
              <h2 className="text-sm font-semibold text-slate-700">Ordem de serviço</h2>
            </div>
            <p className="mt-3 text-sm text-slate-400">Este documento pertence à OS</p>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-lg font-bold text-brand-800">#{os?.numero ?? acao.os_id}</p>
                <p className="text-xs text-slate-500">{os?.tema ?? ""}</p>
              </div>
              <Link
                to={`/os/${acao.os_id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-900"
              >
                Abrir OS <ChevronRight size={14} />
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
              <UserRound size={12} /> Lavrado por {acao.auditor_nome}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-700">Tramitação</h2>
            {acao.tramites && acao.tramites.length > 0 ? (
              <ol className="mt-3 space-y-0">
                {acao.tramites.map((t, i) => (
                  <li key={t.id} className="relative pb-4 pl-5 last:pb-0">
                    {i < acao.tramites!.length - 1 && (
                      <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />
                    )}
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                    <p className="text-sm font-medium text-slate-700">
                      {TRAMITE_LABEL[t.acao] ?? t.acao}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDataHora(t.criado_em)}</p>
                    {t.justificativa && <p className="mt-1 text-xs text-slate-500">{t.justificativa}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Nenhuma tramitação registrada.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}