import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, ArrowRight, RotateCcw, Eye, EyeOff, User, Lock, Mail, Phone, MapPin, Building, Download } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const MANDATE_FACTS = [
  { title: "Edital Animal", content: "Criação de um modelo inédito de destinação de emendas parlamentares onde a população de SP vota e decide. 3 Edições, +250 ONGs Contempladas e +40k Animais Impactados." },
  { title: "Campanhas de Castração", content: "Mutirões via emendas, atuação do Instituto ELPA e programa Pro Pet. +120 mil Castrações em +250 Municípios Contemplados." },
  { title: "Novo Código Animal", content: "Atualização da legislação estadual de proteção animal. 12 audiências públicas, +4.400 sugestões da população, engajamento em 90% dos municípios." },
  { title: "Hospitais Públicos Veterinários", content: "R$ 20,15 milhões destinados para 6 municípios. O Hospital da Zona Sul de SP agora funciona 24h, ampliando o acesso." },
  { title: "Lei do Caramelo", content: "A Lei nº 18.389/2026 reconhece o vira-lata caramelo como patrimônio imaterial do estado de São Paulo." },
  { title: "Lei das Correntes", content: "A Lei nº 18.184/2025 proíbe manter cães e gatos permanentemente acorrentados. Aumento de 105% nas prisões por maus-tratos de acorrentamento." },
  { title: "Lei dos Pet Shops", content: "A Lei nº 17.972/2024 regulamenta a comercialização, proibindo a exposição em vitrines fechadas e garantindo bem-estar." },
  { title: "Lei Joca", content: "A Lei nº 18.441/2026 reforça a proteção contra maus-tratos e amplia os mecanismos de responsabilização." },
  { title: "Resgates e Adoções", content: "+1.000 animais resgatados de situações de risco e abandono e 800 adoções realizadas." },
  { title: "Atuação em Desastres", content: "Resposta emergencial e resgate de animais afetados por desastres no Rio Grande do Sul, São Sebastião e Peruíbe." }
];

export const Jogo = () => {
  const [currentView, setCurrentView] = useState<'HOME' | 'INSTRUCTIONS' | 'PLAYING' | 'RESULT' | 'LEADERBOARD' | 'LOGIN' | 'REGISTER'>('HOME');
  const [resultType, setResultType] = useState<'WIN' | 'GAMEOVER'>('WIN');
  const [finalScore, setFinalScore] = useState(0);
  const [scores, setScores] = useState<any[]>([]);
  const [endGameFact, setEndGameFact] = useState<{title: string, content: string} | null>(null);
  const [factPreviewState, setFactPreviewState] = useState({ active: false, canSkip: false });
  
  const [loggedUser, setLoggedUser] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ nomeCompleto: '', usuario: '', senha: '', email: '', whatsapp: '', cep: '', cidade: '', estado: '', lgpd: false });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const gameStateRef = useRef({
    status: 'HOME',
    playerX: 150,
    targetX: 150,
    distance: 0,
    score: 0,
    lives: 3,
    items: [] as any[],
    particles: [] as any[],
    floatingTexts: [] as any[],
    decorations: [] as any[],
    lastFact: '',
    factTimer: 0,
    speed: 5
  });

  useEffect(() => {
    fetchScores();
    const saved = localStorage.getItem('jogo_user_v3');
    if (saved) {
      setLoggedUser(JSON.parse(saved));
    } else {
      try {
        const savedProfile = localStorage.getItem('rafael_saraiva_user_profile');
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          const nomeFull = profile.nomeCompleto || `${profile.nome || ''} ${profile.sobrenome || ''}`.trim();
          setAuthForm(prev => ({
            ...prev,
            nomeCompleto: prev.nomeCompleto || nomeFull || '',
            whatsapp: prev.whatsapp || profile.whatsapp || '',
            email: prev.email || profile.email || '',
            cep: prev.cep || profile.cep || '',
            cidade: prev.cidade || profile.cidade || '',
            estado: prev.estado || profile.estado || ''
          }));
        }
      } catch (e) {
        console.warn('Erro ao carregar dados no jogo:', e);
      }
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
  }, []);

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/jogo/scores');
      const data = await res.json();
      setScores(data);
    } catch (e) {
      console.warn("API request failed:", e);
    }
  };

  const saveScore = async (scoreToSave: number, user: any) => {
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
      console.warn("API request failed:", e);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    setAuthForm({ ...authForm, cep });
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAuthForm(prev => ({ ...prev, cidade: data.localidade, estado: data.uf || '' }));
        }
      } catch (err) {
        console.warn("API request failed:", err);
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
    if (authForm.usuario.includes('@')) {
      setAuthError("O nome de usuário não pode ser um e-mail.");
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
        try {
          const nameParts = (authForm.nomeCompleto || '').trim().split(/\s+/);
          const profile = {
            nome: nameParts[0] || '',
            sobrenome: nameParts.slice(1).join(' ') || '',
            nomeCompleto: (authForm.nomeCompleto || '').trim(),
            whatsapp: authForm.whatsapp,
            email: authForm.email,
            cep: authForm.cep,
            cidade: authForm.cidade,
            estado: authForm.estado
          };
          localStorage.setItem('rafael_saraiva_user_profile', JSON.stringify(profile));
        } catch (e) {
          console.warn('Erro ao salvar perfil no jogo:', e);
        }
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
        setAuthError(data.error || "Erro no cadastro");
      }
    } catch (e) {
      setAuthError("Erro de conexão");
    }
  };



  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'collect' | 'crash' | 'win' | 'lose', emoji?: string) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'collect') {
      let freqStart = 600;
      let freqEnd = 1200;
      osc.type = 'sine';
      
      if (emoji === '📜') { freqStart = 1000; freqEnd = 2000; osc.type = 'triangle'; }
      else if (emoji === '🏥') { freqStart = 800; freqEnd = 1500; osc.type = 'sine'; }
      else if (emoji === '📦') { freqStart = 500; freqEnd = 1000; osc.type = 'square'; }
      else if (emoji === '⛓️') { freqStart = 400; freqEnd = 800; osc.type = 'sawtooth'; }
      else if (emoji === '🔒') { freqStart = 700; freqEnd = 1000; osc.type = 'triangle'; }

      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'crash') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  };

  const showInstructions = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!loggedUser) {
      setCurrentView('LOGIN');
      return;
    }
    setCurrentView('INSTRUCTIONS');
  };

  
  const downloadColinha = async () => {
    try {
      const response = await fetch('/Colinha_Dobrada.jpeg');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Colinha_Rafael_Saraiva_44077.jpeg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Erro ao baixar a colinha:', error);
    }
  };

  const startGame = () => {
    initAudio();
    setCurrentView('PLAYING');
  };

  useEffect(() => {
    if (currentView !== 'PLAYING') return;

    let initTimeout: NodeJS.Timeout;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        initTimeout = setTimeout(initCanvas, 50);
        return;
      }
      
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      
      const state = gameStateRef.current;
      state.status = 'PLAYING';
    state.playerX = canvas.width / 2;
    state.targetX = canvas.width / 2;
    state.distance = 0;
    state.score = 0;
    state.lives = 5;
    state.items = [];
    state.particles = [];
    state.floatingTexts = [];
    state.decorations = [];
    state.factTimer = 180;
    state.lastFact = 'Deslize para resgatar os animais e desviar dos obstáculos!';
    state.speed = canvas.height * 0.008; // responsive speed

    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
    };

    const update = () => {
      if (state.status !== 'PLAYING') return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Player movement smoothing
      state.playerX += (state.targetX - state.playerX) * 0.15;
      
      // Clamp player
      if (state.playerX < 30) state.playerX = 30;
      if (state.playerX > width - 30) state.playerX = width - 30;

      // Distance calculation
      state.distance += state.speed / 5;
      
      // Progressive speed based on score (starts slow, gets faster as you score)
      const baseSpeed = canvas.height * (window.innerWidth < 768 ? 0.0035 : 0.005);
      state.speed = baseSpeed + (state.score * 0.0003);

      // Spawning
      // Increase spawn rate slightly as speed increases
      const spawnChance = (window.innerWidth < 768 ? 0.02 : 0.03) + (state.speed * 0.002);
      if (Math.random() < spawnChance) {
        let type = Math.random() > 0.4 ? 'animal' : 'obstacle';
        
        // 15% chance of spawning the special 44077 item instead
        if (Math.random() < 0.15) type = 'powerup';
        
        const collect = ['🐶', '🐱', '🐴', '🦜', '🐇', '⛓️', '🔒', '📦', '🏥', '📜'];
        const obstacles = ['🚧', '🕳️', '🗑️', '🚗', '⚠️'];
        
        let emoji = '🗳️'; // default for powerup
        if (type === 'animal') {
          emoji = collect[Math.floor(Math.random() * collect.length)];
        } else if (type === 'obstacle') {
          emoji = obstacles[Math.floor(Math.random() * obstacles.length)];
        }
        
        state.items.push({
          type,
          emoji,
          x: Math.random() * (width - 80) + 40,
          y: -40,
          collected: false
        });
      }
      


      // Update items
      state.items.forEach(item => {
        item.y += state.speed;
        
        // Collision (approximate radius 25)
        if (!item.collected && Math.abs(item.x - state.playerX) < 35 && Math.abs(item.y - (height - 80)) < 35) {
          item.collected = true;
          if (item.type === 'powerup') {
            state.score += 4407;
            playSound('collect', item.emoji);
            state.floatingTexts.push({
              x: width / 2,
              y: height - 150,
              text: "FECHADO COM 44077!",
              life: 1
            });
            for(let i=0; i<15; i++) {
              state.particles.push({
                x: item.x, 
                y: item.y, 
                vx: (Math.random()-0.5)*15, 
                vy: (Math.random()-0.5)*15, 
                life: 1,
                color: '#ebb430'
              });
            }
          } else if (item.type === 'animal') {
            let pts = 100; // Bichos
            if (item.emoji === '📜') pts = 600; // Leis
            else if (item.emoji === '🏥') pts = 500; // Hospital
            else if (item.emoji === '📦') pts = 400; // Ração
            else if (item.emoji === '⛓️') pts = 300; // Correntes
            else if (item.emoji === '🔒') pts = 200; // Cadeado

            state.score += pts;
            playSound('collect', item.emoji);
            // Particles
            for(let i=0; i<8; i++) {
              state.particles.push({
                x: item.x, 
                y: item.y, 
                vx: (Math.random()-0.5)*10, 
                vy: (Math.random()-0.5)*10, 
                life: 1,
                color: ['#10b981', '#3b82f6', '#f59e0b'][Math.floor(Math.random()*3)]
              });
            }
          } else {
            state.lives -= 1;
            playSound('crash');
            // Particles for crash
            for(let i=0; i<10; i++) {
              state.particles.push({
                x: item.x, 
                y: item.y, 
                vx: (Math.random()-0.5)*15, 
                vy: (Math.random()-0.5)*15, 
                life: 1,
                color: '#ef4444'
              });
            }
            
            if (state.lives <= 0) {
              state.status = 'GAMEOVER';
              playSound('lose');
            }
          }
        }
      });

      state.items = state.items.filter(i => i.y < height + 50 && !i.collected);

      // Particles update
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
      });
      state.particles = state.particles.filter(p => p.life > 0);
      


      // Update floating texts
      state.floatingTexts.forEach(ft => {
        ft.y -= 1;
        ft.life -= 0.02;
      });
      state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

      // Draw Background
      ctx.fillStyle = '#4b5563'; // road
      ctx.fillRect(0, 0, width, height);
      
      // Grass edges
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, 15, height);
      ctx.fillRect(width - 15, 0, 15, height);


      
      // Road lines
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 4;
      ctx.setLineDash([30, 30]);
      ctx.beginPath();
      ctx.moveTo(width/3, 0 - ((state.distance * 10) % 60));
      ctx.lineTo(width/3, height);
      ctx.moveTo(width*2/3, 0 - ((state.distance * 10) % 60));
      ctx.lineTo(width*2/3, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Map watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.font = '900 80px Poppins';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RAFAEL', width/2, height/2 - 80);
      ctx.fillText('SARAIVA', width/2, height/2);
      ctx.fillText('44077', width/2, height/2 + 80);
      
      // Floating texts
      state.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = '#ebb430';
        ctx.font = '900 24px Poppins';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#102b31';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Draw items
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '36px Arial';
      state.items.forEach(item => {
        ctx.fillText(item.emoji, item.x, item.y);
      });

      // Draw particles
      state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw player (Rafael)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '45px Arial';
      // simple tilt effect based on movement
      const tilt = (state.targetX - state.playerX) * 0.01;
      ctx.save();
      ctx.translate(state.playerX, height - 80);
      ctx.rotate(tilt);
      ctx.fillText('🏃🏻‍♂️', 0, 0);
      ctx.restore();

      // UI Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, width, 55);
      
      // Top UI
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Poppins';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Vidas: ${'❤️'.repeat(state.lives)}`, 15, 15);
      
      ctx.textAlign = 'right';
      ctx.fillText(`Pts: ${state.score}`, width - 15, 15);

      if (state.status === 'GAMEOVER' || state.status === 'WIN') {
        setFinalScore(state.score);
        setResultType(state.status as 'WIN' | 'GAMEOVER');
        setEndGameFact(MANDATE_FACTS[Math.floor(Math.random() * MANDATE_FACTS.length)]);
        setFactPreviewState({ active: true, canSkip: false });
        setTimeout(() => {
          setFactPreviewState(prev => ({ ...prev, canSkip: true }));
        }, 3000);
        setCurrentView('RESULT');
        
        const saved = localStorage.getItem('jogo_user_v3');
        if (saved) {
          saveScore(state.score, JSON.parse(saved));
        }
        return; // end loop
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
  }; // end initCanvas

  initCanvas();

  return () => {
      clearTimeout(initTimeout);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentView]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    gameStateRef.current.targetX = x;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    gameStateRef.current.targetX = x;
  };

  return (
    <>
      <Helmet>
        <title>Jogo do Mandato | Rafael Saraiva 44077</title>
        <meta name="title" content="Jogo do Mandato | Rafael Saraiva 44077" />
        <meta name="description" content="Jogue o Jogo do Mandato do Rafael Saraiva 44077, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Jogo do Mandato | Rafael Saraiva 44077" />
        <meta property="og:description" content="Jogue o Jogo do Mandato do Rafael Saraiva 44077, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="og:image" content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Jogo do Mandato | Rafael Saraiva 44077" />
        <meta property="twitter:description" content="Jogue o Jogo do Mandato do Rafael Saraiva 44077, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="twitter:image" content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ" />
      </Helmet>
    <div className={`min-h-screen bg-gray-900 flex flex-col items-center justify-center font-sans overflow-hidden relative ${currentView === 'PLAYING' ? 'p-0 h-[100dvh]' : 'p-4'}`}>
      {/* Disclaimer Eleitoral Fixo na Grama Lateral */}
      <div className="absolute inset-0 mx-auto w-full max-w-md pointer-events-none z-[100] flex justify-between overflow-hidden">
        <div className="w-[15px] h-full bg-[#22c55e] flex items-center justify-center shrink-0">
          <span 
            className="text-[#0a3319] font-normal whitespace-nowrap -rotate-90 select-none tracking-widest uppercase"
            style={{ fontSize: 'min(1.4vh, 9px)' }}
          >
            PROPAGANDA ELEITORAL - CNPJ DO CANDIDATO: Eleicao 2026 Rafael Saraiva Gaia Deputado Estadual 68.283.115/0001-74
          </span>
        </div>
        <div className="w-[15px] h-full bg-[#22c55e] shrink-0"></div>
      </div>

      {currentView !== 'PLAYING' && (
        <Link to="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-xl transition-all font-bold text-sm z-50 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar ao site
        </Link>
      )}

      <AnimatePresence mode="wait">
        {currentView === 'HOME' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center max-w-md w-full gap-8 text-center p-6"
          >
            <div className="flex flex-col items-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ" 
                alt="Missão Resgate Animal" 
                className="w-full max-w-[280px] rounded-3xl shadow-2xl mb-6 border-4 border-white/10"
              />
              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase leading-tight font-display">
                Missão <span className="text-primary">Resgate Animal SP</span>
              </h1>
              <p className="text-lg text-white/80 font-medium">
                Corra, desvie dos obstáculos e resgate os animais em perigo por todo o estado!
              </p>
            </div>
            
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

            <button
              onClick={showInstructions}
              className="w-full bg-primary hover:bg-secondary text-white font-black py-6 px-8 rounded-3xl flex items-center justify-center gap-4 transition-transform active:scale-95 shadow-[0_0_40px_rgba(0,177,253,0.4)] text-3xl uppercase tracking-wider"
            >
              <Play className="w-10 h-10 fill-current" />
              Jogar Agora
            </button>

            <button
              onClick={() => setCurrentView('LEADERBOARD')}
              className="w-full bg-white/10 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors hover:bg-white/20 border border-white/10 backdrop-blur-sm"
            >
              <Trophy className="w-6 h-6 text-accent" />
              Ver Ranking
            </button>
            
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Resgate animais no jogo do Rafael Saraiva! No dia da eleição, eu voto 44077 para Deputado Estadual e 4407 Nina Passadore para Federal! Jogue aqui: https://rafaelsaraivasp.com.br/jogo')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg"
            >
              <Phone className="w-6 h-6" />
              Desafiar Amigos
            </a>
          </motion.div>
        )}

        {currentView === 'INSTRUCTIONS' && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-start max-w-md w-[calc(100%-2rem)] gap-4 text-center p-6 bg-white rounded-3xl shadow-2xl my-8 max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-3xl font-black text-dark uppercase shrink-0">Como Jogar</h2>
            <div className="flex flex-col gap-3 text-left w-full">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col gap-2">
                <h3 className="font-bold text-green-800 uppercase text-sm">Colete (Soma Pontos)</h3>
                <div className="flex justify-between items-center text-sm font-bold text-[#ebb430] bg-[#102b31] p-2 rounded-lg border border-[#ebb430] mb-1">
                  <span className="flex items-center gap-2"><span className="text-xl">🗳️</span> Urna 44077 (Super Bônus)</span>
                  <span>4407 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">🐶🐱🐴🦜🐇</span> Animais</span>
                  <span>100 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">🔒</span> Cadeados</span>
                  <span>200 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">⛓️</span> Correntes</span>
                  <span>300 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">📦</span> Ração</span>
                  <span>400 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">🏥</span> Hospitais</span>
                  <span>500 pts</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-green-900 bg-white/60 p-2 rounded-lg">
                  <span className="flex items-center gap-2"><span className="text-xl">📜</span> Leis</span>
                  <span>600 pts</span>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-800 mb-2 uppercase text-sm">Desvie (Perde Vida)</h3>
                <div className="text-3xl tracking-widest">🚧🕳️🗑️🚗⚠️</div>
                <p className="text-xs text-red-700 mt-2 font-medium">Obstáculos e perigos da pista!</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h3 className="font-black text-amber-900 mb-2 uppercase text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Meta: Apoiador 44077
                </h3>
                <p className="text-xs text-amber-800 font-medium mb-2 leading-relaxed">
                  Faça mais de <strong className="text-amber-900 text-sm font-black">44.077 pontos</strong> para conquistar o selo dourado <strong>👑 Apoiador 44077</strong> no Ranking Oficial!
                </p>
                <p className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider">
                  Compartilhe seu recorde e baixe materiais exclusivos no final.
                </p>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full shrink-0 bg-primary hover:bg-secondary text-white font-black py-4 rounded-xl uppercase tracking-wider transition-colors"
            >
              Iniciar Missão
            </button>
          </motion.div>
        )}

        {currentView === 'PLAYING' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md h-[100dvh] relative touch-none"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-crosshair touch-none"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
            />
          </motion.div>
        )}

        {currentView === 'RESULT' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full max-w-md gap-6 p-6"
          >
            {factPreviewState.active ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
                {endGameFact && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-left bg-blue-50 p-6 rounded-xl border-2 border-blue-200 w-full mb-6"
                  >
                    <div className="text-sm font-black text-blue-600 mb-3 uppercase tracking-widest text-center">O Deputado Rafael Saraiva fez:</div>
                    <h4 className="font-black text-primary uppercase text-2xl mb-3 text-center">{endGameFact.title}</h4>
                    <p className="text-base font-bold text-blue-900 leading-relaxed text-center mb-4">
                      {endGameFact.content}
                    </p>
                    <div className="bg-[#102b31] border-2 border-[#ebb430] rounded-xl p-4 mt-2">
                      <p className="text-white text-center font-black text-sm uppercase leading-snug">
                        Vote <span className="text-[#ebb430]">Rafael Saraiva</span> para Deputado Estadual!
                        <br />
                        <span className="text-2xl mt-1 block tracking-widest">44077</span>
                      </p>
                    </div>
                  </motion.div>
                )}
                {factPreviewState.canSkip && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setFactPreviewState({ active: false, canSkip: false })}
                    className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-2xl transition-transform active:scale-95 uppercase tracking-wider mt-auto"
                  >
                    Ver Pontuação
                  </motion.button>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-3 ${resultType === 'WIN' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${resultType === 'WIN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {resultType === 'WIN' ? <Trophy className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
                  </div>

                  <h2 className="text-3xl font-black text-dark uppercase mb-2">
                    {resultType === 'WIN' ? 'Missão Cumprida!' : 'Fim de Jogo'}
                  </h2>
                  <p className="text-gray-500 font-medium mb-4">
                    {resultType === 'WIN' ? 'Você chegou ao destino e salvou muitos animais!' : 'Você tropeçou nos obstáculos.'}
                  </p>
                  
                  <div className="text-6xl font-black text-primary mb-6 font-display">{finalScore.toLocaleString()} pts</div>

                  {endGameFact && (
                    <div className="text-left bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                      <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">O Deputado Rafael Saraiva fez:</div>
                      <h4 className="font-black text-primary uppercase text-sm mb-1">{endGameFact.title}</h4>
                      <p className="text-xs font-medium text-blue-900 leading-relaxed mb-3">
                        {endGameFact.content}
                      </p>
                      <div className="bg-[#102b31] border border-[#ebb430] rounded-lg p-2 text-center">
                        <p className="text-white font-black text-[10px] uppercase leading-tight">
                          Vote <span className="text-[#ebb430]">Rafael Saraiva</span> para Deputado Estadual!
                          <br />
                          <span className="text-lg block mt-0.5 tracking-widest">44077</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Fiz ${finalScore.toLocaleString()} pontos resgatando animais no jogo do Rafael Saraiva! Tente bater meu recorde! No dia da eleição, eu voto 44077 para Deputado Estadual e 4407 Nina Passadore para Federal! Jogue aqui: https://rafaelsaraivasp.com.br/jogo`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-base uppercase tracking-wider shadow-lg"
                  >
                    <Phone className="w-6 h-6" /> Desafiar Amigos
                  </a>
                  
                  <button
                    onClick={downloadColinha}
                    className="w-full bg-[#ebb430] hover:bg-[#d4a22b] text-[#102b31] font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-base uppercase tracking-wider shadow-lg"
                  >
                    <Download className="w-6 h-6" /> Baixar Colinha 44077
                  </button>

                  <button
                    onClick={startGame}
                    className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-base uppercase tracking-wider shadow-lg mt-2"
                  >
                    <RotateCcw className="w-6 h-6" /> Tentar Novamente
                  </button>
                  
                  <button
                    onClick={() => setCurrentView('LEADERBOARD')}
                    className="w-full bg-white hover:bg-gray-50 text-dark border-2 border-gray-200 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
                  >
                    <Trophy className="w-5 h-5" /> Ver Ranking
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        
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
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Usuário ou E-mail</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={authForm.usuario} onChange={e => setAuthForm({...authForm, usuario: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:border-primary outline-none font-medium" placeholder="Seu usuário ou e-mail" />
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
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${authForm.lgpd ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary'}`}>
                    {authForm.lgpd && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-medium leading-tight pt-1">
                  Li e concordo com a <Link to="/politica-de-privacidade" className="text-primary hover:underline">Política de Privacidade e Proteção de Dados</Link> e com o tratamento de meus dados, em conformidade com a LGPD.
                </span>
              </label>
              
              <button type="submit" className="w-full bg-dark hover:bg-black text-white font-black py-4 rounded-xl mt-4 uppercase tracking-wider transition-colors shrink-0">
                Finalizar Cadastro
              </button>
            </form>
          </motion.div>
        )}

        {currentView === 'LEADERBOARD' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[calc(100%-2rem)] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] my-8"
          >
            <div className="bg-dark py-6 px-14 sm:px-6 text-center relative shrink-0">
              <button 
                onClick={() => setCurrentView('HOME')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-3">
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-accent shrink-0" /> 
                <span className="leading-tight text-left sm:text-center">Melhores<br className="sm:hidden" /> Resgates</span>
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {scores.length === 0 ? (
                <p className="text-center text-gray-500 font-medium py-10">Nenhum recorde ainda. Seja o primeiro!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(() => {
                    let currentRank = 1;
                    let lastScore: number | null = null;
                    return scores.map((s, i) => {
                      if (lastScore !== null && s.score < lastScore) {
                        currentRank++; // dense ranking
                      }
                      lastScore = s.score;
                      return (
                        <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
                            currentRank === 1 ? 'bg-yellow-400 text-yellow-900 shadow-md' :
                            currentRank === 2 ? 'bg-gray-300 text-gray-800 shadow-sm' :
                            currentRank === 3 ? 'bg-orange-300 text-orange-900 shadow-sm' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {currentRank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 w-full">
                              <div className="font-black text-dark truncate text-lg">
                                {(s.usuario || s.nome)?.includes('@') ? (s.usuario || s.nome).split('@')[0] : (s.usuario || s.nome)}
                              </div>
                              {s.score >= 44077 && (
                                <span className="bg-[#ebb430] text-[#102b31] text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 font-bold">
                                  👑 Apoiador 44077
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-500 truncate">{s.cidade}</div>
                          </div>
                          <div className="font-black text-primary font-display text-2xl shrink-0">
                            {s.score.toLocaleString()}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex flex-col gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Resgate animais no jogo do Rafael Saraiva! No dia da eleição, eu voto 44077 para Deputado Estadual e 4407 Nina Passadore para Federal! Jogue aqui: https://rafaelsaraivasp.com.br/jogo')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm uppercase tracking-wider shadow-sm"
              >
                <Phone className="w-5 h-5" /> Desafiar Amigos
              </a>
              <button
                onClick={showInstructions}
                className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-xl transition-transform active:scale-95 uppercase tracking-wider mt-1"
              >
                Jogar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

