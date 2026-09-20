import { useEffect, useRef } from "react";
import L from "leaflet";

export interface Marcador {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

export interface Circulo {
  lat: number;
  lng: number;
  raio: number;
  color?: string;
}

export interface Poligono {
  coords: [number, number][];
  color?: string;
  label: string;
}

const PALETA = ["#059669", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function MapView({
  marcadores = [],
  circulos = [],
  poligonos = [],
  center,
  zoom = 13,
}: {
  marcadores?: Marcador[];
  circulos?: Circulo[];
  poligonos?: Poligono[];
  center?: [number, number];
  zoom?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const c = center ?? [marcadores[0]?.lat ?? -15.79, marcadores[0]?.lng ?? -47.89];
    const map = L.map(divRef.current, { scrollWheelZoom: false }).setView(c, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    const novos: L.Layer[] = [];
    marcadores.forEach((m, i) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:99px;background:${m.color ?? PALETA[i % PALETA.length]};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      novos.push(
        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(
          `<strong>${m.label}</strong>`
        )
      );
    });
    circulos.forEach((c2) => {
      novos.push(
        L.circle([c2.lat, c2.lng], {
          radius: c2.raio,
          color: c2.color ?? "#059669",
          weight: 1.5,
          fillOpacity: 0.08,
        }).addTo(map)
      );
    });
    poligonos.forEach((p) => {
      novos.push(
        L.polygon(p.coords, {
          color: p.color ?? "#d97706",
          weight: 1.5,
          fillOpacity: 0.06,
        })
          .addTo(map)
          .bindPopup(`<strong>${p.label}</strong>`)
      );
    });
    if (novos.length) {
      const bounds = L.featureGroup(novos).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const el = divRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || marcadores.length === 0) return;
    const grupo = L.featureGroup(
      marcadores.map((m, i) =>
        L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:22px;height:22px;border-radius:99px;background:${m.color ?? PALETA[i % PALETA.length]};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        })
      )
    );
    if (marcadores.length) {
      map.fitBounds(grupo.getBounds(), { padding: [40, 40] });
    }
    map.invalidateSize();
  }, [marcadores]);

  return <div ref={divRef} className="h-full w-full" />;
}