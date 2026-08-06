const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

const logoutUI = `
            <div className="flex justify-center gap-4 text-4xl mb-2">
              🏃🏻‍♂️ 🐶 🐱 🐴 🦜
            </div>

            {loggedUser && (
              <div className="flex items-center justify-center gap-4 bg-white/10 px-6 py-3 rounded-full border border-white/20 backdrop-blur-sm">
                <span className="text-white font-medium">
                  Olá, <span className="font-bold text-accent">{loggedUser.usuario || loggedUser.nomeCompleto}</span>!
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem('jogo_user_v3');
                    setLoggedUser(null);
                  }}
                  className="text-white/60 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors underline decoration-white/30"
                >
                  Sair
                </button>
              </div>
            )}
`;

content = content.replace(
  '<div className="flex justify-center gap-4 text-4xl mb-2">\n              🏃🏻‍♂️ 🐶 🐱 🐴 🦜\n            </div>',
  logoutUI.trim()
);

fs.writeFileSync('src/components/Jogo.tsx', content);
