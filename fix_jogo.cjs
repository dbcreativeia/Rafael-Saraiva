const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');
content = content.replace(
  `        const saved = localStorage.getItem('jogo_player_v2');
        if (!saved) {
          setShowRegister(true);
        } else {
          saveScore(state.score, JSON.parse(saved));
        }`,
  `        const saved = localStorage.getItem('jogo_user_v3');
        if (saved) {
          saveScore(state.score, JSON.parse(saved));
        }`
);
fs.writeFileSync('src/components/Jogo.tsx', content);
