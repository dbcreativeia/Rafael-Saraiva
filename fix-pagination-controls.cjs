const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const replacement = `
            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                
                <span className="text-sm font-medium text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}

            {/* Footer da Tabela com Totais */}
`;

content = content.replace("{/* Footer da Tabela com Totais */}", replacement);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
