const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// NinaPassadoreAdminTab modifications
content = content.replace(
  'const filteredData = ninapassadore.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);',
  'const filteredData = ninapassadore.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);\n  const totalCount = ninapassadore.length;\n  const impressoCount = ninapassadore.filter(m => m.tipoMaterial === \'impresso\').length;\n  const digitalCount = ninapassadore.filter(m => m.tipoMaterial === \'digital\').length;'
);

content = content.replace(
  '<div className="text-sm font-bold bg-purple-50 text-purple-600 py-1 px-3 rounded-lg">\n            {ninapassadore.length} Pedidos\n          </div>',
  `<div className="flex gap-2">
            <div className="text-sm font-bold bg-purple-50 text-purple-600 py-1 px-3 rounded-lg">
              {totalCount} Geral
            </div>
            <div className="text-sm font-bold bg-orange-50 text-orange-600 py-1 px-3 rounded-lg">
              {impressoCount} Impressos
            </div>
            <div className="text-sm font-bold bg-blue-50 text-blue-600 py-1 px-3 rounded-lg">
              {digitalCount} Digitais
            </div>
          </div>`
);

// MaterialAdminTab modifications
content = content.replace(
  'const filteredData = materials.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);',
  'const filteredData = materials.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);\n  const totalCount = materials.length;\n  const impressoCount = materials.filter(m => m.tipoMaterial === \'impresso\').length;\n  const digitalCount = materials.filter(m => m.tipoMaterial === \'digital\').length;'
);

content = content.replace(
  '<div className="text-sm font-bold bg-indigo-50 text-indigo-600 py-1 px-3 rounded-lg">\n            {materials.length} Pedidos\n          </div>',
  `<div className="flex gap-2">
            <div className="text-sm font-bold bg-indigo-50 text-indigo-600 py-1 px-3 rounded-lg">
              {totalCount} Geral
            </div>
            <div className="text-sm font-bold bg-orange-50 text-orange-600 py-1 px-3 rounded-lg">
              {impressoCount} Impressos
            </div>
            <div className="text-sm font-bold bg-blue-50 text-blue-600 py-1 px-3 rounded-lg">
              {digitalCount} Digitais
            </div>
          </div>`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

