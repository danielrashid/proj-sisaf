import { useEffect } from "react";

const BASE = "SISAF 2.0 — Sistema Integrado de Ações Fiscais";

export function usePageTitle(titulo?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} — SISAF 2.0` : BASE;
  }, [titulo]);
}