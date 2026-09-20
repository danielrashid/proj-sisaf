import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileWarning,
  FolderTree,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import Notificacoes from "./Notificacoes";
import PerfilModal from "./PerfilModal";
import PesquisaModal from "./PesquisaModal";

const NAV_BASE = [
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/os", label: "OS", icon: ClipboardList },
  { to: "/autos", label: "Autos", icon: FileWarning },
  { to: "/geo", label: "Geo", icon: MapIcon },
  { to: "/estabelecimentos", label: "Estabelecimentos", icon: Store },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
  { to: "/log", label: "Log", icon: ScrollText },
];

const BOTTOM_NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/os", label: "OS", icon: ClipboardList },
  { to: "/autos", label: "Autos", icon: FileWarning },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [sufixo, setSufixo] = useState("");
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const h = headerRef.current;
    if (!h) return;
    const atualizar = () =>
      document.documentElement.style.setProperty("--header-h", `${h.offsetHeight}px`);
    atualizar();
    const ro = new ResizeObserver(atualizar);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    api
      .get<{ sufixo?: string }>("/sistema/info")
      .then((i) => setSufixo(i.sufixo ?? ""))
      .catch(() => {});
  }, []);

  const NAV = useMemo(() => {
    const extra = [];
    if (usuario?.permissoes?.includes("caixa_ouvidorias")) {
      extra.push({ to: "/ouvidorias", label: "Ouvidorias", icon: Inbox });
    }
    const podePfo =
      (usuario?.perfil?.nivel ?? 0) >= 6 ||
      ((usuario?.perfil?.nivel ?? 0) >= 3 &&
        (usuario?.vinculos ?? []).some((v) => v.ativo));
    if (podePfo) {
      extra.push({ to: "/programacoes", label: "PFOs", icon: FolderTree });
    }
    const base = [...NAV_BASE].filter(
      (i) => i.to !== "/admin" || (usuario?.perfil?.nivel ?? 0) >= 5
    );
    const pos = base.findIndex((i) => i.to === "/os") + 1;
    base.splice(pos, 0, ...extra);
    return base;
  }, [usuario]);

  const iniciais = (usuario?.nome ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-full flex-col">
      <header ref={headerRef} className="sticky top-0 z-50 shadow-sm">
        {/* Linha superior — fundo igual ao da página */}
        <div className="border-b border-slate-200 bg-slate-100/95 backdrop-blur supports-[backdrop-filter]:bg-slate-100/80">
          <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-1 px-3 sm:px-6">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-200/70 lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={menuAberto}
            >
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>

            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-3 rounded-xl py-1 pr-2 transition hover:bg-slate-200/50"
              title="Ir para o início"
            >
              <img
                src="/assets/DFLegal_brasao.png"
                alt="DF Legal"
                className="h-15 w-15 rounded-xl bg-white object-contain p-1 shadow-sm ring-1 ring-slate-200 transition group-hover:ring-brand-300"
              />
              <span className="hidden text-left sm:block">
                <span className="flex items-center gap-2 text-lg font-bold leading-none tracking-tight text-brand-800">
                  SISAF
                  {sufixo && (
                    <span className="inline-flex items-center rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold leading-none text-gold-dark ring-1 ring-inset ring-gold/50">
                      .{sufixo}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-none text-slate-500">
                  Ações Fiscais · DF Legal
                </span>
              </span>
            </button>

            {/* Busca global central (desktop) */}
            <div className="mx-auto hidden w-full max-w-xl px-6 lg:block">
              <button
                onClick={() => setPesquisaAberta(true)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-400 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40"
                title="Pesquisa geral (LGPD)"
              >
                <Search size={17} />
                <span className="flex-1 text-left">Pesquisar CNPJ, CPF, OS, endereço…</span>
                <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 xl:inline">
                  drsa
                </kbd>
              </button>
            </div>

            {/* Ações à direita */}
            <div className="ml-auto flex items-center gap-1 lg:ml-0">
              <button
                onClick={() => setPesquisaAberta(true)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 lg:hidden"
                title="Pesquisar"
                aria-label="Pesquisar"
              >
                <Search size={19} />
              </button>

              <Notificacoes />

              <button
                onClick={() => setPerfilAberto(true)}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-slate-200/70"
                title="Meu perfil"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-xs font-semibold text-white">
                  {iniciais}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block max-w-[150px] truncate text-sm font-medium text-slate-700">
                    {usuario?.nome}
                  </span>
                  <span className="block max-w-[150px] truncate text-xs text-slate-500">
                    {usuario?.perfil?.nome}
                  </span>
                </span>
              </button>

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Busca global (mobile/tablet) */}
          <div className="px-3 pb-2.5 lg:hidden">
            <button
              onClick={() => setPesquisaAberta(true)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-400"
            >
              <Search size={16} /> Pesquisar CNPJ, CPF, OS, endereço…
            </button>
          </div>
        </div>

        {/* Faixa azul de ponta a ponta com a navegação (desktop) */}
        <div className="hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] lg:block">
          <nav className="mx-auto flex max-w-7xl items-center gap-1 px-3 sm:px-6">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-3 text-[15px] transition ${
                    isActive
                      ? "bg-slate-100 font-semibold text-brand-800 shadow-[inset_0_3px_0_0_#fdb410]"
                      : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            {/*<NavLink
              to="/os/nova"
              className="ml-2 flex shrink-0 items-center gap-1.5 rounded-t-xl border-l border-white/15 py-3 pl-4 pr-4 text-[15px] font-medium text-gold transition hover:bg-white/10 hover:text-amber-300"
              title="Criar nova OS"
            >
              <Plus size={18} /> Nova OS
            </NavLink>*/}
          </nav>
        </div>

        {/* Menu colapsado (mobile/tablet) */}
        {menuAberto && (
          <div className="border-t border-white/10 bg-brand-800 lg:hidden">
            <nav className="mx-auto max-w-7xl px-3 py-2 sm:px-6">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition ${
                      isActive
                        ? "bg-white/15 font-semibold text-white shadow-[inset_3px_0_0_0_#fdb410]"
                        : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={20} />
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/os/nova"
                onClick={() => setMenuAberto(false)}
                className="mt-1 mb-1 flex items-center gap-3 rounded-xl border border-white/20 px-3 py-3 text-[15px] font-medium text-white transition hover:bg-white/10"
              >
                <Plus size={20} /> Nova OS
              </NavLink>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 bg-slate-100">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {BOTTOM_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                  isActive ? "text-brand-800" : "text-slate-400"
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setPesquisaAberta(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-400 transition active:scale-95"
          >
            <Search size={22} />
            Buscar
          </button>
        </div>
      </nav>

      <PesquisaModal open={pesquisaAberta} onClose={() => setPesquisaAberta(false)} />
      <PerfilModal open={perfilAberto} onClose={() => setPerfilAberto(false)} />
    </div>
  );
}