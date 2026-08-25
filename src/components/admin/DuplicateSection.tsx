import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  MapPin, 
  Search, 
  ShieldAlert, 
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import { DuplicateGroup } from './duplicateUtils';

interface DuplicateSectionProps {
  title: string;
  categoryLabel: 'Impressos' | 'Digitais';
  categoryColor: 'orange' | 'blue' | 'purple' | 'indigo';
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
  onDeleteSingle: (id: string) => Promise<void>;
  onDeleteBatch: (ids: string[]) => Promise<void>;
  onRefresh: () => void;
}

export const DuplicateSection: React.FC<DuplicateSectionProps> = ({
  title,
  categoryLabel,
  categoryColor,
  duplicateGroups,
  totalDuplicates,
  onDeleteSingle,
  onDeleteBatch,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [confirmBulkModal, setConfirmBulkModal] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Filtrar grupos por busca
  const filteredGroups = duplicateGroups.filter(group => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const nameMatch = group.allItems.some(item => 
      `${item.nome || ''} ${item.sobrenome || ''}`.toLowerCase().includes(q)
    );
    const phoneMatch = group.allItems.some(item => (item.whatsapp || '').includes(q));
    const emailMatch = group.allItems.some(item => (item.email || '').toLowerCase().includes(q));
    const cityMatch = group.allItems.some(item => (item.cidade || '').toLowerCase().includes(q));
    return nameMatch || phoneMatch || emailMatch || cityMatch;
  });

  const allDuplicateIds = duplicateGroups.flatMap(g => g.duplicateItems.map(d => d.id));

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este registro duplicado?")) return;
    setDeletingId(id);
    try {
      await onDeleteSingle(id);
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteGroupDuplicates = async (group: DuplicateGroup) => {
    const ids = group.duplicateItems.map(d => d.id);
    if (!window.confirm(`Deseja excluir as ${ids.length} duplicatas deste grupo e manter apenas o registro mais recente de "${group.primaryItem.nome} ${group.primaryItem.sobrenome}"?`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      await onDeleteBatch(ids);
      onRefresh();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeleteAll = async () => {
    setConfirmBulkModal(false);
    setIsBulkDeleting(true);
    try {
      await onDeleteBatch(allDuplicateIds);
      onRefresh();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const badgeColorClass = {
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  }[categoryColor];

  const btnColorClass = {
    orange: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
    blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    purple: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
  }[categoryColor];

  return (
    <div className="space-y-5">
      {/* Header com Resumo e Ação Global */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-300/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {title}
                </h3>
                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border ${badgeColorClass}`}>
                  {categoryLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                {duplicateGroups.length === 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Nenhum registro duplicado encontrado! Todos os {categoryLabel.toLowerCase()} são únicos.
                  </span>
                ) : (
                  <span>
                    Identificados <strong className="text-red-600">{totalDuplicates} registros duplicados</strong> distribuídos em <strong>{duplicateGroups.length} grupos</strong> de pessoas que enviaram mais de uma vez.
                  </span>
                )}
              </p>
            </div>
          </div>

          {totalDuplicates > 0 && (
            <div className="flex items-center gap-2.5 self-stretch md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setConfirmBulkModal(true)}
                disabled={isBulkDeleting}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Todos os {totalDuplicates} Duplicados ({categoryLabel})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {duplicateGroups.length > 0 && (
        <>
          {/* Busca interna */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar nos grupos de duplicados (${categoryLabel})...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-xs sm:text-sm font-medium text-gray-800"
              />
            </div>
            <div className="text-xs text-gray-500 font-bold whitespace-nowrap px-2">
              {filteredGroups.length} de {duplicateGroups.length} grupos
            </div>
          </div>

          {/* Lista de Grupos de Duplicados */}
          <div className="space-y-4">
            {filteredGroups.map((group, groupIdx) => {
              const primary = group.primaryItem;
              const duplicates = group.duplicateItems;

              return (
                <div 
                  key={group.id} 
                  className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden divide-y divide-gray-100 hover:border-amber-300 transition-colors"
                >
                  {/* Cabeçalho do Grupo */}
                  <div className="p-4 sm:p-4.5 bg-gradient-to-r from-amber-50/70 to-orange-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-black text-xs shrink-0 border border-amber-200">
                        #{groupIdx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-gray-900">
                            {primary.nome} {primary.sobrenome}
                          </h4>
                          <span className="bg-red-100 text-red-700 text-[11px] font-black px-2 py-0.5 rounded-md border border-red-200">
                            {group.totalCount} envios ({duplicates.length} duplicata{duplicates.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap font-medium">
                          {primary.whatsapp && (
                            <span className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <strong className="font-mono">{primary.whatsapp}</strong>
                            </span>
                          )}
                          {primary.email && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <Mail className="w-3.5 h-3.5 text-blue-600" />
                              <span>{primary.email}</span>
                            </span>
                          )}
                          {primary.cidade && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span>{primary.cidade}/{primary.estado}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroupDuplicates(group)}
                      disabled={isBulkDeleting}
                      className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-stretch sm:self-auto justify-center"
                      title="Deixar apenas 1 registro único para este contato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir {duplicates.length} duplicata{duplicates.length > 1 ? 's' : ''} (Deixar Único)</span>
                    </button>
                  </div>

                  {/* Detalhes dos Itens do Grupo */}
                  <div className="p-4 sm:p-5 space-y-3 bg-white">
                    {/* Item Principal (A MANTER) */}
                    <div className="p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            Registro Mais Recente (ÚNICO A MANTER)
                          </span>
                          <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {primary.createdAt ? new Date(primary.createdAt).toLocaleString('pt-BR') : '-'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700 font-medium">
                          <strong>Endereço:</strong> {primary.endereco || 'Não informado'}{primary.numero ? `, ${primary.numero}` : ''}{primary.complemento ? ` (${primary.complemento})` : ''} - {primary.bairro || ''}, {primary.cidade}/{primary.estado} - CEP: {primary.cep}
                        </div>
                        {primary.adesivoPerfurado !== undefined && (
                          <div className="text-[11px] text-gray-500">
                            Adesivo perfurado: <strong>{primary.adesivoPerfurado ? 'Sim' : 'Não'}</strong>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg inline-block border border-emerald-200">
                          Preservado como Único
                        </span>
                      </div>
                    </div>

                    {/* Itens Duplicados (A EXCLUIR) */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-black uppercase tracking-wider text-red-600 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        Envios repetidos anteriores ({duplicates.length}):
                      </p>
                      {duplicates.map((dup, dupIdx) => (
                        <div 
                          key={dup.id}
                          className="p-3.5 rounded-xl border border-red-200 bg-red-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-red-50/60 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                                Duplicata #{dupIdx + 1}
                              </span>
                              <span className="text-xs text-gray-600 font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {dup.createdAt ? new Date(dup.createdAt).toLocaleString('pt-BR') : '-'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium text-gray-800">{dup.endereco || 'Endereço não informado'}{dup.numero ? `, ${dup.numero}` : ''}</span> - {dup.bairro}, {dup.cidade}/{dup.estado} - CEP: {dup.cep}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(dup.id)}
                            disabled={deletingId === dup.id || isBulkDeleting}
                            className="bg-white hover:bg-red-600 active:bg-red-700 text-red-600 hover:text-white border border-red-300 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 self-end md:self-auto"
                            title="Excluir apenas esta duplicata"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingId === dup.id ? 'Excluindo...' : 'Excluir esta cópia'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Confirmação para Excluir Todos os Duplicados */}
      {confirmBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900">
                Confirmar Limpeza de Duplicados
              </h3>
              <p className="text-sm text-gray-600">
                Você está prestes a remover <strong className="text-red-600">{totalDuplicates} registros duplicados</strong> de <strong>{categoryLabel}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 text-left space-y-1.5 font-medium">
                <p>✓ <strong>{duplicateGroups.length} contatos</strong> continuarão com exatamente 1 pedido único preservado (o mais recente).</p>
                <p>✓ Os envios repetidos anteriores serão removidos permanentemente.</p>
                <p>✓ Apenas registros de <strong>{categoryLabel}</strong> serão afetados.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBulkModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteAll}
                disabled={isBulkDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                {isBulkDeleting ? 'Excluindo...' : 'Sim, Excluir Duplicados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
