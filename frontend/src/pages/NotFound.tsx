import { Link } from "react-router-dom";
import { Compass, CornerUpLeft } from "lucide-react";
import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Página não encontrada");

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="relative">
        <p className="bg-gradient-to-br from-brand-800 to-brand-900 bg-clip-text text-[7rem] font-bold leading-none text-transparent">
          404
        </p>
        <span className="absolute right-[-1.25rem] top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold text-brand-900 shadow-md">
          <Compass size={20} />
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold text-slate-800">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        O endereço acessado não existe ou foi movido. Verifique a URL ou volte ao início para
        continuar pelo menu principal.
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <CornerUpLeft size={16} /> Ir para o início
      </Link>
    </div>
  );
}