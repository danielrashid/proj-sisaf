import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import MinhasOS from "./pages/MinhasOS";
import Dashboard from "./pages/Dashboard";
import OSList from "./pages/OSList";
import OSCreate from "./pages/OSCreate";
import OSDetail from "./pages/OSDetail";
import Autos from "./pages/Autos";
import Geo from "./pages/Geo";
import Estabelecimentos from "./pages/Estabelecimentos";
import Admin from "./pages/Admin";
import Logs from "./pages/Logs";
import CaixaOuvidorias from "./pages/CaixaOuvidorias";
import Programacoes from "./pages/Programacoes";
import NotFound from "./pages/NotFound";
import Privacidade from "./pages/Privacidade";

function Private({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <p className="p-10 text-center text-slate-500">Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route
            element={
              <Private>
                <Layout />
              </Private>
            }
          >
            <Route path="/" element={<MinhasOS />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/os" element={<OSList />} />
            <Route path="/os/nova" element={<OSCreate />} />
            <Route path="/os/:id" element={<OSDetail />} />
            <Route path="/ouvidorias" element={<CaixaOuvidorias />} />
            <Route path="/programacoes" element={<Programacoes />} />
            <Route path="/autos" element={<Autos />} />
            <Route path="/geo" element={<Geo />} />
            <Route path="/estabelecimentos" element={<Estabelecimentos />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/log" element={<Logs />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}