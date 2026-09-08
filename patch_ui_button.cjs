const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const target = `<button
              onClick={() => {
                setIsUploadModalOpen(true);
                setUploadError('');
                setUploadSuccessMessage('');
              }}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer border border-blue-400/40"
            >`;

const replace = `<button
              onClick={() => {
                setIsUploadModalOpen(true);
                setUploadError('');
                setUploadSuccessMessage('');
              }}
              disabled={summary?.isRefreshing || !summary?.isReady}
              className={\`\${(summary?.isRefreshing || !summary?.isReady) ? 'bg-blue-800/80 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 cursor-pointer'} text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 text-xs sm:text-sm transition-all border border-blue-400/40\`}
            >`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
console.log('patched upload button');
