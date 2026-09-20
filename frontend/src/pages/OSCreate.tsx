import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import {
  Especialidade,
  OrdemServico,
  ORIGEM_SIGLA,
  ORIGENS,
  Origem,
  ProgramacaoFiscal,
  Unidade,
  Usuario,
} from "../lib/types";
import { Badge, Btn, Card, Field, inputCls, maskCNPJ, Spinner } from "../components/ui";

function Secao({ n, titulo, desc }: { n: number; titulo: string; desc?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-semibold text-white">
        {n}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

export default function OSCreate() {
  usePageTitle("Nova OS");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [esp, setEsp] = useState<Especialidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pfos, setPfos] = useState<ProgramacaoFiscal[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [origem, setOrigem] = useState<Origem>(
    (searchParams.get("origem") as Origem) || "ouvidoria"
  );
  const [unidadeResponsavel, setUnidadeResponsavel] = useState("");
  const [pfoId, setPfoId] = useState(searchParams.get("pfo") ?? "");
  const [tema, setTema] = useState("");
  const [ra, setRa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [raio, setRaio] = useState("50");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");

  const [frentes, setFrentes] = useState<{ especialidade_id: number; descricao: string }[]>([]);
  const [auditores, setAuditores] = useState<{ usuario_id: number; frente_id?: number }[]>([]);

  useEffect(() => {
    api.get<Especialidade[]>("/especialidades").then(setEsp).catch(console.error);
    api.get<Usuario[]>("/usuarios").then(setUsuarios).catch(console.error);
    api.get<Unidade[]>("/unidades").then(setUnidades).catch(console.error);
    api.get<ProgramacaoFiscal[]>("/programacoes").then(setPfos).catch(console.error);
  }, []);

  const unidadesPai = useMemo(
    () => unidades.filter((u) => !u.unidade_pai_id),
    [unidades]
  );

  const semAuditoresNaCriacao = origem === "ouvidoria" || origem === "programacao";

  const auditoresCampo = useMemo(
    () => usuarios.filter((u) => u.perfil?.codigo === "auditor_campo" && u.ativo),
    [usuarios]
  );

  function toggleFrente(id: number) {
    setFrentes((prev) =>
      prev.some((f) => f.especialidade_id === id)
        ? prev.filter((f) => f.especialidade_id !== id)
        : [...prev, { especialidade_id: id, descricao: "" }]
    );
    setAuditores((prev) => prev.filter((a) => a.frente_id !== id));
  }

  function toggleAuditor(id: number) {
    setAuditores((prev) =>
      prev.some((a) => a.usuario_id === id)
        ? prev.filter((a) => a.usuario_id !== id)
        : [
            ...prev,
            {
              usuario_id: id,
              frente_id: frentes.length === 1 ? frentes[0].especialidade_id : undefined,
            },
          ]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!tema.trim()) return setErro("Informe o tema da OS");
    if (frentes.length === 0) return setErro("Selecione ao menos uma especialidade (frente)");
    if (origem === "ouvidoria" && !unidadeResponsavel)
      return setErro("Ouvidoria: informe a unidade responsável (encaminhamento)");
    if (origem === "programacao" && !pfoId)
      return setErro("Programação: selecione a PFO de referência");
    if (!semAuditoresNaCriacao && auditores.length === 0)
      return setErro("Vincule ao menos um auditor");

    setSalvando(true);
    try {
      const nova = await api.post<OrdemServico>("/os", {
        origem,
        tema,
        ra: ra || null,
        cnpj: cnpj.replace(/\D/g, "") || null,
        endereco: endereco || null,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
        raio_geo: parseFloat(raio) || 50,
        prazo_data: prazo || null,
        descricao: descricao || null,
        frentes,
        auditores,
        unidade_responsavel_id: origem === "ouvidoria" ? Number(unidadeResponsavel) || null : null,
        pfo_id: origem === "programacao" ? Number(pfoId) || null : null,
      });
      navigate(`/os/${nova.id}`);
    } catch (err: any) {
      setErro(err.message || "Erro ao criar OS");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate("/os")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft size={16} /> Voltar para OS
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nova Ordem de Serviço</h1>
        <p className="text-sm text-slate-500">
          Uma OS pode envolver mais de uma especialidade — cada frente segue para o auditor correspondente (RN-02).
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Card className="p-5">
          <Secao n={1} titulo="Dados gerais" desc="Informações iniciais da fiscalização." />
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Origem">
                <select value={origem} onChange={(e) => { setOrigem(e.target.value as Origem); setUnidadeResponsavel(""); setPfoId(""); }} className={inputCls}>
                  {(Object.keys(ORIGENS) as Origem[]).map((o) => (
                    <option key={o} value={o}>
                      {ORIGENS[o]} ({ORIGEM_SIGLA[o]})
                    </option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Tema">
                  <input value={tema} onChange={(e) => setTema(e.target.value)} className={inputCls} placeholder="Ex.: Denúncia de atividade sem alvará" />
                </Field>
              </div>
            </div>
            {origem === "ouvidoria" && (
              <Field
                label="Unidade responsável (encaminhamento)"
                hint="A Ouvidoria encaminha apenas para unidades raiz — dentro delas, a distribuição faz o resto."
              >
                <select value={unidadeResponsavel} onChange={(e) => setUnidadeResponsavel(e.target.value)} className={inputCls}>
                  <option value="">Selecione a unidade responsável…</option>
                  {unidadesPai.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.sigla})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {origem === "programacao" && (
              <Field
                label="PFO de referência (documento pai)"
                hint="A OS tipo PFO herda fundamentação legal, tema e raio. Nasce sem auditor — vincule depois."
              >
                <select value={pfoId} onChange={(e) => setPfoId(e.target.value)} className={inputCls}>
                  <option value="">Selecione a PFO…</option>
                  {pfos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.tema} ({p.unidade_sigla})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="RA">
                <input value={ra} onChange={(e) => setRa(e.target.value)} className={inputCls} placeholder="Ex.: Ceilândia" />
              </Field>
              <Field label="CNPJ">
                <input value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} className={inputCls} placeholder="00.000.000/0000-00" inputMode="numeric" />
              </Field>
              <Field label="Endereço">
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Latitude">
                <input value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} placeholder="-15.8170" inputMode="decimal" />
              </Field>
              <Field label="Longitude">
                <input value={lng} onChange={(e) => setLng(e.target.value)} className={inputCls} placeholder="-47.8900" inputMode="decimal" />
              </Field>
              <Field label="Raio geo (m)" hint="raio de cruzamento, configurável por OS">
                <input value={raio} onChange={(e) => setRaio(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Prazo de atendimento">
                <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} placeholder="Contexto, denunciado, histórico do local…" />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <Secao n={2} titulo="Frentes por especialidade (módulos)" desc="A OS passa a valer para cada módulo selecionado." />
          <div className="grid gap-3 sm:grid-cols-3">
            {esp.map((e) => {
              const ativo = frentes.some((f) => f.especialidade_id === e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleFrente(e.id)}
                  aria-pressed={ativo}
                  className={`rounded-xl border p-4 text-left transition ${
                    ativo ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${ativo ? "text-brand-800" : "text-slate-700"}`}>Módulo {e.sigla}</span>
                    {ativo && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                        Selecionada
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{e.nome}</p>
                </button>
              );
            })}
          </div>

          <Secao
            n={3}
            titulo="Auditores vinculados"
            desc={
              semAuditoresNaCriacao
                ? "Ouvidoria e PFO não exigem auditor na criação — a distribuição acontece na caixa ou depois da abertura."
                : "O sistema respeita a unidade do criador — atribuição restrita aos auditores da sua unidade (RN-09)."
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {auditoresCampo.map((u) => {
              const ativo = auditores.some((a) => a.usuario_id === u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${ativo ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={() => toggleAuditor(u.id)}
                    className="h-4 w-4 accent-brand-800"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{u.nome}</p>
                    <p className="truncate text-xs text-slate-400">
                      {u.vinculos.map((v) => `${v.unidade_sigla}·${v.especialidade_sigla}`).join(" | ")}
                    </p>
                  </div>
                  {ativo && frentes.length > 1 && (
                    <select
                      className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      value={auditores.find((a) => a.usuario_id === u.id)?.frente_id ?? ""}
                      onChange={(e) =>
                        setAuditores((prev) =>
                          prev.map((a) =>
                            a.usuario_id === u.id ? { ...a, frente_id: e.target.value ? Number(e.target.value) : undefined } : a
                          )
                        )
                      }
                    >
                      <option value="">Todas as frentes</option>
                      {frentes.map((f) => (
                        <option key={f.especialidade_id} value={f.especialidade_id}>
                          {esp.find((x) => x.id === f.especialidade_id)?.sigla}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              );
            })}
          </div>
        </Card>

        <Card className="sticky bottom-20 z-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:bottom-4">
          <div className="flex flex-wrap gap-2">
            {frentes.length === 0 && auditores.length === 0 && (
              <span className="text-xs text-slate-400">Preencha os dados para criar a OS.</span>
            )}
            {frentes.map((f) => (
              <Badge key={f.especialidade_id} text={`Módulo ${esp.find((x) => x.id === f.especialidade_id)?.sigla}`} color="bg-brand-50 text-brand-800 ring-brand-300" />
            ))}
            {auditores.map((a) => (
              <Badge key={a.usuario_id} text={usuarios.find((u) => u.id === a.usuario_id)?.nome.split(" ")[0] ?? "?"} color="bg-sky-100 text-sky-800 ring-sky-300" />
            ))}
          </div>
          <Btn type="submit" disabled={salvando}>
            {salvando ? <Spinner size={16} /> : <Plus size={16} />} {salvando ? "Criando…" : "Criar OS"}
          </Btn>
        </Card>
        {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}
      </form>
    </div>
  );
}