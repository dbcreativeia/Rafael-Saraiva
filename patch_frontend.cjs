const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// Add handleRefreshData
code = code.replace(/const fetchSummary = async \(\) => \{/, `const handleRefreshData = async () => {
    try {
      await fetch('/api/leads/refresh-cache', { method: 'POST' });
      fetchSummary(); // Trigger a quick refresh to see the spinner
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSummary = async () => {`);

// Add useEffect for polling
code = code.replace(/useEffect\(\(\) => \{\n\s*fetchLeadsPage\(currentPage\);\n\s*\}, \[deferredSearch/, `useEffect(() => {
    let interval;
    if (summary?.isRefreshing || !summary?.isReady) {
      interval = setInterval(() => {
        fetchSummary();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [summary?.isRefreshing, summary?.isReady]);

  useEffect(() => {
    fetchLeadsPage(currentPage);
  }, [deferredSearch`);

// Inject the button next to "Importar Base"
const btnCode = `
            <button
              onClick={handleRefreshData}
              disabled={summary?.isRefreshing || !summary?.isReady}
              className={\`\${(summary?.isRefreshing || !summary?.isReady) ? 'bg-indigo-800/80 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700'} text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-900/40 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer border border-indigo-400/40\`}
            >
              <RefreshCw className={\`w-4 h-4 \${(summary?.isRefreshing || !summary?.isReady) ? 'animate-spin' : ''}\`} />
              <span>{(summary?.isRefreshing || !summary?.isReady) ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>
`;
code = code.replace(/<button\n\s*onClick=\{\(\) => \{\n\s*setIsUploadModalOpen\(true\);/, btnCode + '\n            <button\n              onClick={() => {\n                setIsUploadModalOpen(true);');

// Add the refreshMessage display somewhere visible, maybe under the title
const msgCode = `
        {/* Titulo */}
        <div className="flex-1 min-w-[300px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            <span className="text-xs font-bold text-blue-100 tracking-wider">CENTRAL UNIFICADA DE LEADS 360°</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-2 tracking-tight">
            GESTÃO CONSOLIDADA DE <br className="hidden sm:block" />APOIADORES
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base max-w-xl font-medium leading-relaxed">
            Todos os cadastros do site e bases externas unificados por pessoa: Apoio SP, Materiais, Abaixo-assinados, Minuta do PL, Jogo e Listas Importadas.
          </p>
          {(summary?.isRefreshing || !summary?.isReady) && summary?.refreshMessage && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-900/50 border border-indigo-400/50 rounded-lg backdrop-blur-sm animate-pulse">
              <RefreshCw className="w-4 h-4 text-indigo-300 animate-spin" />
              <span className="text-indigo-100 text-sm font-semibold">{summary.refreshMessage}</span>
            </div>
          )}
        </div>
`;
code = code.replace(/\{\/\* Titulo \*\/\}\n\s*<div className="flex-1 min-w-\[300px\]">[\s\S]*?<\/p>\n\s*<\/div>/, msgCode);


fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
console.log('patched CentralLeadsTab.tsx');
