const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const target = `{/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">`;

const replace = `{(summary?.isRefreshing || !summary?.isReady) && summary?.refreshMessage && (
        <div className="bg-blue-900 border border-blue-400 text-blue-100 px-4 py-3 rounded-lg flex items-center justify-between mb-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-300" />
            <span className="font-medium">{summary.refreshMessage}</span>
          </div>
        </div>
      )}

      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">`;

if (code.includes('summary?.refreshMessage')) {
  console.log('already has refreshMessage');
} else {
  code = code.replace(target, replace);
  fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
  console.log('added refreshMessage');
}
