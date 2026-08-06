const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

const loginRegisterViews = `
        {currentView === 'LOGIN' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[calc(100%-2rem)] max-w-md bg-white rounded-3xl shadow-2xl p-6 m-4"
          >
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setCurrentView('HOME')} className="text-gray-400 hover:text-dark">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black text-dark uppercase">Login</h2>
            </div>
            
            {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4">{authError}</div>}
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Usuário</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={authForm.usuario} onChange={e => setAuthForm({...authForm, usuario: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="Seu usuário" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Senha</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? "text" : "password"} required value={authForm.senha} onChange={e => setAuthForm({...authForm, senha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 focus:border-primary outline-none font-medium" placeholder="Sua senha" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button type="submit" className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-xl mt-2 uppercase tracking-wider transition-colors">
                Entrar e Jogar
              </button>
              
              <div className="text-center mt-4">
                <span className="text-gray-500 font-medium">Ainda não tem conta? </span>
                <button type="button" onClick={() => setCurrentView('REGISTER')} className="text-primary font-bold hover:underline">
                  Cadastre-se
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {currentView === 'REGISTER' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[calc(100%-2rem)] max-w-md bg-white rounded-3xl shadow-2xl p-6 my-8 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <button onClick={() => setCurrentView('LOGIN')} className="text-gray-400 hover:text-dark">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black text-dark uppercase">Cadastro</h2>
            </div>
            
            {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 shrink-0">{authError}</div>}
            
            <form onSubmit={handleRegisterAuth} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nome Completo</label>
                <input type="text" required value={authForm.nomeCompleto} onChange={e => setAuthForm({...authForm, nomeCompleto: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-primary outline-none font-medium" placeholder="Seu nome" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Usuário</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={authForm.usuario} onChange={e => setAuthForm({...authForm, usuario: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="Como quer ser chamado" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">E-mail</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="seu@email.com" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">WhatsApp</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" required value={authForm.whatsapp} onChange={e => setAuthForm({...authForm, whatsapp: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="(11) 99999-9999" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">CEP</label>
                  <input type="text" required value={authForm.cep} onChange={handleCepChange} maxLength={9} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-3 focus:border-primary outline-none font-medium text-center" placeholder="00000-000" />
                </div>
                <div className="w-2/3">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Cidade</label>
                  <div className="relative">
                    <Building className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" required value={authForm.cidade} onChange={e => setAuthForm({...authForm, cidade: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="Sua cidade" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Senha</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? "text" : "password"} required value={authForm.senha} onChange={e => setAuthForm({...authForm, senha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 focus:border-primary outline-none font-medium" placeholder="Crie uma senha" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 mt-2 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-1">
                  <input type="checkbox" className="sr-only" checked={authForm.lgpd} onChange={e => setAuthForm({...authForm, lgpd: e.target.checked})} />
                  <div className={\`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors \${authForm.lgpd ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary'}\`}>
                    {authForm.lgpd && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-medium leading-tight pt-1">
                  Li e concordo com a <Link to="/privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</Link> e autorizo o uso dos meus dados.
                </span>
              </label>
              
              <button type="submit" className="w-full bg-dark hover:bg-black text-white font-black py-4 rounded-xl mt-4 uppercase tracking-wider transition-colors shrink-0">
                Finalizar Cadastro
              </button>
            </form>
          </motion.div>
        )}
`;

content = content.replace(
  "{currentView === 'LEADERBOARD' && (",
  loginRegisterViews + "\n        {currentView === 'LEADERBOARD' && ("
);

// We need to fix the update loop inside Jogo.tsx where gameover logic is handled.
content = content.replace(
  `      if (state.status === 'GAMEOVER' || state.status === 'WIN') {
        setFinalScore(state.score);
        setResultType(state.status as 'WIN' | 'GAMEOVER');
        
        const fact = MANDATE_FACTS[Math.floor(Math.random() * MANDATE_FACTS.length)];
        setEndGameFact(fact);
        
        const saved = localStorage.getItem('jogo_player_v2');
        if (state.score > 0 && (!saved || JSON.parse(saved).nome === '')) {
          setShowRegister(true);
        } else if (state.score > 0) {
          saveScore(state.score, JSON.parse(saved));
        }
        
        setCurrentView('RESULT');
        return; // end loop
      }`,
  `      if (state.status === 'GAMEOVER' || state.status === 'WIN') {
        setFinalScore(state.score);
        setResultType(state.status as 'WIN' | 'GAMEOVER');
        
        const fact = MANDATE_FACTS[Math.floor(Math.random() * MANDATE_FACTS.length)];
        setEndGameFact(fact);
        
        // Use loggedUser state directly, but since we are inside a closure, we might need a ref, 
        // OR we can just read from localStorage again to be safe.
        const saved = localStorage.getItem('jogo_user_v3');
        if (state.score > 0 && saved) {
          saveScore(state.score, JSON.parse(saved));
        }
        
        setCurrentView('RESULT');
        return; // end loop
      }`
);

// We need to update the leaderboard item to use `s.usuario` instead of `s.nome`.
content = content.replace(
  `<div className="font-black text-dark truncate text-lg">{s.nome}</div>`,
  `<div className="font-black text-dark truncate text-lg">{s.usuario || s.nome}</div>`
);


fs.writeFileSync('src/components/Jogo.tsx', content);
