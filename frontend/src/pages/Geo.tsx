import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crosshair, MapPinned, Search } from "lucide-react";
import { api } from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { Camada, GeoProxima } from "../lib/types";
import { Badge, Btn, Card, EmptyState, Field, inputCls } from "../components/ui";
import MapView, { Poligono } from "../components/MapView";

export default function Geo() {
  usePageTitle("Geofiscalização");
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [proximas, setProximas] = useState<GeoProxima[]>([]);
  const [ativa, setAtiva] = useState<Record<number, boolean>>({});
  const [lat, setLat] = useState("-15.7902");
  const [lng, setLng] = useState("-47.8915");
  const [raio, setRaio] = useState("100");
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    api.get<Camada[]>("/geo/camadas").then(setCamadas).catch(console.error);
  }, []);

  useEffect(() => {
    if (camadas.length) {
      const ini: Record<number, boolean> = {};
      camadas.forEach((c) => (ini[c.id] = false));
      setAtiva(ini);
    }
  }, [camadas]);

  async function buscar() {
    setBuscando(true);
    try {
      const r = await api.get<GeoProxima[]>(
        `/geo/os-proximas?latitude=${lat}&longitude=${lng}&raio=${raio}`
      );
      setProximas(r);
    } finally {
      setBuscando(false);
    }
  }

  const poligonos: Poligono[] = camadas
    .filter((c) => ativa[c.id])
    .map((c) => {
      const ring: number[][] = c.geojson?.features?.[0]?.geometry?.coordinates?.[0] ?? [];
      return {
        label: c.nome,
        color: c.tipo === "lotes_ocupados" ? "#2563eb" : "#d97706",
        coords: ring.map((pt) => {
          const [lng0, lat0] = pt;
          return [lat0, lng0] as [number, number];
        }),
      };
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Georreferenciamento</h1>
        <p className="text-sm text-slate-500">
          Planejamento por RA, camadas de lotes e cruzamento de ações por raio configurável por OS.
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="Latitude">
          <input value={lat} onChange={(e) => setLat(e.target.value)} className={`${inputCls} w-36`} />
        </Field>
        <Field label="Longitude">
          <input value={lng} onChange={(e) => setLng(e.target.value)} className={`${inputCls} w-36`} />
        </Field>
        <Field label="Raio (m)">
          <input value={raio} onChange={(e) => setRaio(e.target.value)} className={`${inputCls} w-24`} />
        </Field>
        <Btn onClick={buscar} disabled={buscando}>
          <Search size={16} /> Cruzar ações no raio
        </Btn>
        <button
          onClick={() => {
            navigator.geolocation?.getCurrentPosition((p) => {
              setLat(p.coords.latitude.toFixed(6));
              setLng(p.coords.longitude.toFixed(6));
            });
          }}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"
        >
          <Crosshair size={14} /> usar minha localização
        </button>
      </Card>

      <div className="mb-2 flex flex-wrap gap-2">
        {camadas.map((c) => (
          <button
            key={c.id}
            onClick={() => setAtiva((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
            className="rounded-lg transition focus-visible:ring-2 focus-visible:ring-brand-500/60"
          >
            <Badge
              text={
                <span className="inline-flex items-center gap-1">
                  {ativa[c.id] && <Check size={12} strokeWidth={3} />}
                  {c.nome}
                </span>
              }
              color={ativa[c.id] ? "bg-brand-100 text-brand-800 ring-brand-300" : "bg-slate-100 text-slate-600 ring-slate-300"}
            />
          </button>
        ))}
        {camadas.length === 0 && (
          <span className="text-sm text-slate-400">Carregando camadas…</span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="h-96">
            <MapView
              marcadores={proximas.map((p) => ({
                lat: p.latitude,
                lng: p.longitude,
                label: `OS #${p.numero} — ${p.tema} (${p.distancia_m} m)`,
              }))}
              circulos={proximas.length ? [{ lat: parseFloat(lat), lng: parseFloat(lng), raio: parseFloat(raio) || 50 }] : []}
              poligonos={poligonos}
            />
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            OS dentro do raio ({proximas.length})
          </h2>
          <div className="space-y-2">
            {buscando && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Search size={16} className="animate-pulse" /> Buscando OS no raio…
              </div>
            )}
            {!buscando && proximas.map((p) => (
              <Link
                key={p.os_id}
                to={`/os/${p.os_id}`}
                className="group block rounded-lg border border-slate-200 p-3 transition hover:border-brand-400 hover:bg-brand-50/40"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-700 group-hover:text-brand-800">OS #{p.numero}</p>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">{p.distancia_m} m</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.tema}</p>
              </Link>
            ))}
            {!buscando && proximas.length === 0 && (
              <EmptyState
                icon={<MapPinned size={20} />}
                titulo="Nenhuma OS neste raio"
                descricao="Informe coordenadas e clique em “Cruzar ações no raio” para listar as OS próximas."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}