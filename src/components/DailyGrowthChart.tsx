import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { TrendingUp, Calendar, BarChart3, LineChart, Award, Layers } from 'lucide-react';

interface DailyGrowthChartProps {
  items: any[];
  title: string;
  subtitle?: string;
  accentColor?: string;
  hasBreakdown?: boolean;
  itemNoun?: string;
}

interface DailyDataPoint {
  date: string;
  displayDate: string;
  fullDate: string;
  count: number;
  acumulado: number;
  impresso?: number;
  digital?: number;
  acumuladoImpresso?: number;
  acumuladoDigital?: number;
}

const parseDateKey = (createdAt: any): string | null => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const DailyGrowthChart: React.FC<DailyGrowthChartProps> = ({
  items,
  title,
  subtitle = 'Evolução temporal e volume diário de preenchimentos',
  accentColor = '#FF5500',
  hasBreakdown = false,
  itemNoun = 'cadastros'
}) => {
  const [period, setPeriod] = useState<'7D' | '14D' | '30D' | 'ALL'>('30D');
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Processar dados em linha do tempo contínua
  const fullTimeline = useMemo(() => {
    if (!items || items.length === 0) return [];

    const dayMap = new Map<string, { total: number; impresso: number; digital: number }>();

    items.forEach(item => {
      const dStr = parseDateKey(item.createdAt);
      if (!dStr) return;
      if (!dayMap.has(dStr)) {
        dayMap.set(dStr, { total: 0, impresso: 0, digital: 0 });
      }
      const cur = dayMap.get(dStr)!;
      cur.total += 1;
      if (item.tipoMaterial === 'impresso') cur.impresso += 1;
      else if (item.tipoMaterial === 'digital') cur.digital += 1;
    });

    const sortedDates = Array.from(dayMap.keys()).sort();
    if (sortedDates.length === 0) return [];

    const result: DailyDataPoint[] = [];
    let runningTotal = 0;
    let runningImpresso = 0;
    let runningDigital = 0;

    const startDate = new Date(sortedDates[0] + 'T00:00:00');
    const lastItemDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = lastItemDate > today ? lastItemDate : today;

    for (let cur = new Date(startDate); cur <= endDate; cur.setDate(cur.getDate() + 1)) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const dayStats = dayMap.get(key) || { total: 0, impresso: 0, digital: 0 };
      runningTotal += dayStats.total;
      runningImpresso += dayStats.impresso;
      runningDigital += dayStats.digital;

      result.push({
        date: key,
        displayDate: `${dd}/${mm}`,
        fullDate: `${dd}/${mm}/${yyyy}`,
        count: dayStats.total,
        acumulado: runningTotal,
        impresso: dayStats.impresso,
        digital: dayStats.digital,
        acumuladoImpresso: runningImpresso,
        acumuladoDigital: runningDigital
      });
    }

    return result;
  }, [items]);

  // Filtrar de acordo com o período selecionado
  const filteredTimeline = useMemo(() => {
    if (fullTimeline.length === 0) return [];
    if (period === 'ALL') return fullTimeline;

    const daysCount = period === '7D' ? 7 : period === '14D' ? 14 : 30;
    return fullTimeline.slice(-daysCount);
  }, [fullTimeline, period]);

  // Estatísticas do período
  const stats = useMemo(() => {
    const totalInPeriod = filteredTimeline.reduce((acc, d) => acc + d.count, 0);
    const todayKey = parseDateKey(new Date()) || '';
    const todayData = fullTimeline.find(d => d.date === todayKey);
    const todayCount = todayData ? todayData.count : 0;

    let peakCount = 0;
    let peakDate = '-';
    filteredTimeline.forEach(d => {
      if (d.count > peakCount) {
        peakCount = d.count;
        peakDate = d.displayDate;
      }
    });

    const activeDays = filteredTimeline.length || 1;
    const avgDaily = (totalInPeriod / activeDays).toFixed(1);

    const totalImpressos = filteredTimeline.reduce((acc, d) => acc + (d.impresso || 0), 0);
    const totalDigitais = filteredTimeline.reduce((acc, d) => acc + (d.digital || 0), 0);

    return {
      totalInPeriod,
      todayCount,
      peakCount,
      peakDate,
      avgDaily,
      totalImpressos,
      totalDigitais
    };
  }, [filteredTimeline, fullTimeline]);

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as DailyDataPoint;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 text-xs z-50 min-w-[200px]">
          <p className="font-bold text-gray-800 mb-2 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {dataPoint.fullDate}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-black text-gray-900">{entry.value}</span>
              </div>
            ))}

            {viewMode === 'daily' && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 text-gray-500 font-medium">
                <span>Total Acumulado:</span>
                <span className="font-bold text-gray-800">{dataPoint.acumulado}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      {/* Cabeçalho */}
      <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-dark flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5" style={{ color: accentColor }} />
            {title}
          </h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternar Visualização: Diário vs Acumulado */}
          <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daily' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Novos / Dia
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cumulative' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Acumulado
            </button>
          </div>

          {/* Tipo de Gráfico */}
          <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setChartType('area')}
              title="Gráfico de Linhas/Área"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartType === 'area' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title="Gráfico de Barras"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartType === 'bar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Filtro de Período */}
          <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1">
            {(['7D', '14D', '30D', 'ALL'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === p ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                {p === 'ALL' ? 'Tudo' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 pb-2">
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Total no Período
          </span>
          <p className="text-2xl font-black text-gray-900">{stats.totalInPeriod}</p>
          <span className="text-[11px] text-gray-500 font-medium">
            {hasBreakdown ? `${stats.totalImpressos} imp. • ${stats.totalDigitais} dig.` : itemNoun}
          </span>
        </div>

        <div className="bg-green-50/60 rounded-2xl p-4 border border-green-100">
          <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider block mb-1">
            Cadastros Hoje
          </span>
          <p className="text-2xl font-black text-green-900">{stats.todayCount}</p>
          <span className="text-[11px] text-green-700 font-medium">novos preenchimentos</span>
        </div>

        <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
            Média Diária
          </span>
          <p className="text-2xl font-black text-blue-900">{stats.avgDaily}</p>
          <span className="text-[11px] text-blue-700 font-medium">cadastros / dia</span>
        </div>

        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-600" /> Pico Diário
          </span>
          <p className="text-2xl font-black text-amber-900">{stats.peakCount}</p>
          <span className="text-[11px] text-amber-700 font-medium">
            {stats.peakDate !== '-' ? `em ${stats.peakDate}` : 'nenhum'}
          </span>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="p-6 pt-4">
        <div className="h-[290px] w-full">
          {filteredTimeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold">
              Nenhum dado registrado para exibir no gráfico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${accentColor}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="grad-impresso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="grad-digital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <RechartsTooltip content={customTooltip} />

                  {hasBreakdown && viewMode === 'daily' ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="impresso"
                        name="Impresso"
                        stroke="#ea580c"
                        strokeWidth={2.5}
                        fill="url(#grad-impresso)"
                      />
                      <Area
                        type="monotone"
                        dataKey="digital"
                        name="Digital"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fill="url(#grad-digital)"
                      />
                    </>
                  ) : hasBreakdown && viewMode === 'cumulative' ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="acumulado"
                        name="Total Acumulado"
                        stroke={accentColor}
                        strokeWidth={3}
                        fill={`url(#grad-${accentColor})`}
                      />
                      <Area
                        type="monotone"
                        dataKey="acumuladoImpresso"
                        name="Acumulado Impresso"
                        stroke="#ea580c"
                        strokeWidth={2}
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="acumuladoDigital"
                        name="Acumulado Digital"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="none"
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey={viewMode === 'daily' ? 'count' : 'acumulado'}
                      name={viewMode === 'daily' ? 'Novos Cadastros' : 'Total Acumulado'}
                      stroke={accentColor}
                      strokeWidth={3}
                      fill={`url(#grad-${accentColor})`}
                    />
                  )}
                  {hasBreakdown && <Legend verticalAlign="bottom" height={36} />}
                </AreaChart>
              ) : (
                <BarChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <RechartsTooltip content={customTooltip} />

                  {hasBreakdown && viewMode === 'daily' ? (
                    <>
                      <Bar dataKey="impresso" name="Impresso" fill="#ea580c" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="digital" name="Digital" fill="#2563eb" radius={[4, 4, 0, 0]} stackId="a" />
                    </>
                  ) : (
                    <Bar
                      dataKey={viewMode === 'daily' ? 'count' : 'acumulado'}
                      name={viewMode === 'daily' ? 'Novos Cadastros' : 'Total Acumulado'}
                      fill={accentColor}
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {hasBreakdown && <Legend verticalAlign="bottom" height={36} />}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
