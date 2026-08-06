const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const jogoActions = `
  const exportJogoUsersExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = jogoUsersData.map(u => ({
      Nome: u.nomeCompleto,
      Usuario: u.usuario,
      WhatsApp: u.whatsapp,
      Email: u.email,
      CEP: u.cep,
      Cidade: u.cidade,
      Estado: u.estado,
      'Data de Cadastro': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Jogo Users");
    XLSX.writeFile(wb, "jogo_users.xlsx");
  };

  const deleteJogoUser = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover este cadastro?")) return;
    try {
      await fetch(\`/api/jogo/users/\${id}\`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };
`;

content = content.replace(
  "  if (!isAuthenticated) {",
  jogoActions + "\n  if (!isAuthenticated) {"
);

// Add export button and delete button
content = content.replace(
  '<div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">',
  `<div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">`
);

content = content.replace(
  '<h2 className="text-xl font-black uppercase text-dark">Usuários do Jogo</h2>',
  `<div className="flex items-center gap-4">
                  <h2 className="text-xl font-black uppercase text-dark">Usuários do Jogo</h2>
                  <div className="text-sm font-bold bg-blue-50 text-blue-600 py-1 px-3 rounded-lg">
                    {jogoUsersData.length} Cadastros
                  </div>
                </div>`
);

content = content.replace(
  '<div className="text-sm font-bold bg-blue-50 text-blue-600 py-2 px-4 rounded-xl">\n                  {jogoUsersData.length} Cadastros\n                </div>',
  `<button
                  onClick={exportJogoUsersExcel}
                  className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" /> Exportar Dados
                </button>`
);

content = content.replace(
  '<th className="p-4 font-bold text-gray-500 uppercase text-xs">Localidade</th>\n                    </tr>',
  `<th className="p-4 font-bold text-gray-500 uppercase text-xs">Localidade</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs text-right">Ações</th>
                    </tr>`
);

content = content.replace(
  '<td className="p-4 text-sm font-medium text-gray-600">\n                            <div>{user.cidade} - {user.estado || \'SP\'}</div>\n                            <div className="text-xs text-gray-400">CEP: {user.cep}</div>\n                          </td>\n                        </tr>',
  `<td className="p-4 text-sm font-medium text-gray-600">
                            <div>{user.cidade} - {user.estado || 'SP'}</div>
                            <div className="text-xs text-gray-400">CEP: {user.cep}</div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => deleteJogoUser(user.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remover Cadastro"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
