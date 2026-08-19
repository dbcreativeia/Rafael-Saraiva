import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface CityDistributionMapProps {
  items: any[];
  title?: string;
  subtitle?: string;
  itemLabel?: string;
  accentColor?: string;
}

export const CityDistributionMap: React.FC<CityDistributionMapProps> = ({
  items,
  title = 'Distribuição Geográfica por Cidade',
  subtitle = 'Visualização geoespacial das adesões por município',
  itemLabel = 'cadastro',
  accentColor = '#FF5500'
}) => {
  const [municipiosData, setMunicipiosData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/municipios.json')
      .then(res => res.json())
      .then(d => {
        setMunicipiosData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(e => {
        console.warn('Erro ao carregar municipios.json:', e);
        setLoading(false);
      });
  }, []);

  const mapPoints = useMemo(() => {
    if (!municipiosData.length || !items.length) return [];

    const cityCounts: Record<string, number> = {};
    items.forEach(u => {
      const rawCity = u.cidade || 'São Paulo';
      if (rawCity) {
        const name = rawCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        cityCounts[name] = (cityCounts[name] || 0) + 1;
      }
    });

    const points: { lat: number; lng: number; count: number; name: string }[] = [];
    municipiosData.forEach(mun => {
      const name = (mun.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (cityCounts[name]) {
        points.push({
          lat: mun.latitude,
          lng: mun.longitude,
          count: cityCounts[name],
          name: mun.nome
        });
      }
    });

    // Ordenar do maior para o menor
    return points.sort((a, b) => b.count - a.count);
  }, [items, municipiosData]);

  const totalPoints = useMemo(() => mapPoints.reduce((acc, p) => acc + p.count, 0), [mapPoints]);
  const totalCities = mapPoints.length;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-dark flex items-center gap-2.5">
            <MapPin className="w-5 h-5" style={{ color: accentColor }} />
            {title}
          </h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-gray-500" />
            {totalCities} {totalCities === 1 ? 'município' : 'municípios'}
          </span>
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {totalPoints} {totalPoints === 1 ? itemLabel : itemLabel + 's'}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="h-[400px] w-full bg-gray-100 rounded-2xl overflow-hidden relative z-0 border border-gray-200/80 shadow-inner">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-sm">
              Carregando mapa...
            </div>
          ) : (
            <MapContainer
              center={[-23.5505, -46.6333]}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {mapPoints.map((pt, i) => (
                <CircleMarker
                  key={i}
                  center={[pt.lat, pt.lng]}
                  radius={Math.min(35, Math.max(6, Math.sqrt(pt.count) * 6))}
                  pathOptions={{
                    color: accentColor,
                    fillColor: accentColor,
                    fillOpacity: 0.65,
                    weight: 2
                  }}
                >
                  <Tooltip>
                    <div className="font-bold text-gray-900 text-sm">{pt.name}</div>
                    <div className="text-xs text-gray-600 font-medium mt-0.5">
                      {pt.count} {pt.count > 1 ? `${itemLabel}s` : itemLabel}
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Top 5 Cidades com mais adesões */}
        {mapPoints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
              Top Municípios:
            </span>
            {mapPoints.slice(0, 6).map((pt, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 border border-gray-100"
              >
                <span className="font-bold text-gray-900">{pt.name}</span>
                <span
                  className="font-bold px-1.5 py-0.2 text-[11px] rounded-md text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {pt.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
