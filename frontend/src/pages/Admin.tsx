import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../lib/auth";
import type { LucideIcon } from "lucide-react";
import {
  Especialidade,
  Perfil,
  Permissao,
  Unidade,
  Usuario,
  VinculoAdmin,
} from "../lib/types";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Modal,
  Spinner,
  inputCls,
  masckCPF,
} from "../components/ui";

function Switch({
  on,
  onChange,
  busy,
  disabled,
  title,
}: {
  on: boolean;
  onChange: () => void;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onChange}
      disabled={busy || disabled}
      title={title}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "bg-brand-600" : "bg-slate-300"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function BadgeAtivo({ on }: { on: boolean }) {
  return on ? (
    <Badge text="Ativo" color="bg-emerald-100 text-emerald-800 ring-emerald-300" />
  ) : (
    <Badge text="Inativo" color="bg-rose-100 text-rose-800 ring-rose-300" />
  );
}

interface FormUsuarioProps {
  alvo?: Usuario;
  unidades: Unidade[];
  especialidades: Especialidade[];
  perfis: Perfil[];
  permissoes: Permissao[];
  salvando: boolean;
  setSalvando: (v: boolean) => void;
  onSalvo: () => void;
  onClose: () => void;
}

function FormUsuario({
  alvo,
  unidades,
  especialidades,
  perfis,
  permissoes,
  salvando,
  setSalvando,
  onSalvo,
  onClose,
}: FormUsuarioProps) {
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [email, setEmail] = useState(alvo?.email ?? "");
  const [cpf, setCpf] = useState(alvo?.cpf ?? "");
  const [senha, setSenha] = useState("");
  const [perfilId, setPerfilId] = useState<string>(alvo?.perfil_id ? String(alvo.perfil_id) : "");
  const [ativo, setAtivo] = useState(alvo?.ativo ?? true);
  const [vinculos, setVinculos] = useState<VinculoAdmin[]>(
    alvo
      ? alvo.vinculos.map((v) => ({
          unidade_id: v.unidade_id,
          especialidade_id: v.especialidade_id,
          cargo: v.cargo,
          ativo: v.ativo,
        }))
      : []
  );
  const [extraPerms, setExtraPerms] = useState<number[]>(
    alvo
      ? permissoes.filter((p) => alvo.permissoes?.includes(p.codigo)).map((p) => p.id)
      : []
  );
  const [erro, setErro] = useState("");

  function novoVinculo() {
    setVinculos((prev) => [
      ...prev,
      {
        unidade_id: unidades[0]?.id ?? 0,
        especialidade_id: especialidades[0]?.id ?? 0,
        cargo: "",
        ativo: true,
      },
    ]);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || nome.trim().length < 3) return setErro("Informe o nome completo");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErro("E-mail inválido");
    if (!perfilId) return setErro("Selecione o perfil");
    if (!alvo && senha.length < 6) return setErro("A senha deve ter ao menos 6 caracteres");
    for (const v of vinculos) {
      if (!v.unidade_id || !v.especialidade_id) return setErro("Preencha unidade e especialidade dos vínculos");
    }
    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.replace(/\D/g, "") || null,
      perfil_id: Number(perfilId),
      ativo,
      vinculos: vinculos.map((v) => ({
        unidade_id: Number(v.unidade_id),
        especialidade_id: Number(v.especialidade_id),
        cargo: v.cargo.trim() || "Servidor",
        ativo: v.ativo,
      })),
      permissao_ids: extraPerms,
    };
    if (senha) payload.senha = senha;
    setSalvando(true);
    try {
      if (alvo) await api.patch<Usuario>(`/admin/usuarios/${alvo.id}`, payload);
      else await api.post<Usuario>("/admin/usuarios", payload);
      onSalvo();
    } catch (err: any) {
      setErro(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Perfil">
          <select
            className={inputCls}
            value={perfilId}
            onChange={(e) => setPerfilId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} (nível {p.nivel})
              </option>
            ))}
          </select>
        </Field>
        <Field label="E-mail">
          <input
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </Field>
        <Field label="CPF (opcional)">
          <input
            className={inputCls}
            value={cpf}
            onChange={(e) => setCpf(masckCPF(e.target.value))}
            placeholder="000.000.000-00"
          />
        </Field>
        <Field
          label={alvo ? "Nova senha (opcional)" : "Senha"}
          hint={alvo ? "Deixe em branco para manter a atual" : "Mínimo de 6 caracteres"}
        >
          <input
            className={inputCls}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            type="password"
          />
        </Field>
        <Field label="Status">
          <div className="flex items-center gap-3 pt-1">
            <Switch on={ativo} onChange={() => setAtivo((v) => !v)} />
            <span className="text-sm text-slate-600">{ativo ? "Ativo" : "Inativo"}</span>
          </div>
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Vínculos funcionais</span>
          <Btn type="button" variant="ghost" onClick={novoVinculo} className="!px-2 !py-1 text-xs">
            <Plus size={14} /> Adicionar vínculo
          </Btn>
        </div>
        <div className="space-y-2">
          {vinculos.map((v, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <select
                className={inputCls}
                value={v.unidade_id || ""}
                onChange={(e) => {
                  const novo = [...vinculos];
                  novo[i] = { ...v, unidade_id: Number(e.target.value) };
                  setVinculos(novo);
                }}
              >
                <option value="">Unidade…</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.sigla} — {u.nome}
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={v.especialidade_id || ""}
                onChange={(e) => {
                  const novo = [...vinculos];
                  novo[i] = { ...v, especialidade_id: Number(e.target.value) };
                  setVinculos(novo);
                }}
              >
                <option value="">Especialidade…</option>
                {especialidades.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sigla} — {s.nome}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder="Cargo"
                value={v.cargo}
                onChange={(e) => {
                  const novo = [...vinculos];
                  novo[i] = { ...v, cargo: e.target.value };
                  setVinculos(novo);
                }}
              />
              <div className="flex items-center justify-center">
                <Switch
                  on={v.ativo}
                  title="Vínculo ativo"
                  onChange={() => {
                    const novo = [...vinculos];
                    novo[i] = { ...v, ativo: !v.ativo };
                    setVinculos(novo);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setVinculos((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Remover vínculo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {vinculos.length === 0 && (
            <p className="text-xs text-slate-400">
              Sem vínculos — o usuário não verá OS nem a caixa de ouvidorias.
            </p>
          )}
        </div>
      </div>

      {permissoes.length > 0 && (
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Permissões individuais (além do perfil)
          </span>
          <div className="flex flex-wrap gap-2">
            {permissoes.map((p) => (
              <label
                key={p.id}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition ${
                  extraPerms.includes(p.id)
                    ? "border-brand-400 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-brand-800"
                  checked={extraPerms.includes(p.id)}
                  onChange={() =>
                    setExtraPerms((prev) =>
                      prev.includes(p.id)
                        ? prev.filter((x) => x !== p.id)
                        : [...prev, p.id]
                    )
                  }
                />
                {p.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn type="submit" disabled={salvando}>
          {salvando ? <Spinner size={16} /> : <Plus size={16} />}
          {alvo ? "Salvar alterações" : "Cadastrar usuário"}
        </Btn>
      </div>
    </form>
  );
}

interface FormUnidadeProps {
  alvo?: Unidade;
  unidades: Unidade[];
  especialidades: Especialidade[];
  salvando: boolean;
  setSalvando: (v: boolean) => void;
  onSalvo: () => void;
  onClose: () => void;
}

function FormUnidade({
  alvo,
  unidades,
  especialidades,
  salvando,
  setSalvando,
  onSalvo,
  onClose,
}: FormUnidadeProps) {
  const options = unidades.filter((u) => (alvo ? u.id !== alvo.id : true));
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [sigla, setSigla] = useState(alvo?.sigla ?? "");
  const [paiId, setPaiId] = useState<string>(alvo?.unidade_pai_id ? String(alvo.unidade_pai_id) : "");
  const [ativo, setAtivo] = useState(alvo?.ativo ?? true);
  const [escolhidas, setEscolhidas] = useState<number[]>(
    alvo ? alvo.especialidades.map((e) => e.especialidade.id) : []
  );
  const [erro, setErro] = useState("");

  function toggleEsp(id: number) {
    setEscolhidas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!sigla.trim()) return setErro("Informe a sigla");
    if (nome.trim().length < 3) return setErro("Informe o nome da unidade");
    setSalvando(true);
    try {
      if (alvo) {
        await api.patch<Unidade>(`/admin/unidades/${alvo.id}`, {
          nome: nome.trim(),
          sigla: sigla.trim().toUpperCase(),
          unidade_pai_id: paiId ? Number(paiId) : null,
          ativo,
          especialidade_ids: escolhidas,
        });
      } else {
        await api.post<Unidade>("/admin/unidades", {
          nome: nome.trim(),
          sigla: sigla.trim().toUpperCase(),
          unidade_pai_id: paiId ? Number(paiId) : null,
          ativo,
          especialidade_ids: escolhidas,
        });
      }
      onSalvo();
    } catch (err: any) {
      setErro(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sigla">
          <input
            className={inputCls}
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase())}
            placeholder="EX: SULOC"
          />
        </Field>
        <Field label="Unidade-pai (opcional)">
          <select className={inputCls} value={paiId} onChange={(e) => setPaiId(e.target.value)}>
            <option value="">Sem unidade-pai</option>
            {options.map((u) => (
              <option key={u.id} value={u.id}>
                {u.sigla} — {u.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Nome da unidade">
        <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
      </Field>
      <Field label="Status">
        <div className="flex items-center gap-3 pt-1">
          <Switch on={ativo} onChange={() => setAtivo((v) => !v)} />
          <span className="text-sm text-slate-600">{ativo ? "Ativo" : "Inativo"}</span>
        </div>
      </Field>
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Módulos (especialidades) da unidade
        </span>
        <div className="flex flex-wrap gap-2">
          {especialidades.map((s) => (
            <label
              key={s.id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition ${
                escolhidas.includes(s.id)
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                className="accent-brand-800"
                checked={escolhidas.includes(s.id)}
                onChange={() => toggleEsp(s.id)}
              />
              {s.sigla} — {s.nome}
            </label>
          ))}
        </div>
      </div>
      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn type="submit" disabled={salvando}>
          {salvando ? <Spinner size={16} /> : <Plus size={16} />}
          {alvo ? "Salvar alterações" : "Criar unidade"}
        </Btn>
      </div>
    </form>
  );
}

function FormPermissao({
  alvo,
  salvando,
  setSalvando,
  onSalvo,
  onClose,
}: {
  alvo?: Permissao;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
  onSalvo: () => void;
  onClose: () => void;
}) {
  const [codigo, setCodigo] = useState(alvo?.codigo ?? "");
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [ativo, setAtivo] = useState(alvo?.ativo ?? true);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!codigo.trim()) return setErro("Informe o código da permissão");
    if (!nome.trim()) return setErro("Informe o nome da permissão");
    setSalvando(true);
    try {
      if (alvo) {
        await api.patch<Permissao>(`/admin/permissoes/${alvo.id}`, {
          nome: nome.trim(),
          ativo,
        });
      } else {
        await api.post<Permissao>("/admin/permissoes", {
          codigo: codigo.trim(),
          nome: nome.trim(),
        });
      }
      onSalvo();
    } catch (err: any) {
      setErro(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" hint="minúsculas, números e _">
          <input
            className={inputCls}
            value={codigo}
            disabled={!!alvo}
            onChange={(e) => setCodigo(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          />
        </Field>
        <Field label="Nome">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
      </div>
      <Field label="Status">
        <div className="flex items-center gap-3 pt-1">
          <Switch on={ativo} onChange={() => setAtivo((v) => !v)} />
          <span className="text-sm text-slate-600">
            {ativo ? "Permissão ativa" : "Permissão inativa"}
          </span>
        </div>
      </Field>
      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn type="submit" disabled={salvando}>
          {salvando ? <Spinner size={16} /> : <Plus size={16} />}
          {alvo ? "Salvar" : "Criar permissão"}
        </Btn>
      </div>
    </form>
  );
}

type Tab = "usuarios" | "unidades" | "permissoes";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "unidades", label: "Unidades", icon: Building2 },
  { key: "permissoes", label: "Permissões", icon: KeyRound },
];

export default function Admin() {
  usePageTitle("Administração");
  const { usuario } = useAuth();
  const nivel = usuario?.perfil?.nivel ?? 0;
  const podeGerir = nivel >= 5;
  const podeEstrutura = nivel >= 6;

  const [tab, setTab] = useState<Tab>("usuarios");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [userForm, setUserForm] = useState<{ alvo?: Usuario } | null>(null);
  const [unitForm, setUnitForm] = useState<{ alvo?: Unidade } | null>(null);
  const [permForm, setPermForm] = useState<{ alvo?: Permissao } | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro("");
    Promise.all([
      api.get<Usuario[]>("/usuarios"),
      api.get<Unidade[]>("/unidades"),
      api.get<Especialidade[]>("/especialidades"),
      podeGerir ? api.get<Perfil[]>("/admin/perfis") : Promise.resolve([] as Perfil[]),
      podeGerir ? api.get<Permissao[]>("/admin/permissoes") : Promise.resolve([] as Permissao[]),
    ])
      .then(([u, un, esp, pf, pm]) => {
        setUsuarios(u);
        setUnidades(un);
        setEspecialidades(esp);
        setPerfis(pf);
        setPermissoes(pm);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [podeGerir]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aposSalvar() {
    setUserForm(null);
    setUnitForm(null);
    setPermForm(null);
    await carregar();
  }

  async function toggleUsuario(u: Usuario) {
    setSalvando(true);
    try {
      await api.patch<Usuario>(`/admin/usuarios/${u.id}`, { ativo: !u.ativo });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !u.ativo } : x)));
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function toggleUnidade(u: Unidade) {
    setSalvando(true);
    try {
      await api.patch<Unidade>(`/admin/unidades/${u.id}`, { ativo: !u.ativo });
      setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !u.ativo } : x)));
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function togglePermissao(p: Permissao) {
    setSalvando(true);
    try {
      await api.patch<Permissao>(`/admin/permissoes/${p.id}`, { ativo: !p.ativo });
      setPermissoes((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !p.ativo } : x)));
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function togglePerfilPermissao(p: Permissao, perfilId: number) {
    const novoIds = p.perfil_ids.includes(perfilId)
      ? p.perfil_ids.filter((x) => x !== perfilId)
      : [...p.perfil_ids, perfilId];
    setSalvando(true);
    try {
      const atualizada = await api.put<Permissao>(`/admin/permissoes/${p.id}/perfis`, {
        perfil_ids: novoIds,
      });
      setPermissoes((prev) => prev.map((x) => (x.id === p.id ? atualizada : x)));
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (!podeGerir) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Acesso restrito a chefes de unidade e acima (nível 5+).
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administração</h1>
          <p className="text-sm text-slate-500">
            Usuários, unidades e base de permissões — tudo com ativo/inativo.
          </p>
        </div>
        {tab === "usuarios" && (
          <Btn onClick={() => setUserForm({})}>
            <Plus size={16} /> Novo usuário
          </Btn>
        )}
        {tab === "unidades" && podeEstrutura && (
          <Btn onClick={() => setUnitForm({})}>
            <Plus size={16} /> Nova unidade
          </Btn>
        )}
        {tab === "permissoes" && podeEstrutura && (
          <Btn onClick={() => setPermForm({})}>
            <Plus size={16} /> Nova permissão
          </Btn>
        )}
      </div>

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-brand-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {label}
            {key === "usuarios" && <span className="opacity-70">{usuarios.length}</span>}
            {key === "unidades" && <span className="opacity-70">{unidades.length}</span>}
            {key === "permissoes" && <span className="opacity-70">{permissoes.length}</span>}
          </button>
        ))}
      </div>

      {tab === "usuarios" && (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-5 text-sm text-slate-400">Carregando…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Vínculos</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{u.nome}</p>
                        <p className="text-xs text-slate-400">
                          {u.email} · {u.cpf ? masckCPF(u.cpf) : "sem CPF"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={u.perfil?.nome ?? "?"} color="bg-slate-100 text-slate-600 ring-slate-300" />
                        {u.pesquisa_ilimitada && (
                          <Badge
                            text={
                              <span className="inline-flex items-center gap-1">
                                <Search size={11} /> LGPD
                              </span>
                            }
                            color="bg-gold/15 text-gold-dark ring-gold/40"
                            className="ml-1"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.vinculos.map((v) => (
                            <Badge
                              key={v.id}
                              text={`${v.unidade_sigla} · ${v.especialidade_sigla}`}
                              title={v.cargo}
                              color={v.ativo ? undefined : "bg-slate-100 text-slate-400 ring-slate-200"}
                            />
                          ))}
                          {u.vinculos.length === 0 && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            on={u.ativo}
                            busy={salvando}
                            disabled={u.id === usuario?.id}
                            onChange={() => toggleUsuario(u)}
                            title={u.id === usuario?.id ? "Você não pode inativar a si mesmo" : undefined}
                          />
                          <BadgeAtivo on={u.ativo} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Btn variant="secondary" className="!px-2.5 !py-1.5" onClick={() => setUserForm({ alvo: u })}>
                          <Pencil size={14} /> Editar
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "unidades" && (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-5 text-sm text-slate-400">Carregando…</div>
          ) : unidades.length === 0 ? (
            <EmptyState icon={<Building2 size={24} />} titulo="Nenhuma unidade" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3">Unidade-pai</th>
                    <th className="px-4 py-3">Módulos</th>
                    <th className="px-4 py-3">Status</th>
                    {podeEstrutura && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unidades.map((u) => {
                    const pai = unidades.find((x) => x.id === u.unidade_pai_id);
                    return (
                      <tr key={u.id} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{u.sigla}</p>
                          <p className="text-xs text-slate-400">{u.nome}</p>
                        </td>
                        <td className="px-4 py-3">
                          {pai ? (
                            <span className="text-sm text-slate-600">{pai.sigla}</span>
                          ) : (
                            <span className="text-xs text-slate-400">Raiz</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.especialidades.map((e) => (
                              <Badge
                                key={e.id}
                                text={e.especialidade.sigla}
                                color="bg-brand-50 text-brand-800 ring-brand-300"
                              />
                            ))}
                            {u.especialidades.length === 0 && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              on={u.ativo}
                              busy={salvando}
                              disabled={!podeEstrutura}
                              onChange={() => toggleUnidade(u)}
                            />
                            <BadgeAtivo on={u.ativo} />
                          </div>
                        </td>
                        {podeEstrutura && (
                          <td className="px-4 py-3 text-right">
                            <Btn variant="secondary" className="!px-2.5 !py-1.5" onClick={() => setUnitForm({ alvo: u })}>
                              <Pencil size={14} /> Editar
                            </Btn>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "permissoes" && (
        <div className="space-y-3">
          {loading ? (
            <Card className="p-5 text-sm text-slate-400">Carregando…</Card>
          ) : permissoes.length === 0 ? (
            <Card>
              <EmptyState icon={<KeyRound size={24} />} titulo="Nenhuma permissão cadastrada" />
            </Card>
          ) : (
            permissoes.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand-800">{p.codigo}</span>
                      <BadgeAtivo on={p.ativo} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{p.nome}</p>
                    {p.usuario_ids.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {p.usuario_ids.length} usuário(s) com permissão direta
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {podeEstrutura && (
                      <>
                        <Switch on={p.ativo} busy={salvando} onChange={() => togglePermissao(p)} />
                        <Btn variant="secondary" className="!px-2.5 !py-1.5" onClick={() => setPermForm({ alvo: p })}>
                          <Pencil size={14} /> Editar
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
                {podeEstrutura && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <ShieldCheck size={13} /> Perfis:
                    </span>
                    {perfis.map((per) => (
                      <label
                        key={per.id}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1 text-sm transition ${
                          p.perfil_ids.includes(per.id)
                            ? "border-brand-400 bg-brand-50 text-brand-800"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-800"
                          checked={p.perfil_ids.includes(per.id)}
                          onChange={() => togglePerfilPermissao(p, per.id)}
                        />
                        {per.nome}
                        <span className="text-[10px] opacity-60">n{per.nivel}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <Modal open={!!userForm} title={userForm?.alvo ? "Editar usuário" : "Novo usuário"} onClose={() => setUserForm(null)} wide>
        {userForm && (
          <FormUsuario
            alvo={userForm.alvo}
            unidades={unidades}
            especialidades={especialidades}
            perfis={perfis}
            permissoes={permissoes}
            salvando={salvando}
            setSalvando={setSalvando}
            onSalvo={aposSalvar}
            onClose={() => setUserForm(null)}
          />
        )}
      </Modal>

      <Modal open={!!unitForm} title={unitForm?.alvo ? "Editar unidade" : "Nova unidade"} onClose={() => setUnitForm(null)} wide>
        {unitForm && (
          <FormUnidade
            alvo={unitForm.alvo}
            unidades={unidades}
            especialidades={especialidades}
            salvando={salvando}
            setSalvando={setSalvando}
            onSalvo={aposSalvar}
            onClose={() => setUnitForm(null)}
          />
        )}
      </Modal>

      <Modal open={!!permForm} title={permForm?.alvo ? "Editar permissão" : "Nova permissão"} onClose={() => setPermForm(null)}>
        {permForm && (
          <FormPermissao
            alvo={permForm.alvo}
            salvando={salvando}
            setSalvando={setSalvando}
            onSalvo={aposSalvar}
            onClose={() => setPermForm(null)}
          />
        )}
      </Modal>
    </div>
  );
}