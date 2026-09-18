// Utilitário central e robusto para normalização e saneamento de Estado (UF) e Cidade (Município)
// Usado em todas as entradas de dados: formulários nativos, importações CSV/XLSX, cadastros e CRM.

export const OFFICIAL_BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export const OFFICIAL_STATES_SET = new Set<string>(OFFICIAL_BRAZIL_STATES);

const STATE_FULL_NAMES: Record<string, string> = {
  'SAO PAULO': 'SP',
  'RIO DE JANEIRO': 'RJ',
  'MINAS GERAIS': 'MG',
  'ESPIRITO SANTO': 'ES',
  'PARANA': 'PR',
  'SANTA CATARINA': 'SC',
  'RIO GRANDE DO SUL': 'RS',
  'BAHIA': 'BA',
  'SERGIPE': 'SE',
  'ALAGOAS': 'AL',
  'PERNAMBUCO': 'PE',
  'PARAIBA': 'PB',
  'RIO GRANDE DO NORTE': 'RN',
  'CEARA': 'CE',
  'PIAUI': 'PI',
  'MARANHAO': 'MA',
  'TOCANTINS': 'TO',
  'GOIAS': 'GO',
  'DISTRITO FEDERAL': 'DF',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'RONDONIA': 'RO',
  'ACRE': 'AC',
  'AMAZONAS': 'AM',
  'RORAIMA': 'RR',
  'AMAPA': 'AP',
  'PARA': 'PA'
};

/**
 * Dedução do Estado pelo CEP brasileiro (faixas oficiais dos Correios)
 */
export function getStateFromCep(cep?: string | null): string | null {
  if (!cep) return null;
  const cleanCep = String(cep).replace(/\D/g, '');
  if (cleanCep.length < 5) return null;
  const prefix = parseInt(cleanCep.substring(0, 5), 10);
  if (isNaN(prefix)) return null;

  if (prefix >= 1000 && prefix <= 19999) return 'SP';
  if (prefix >= 20000 && prefix <= 28999) return 'RJ';
  if (prefix >= 29000 && prefix <= 29999) return 'ES';
  if (prefix >= 30000 && prefix <= 39999) return 'MG';
  if (prefix >= 40000 && prefix <= 48999) return 'BA';
  if (prefix >= 49000 && prefix <= 49999) return 'SE';
  if (prefix >= 50000 && prefix <= 56999) return 'PE';
  if (prefix >= 57000 && prefix <= 57999) return 'AL';
  if (prefix >= 58000 && prefix <= 58999) return 'PB';
  if (prefix >= 59000 && prefix <= 59999) return 'RN';
  if (prefix >= 60000 && prefix <= 63999) return 'CE';
  if (prefix >= 64000 && prefix <= 64999) return 'PI';
  if (prefix >= 65000 && prefix <= 65999) return 'MA';
  if (prefix >= 66000 && prefix <= 68899) return 'PA';
  if (prefix >= 68900 && prefix <= 68999) return 'AP';
  if (prefix >= 69000 && prefix <= 69299) return 'AM';
  if (prefix >= 69300 && prefix <= 69399) return 'RR';
  if (prefix >= 69900 && prefix <= 69999) return 'AC';
  if (prefix >= 70000 && prefix <= 73699) return 'DF';
  if (prefix >= 73700 && prefix <= 76799) return 'GO';
  if (prefix >= 77000 && prefix <= 77999) return 'TO';
  if (prefix >= 78000 && prefix <= 78899) return 'MT';
  if (prefix >= 78900 && prefix <= 78999) return 'RO';
  if (prefix >= 79000 && prefix <= 79999) return 'MS';
  if (prefix >= 80000 && prefix <= 87999) return 'PR';
  if (prefix >= 88000 && prefix <= 89999) return 'SC';
  if (prefix >= 90000 && prefix <= 99999) return 'RS';

  return null;
}

/**
 * Normaliza estritamente qualquer string de Estado (UF) para sigla oficial em MAIÚSCULAS de 2 letras.
 * Se inválido, utiliza o estado deduzido pelo CEP ou 'SP' por padrão da campanha.
 */
export function sanitizeState(rawState?: string | null, cep?: string | null): string {
  const deducedFromCep = getStateFromCep(cep);
  const fallback = deducedFromCep || 'SP';

  if (!rawState || typeof rawState !== 'string') {
    return fallback;
  }

  let s = rawState.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Correção de formatos corrompidos ou abreviações
  if (s === 'SAO PAULO' || s.startsWith('SAO') || s.startsWith('SÃ') || s === 'S.P' || s === 'SP.' || s === 'S/' || s === 'SA' || s === 'S') {
    return 'SP';
  }

  if (STATE_FULL_NAMES[s]) {
    return STATE_FULL_NAMES[s];
  }

  // Verifica se é sigla de 2 caracteres
  if (s.length === 2 && OFFICIAL_STATES_SET.has(s)) {
    return s;
  }

  // Se for algo como 'D' ou caractere corrompido, usa o CEP ou SP
  return fallback;
}

/**
 * Corrige problemas comuns de codificação de texto (Mojibake UTF-8)
 */
export function fixMojibake(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/Ã£|ã£/g, 'ã')
    .replace(/Ã§|ã§/g, 'ç')
    .replace(/Ã¡|ã¡/g, 'á')
    .replace(/Ã©|ã©/g, 'é')
    .replace(/Ã­|ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/ã³/g, 'ó')
    .replace(/Ãº|ãº/g, 'ú')
    .replace(/Ã¢|ã¢/g, 'â')
    .replace(/Ãª|ãª/g, 'ê')
    .replace(/Ã´|ã´/g, 'ô')
    .replace(/Ãµ|ãµ/g, 'õ')
    .replace(/Ã€|ã€/g, 'À')
    .replace(/Ã\x81/g, 'Á')
    .replace(/Ã/g, 'Á')
    .replace(/â€™/g, "'")
    .replace(/â€“/g, "-")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"');
}

/**
 * Formata nome para Title Case formal em português respeitando preposições
 */
export function formatCityTitleCase(city: string): string {
  if (!city) return '';
  const prepositions = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'd\'', 'del']);
  
  const words = city.toLowerCase().split(/\s+/);
  return words
    .map((word, idx) => {
      if (word.length === 0) return '';
      // Trata contrações como d'oeste
      if (word.startsWith("d'") && word.length > 2) {
        return "d'" + word.charAt(2).toUpperCase() + word.slice(3);
      }
      if (idx > 0 && prepositions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .filter(Boolean)
    .join(' ');
}

// Mapa de correções específicas para cidades comuns com digitação errônea ou abreviações
const KNOWN_CITY_SYNONYMS: Record<string, string> = {
  'sao paulo': 'São Paulo',
  'sp': 'São Paulo',
  'capital': 'São Paulo',
  'sampa': 'São Paulo',
  'sbc': 'São Bernardo do Campo',
  'sao bernardo': 'São Bernardo do Campo',
  'sao caetano': 'São Caetano do Sul',
  'scs': 'São Caetano do Sul',
  'santo andre': 'Santo André',
  'mogi': 'Mogi das Cruzes',
  'mogi cruzes': 'Mogi das Cruzes',
  'mogi mirim': 'Mogi Mirim',
  'mogi guacu': 'Mogi Guaçu',
  'sjcampos': 'São José dos Campos',
  'sjc': 'São José dos Campos',
  'sao jose dos campos': 'São José dos Campos',
  'sjrp': 'São José do Rio Preto',
  'sj rio preto': 'São José do Rio Preto',
  'sao jose do rio preto': 'São José do Rio Preto',
  'ribeirao': 'Ribeirão Preto',
  'ribeirao preto': 'Ribeirão Preto',
  'rio claro': 'Rio Claro',
  'regente feijo': 'Regente Feijó',
  'capela do alto': 'Capela do Alto',
  'cananeia': 'Cananéia',
  'bady bassitt': 'Bady Bassitt',
  'barra do choca': 'Barra do Choça',
  'barra do choca bahia': 'Barra do Choça',
  'paraguacu paulista': 'Paraguaçu Paulista',
  'paraguacu': 'Paraguaçu Paulista',
  'itaquaquecetuba': 'Itaquaquecetuba',
  'itaqua': 'Itaquaquecetuba',
  'ferraz': 'Ferraz de Vasconcelos',
  'ferraz de vasconcelos': 'Ferraz de Vasconcelos',
  'pindamonhangaba': 'Pindamonhangaba',
  'pinda': 'Pindamonhangaba',
  'embu': 'Embu das Artes',
  'embu das artes': 'Embu das Artes',
  'embu guacu': 'Embu-Guaçu',
  'santana de parnaiba': 'Santana de Parnaíba',
  'poa': 'Poá',
  'varzea paulista': 'Várzea Paulista',
  'franco da rocha': 'Franco da Rocha',
  'francisco morato': 'Francisco Morato',
  'taboao da serra': 'Taboão da Serra',
  'carapicuiba': 'Carapicuíba',
  'jandira': 'Jandira',
  'osasco': 'Osasco',
  'barueri': 'Barueri',
  'campinas': 'Campinas',
  'sorocaba': 'Sorocaba',
  'guarulhos': 'Guarulhos',
  'santos': 'Santos',
  'sao vicente': 'São Vicente',
  'praia grande': 'Praia Grande',
  'guaruja': 'Guarujá',
  'cubatao': 'Cubatão',
  'bertioga': 'Bertioga',
  'mongagua': 'Mongaguá',
  'itariri': 'Itariri',
  'peruibe': 'Peruíbe',
  'itirapina': 'Itirapina',
  'igarapava': 'Igarapava',
  'jaboticabal': 'Jaboticabal',
  'hortolandia': 'Hortolândia',
  'ibiuna': 'Ibiúna',
  'itanhaem': 'Itanhaém',
  'diadema': 'Diadema',
  'macedonia': 'Macedônia',
  'maua': 'Mauá',
  'severinia': 'Severínia',
  'capivari': 'Capivari',
  'taubate': 'Taubaté'
};

/**
 * Normaliza e limpa o nome da cidade:
 * - Remove espaços extras (trim e múltiplos espaços internos)
 * - Remove sufixos como "- SP", "/SP", "- Bahia", etc.
 * - Corrige acentuações e Mojibake
 * - Aplica Title Case rigoroso
 */
export function sanitizeCity(rawCity?: string | null, rawState?: string | null, cep?: string | null): string {
  if (!rawCity || typeof rawCity !== 'string') {
    const st = sanitizeState(rawState, cep);
    return st === 'SP' ? 'São Paulo' : 'Não Informada';
  }

  let city = fixMojibake(rawCity).trim();

  // Remove sufixos comuns de estado anexados no campo cidade (ex: "Cananéia - SP", "Salvador/BA", "Barra do choça bahia")
  city = city.replace(/[-\/,\s]+(sp|rj|mg|es|pr|sc|rs|ba|pe|ce|df|go|ma|pb|rn|al|se|pi|to|ro|ac|ap|am|rr|pa|mt|ms|são paulo|sao paulo|bahia)$/i, '').trim();

  // Remove caracteres especiais residuais
  city = city.replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!city) {
    const st = sanitizeState(rawState, cep);
    return st === 'SP' ? 'São Paulo' : 'Não Informada';
  }

  // Chave normalizada para comparação de dicionário
  const normKey = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

  if (KNOWN_CITY_SYNONYMS[normKey]) {
    return KNOWN_CITY_SYNONYMS[normKey];
  }

  return formatCityTitleCase(city);
}

/**
 * Higieniza completamente o par Cidade + Estado
 */
export function sanitizeGeo(city?: string | null, state?: string | null, cep?: string | null): { cidade: string; estado: string } {
  const finalState = sanitizeState(state, cep);
  const finalCity = sanitizeCity(city, finalState, cep);
  return {
    cidade: finalCity,
    estado: finalState
  };
}
