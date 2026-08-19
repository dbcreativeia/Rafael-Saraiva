import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Download, Trash2, Filter, Package, Printer, Monitor, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DailyGrowthChart } from '../DailyGrowthChart';
import { CityDistributionMap } from '../CityDistributionMap';

interface MaterialDobradaTabProps {
  refreshTrigger?: number;
}

export const MaterialDobradaTab: React.FC<MaterialDobradaTabProps> = ({ refreshTrigger }) => {
  const [ninapassadore, setNinapassadore] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'impresso' | 'digital'>('todos');
  const [loading, setLoading] = useState(false);

  const fetchNinapassadore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ninapassadore?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setNinapassadore(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("API request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNinapassadore();
  }, [refreshTrigger]);

  const deleteNinapassadore = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este pedido de dobrada?")) return;
    try {
      await fetch('/api/ninapassadore/' + id, { method: 'DELETE' });
      fetchNinapassadore();
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(ninapassadore.map(m => m.cidade))).filter(Boolean).sort();
  }, [ninapassadore]);

  const filteredData = useMemo(() => {
    return ninapassadore.filter(m => {
      const matchCity = cidadeFilter ? m.cidade === cidadeFilter : true;
      const matchTipo = tipoFilter !== 'todos' ? m.tipoMaterial === tipoFilter : true;
      if (!matchCity || !matchTipo) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullName = `${m.nome || ''} ${m.sobrenome || ''}`.toLowerCase();
        const matchName = fullName.includes(q);
        const matchPhone = m.whatsapp?.includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        const matchCity = m.cidade?.toLowerCase().includes(q);
        const matchBairro = m.bairro?.toLowerCase().includes(q);
        const matchCep = m.cep?.includes(q);
        return matchName || matchPhone || matchEmail || matchCity || matchBairro || matchCep;
      }

      return true;
    });
  }, [ninapassadore, cidadeFilter, tipoFilter, search]);

  const totalCount = ninapassadore.length;
  const impressoCount = ninapassadore.filter(m => m.tipoMaterial === 'impresso').length;
  const digitalCount = ninapassadore.filter(m => m.tipoMaterial === 'digital').length;

  const exportFilteredToExcel = (tipo?: 'impresso' | 'digital') => {
    let dataset = filteredData;
    let sheetName = "Material Dobrada";
    let filename = "pedidos_material_dobrada_TODOS.xlsx";

    if (tipo === 'impresso') {
      dataset = filteredData.filter(m => m.tipoMaterial === 'impresso');
      sheetName = "Impressos";
      filename = "pedidos_material_dobrada_IMPRESSO.xlsx";
    } else if (tipo === 'digital') {
      dataset = filteredData.filter(m => m.tipoMaterial === 'digital');
      sheetName = "Digitais";
      filename = "pedidos_material_dobrada_DIGITAL.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(dataset.map(m => ({
      'Data do Pedido': m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR') : '',
      'Nome': m.nome,
      'Sobrenome': m.sobrenome,
      'WhatsApp': m.whatsapp,
      'E-mail': m.email,
      'Endereço': m.endereco,
      'Número': m.numero,
      'Complemento': m.complemento,
      'Bairro': m.bairro,
      'Cidade': m.cidade,
      'Estado': m.estado,
      'CEP': m.cep,
      'Tipo de Material': m.tipoMaterial === 'impresso' ? 'Impresso (Físico)' : 'Digital',
      'Adesivo Perfurado': m.adesivoPerfurado ? 'Sim' : 'Não'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Total Pedidos</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-dark">{totalCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Dobrada Nina Passadore</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Impressos</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-orange-600">{impressoCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Envios físicos</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Digitais</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-600">{digitalCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Download digital</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-fuchsia-600 mb-1">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Cidades</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-fuchsia-600">{uniqueCities.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Municípios alcançados</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Filtros Tipo de Material */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setTipoFilter('todos')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                tipoFilter === 'todos'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setTipoFilter('impresso')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                tipoFilter === 'impresso'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Impressos ({impressoCount})
            </button>
            <button
              onClick={() => setTipoFilter('digital')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                tipoFilter === 'digital'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Digitais ({digitalCount})
            </button>
          </div>

          {/* Lado Direito: Busca, Select de Cidade e Botões */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            
            {/* Campo de Busca */}
            <div className="relative flex-1 sm:w-56 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pedidos dobrada..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none text-xs sm:text-sm bg-white font-medium text-gray-800"
              />
            </div>

            {/* Select de Cidade */}
            <div className="relative flex-1 sm:flex-initial sm:w-48 min-w-[170px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={cidadeFilter}
                onChange={(e) => setCidadeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none bg-white font-medium text-gray-700 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Todas as Cidades ({uniqueCities.length})</option>
                {uniqueCities.map(cidade => (
                  <option key={String(cidade)} value={String(cidade)}>{String(cidade)}</option>
                ))}
              </select>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchNinapassadore}
                disabled={loading}
                title="Atualizar lista"
                className="flex-1 sm:flex-initial bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
                <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
              </button>

              <button
                onClick={() => exportFilteredToExcel('impresso')}
                className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                title="Exportar impressos"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Impressos ({filteredData.filter(m => m.tipoMaterial === 'impresso').length})</span>
              </button>

              <button
                onClick={() => exportFilteredToExcel('digital')}
                className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                title="Exportar digitais"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Digitais ({filteredData.filter(m => m.tipoMaterial === 'digital').length})</span>
              </button>

              <button
                onClick={() => exportFilteredToExcel()}
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                title="Exportar todos os pedidos filtrados"
              >
                <Download className="w-4 h-4" />
                <span>Todos ({filteredData.length})</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Gráfico de Crescimento Diário */}
      <DailyGrowthChart 
        items={ninapassadore}
        title="Histórico de Crescimento - Material Dobrada"
        subtitle="Acompanhamento diário de pedidos de material impresso e digital (Nina Passadore)"
        accentColor="#9333ea"
        hasBreakdown={true}
        itemNoun="Pedidos"
      />

      {/* Mapa de Distribuição por Cidade */}
      <CityDistributionMap 
        items={ninapassadore}
        title="Distribuição Geográfica (Material Dobrada)"
        subtitle="Concentração por município dos pedidos de material da dobrada"
        itemLabel="pedido"
        accentColor="#9333ea"
      />

      {/* Tabela de Pedidos */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase text-dark">Lista de Pedidos - Dobrada Nina Passadore</h3>
            <p className="text-xs text-gray-500">Exibindo {filteredData.length} de {totalCount} registros</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Nome Completo</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">Endereço de Entrega</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Adesivo Perf.</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
              {filteredData.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap font-medium">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-800">
                    {m.nome} {m.sobrenome}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="font-mono text-xs text-gray-800 font-bold">{m.whatsapp}</div>
                    <div className="text-[11px] text-gray-400">{m.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="font-medium text-gray-800">{m.endereco}{m.numero ? `, ${m.numero}` : ''}{m.complemento ? ` (${m.complemento})` : ''}</div>
                    <div className="text-[11px] text-gray-400">{m.bairro}, {m.cidade}/{m.estado} - CEP: {m.cep}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      m.tipoMaterial === 'digital'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {m.tipoMaterial === 'impresso' ? 'Impresso' : 'Digital'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap">
                    {m.tipoMaterial === 'impresso' ? (
                      m.adesivoPerfurado ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-xs">Sim</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Não</span>
                      )
                    ) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => deleteNinapassadore(m.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Excluir pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-gray-400 font-medium">
                    {loading ? 'Carregando dados...' : 'Nenhum pedido encontrado com os filtros selecionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
