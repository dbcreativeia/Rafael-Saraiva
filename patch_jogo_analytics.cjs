const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

// 1. Add PageView tracking inside useEffect
const useEffectMountTarget = `  useEffect(() => {
    fetchScores();
    const saved = localStorage.getItem('jogo_user_v3');
    if (saved) {
      setLoggedUser(JSON.parse(saved));
    }
  }, []);`;

const useEffectMountReplacement = `  useEffect(() => {
    fetchScores();
    const saved = localStorage.getItem('jogo_user_v3');
    if (saved) {
      setLoggedUser(JSON.parse(saved));
    }

    // Track PageView
    const trackPage = () => {
      const fbq = (window as any).fbq;
      if (fbq) {
        fbq('trackCustom', 'PageView_Jogo');
      }
    };
    if ((window as any).fbq) {
      trackPage();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).fbq) {
          trackPage();
          clearInterval(interval);
        } else if (attempts > 10) {
          clearInterval(interval);
        }
      }, 500);
    }
  }, []);`;

content = content.replace(useEffectMountTarget, useEffectMountReplacement);

// 2. Add Lead tracking inside handleRegisterAuth on success
const registerTarget = `      if (data.success) {
        localStorage.setItem('jogo_user_v3', JSON.stringify(data.data));
        setLoggedUser(data.data);
        setCurrentView('INSTRUCTIONS');
      } else {`;

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
      } else {`;

content = content.replace(registerTarget, registerReplacement);

fs.writeFileSync('src/components/Jogo.tsx', content);
