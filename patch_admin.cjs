const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Add activeTab state
content = content.replace(
  "const [cityFilterPetitions, setCityFilterPetitions] = useState('');",
  "const [cityFilterPetitions, setCityFilterPetitions] = useState('');\n  const [activeTab, setActiveTab] = useState<'PROTOCOLOS' | 'JOGO'>('PROTOCOLOS');\n  const [jogoUsersData, setJogoUsersData] = useState<any[]>([]);"
);

// Fetch jogo users
content = content.replace(
  "        fetch('/api/petitions')",
  "        fetch('/api/petitions'),\n        fetch('/api/jogo/users')"
);

content = content.replace(
  "const petitionsResult = await petitionsResponse.json();",
  "const petitionsResult = await petitionsResponse.json();\n      const jogoUsersResult = await jogoUsersResponse.json();"
);

content = content.replace(
  "setPetitionsData(Array.isArray(petitionsResult) ? petitionsResult : []);",
  "setPetitionsData(Array.isArray(petitionsResult) ? petitionsResult : []);\n      setJogoUsersData(Array.isArray(jogoUsersResult) ? jogoUsersResult : []);"
);

// We need to add the tab switch UI
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
  "        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6 mb-8\">",
  tabUI + "\n        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6 mb-8\">"
);

// End of PROTOCOLOS tab and start of JOGO tab
const jogoTab = `
          </div>
        )}

        {activeTab === 'JOGO' && (
          <div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-black uppercase text-dark">Usuários do Jogo</h2>
                <div className="text-sm font-bold bg-blue-50 text-blue-600 py-2 px-4 rounded-xl">
                  {jogoUsersData.length} Cadastros
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Data</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Nome Completo</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Usuário</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Contato</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Localidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jogoUsersData.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Nenhum cadastro encontrado.</td></tr>
                    ) : (
                      jogoUsersData.map((user, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-600">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4 font-bold text-dark">{user.nomeCompleto}</td>
                          <td className="p-4 text-sm font-bold text-primary">{user.usuario}</td>
                          <td className="p-4 text-sm font-medium text-gray-600">
                            <div>{user.email}</div>
                            <div className="text-xs text-gray-400">{user.whatsapp}</div>
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-600">
                            <div>{user.cidade}</div>
                            <div className="text-xs text-gray-400">CEP: {user.cep}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace(
  "      </div>\n    </div>\n  );\n};",
  jogoTab + "\n      </div>\n    </div>\n  );\n};"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
