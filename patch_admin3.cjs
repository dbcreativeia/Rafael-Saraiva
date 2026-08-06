const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const tabUI = `
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('PROTOCOLOS')}
            className={\`pb-4 font-bold uppercase tracking-wider transition-colors \${activeTab === 'PROTOCOLOS' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}\`}
          >
            Protocolos e Abaixo-assinados
          </button>
          <button
            onClick={() => setActiveTab('JOGO')}
            className={\`pb-4 font-bold uppercase tracking-wider transition-colors \${activeTab === 'JOGO' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}\`}
          >
            Jogo - Missão Resgate
          </button>
        </div>

        {activeTab === 'PROTOCOLOS' && (
          <div>
`;

content = content.replace(
  "        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10\">",
  tabUI + "\n        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10\">"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
