const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { Trophy, ArrowLeft, Play, ArrowRight, RotateCcw } from 'lucide-react';",
  "import { Trophy, ArrowLeft, Play, ArrowRight, RotateCcw, Eye, EyeOff, User, Lock, Mail, Phone, MapPin, Building } from 'lucide-react';"
);

// State replacement
content = content.replace(
  "const [currentView, setCurrentView] = useState<'HOME' | 'INSTRUCTIONS' | 'PLAYING' | 'RESULT' | 'LEADERBOARD'>('HOME');\n  const [resultType, setResultType] = useState<'WIN' | 'GAMEOVER'>('WIN');\n  const [finalScore, setFinalScore] = useState(0);\n  const [scores, setScores] = useState<any[]>([]);\n  const [playerInfo, setPlayerInfo] = useState({ nome: '', cidade: '' });\n  const [showRegister, setShowRegister] = useState(false);\n  const [endGameFact, setEndGameFact] = useState<{title: string, content: string} | null>(null);",
  `const [currentView, setCurrentView] = useState<'HOME' | 'INSTRUCTIONS' | 'PLAYING' | 'RESULT' | 'LEADERBOARD' | 'LOGIN' | 'REGISTER'>('HOME');
  const [resultType, setResultType] = useState<'WIN' | 'GAMEOVER'>('WIN');
  const [finalScore, setFinalScore] = useState(0);
  const [scores, setScores] = useState<any[]>([]);
  const [endGameFact, setEndGameFact] = useState<{title: string, content: string} | null>(null);
  
  const [loggedUser, setLoggedUser] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ nomeCompleto: '', usuario: '', senha: '', email: '', whatsapp: '', cep: '', cidade: '', lgpd: false });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');`
);

// useEffect
content = content.replace(
  `  useEffect(() => {
    fetchScores();
    const saved = localStorage.getItem('jogo_player_v2');
    if (saved) {
      setPlayerInfo(JSON.parse(saved));
    }
  }, []);`,
  `  useEffect(() => {
    fetchScores();
    const saved = localStorage.getItem('jogo_user_v3');
    if (saved) {
      setLoggedUser(JSON.parse(saved));
    }
  }, []);`
);

// Save Score
content = content.replace(
  `  const saveScore = async (scoreToSave: number, info: {nome: string, cidade: string}) => {
    try {
      await fetch('/api/jogo/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: info.nome,
          cidade: info.cidade,
          score: scoreToSave,
          fase: 1
        })
      });
      fetchScores();
    } catch (e) {
      console.error(e);
    }
  };`,
  `  const saveScore = async (scoreToSave: number, user: any) => {
    try {
      await fetch('/api/jogo/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: user.nomeCompleto,
          cidade: user.cidade,
          usuario: user.usuario,
          score: scoreToSave,
          fase: 1
        })
      });
      fetchScores();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\\D/g, '');
    setAuthForm({ ...authForm, cep });
    if (cep.length === 8) {
      try {
        const res = await fetch(\`https://viacep.com.br/ws/\${cep}/json/\`);
        const data = await res.json();
        if (!data.erro) {
          setAuthForm(prev => ({ ...prev, cidade: data.localidade }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/jogo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: authForm.usuario, senha: authForm.senha })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
      } else {
        setAuthError(data.error || "Erro no login");
      }
    } catch (e) {
      setAuthError("Erro de conexão");
    }
  };

  const handleRegisterAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.lgpd) {
      setAuthError("Você precisa aceitar os termos da LGPD");
      return;
    }
    try {
      const res = await fetch('/api/jogo/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
      } else {
        setAuthError(data.error || "Erro no cadastro");
      }
    } catch (e) {
      setAuthError("Erro de conexão");
    }
  };`
);

// handleRegister
content = content.replace(
  `  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerInfo.nome && playerInfo.cidade) {
      localStorage.setItem('jogo_player_v2', JSON.stringify(playerInfo));
      setShowRegister(false);
      saveScore(finalScore, playerInfo);
    }
  };`,
  ``
);

// showInstructions
content = content.replace(
  `  const showInstructions = () => {
    setCurrentView('INSTRUCTIONS');
  };`,
  `  const showInstructions = () => {
    if (!loggedUser) {
      setCurrentView('LOGIN');
      return;
    }
    setCurrentView('INSTRUCTIONS');
  };`
);

// RESULT SCREEN: Replace showRegister with auto save when GAMEOVER/WIN logic happens.
// Wait, when GAMEOVER or WIN happens, we should save immediately.
// Let's modify the place where GAMEOVER/WIN is set.
// It's in the update loop.

// First, replace RESULT rendering.
const oldResultScreen = `            {showRegister ? (
              <form onSubmit={handleRegister} className="bg-white p-6 rounded-3xl shadow-xl flex flex-col gap-4">
                <h3 className="font-black text-dark text-center uppercase tracking-wider">Salvar no Ranking</h3>
                <input
                  type="text"
                  placeholder="Seu Apelido"
                  required
                  value={playerInfo.nome}
                  onChange={e => setPlayerInfo({...playerInfo, nome: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none font-medium"
                />
                <input
                  type="text"
                  placeholder="Sua Cidade"
                  required
                  value={playerInfo.cidade}
                  onChange={e => setPlayerInfo({...playerInfo, cidade: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none font-medium"
                />
                <button type="submit" className="w-full bg-dark hover:bg-black text-white font-black py-4 rounded-xl mt-2 uppercase tracking-wider transition-colors">
                  Salvar
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={startGame}
                  className="w-full bg-primary hover:bg-secondary text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-lg uppercase tracking-wider shadow-lg"
                >
                  <RotateCcw className="w-6 h-6" /> Tentar Novamente
                </button>
                <button
                  onClick={() => setCurrentView('LEADERBOARD')}
                  className="w-full bg-white text-dark font-bold py-4 rounded-2xl"
                >
                  Ver Ranking
                </button>
              </div>
            )}`;

const newResultScreen = `            <div className="flex flex-col gap-3">
              <button
                onClick={startGame}
                className="w-full bg-primary hover:bg-secondary text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-lg uppercase tracking-wider shadow-lg"
              >
                <RotateCcw className="w-6 h-6" /> Tentar Novamente
              </button>
              <button
                onClick={() => setCurrentView('LEADERBOARD')}
                className="w-full bg-white text-dark font-bold py-4 rounded-2xl"
              >
                Ver Ranking
              </button>
            </div>`;
            
content = content.replace(oldResultScreen, newResultScreen);

// In the update loop, instead of showRegister we just save the score.
content = content.replace(
  `        if (state.score > 0) {
          setShowRegister(true);
        } else {
          saveScore(state.score, JSON.parse(saved));
        }`,
  `        if (loggedUser) {
          saveScore(state.score, loggedUser);
        }`
);

content = content.replace(
  `        if (state.score > 0 && (!saved || JSON.parse(saved).nome === '')) {
          setShowRegister(true);
        } else if (state.score > 0) {
          saveScore(state.score, JSON.parse(saved));
        }`,
  `        if (loggedUser) { saveScore(state.score, loggedUser); }`
);

// It might be different, let's just do a manual replace for the gameover section inside update()
// Let's check how the end game loop handles it.
// I'll do this in a second script or a generic replace.

fs.writeFileSync('src/components/Jogo.tsx', content);
