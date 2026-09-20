import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setSession } from "./api";
import { Usuario } from "./types";

interface AuthState {
  usuario: Usuario | null;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<void>;
  logout: () => void;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthState>({
  usuario: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  atualizarUsuario: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sisaf_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<Usuario>("/auth/me")
      .then(setUsuario)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(cpf: string, senha: string) {
    const res = await api.post<{ access_token: string; usuario: Usuario }>("/auth/login", {
      cpf,
      senha,
    });
    setSession(res.access_token);
    setUsuario(res.usuario);
  }

  function logout() {
    setSession(null);
    setUsuario(null);
  }

  function atualizarUsuario(u: Usuario) {
    setUsuario(u);
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);