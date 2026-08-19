import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Download, Trash2, Filter, Gamepad2, Trophy, Users, UserCheck, Flame, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DailyGrowthChart } from '../DailyGrowthChart';
import { CityDistributionMap } from '../CityDistributionMap';

interface JogoTabProps {
  refreshTrigger?: number;
}

export const JogoTab: React.FC<JogoTabProps> = ({ refreshTrigger }) => {
  const [jogoUsers, setJogoUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unique' | 'duplicates'>('all');
  const [sortField, setSortField] = useState<'date' | 'score' | 'playCount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  const fetchJogoUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jogo/users?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setJogoUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("API request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJogoUsers();
  }, [refreshTrigger]);

  const deleteJogoUser = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este cadastro de jogador?")) return;
    try {
      await fetch(`/api/jogo/users/${id}`, { method: 'DELETE' });
      fetchJogoUsers();
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const processedList = useMemo(() => {
    const list = [...jogoUsers];
    const emailMap = new Map();
    const phoneMap = new Map();

    list.forEach(user => {
      if (user.email) {
        const key = user.email.toLowerCase().trim();
        emailMap.set(key, (emailMap.get(key) || 0) + 1);
      }
      if (user.whatsapp) {
        const key = user.whatsapp.replace(/\D/g, '');
        if (key.length > 8) {
          phoneMap.set(key, (phoneMap.get(key) || 0) + 1);
        }
      }
    });

    return list.map(user => {
      let isDuplicate = false;
      const emailKey = user.email ? user.email.toLowerCase().trim() : null;
      const phoneKey = user.whatsapp ? user.whatsapp.replace(/\D/g, '') : null;

      if (emailKey && emailMap.get(emailKey) > 1) isDuplicate = true;
      if (phoneKey && phoneKey.length > 8 && phoneMap.get(phoneKey) > 1) isDuplicate = true;

      return { ...user, isDuplicate };
    });
  }, [jogoUsers]);

  const filteredAndSorted = useMemo(() => {
    let result = processedList.filter(user => {
      if (filterType === 'unique' && user.isDuplicate) return false;
      if (filterType === 'duplicates' && !user.isDuplicate) return false;
      if (estadoFilter && (user.estado || 'SP') !== estadoFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = user.nomeCompleto?.toLowerCase().includes(q);
        const matchUser = user.usuario?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchPhone = user.whatsapp?.includes(q);
        const matchCity = user.cidade?.toLowerCase().includes(q);
        return matchName || matchUser || matchEmail || matchPhone || matchCity;
      }

      return true;
    });

    return result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'date') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else if (sortField === 'score') {
        valA = a.maxScore || 0;
        valB = b.maxScore || 0;
      } else if (sortField === 'playCount') {
        valA = a.playCount || 0;
        valB = b.playCount || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }, [processedList, filterType, estadoFilter, search, sortField, sortOrder]);

  const totalCount = processedList.length;
  const uniqueCount = processedList.filter(u => !u.isDuplicate).length;
  const totalPlays = useMemo(() => processedList.reduce((acc, u) => acc + (u.playCount || 0), 0), [processedList]);
  const maxScore = useMemo(() => processedList.reduce((max, u) => Math.max(max, u.maxScore || 0), 0), [processedList]);

  const exportJogoUsersExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredAndSorted.map(u => ({
      'Data de Cadastro': u.createdAt ? new Date(u.createdAt).toLocaleString('pt-BR') : '',
      'Nome Completo': u.nomeCompleto,
      'Usuário (Nickname)': u.usuario,
      'WhatsApp': u.whatsapp,
      'E-mail': u.email,
      'CEP': u.cep,
      'Cidade': u.cidade,
      'Estado': u.estado || 'SP',
      'Pontuação Máxima': u.maxScore || 0,
      'Partidas Jogadas': u.playCount || 0,
      'Duplicado': u.isDuplicate ? 'Sim' : 'Não'
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Jogadores");
    XLSX.writeFile(wb, "jogadores_missao_resgate.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Total Jogadores</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-dark">{totalCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Cadastros totais</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Únicos</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-600">{uniqueCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Contatos válidos</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Partidas</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{totalPlays.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 font-medium">Partidas jogadas</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Recorde Máx</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-600">{maxScore.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 font-medium">Maior pontuação</p>
        </div>
      </div>

      {/* Barra de Filtros, Ordenação, Busca e Ações */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Filtros Tipo */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setFilterType('unique')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'unique'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Únicos ({uniqueCount})
            </button>
            <button
              onClick={() => setFilterType('duplicates')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'duplicates'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Duplicados ({totalCount - uniqueCount})
            </button>
          </div>

          {/* Busca, Ordenação, Estado e Botões */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            
            {/* Busca */}
            <div className="relative flex-1 sm:w-56 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar jogador ou nick..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-xs sm:text-sm bg-white font-medium text-gray-800"
              />
            </div>

            {/* Ordenação */}
            <div className="relative flex-1 sm:flex-initial sm:w-44 min-w-[150px]">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field as 'date' | 'score' | 'playCount');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="w-full pl-8 pr-7 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-xs sm:text-sm cursor-pointer"
              >
                <option value="date-desc">Mais Recentes</option>
                <option value="date-asc">Mais Antigos</option>
                <option value="score-desc">Maior Pontuação</option>
                <option value="score-asc">Menor Pontuação</option>
                <option value="playCount-desc">Mais Partidas</option>
                <option value="playCount-asc">Menos Partidas</option>
              </select>
            </div>

            {/* Estado (UF) */}
            <div className="relative flex-1 sm:flex-initial sm:w-36 min-w-[130px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full pl-8 pr-7 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Todos Estados</option>
                {['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'DF', 'ES', 'GO', 'PE', 'CE', 'MT', 'MS', 'PA', 'PB', 'RN', 'AL', 'SE', 'PI', 'MA', 'RO', 'TO', 'AC', 'AM', 'AP', 'RR'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchJogoUsers}
                disabled={loading}
                title="Atualizar lista"
                className="flex-1 sm:flex-initial bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : 'text-gray-500'}`} />
                <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
              </button>

              <button
                onClick={exportJogoUsersExcel}
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>Exportar ({filteredAndSorted.length})</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Gráfico de Crescimento Diário do Jogo */}
      <DailyGrowthChart 
        items={jogoUsers}
        title="Histórico de Novos Jogadores"
        subtitle="Acompanhamento diário de novos usuários cadastrados no jogo"
        accentColor="#0284c7"
        itemNoun="Jogadores"
      />

      {/* Mapa de Calor por Cidade */}
      <CityDistributionMap 
        items={jogoUsers}
        title="Distribuição Geográfica dos Jogadores"
        subtitle="Concentração de jogadores por município"
        itemLabel="jogador"
        accentColor="#0284c7"
      />

      {/* Tabela de Jogadores */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase text-dark">Ranking e Lista de Jogadores</h3>
            <p className="text-xs text-gray-500">Exibindo {filteredAndSorted.length} de {totalCount} cadastros</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Nome Completo</th>
                <th className="py-3.5 px-4">Usuário (Nick)</th>
                <th className="py-3.5 px-4">Desempenho</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">Localidade</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
              {filteredAndSorted.map((user, idx) => (
                <tr key={user.id || idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{user.nomeCompleto}</span>
                      {user.isDuplicate && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-primary">
                    @{user.usuario}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold text-dark">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span>{user.maxScore?.toLocaleString() || 0} pts</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">{user.playCount || 0} partidas</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="font-mono text-xs text-gray-800 font-bold">{user.whatsapp || '-'}</div>
                    <div className="text-[11px] text-gray-400">{user.email || '-'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700">
                    <span className="font-bold">{user.cidade || 'Não informada'}</span>
                    <span className="text-gray-400 text-xs ml-1">/{user.estado || 'SP'}</span>
                    {user.cep && <div className="text-[11px] text-gray-400 font-mono">CEP: {user.cep}</div>}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => deleteJogoUser(user.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Excluir jogador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-gray-400 font-medium">
                    {loading ? 'Carregando dados...' : 'Nenhum jogador encontrado com os filtros selecionados.'}
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
