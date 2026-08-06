const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

content = content.replace(
  "const [authForm, setAuthForm] = useState({ nomeCompleto: '', usuario: '', senha: '', email: '', whatsapp: '', cep: '', cidade: '', lgpd: false });",
  "const [authForm, setAuthForm] = useState({ nomeCompleto: '', usuario: '', senha: '', email: '', whatsapp: '', cep: '', cidade: '', estado: '', lgpd: false });"
);

content = content.replace(
  "setAuthForm(prev => ({ ...prev, cidade: data.localidade }));",
  "setAuthForm(prev => ({ ...prev, cidade: data.localidade, estado: data.uf || '' }));"
);

const cepCidadeEstado = `
              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">CEP</label>
                  <input type="text" required value={authForm.cep} onChange={handleCepChange} maxLength={9} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-3 focus:border-primary outline-none font-medium text-center" placeholder="00000-000" />
                </div>
                <div className="w-1/2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Cidade</label>
                  <div className="relative">
                    <Building className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" required value={authForm.cidade} onChange={e => setAuthForm({...authForm, cidade: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="Sua cidade" />
                  </div>
                </div>
                <div className="w-1/6">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">UF</label>
                  <input type="text" required value={authForm.estado} onChange={e => setAuthForm({...authForm, estado: e.target.value})} maxLength={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-2 focus:border-primary outline-none font-medium text-center uppercase" placeholder="SP" />
                </div>
              </div>
`;

content = content.replace(
  /<div className="flex gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  cepCidadeEstado.trim()
);

fs.writeFileSync('src/components/Jogo.tsx', content);
