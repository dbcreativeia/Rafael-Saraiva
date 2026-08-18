const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Modifying NinaPassadoreAdminTab
content = content.replace(
  'const NinaPassadoreAdminTab = () => {\n  const [ninapassadore, setNinapassadore] = React.useState<any[]>([]);',
  'const NinaPassadoreAdminTab = () => {\n  const [ninapassadore, setNinapassadore] = React.useState<any[]>([]);\n  const [cidadeFilter, setCidadeFilter] = React.useState("");\n\n  const uniqueCities = Array.from(new Set(ninapassadore.map(m => m.cidade))).filter(Boolean).sort();\n  const filteredData = ninapassadore.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);'
);

content = content.replace(
  '<div className="flex justify-between items-center mb-6">\n        <h2 className="text-2xl font-black uppercase text-dark">Pedidos de Material Dobrada</h2>\n        <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2">\n          <Download className="w-5 h-5" /> Exportar Planilha\n        </button>\n      </div>',
  `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black uppercase text-dark">Pedidos de Material Dobrada</h2>
          <div className="text-sm font-bold bg-purple-50 text-purple-600 py-1 px-3 rounded-lg">
            {ninapassadore.length} Pedidos
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={cidadeFilter}
              onChange={(e) => setCidadeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-sm"
            >
              <option value="">Todas as cidades</option>
              {uniqueCities.map(cidade => (
                <option key={String(cidade)} value={String(cidade)}>{String(cidade)}</option>
              ))}
            </select>
          </div>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2">
            <Download className="w-5 h-5" /> Exportar
          </button>
        </div>
      </div>`
);

content = content.replace(
  '<th className="p-4 font-bold">Data</th>\n              <th className="p-4 font-bold">Nome</th>\n              <th className="p-4 font-bold">WhatsApp</th>\n              <th className="p-4 font-bold">Cidade</th>\n              <th className="p-4 font-bold">Tipo</th>\n              <th className="p-4 font-bold">Adesivo Perf.</th>\n              <th className="p-4 font-bold">Ações</th>',
  '<th className="p-4 font-bold">Data</th>\n              <th className="p-4 font-bold">Nome</th>\n              <th className="p-4 font-bold">Contato</th>\n              <th className="p-4 font-bold">Endereço Completo</th>\n              <th className="p-4 font-bold">Tipo</th>\n              <th className="p-4 font-bold">Adesivo Perf.</th>\n              <th className="p-4 font-bold text-right">Ações</th>'
);

content = content.replace(
  '{ninapassadore.map(m => (\n              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">\n                <td className="p-4 text-sm font-medium text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</td>\n                <td className="p-4 font-bold text-gray-800">{m.nome} {m.sobrenome}</td>\n                <td className="p-4 text-sm text-gray-600">{m.whatsapp}</td>\n                <td className="p-4 text-sm text-gray-600">{m.cidade}/{m.estado}</td>',
  `{filteredData.map(m => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-sm font-medium text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td className="p-4 font-bold text-gray-800">{m.nome} {m.sobrenome}</td>
                <td className="p-4 text-sm text-gray-600">
                  <div>{m.whatsapp}</div>
                  <div className="text-xs text-gray-400">{m.email}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  <div>{m.endereco}{m.numero ? \`, \${m.numero}\` : ''}{m.complemento ? \` - \${m.complemento}\` : ''}</div>
                  <div className="text-xs text-gray-400">{m.bairro}, {m.cidade}/{m.estado} - CEP: {m.cep}</div>
                </td>`
);

content = content.replace(
  '<td className="p-4">\n                  <button onClick={() => deleteNinapassadore(m.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>\n                </td>',
  '<td className="p-4 text-right">\n                  <button onClick={() => deleteNinapassadore(m.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>\n                </td>'
);


// Modifying MaterialAdminTab
content = content.replace(
  'const MaterialAdminTab = () => {\n  const [materials, setMaterials] = React.useState<any[]>([]);',
  'const MaterialAdminTab = () => {\n  const [materials, setMaterials] = React.useState<any[]>([]);\n  const [cidadeFilter, setCidadeFilter] = React.useState("");\n\n  const uniqueCities = Array.from(new Set(materials.map(m => m.cidade))).filter(Boolean).sort();\n  const filteredData = materials.filter(m => cidadeFilter ? m.cidade === cidadeFilter : true);'
);

content = content.replace(
  '<div className="flex justify-between items-center mb-6">\n        <h2 className="text-2xl font-black uppercase text-dark">Pedidos de Material de Campanha</h2>\n        <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2">\n          <Download className="w-5 h-5" /> Exportar Planilha\n        </button>\n      </div>',
  `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black uppercase text-dark">Pedidos de Material de Campanha</h2>
          <div className="text-sm font-bold bg-indigo-50 text-indigo-600 py-1 px-3 rounded-lg">
            {materials.length} Pedidos
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={cidadeFilter}
              onChange={(e) => setCidadeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-sm"
            >
              <option value="">Todas as cidades</option>
              {uniqueCities.map(cidade => (
                <option key={String(cidade)} value={String(cidade)}>{String(cidade)}</option>
              ))}
            </select>
          </div>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2">
            <Download className="w-5 h-5" /> Exportar
          </button>
        </div>
      </div>`
);

content = content.replace(
  '<th className="p-4 font-bold">Data</th>\n              <th className="p-4 font-bold">Nome</th>\n              <th className="p-4 font-bold">WhatsApp</th>\n              <th className="p-4 font-bold">Cidade</th>\n              <th className="p-4 font-bold">Tipo</th>\n              <th className="p-4 font-bold">Adesivo Perf.</th>\n              <th className="p-4 font-bold">Ações</th>',
  '<th className="p-4 font-bold">Data</th>\n              <th className="p-4 font-bold">Nome</th>\n              <th className="p-4 font-bold">Contato</th>\n              <th className="p-4 font-bold">Endereço Completo</th>\n              <th className="p-4 font-bold">Tipo</th>\n              <th className="p-4 font-bold">Adesivo Perf.</th>\n              <th className="p-4 font-bold text-right">Ações</th>'
);

content = content.replace(
  '{materials.map(m => (\n              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">\n                <td className="p-4 text-sm font-medium text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</td>\n                <td className="p-4 font-bold text-gray-800">{m.nome} {m.sobrenome}</td>\n                <td className="p-4 text-sm text-gray-600">{m.whatsapp}</td>\n                <td className="p-4 text-sm text-gray-600">{m.cidade}/{m.estado}</td>',
  `{filteredData.map(m => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-sm font-medium text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td className="p-4 font-bold text-gray-800">{m.nome} {m.sobrenome}</td>
                <td className="p-4 text-sm text-gray-600">
                  <div>{m.whatsapp}</div>
                  <div className="text-xs text-gray-400">{m.email}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  <div>{m.endereco}{m.numero ? \`, \${m.numero}\` : ''}{m.complemento ? \` - \${m.complemento}\` : ''}</div>
                  <div className="text-xs text-gray-400">{m.bairro}, {m.cidade}/{m.estado} - CEP: {m.cep}</div>
                </td>`
);

content = content.replace(
  '<td className="p-4">\n                  <button onClick={() => deleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>\n                </td>',
  '<td className="p-4 text-right">\n                  <button onClick={() => deleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>\n                </td>'
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

