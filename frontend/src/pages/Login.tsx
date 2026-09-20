import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";
import { masckCPF } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";

const DEMO = [
  { nome: "Admin", cpf: "111.444.777-35" },
  { nome: "Chefe UFOPE", cpf: "333.666.999-57" },
  { nome: "Auditor AEU", cpf: "666.999.222-80" },
  { nome: "Atendimento", cpf: "123.456.789-01" },
];

export default function Login() {
  usePageTitle("Acessar o sistema");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (cpf.replace(/\D/g, "").length < 11) {
      setErro("Digite o CPF completo (11 dígitos)");
      return;
    }
    setCarregando(true);
    try {
      await login(cpf, senha);
      navigate("/");
    } catch (err: any) {
      setErro(err.message || "Não foi possível entrar");
    } finally {
      setCarregando(false);
    }
  }

  const df = {
    grad: "bg-gradient-to-br from-[#122e66] via-[#0c2049] to-[#071530]",
    solid: "bg-[#122e66]",
    solidHover: "hover:bg-[#0c2049]",
    focus: "focus:border-[#122e66] focus:ring-[#122e66]/40",
    gold: "bg-[#fdb410]",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef0f7] p-4">
      <div className="animate-rise-in grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 md:grid-cols-[minmax(280px,380px)_1fr]">
        <div className={`relative hidden flex-col justify-between p-8 text-white md:flex ${df.grad}`}>
          <div className="flex justify-center">
            <img
              src="/assets/DFLegal_brasao.png"
              alt="Brasão DF Legal"
              className="h-80 w-80  object-contain p-2"
            />
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold tracking-tight">SISAF</p>
            <p className="mt-1 text-sm text-blue-100/90">Ações Fiscais · DF Legal</p>
            <div className={`mx-auto mt-4 h-0.5 w-16 rounded-full ${df.gold}`} />
          </div>

          <div className="mx-auto w-full max-w-[220px] space-y-3">
            <p className="text-center text-xs text-blue-200/80">
              Sistema de uso interno de fiscalização.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <img
              src="/assets/DFLegal_brasao.png"
              alt="Brasão DF Legal"
              className="h-12 w-12 rounded-full bg-[#122e66] p-1 object-contain"
            />
            <div>
              <p className="text-lg font-bold text-slate-800">SISAF</p>
              <p className="text-xs text-slate-500">Ações Fiscais · DF Legal</p>
            </div>
          </div>
          <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Acessar o sistema</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com seu CPF e senha funcionais.</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">CPF</span>
              <div className="relative">
                <UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={cpf}
                  onChange={(e) => setCpf(masckCPF(e.target.value))}
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="000.000.000-00"
                  className={`w-full rounded-xl border border-slate-300 py-3 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 ${df.focus}`}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Senha</span>
              <div className="relative">
                <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl border border-slate-300 py-3 pl-9 pr-11 text-sm focus:outline-none focus:ring-2 ${df.focus}`}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {erro && (
              <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-m font-semibold text-white shadow-lg shadow-[#122e66]/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${df.solid} ${df.solidHover}`}
            >
              {carregando ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-7">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Usuários de demonstração
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.cpf}
                  type="button"
                  onClick={() => {
                    setCpf(d.cpf);
                    setSenha("sisaf123");
                    setErro("");
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#122e66]/40 hover:bg-[#eef0f7] hover:text-[#122e66] active:scale-95"
                >
                  {d.nome}: <span className="tabular-nums">{d.cpf}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Senha padrão: <code className="font-semibold">sisaf123</code>
            </p>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-4 text-center">
            <Link
              to="/privacidade"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-[#122e66]"
            >
              <ShieldCheck size={14} /> Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}