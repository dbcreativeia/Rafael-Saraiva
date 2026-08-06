const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

// Undo login tracking
const loginTarget = `      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
        
        // Track conversion
        if (typeof window !== 'undefined') {
          const fbq = (window as any).fbq;
          if (fbq) {
            fbq('track', 'Lead');
            fbq('trackCustom', 'Lead_Jogo');
          }
        }
      } else {
        setAuthError(data.error || "Erro no login");`;

const loginReplacement = `      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
      } else {
        setAuthError(data.error || "Erro no login");`;

content = content.replace(loginTarget, loginReplacement);

// Add to register
const registerTarget = `      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
      } else {
        setAuthError(data.error || "Erro no cadastro");`;

const registerReplacement = `      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
        
        // Track conversion
        if (typeof window !== 'undefined') {
          const fbq = (window as any).fbq;
          if (fbq) {
            fbq('track', 'Lead');
            fbq('trackCustom', 'Lead_Jogo');
          }
        }
      } else {
        setAuthError(data.error || "Erro no cadastro");`;

content = content.replace(registerTarget, registerReplacement);

fs.writeFileSync('src/components/Jogo.tsx', content);
