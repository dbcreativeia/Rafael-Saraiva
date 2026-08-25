const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const newButton = `
            <button
              onClick={exportMailMergeExcel}
              disabled={consolidatedLeads.length === 0}
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-amber-900/30 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Endereços Correios</span>
            </button>
            <button
              onClick={exportConsolidatedExcel}
`;

content = content.replace("<button\n              onClick={exportConsolidatedExcel}", newButton);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
