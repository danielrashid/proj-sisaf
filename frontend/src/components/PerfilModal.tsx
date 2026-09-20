import { useEffect, useState } from "react";
import { BadgeCheck, KeyRound, Loader2, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Usuario } from "../lib/types";
import { Btn, Field, inputCls, Modal, masckCPF } from "./ui";

export default function PerfilModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open && usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmar("");
      setErro("");
      setOk("");
    }
  }, [open, usuario]);

  if (!usuario) return null;

  const iniciais = usuario.nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    if (!usuario) return;

    const body: Record<string, string> = {};
    if (nome.trim() && nome.trim() !== usuario.nome) body.nome = nome.trim();
    if (email.trim() && email.trim().toLowerCase() !== usuario.email) body.email = email.trim();

    if (senhaNova || senhaAtual || confirmar) {
      if (senhaNova !== confirmar) {
        setErro("A confirmação da nova senha não confere");
        return;
      }
      if (senhaNova.length < 6) {
        setErro("A nova senha deve ter ao menos 6 caracteres");
        return;
      }
      body.senha_atual = senhaAtual;
      body.senha_nova = senhaNova;
    }

    if (Object.keys(body).length === 0) {
      setErro("Nenhuma alteração para salvar");
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await api.patch<Usuario>("/auth/me", body);
      atualizarUsuario(atualizado);
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmar("");
      setOk("Dados atualizados com sucesso");
    } catch (err: any) {
      setErro(err.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} title="Meu perfil" onClose={onClose}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-800 text-lg font-semibold text-white">
          {iniciais}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{usuario.nome}</p>
          <p className="truncate text-xs text-slate-500">
            {usuario.perfil?.nome ?? "—"}
            {usuario.pesquisa_ilimitada && (
              <span className="ml-1 inline-flex items-center gap-0.5 text-brand-800">
                <BadgeCheck size={12} /> pesquisa ilimitada
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-400">
            CPF {usuario.cpf ? masckCPF(usuario.cpf) : "—"}
          </p>
        </div>
      </div>

      {usuario.vinculos.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1">
          {usuario.vinculos.map((v) => (
            <span
              key={v.id}
              className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              title={v.cargo}
            >
              {v.unidade_sigla} · {v.especialidade_sigla}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={salvar} className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <UserRound size={14} /> Dados de acesso
        </div>
        <Field label="Nome completo">
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <KeyRound size={14} /> Alterar senha (opcional)
        </div>
        <Field label="Senha atual">
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nova senha">
            <input
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
        </div>

        {erro && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{erro}</p>
        )}
        {ok && (
          <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800">{ok}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose}>
            Fechar
          </Btn>
          <Btn type="submit" disabled={salvando}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Salvar alterações
          </Btn>
        </div>
      </form>
    </Modal>
  );
}