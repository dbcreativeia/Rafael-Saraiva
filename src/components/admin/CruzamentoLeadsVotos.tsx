import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  TrendingUp,
  Target,
  Award,
  Users,
  Vote,
  Search,
  Download,
  Building2,
  MapPin,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { ElectoralResultsJSON } from './ResultadosEleitoraisTab';

interface Props {
  electoralData: ElectoralResultsJSON | null;
}

const normalizeName = (name: string = '') => {
  return String(name)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const CruzamentoLeadsVotos: React.FC<Props> = ({ electoralData }) => {
  const [leadsBreakdown, setLeadsBreakdown] = useState<{
    cities: Array<{ cidade: string; leads: number; whatsappCount?: number }>;
    bairros: Array<{ bairro: string; leads: number }>;
    totalLeads: number;
    availableCampaigns?: Array<{ name: string; count: number }>;
  }>({ cities: [], bairros: [], totalLeads: 0, availableCampaigns: [] });

  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'municipios' | 'bairros'>('municipios');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeadsTier, setFilterLeadsTier] = useState<'ALL' | 'WITH_LEADS' | 'HIGH_LEADS' | 'NO_LEADS'>('ALL');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'HIGH_EFFICIENCY' | 'HIGH_VOLUME' | 'OPPORTUNITY'>('ALL');
  const [sortBy, setSortBy] = useState<string>('leads_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [showDiagnosticGuide, setShowDiagnosticGuide] = useState<boolean>(false);

  const loadLeads = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const url = selectedCampaign && selectedCampaign !== 'ALL'
        ? `/api/eleicoes/leads-breakdown?campaign=${encodeURIComponent(selectedCampaign)}&_t=${Date.now()}`
        : `/api/eleicoes/leads-breakdown?_t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLeadsBreakdown(json);
      }
    } catch (err) {
      console.warn("Erro ao buscar dados de leads para cruzamento:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads(leadsBreakdown.cities.length > 0);
  }, [selectedCampaign]);

  // Map of normalized city name -> lead count
  const cityLeadsMap = useMemo(() => {
    const map = new Map<string, { leads: number; whatsappCount: number }>();
    leadsBreakdown.cities.forEach(c => {
      const key = normalizeName(c.cidade);
      const existing = map.get(key) || { leads: 0, whatsappCount: 0 };
      map.set(key, {
        leads: existing.leads + c.leads,
        whatsappCount: existing.whatsappCount + (c.whatsappCount || 0)
      });
    });
    return map;
  }, [leadsBreakdown.cities]);

  // Map of normalized bairro name -> lead count
  const bairroLeadsMap = useMemo(() => {
    const map = new Map<string, number>();
    leadsBreakdown.bairros.forEach(b => {
      const key = normalizeName(b.bairro);
      const existing = map.get(key) || 0;
      map.set(key, existing + b.leads);
    });
    return map;
  }, [leadsBreakdown.bairros]);

  // Joined records: electoral results + leads
  const crossRecords = useMemo(() => {
    if (!electoralData?.bases) return [];

    if (viewType === 'municipios') {
      const municipios = electoralData.bases.municipios?.registros || [];
      return municipios.map(m => {
        const key = normalizeName(m.municipio);
        const leadInfo = cityLeadsMap.get(key) || { leads: 0, whatsappCount: 0 };
        const leads = leadInfo.leads;
        const rafaelVotos = m.rafael_votos || 0;
        const ninaVotos = m.nina_votos || 0;
        const eleitores = m.eleitores_aptos || 0;
        
        const votosPorLeadRafael = leads > 0 ? rafaelVotos / leads : null;
        const votosPorLeadTotal = leads > 0 ? (rafaelVotos + ninaVotos) / leads : null;
        const penetracaoLeads = eleitores > 0 ? (leads / eleitores) * 1000 : 0;

        let category: 'HIGH_EFFICIENCY' | 'HIGH_VOLUME' | 'OPPORTUNITY' | 'STANDARD' = 'STANDARD';
        if (leads >= 15 && rafaelVotos >= 500) {
          category = 'HIGH_VOLUME';
        } else if (leads >= 10 && rafaelVotos < 300) {
          category = 'OPPORTUNITY';
        } else if (rafaelVotos >= 300 && (leads === 0 || (votosPorLeadRafael && votosPorLeadRafael >= 30))) {
          category = 'HIGH_EFFICIENCY';
        }

        return {
          id: m.codigo_tse,
          nome: m.municipio,
          codigo: m.codigo_tse,
          eleitores,
          do_eleitorado: m.do_eleitorado || 0,
          rafaelVotos,
          rafaelValidos: m.rafael_validos || 0,
          ninaVotos,
          ninaValidos: m.nina_validos || 0,
          validosEstadual: m.validos_estadual || 0,
          validosFederal: m.validos_federal || 0,
          leads,
          whatsappLeads: leadInfo.whatsappCount,
          votosPorLeadRafael,
          votosPorLeadTotal,
          penetracaoLeads,
          category
        };
      });
    } else {
      const bairros = electoralData.bases.bairros?.registros || [];
      return bairros.map(b => {
        const key = normalizeName(b.bairro_cadastrado_do_local);
        const leads = bairroLeadsMap.get(key) || 0;
        const rafaelVotos = b.rafael_votos || 0;
        const ninaVotos = b.nina_votos || 0;
        const eleitores = b.eleitores_aptos || 0;

        const votosPorLeadRafael = leads > 0 ? rafaelVotos / leads : null;
        const votosPorLeadTotal = leads > 0 ? (rafaelVotos + ninaVotos) / leads : null;
        const penetracaoLeads = eleitores > 0 ? (leads / eleitores) * 1000 : 0;

        let category: 'HIGH_EFFICIENCY' | 'HIGH_VOLUME' | 'OPPORTUNITY' | 'STANDARD' = 'STANDARD';
        if (leads >= 10 && rafaelVotos >= 200) {
          category = 'HIGH_VOLUME';
        } else if (leads >= 8 && rafaelVotos < 100) {
          category = 'OPPORTUNITY';
        } else if (rafaelVotos >= 150 && (leads === 0 || (votosPorLeadRafael && votosPorLeadRafael >= 20))) {
          category = 'HIGH_EFFICIENCY';
        }

        return {
          id: b.bairro_cadastrado_do_local,
          nome: b.bairro_cadastrado_do_local,
          codigo: '-',
          eleitores,
          do_eleitorado: b.eleitorado_capital || 0,
          rafaelVotos,
          rafaelValidos: b.rafael_validos || 0,
          ninaVotos,
          ninaValidos: b.nina_validos || 0,
          validosEstadual: b.validos_estadual || 0,
          validosFederal: b.validos_federal || 0,
          leads,
          whatsappLeads: leads,
          votosPorLeadRafael,
          votosPorLeadTotal,
          penetracaoLeads,
          category
        };
      });
    }
  }, [electoralData, viewType, cityLeadsMap, bairroLeadsMap]);

  // Filtered and Sorted
  const filteredRecords = useMemo(() => {
    let list = [...crossRecords];
    const term = searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(r => r.nome && String(r.nome).toLowerCase().includes(term));
    }

    if (filterLeadsTier === 'WITH_LEADS') {
      list = list.filter(r => r.leads > 0);
    } else if (filterLeadsTier === 'HIGH_LEADS') {
      list = list.filter(r => r.leads >= 15);
    } else if (filterLeadsTier === 'NO_LEADS') {
      list = list.filter(r => r.leads === 0);
    }

    if (filterCategory !== 'ALL') {
      list = list.filter(r => r.category === filterCategory);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'leads_desc':
          return b.leads - a.leads;
        case 'multiplier_desc':
          return (b.votosPorLeadRafael || 0) - (a.votosPorLeadRafael || 0);
        case 'rafael_votos_desc':
          return b.rafaelVotos - a.rafaelVotos;
        case 'rafael_validos_desc':
          return b.rafaelValidos - a.rafaelValidos;
        case 'nina_votos_desc':
          return b.ninaVotos - a.ninaVotos;
        case 'eleitores_desc':
          return b.eleitores - a.eleitores;
        case 'nome_asc':
          return String(a.nome).localeCompare(String(b.nome));
        default:
          return 0;
      }
    });

    return list;
  }, [crossRecords, searchTerm, filterLeadsTier, filterCategory, sortBy]);

  // General Aggregations
  const globalStats = useMemo(() => {
    let totalLeadsMatched = 0;
    let totalRafaelVotosMatched = 0;
    let totalValidosEstadual = 0;
    let locationsWithLeads = 0;

    crossRecords.forEach(r => {
      totalLeadsMatched += r.leads;
      totalRafaelVotosMatched += r.rafaelVotos;
      totalValidosEstadual += r.validosEstadual;
      if (r.leads > 0) locationsWithLeads++;
    });

    const averageMultiplier = totalLeadsMatched > 0 ? totalRafaelVotosMatched / totalLeadsMatched : 0;

    return {
      totalLeadsMatched,
      totalRafaelVotosMatched,
      totalValidosEstadual,
      locationsWithLeads,
      averageMultiplier
    };
  }, [crossRecords]);

  // Chart data (Top 15 by Leads with Votos)
  const chartData = useMemo(() => {
    const sortedByLeads = [...crossRecords].filter(r => r.leads > 0).sort((a, b) => b.leads - a.leads);
    return sortedByLeads.slice(0, 15).map(r => ({
      name: r.nome.length > 14 ? r.nome.slice(0, 14) + '...' : r.nome,
      fullName: r.nome,
      leads: r.leads,
      rafaelVotos: r.rafaelVotos,
      multiplier: r.votosPorLeadRafael ? Number(r.votosPorLeadRafael.toFixed(1)) : 0
    }));
  }, [crossRecords]);

  // Formatters
  const fmt = (n: number | null | undefined) => (n !== null && n !== undefined && !isNaN(n) ? new Intl.NumberFormat('pt-BR').format(n) : '-');
  const fmtPct = (n: number | null | undefined) => (n !== null && n !== undefined && !isNaN(n) ? (n * 100).toFixed(2).replace('.', ',') + '%' : '-');

  // Pagination
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = pageSize === -1 ? filteredRecords : filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewType, searchTerm, filterLeadsTier, filterCategory, sortBy]);

  const handleExportXLSX = () => {
    const rows = filteredRecords.map(r => ({
      'Local': r.nome,
      'Código TSE': r.codigo,
      'Leads Cadastrados no CRM': r.leads,
      'Votos Rafael Saraiva (44077)': r.rafaelVotos,
      '% Válidos Rafael (Estadual)': fmtPct(r.rafaelValidos),
      'Votos / Lead (Rafael Saraiva)': r.votosPorLeadRafael ? r.votosPorLeadRafael.toFixed(2) : 'N/A',
      'Votos Nina Passadore (4407)': r.ninaVotos,
      '% Válidos Nina (Federal)': fmtPct(r.ninaValidos),
      'Eleitores Aptos': r.eleitores,
      'Diagnóstico': r.category === 'HIGH_VOLUME' ? 'Alto Volume & Conversão' : r.category === 'HIGH_EFFICIENCY' ? 'Alta Eficiência Orgânica' : r.category === 'OPPORTUNITY' ? 'Oportunidade Pós-Mandato' : 'Padrão'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Cruzamento_${viewType}`);
    XLSX.writeFile(workbook, `Cruzamento_Leads_Votos_${viewType}.xlsx`);
  };

  if (loading && leadsBreakdown.cities.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-14 border border-gray-200/80 shadow-xs flex flex-col items-center justify-center min-h-[420px] text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-md">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-dark">
            Cruzando Leads com Votação das Urnas
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
            Correlacionando os apoiadores cadastrados com os votos oficiais apurados em todos os 645 municípios e bairros da capital...
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            <Building2 className="w-3.5 h-3.5" /> 645 Municípios
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <MapPin className="w-3.5 h-3.5" /> 899 Bairros SP
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Calculando Multiplicadores
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Inteligência Eleitoral & CRM
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Cruzamento Leads × Votação
              </span>
              {selectedCampaign !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40">
                  Origem: {selectedCampaign}
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Relação de Mobilização & Eficiência nas Urnas
            </h3>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl font-medium leading-relaxed">
              Analise como cada apoiador cadastrado nas ações de mobilização se converteu em votos nominais de Rafael Saraiva (44077) e Nina Passadore (4407).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportXLSX}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold py-2.5 px-4 rounded-2xl border border-white/20 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Exportar Cruzamento</span>
            </button>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="mt-6 pt-6 border-t border-indigo-800/40 grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Total Leads Cruzados
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {fmt(globalStats.totalLeadsMatched)}
            </div>
            <div className="text-[10px] text-indigo-200/70 mt-0.5">
              Distribuídos em {globalStats.locationsWithLeads} {viewType === 'municipios' ? 'cidades de SP' : 'bairros da Capital'}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Multiplicador Médio
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {globalStats.averageMultiplier.toFixed(1)}x
            </div>
            <div className="text-[10px] text-indigo-200/70 mt-0.5">
              Média de votos Rafael por cada lead cadastrado
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Alta Eficiência Orgânica
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {crossRecords.filter(r => r.category === 'HIGH_EFFICIENCY').length}
            </div>
            <div className="text-[10px] text-indigo-200/70 mt-0.5">
              Polos de forte voto espontâneo/orgânico
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
              Oportunidades Pós-Mandato
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1">
              {crossRecords.filter(r => r.category === 'OPPORTUNITY').length}
            </div>
            <div className="text-[10px] text-indigo-200/70 mt-0.5">
              Bases ativas com alto potencial de crescimento
            </div>
          </div>

        </div>
      </div>

      {/* Switcher & Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
        
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* View Switcher: Municípios vs Bairros */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setViewType('municipios')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewType === 'municipios' ? 'bg-white text-dark shadow-xs' : 'text-gray-500 hover:text-dark'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Municípios do Estado ({leadsBreakdown.cities.length})</span>
            </button>
            <button
              onClick={() => setViewType('bairros')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewType === 'bairros' ? 'bg-white text-dark shadow-xs' : 'text-gray-500 hover:text-dark'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Bairros de São Paulo ({leadsBreakdown.bairros.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Filtrar ${viewType === 'municipios' ? 'município' : 'bairro'}...`}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* Secondary Filter Tags */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
          
          {/* Campaign / Origin Base Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" /> Origem / Base do Lead:
            </span>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5 font-black text-indigo-900 outline-none focus:border-indigo-500 cursor-pointer max-w-[220px] truncate"
            >
              <option value="ALL">⭐ Todas as Origens (Panorama Geral)</option>
              {leadsBreakdown.availableCampaigns && leadsBreakdown.availableCampaigns.map((camp, idx) => (
                <option key={idx} value={camp.name}>
                  {camp.name} ({camp.count} ações)
                </option>
              ))}
            </select>
          </div>

          {/* Leads Tier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500 uppercase tracking-wider">Volume de Leads:</span>
            <select
              value={filterLeadsTier}
              onChange={(e) => setFilterLeadsTier(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Todos os registros</option>
              <option value="WITH_LEADS">Com pelo menos 1 lead ({crossRecords.filter(r => r.leads > 0).length})</option>
              <option value="HIGH_LEADS">Alto Volume (≥ 15 leads)</option>
              <option value="NO_LEADS">Sem leads cadastrados</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500 uppercase tracking-wider">Diagnóstico:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Todas as categorias</option>
              <option value="HIGH_VOLUME">🚀 Alto Volume & Conversão</option>
              <option value="HIGH_EFFICIENCY">🏆 Alta Eficiência Orgânica</option>
              <option value="OPPORTUNITY">🎯 Oportunidade Pós-Mandato</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-500 uppercase tracking-wider">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="leads_desc">Mais Leads Cadastrados</option>
              <option value="multiplier_desc">Maior Multiplicador (Votos/Lead)</option>
              <option value="rafael_votos_desc">Mais Votos Rafael (44077)</option>
              <option value="rafael_validos_desc">Maior % Válidos Rafael</option>
              <option value="nina_votos_desc">Mais Votos Nina (4407)</option>
              <option value="eleitores_desc">Maior Eleitorado</option>
              <option value="nome_asc">Nome Alfabético (A-Z)</option>
            </select>
          </div>

          {/* Diagnostic Guide Toggle */}
          <button
            onClick={() => setShowDiagnosticGuide(!showDiagnosticGuide)}
            className={`px-3 py-1.5 rounded-xl border font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              showDiagnosticGuide 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{showDiagnosticGuide ? 'Ocultar Guia do Diagnóstico' : 'O que é Diagnóstico?'}</span>
          </button>

          <div className="ml-auto text-gray-400 font-medium">
            Exibindo <strong>{filteredRecords.length}</strong> de {crossRecords.length} registros
          </div>

        </div>

        {/* Diagnostic Guide Accordion/Card */}
        {showDiagnosticGuide && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-950 space-y-3">
            <div className="font-black uppercase tracking-tight flex items-center gap-2 text-indigo-900 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Guia das Categorias de Diagnóstico Eleitoral
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              
              <div className="p-3.5 rounded-xl bg-white border border-orange-200 shadow-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-orange-700 uppercase tracking-tight">
                  <span>🚀 Alto Volume & Conversão</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  <strong>Critério:</strong> Alto número de apoiadores cadastrados no CRM (&ge; 15 leads) com votação expressiva nas urnas (&ge; 500 votos).
                </p>
                <div className="text-[10px] text-orange-900 font-bold bg-orange-50 p-1.5 rounded-lg">
                  📌 Significado: Polo principal onde a mobilização digital/física converteu com alta força direta nas urnas.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-emerald-700 uppercase tracking-tight">
                  <span>🏆 Alta Eficiência Orgânica</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  <strong>Critério:</strong> Votação expressiva (&ge; 300 votos) com poucos leads cadastrados, gerando multiplicador elevado (&ge; 30 votos/lead).
                </p>
                <div className="text-[10px] text-emerald-900 font-bold bg-emerald-50 p-1.5 rounded-lg">
                  📌 Significado: Região com forte voto espontâneo, simpatia popular ou lideranças animais independentes.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-sky-200 shadow-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-sky-700 uppercase tracking-tight">
                  <span>🎯 Oportunidade Pós-Mandato</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  <strong>Critério:</strong> Boa base de apoiadores cadastrados (&ge; 10 leads), porém com votação final abaixo do potencial esperado (&lt; 300 votos).
                </p>
                <div className="text-[10px] text-sky-900 font-bold bg-sky-50 p-1.5 rounded-lg">
                  📌 Significado: Local com público ativo já captado. Prioritário para comunicação pós-eleição, fidelização e eventos.
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Cross Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-dark flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Top 15 - Leads no CRM vs Votos Nominais Conquistados
              </h4>
              <p className="text-[11px] text-gray-400 font-medium">
                Comparativo de volume de apoiadores mobilizados contra a votação nominal apurada
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full self-start">
              {viewType.toUpperCase()}
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  height={65} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    fmt(Number(value)), 
                    name === 'leads' ? 'Leads Cadastrados no CRM' : 'Votos Rafael Saraiva (44077)'
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="top"
                  align="right"
                  formatter={(value) => value === 'leads' ? 'Leads no CRM' : 'Votos Rafael Saraiva'}
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 700 }}
                />
                <Bar dataKey="leads" fill="#6366f1" radius={[6, 6, 0, 0]} name="leads" />
                <Bar dataKey="rafaelVotos" fill="#ea580c" radius={[6, 6, 0, 0]} name="rafaelVotos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cross Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-dark">
              Tabela de Desempenho e Multiplicação Eleitoral
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Multiplicador = Votos nominais de Rafael Saraiva divididos pelo número de leads cadastrados
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span>Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 font-bold outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Todos ({filteredRecords.length})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50/80 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200/60">
              <tr>
                <th className="px-4 py-3.5">Local ({viewType === 'municipios' ? 'Município' : 'Bairro'})</th>
                <th className="px-4 py-3.5 text-center bg-indigo-50/50 text-indigo-950">Leads CRM</th>
                <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: Votos</th>
                <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: % Válidos</th>
                <th className="px-4 py-3.5 text-center bg-amber-50/60 text-amber-950 font-black">Multiplicador (Votos/Lead)</th>
                <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: Votos</th>
                <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: % Válidos</th>
                <th className="px-4 py-3.5 text-right">Aptos</th>
                <th className="px-4 py-3.5 text-center">Diagnóstico</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedRecords.map((r, idx) => (
                <tr key={idx} className="hover:bg-amber-50/30 transition-colors font-medium">
                  
                  {/* Nome do Local */}
                  <td className="px-4 py-3">
                    <div className="font-black text-dark">{r.nome}</div>
                    {r.codigo !== '-' && (
                      <div className="text-[10px] text-gray-400 font-mono">TSE: {r.codigo}</div>
                    )}
                  </td>

                  {/* Leads no CRM */}
                  <td className="px-4 py-3 text-center bg-indigo-50/20">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-black ${
                      r.leads >= 20 
                        ? 'bg-indigo-600 text-white' 
                        : r.leads > 0 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-gray-100 text-gray-400 font-medium'
                    }`}>
                      {fmt(r.leads)}
                    </span>
                  </td>

                  {/* Rafael Votos */}
                  <td className="px-4 py-3 text-right font-black text-orange-600 bg-orange-50/20">
                    {fmt(r.rafaelVotos)}
                  </td>

                  {/* Rafael % */}
                  <td className="px-4 py-3 text-right font-bold text-orange-700 bg-orange-50/20">
                    {fmtPct(r.rafaelValidos)}
                  </td>

                  {/* Multiplicador (Votos / Lead) */}
                  <td className="px-4 py-3 text-center bg-amber-50/30">
                    {r.votosPorLeadRafael !== null ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                        r.votosPorLeadRafael >= 30
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : r.votosPorLeadRafael >= 10
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {r.votosPorLeadRafael.toFixed(1)}x
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">-</span>
                    )}
                  </td>

                  {/* Nina Votos */}
                  <td className="px-4 py-3 text-right font-black text-purple-600 bg-purple-50/20">
                    {fmt(r.ninaVotos)}
                  </td>

                  {/* Nina % */}
                  <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/20">
                    {fmtPct(r.ninaValidos)}
                  </td>

                  {/* Eleitores Aptos */}
                  <td className="px-4 py-3 text-right text-gray-500">
                    {fmt(r.eleitores)}
                  </td>

                  {/* Diagnóstico */}
                  <td className="px-4 py-3 text-center">
                    {r.category === 'HIGH_VOLUME' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                        🚀 Alto Volume
                      </span>
                    )}
                    {r.category === 'HIGH_EFFICIENCY' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🏆 Alta Eficiência
                      </span>
                    )}
                    {r.category === 'OPPORTUNITY' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                        🎯 Oportunidade
                      </span>
                    )}
                    {r.category === 'STANDARD' && (
                      <span className="text-[10px] font-bold text-gray-400">
                        Padrão
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
            <div className="text-gray-500 font-medium">
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredRecords.length} itens)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
