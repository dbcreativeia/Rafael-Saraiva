const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const regex = /  const getIbgeCityName = \([\s\S]*?      \.join\(' '\);\n  };\n/m;

const replacement = `  const cityCache = new Map();

  const getIbgeCityName = (cityStr, stateStr, cepStr) => {
    let deducedState = getStateFromCep(cepStr);
    let finalState = normalizeState(stateStr, deducedState);

    if (!cityStr) {
      if (finalState === 'SP') return 'São Paulo';
      return 'Não Informada';
    }
    
    // Convert to lowercase, remove accents
    let norm = cityStr.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    
    // Remove state abbreviations at the end
    norm = norm.replace(/[-\\/,\\s]+sp$/, '').trim();
    norm = norm.replace(/[-\\/,\\s]+rj$/, '').trim();
    norm = norm.replace(/[-\\/,\\s]+mg$/, '').trim();
    
    // Aggressive cleaning to handle mojibake like Sã£o Paulo -> sa£o paulo -> sao paulo
    norm = norm.replace(/[^a-z0-9\\s]/gi, '').replace(/\\s+/g, ' ').trim();
    
    const cacheKey = \`\${norm}_\${finalState}\`;
    if (cityCache.has(cacheKey)) {
      return cityCache.get(cacheKey);
    }
    
    // Very aggressive common mappings for edge cases that Levenshtein might miss
    const cityMap = {
      'sao paulo': 'São Paulo', 'sp': 'São Paulo', 'capital': 'São Paulo', 'sampa': 'São Paulo',
      'sbc': 'São Bernardo do Campo', 'sao bernardo': 'São Bernardo do Campo', 'sao bernardo do campo': 'São Bernardo do Campo',
      'scs': 'São Caetano do Sul', 'sao caetano': 'São Caetano do Sul', 'sao caetano do sul': 'São Caetano do Sul',
      'sa': 'Santo André', 'santo andre': 'Santo André', 'sta andre': 'Santo André',
      'sjc': 'São José dos Campos', 'sao jose': 'São José dos Campos', 'sao jose dos campos': 'São José dos Campos',
      's j dos campos': 'São José dos Campos', 's jose dos campos': 'São José dos Campos', 'sao jose dps campos': 'São José dos Campos',
      'mogi': 'Mogi das Cruzes', 'mogi das cruzes': 'Mogi das Cruzes',
      'rib preto': 'Ribeirão Preto', 'ribeirao preto': 'Ribeirão Preto',
      'sjrp': 'São José do Rio Preto', 'rio preto': 'São José do Rio Preto', 'sao jose do rio preto': 'São José do Rio Preto',
      's j rio preto': 'São José do Rio Preto', 'sj do rio preto': 'São José do Rio Preto',
      'pinda': 'Pindamonhangaba', 'pindamonhangaba': 'Pindamonhangaba',
      'itaq': 'Itaquaquecetuba', 'itaqua': 'Itaquaquecetuba', 'itaquaquecetuba': 'Itaquaquecetuba',
      'guarulhos': 'Guarulhos', 'campinas': 'Campinas', 'osasco': 'Osasco', 'barueri': 'Barueri', 'diadema': 'Diadema',
      'maua': 'Mauá', 'carapicuiba': 'Carapicuíba', 'piracicaba': 'Piracicaba', 'bauru': 'Bauru', 'franca': 'Franca',
      'taubate': 'Taubaté', 'suzano': 'Suzano', 'taboao da serra': 'Taboão da Serra', 'sorocaba': 'Sorocaba', 'jundiai': 'Jundiaí',
      'poa': 'Poá', 'itapecerica': 'Itapecerica da Serra', 'itapecerica da serra': 'Itapecerica da Serra',
      'embu': 'Embu das Artes', 'embu das artes': 'Embu das Artes',
      's b do campo': 'São Bernardo do Campo',
      's andre': 'Santo André', 'sta barbara': "Santa Bárbara d'Oeste", 'santa barbara': "Santa Bárbara d'Oeste",
      'santa barbara d oeste': "Santa Bárbara d'Oeste", 'sta barbara d oeste': "Santa Bárbara d'Oeste"
    };

    let result;
    if (cityMap[norm]) {
      result = cityMap[norm];
    } else if (finalState === 'SP') {
      // For SP, ALWAYS snap to the closest of the 645 cities
      let bestMatch = 'São Paulo';
      let bestDist = Infinity;
      
      for (const item of spCitiesList) {
        if (item.norm === norm) {
          bestMatch = item.official;
          bestDist = 0;
          break; // exact match
        }
        
        // Find closest
        const dist = levenshtein(norm, item.norm);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = item.official;
        }
      }
      
      // Only accept if distance is reasonable
      if (bestDist <= Math.max(3, Math.floor(norm.length * 0.5))) {
        result = bestMatch;
      } else {
        result = 'São Paulo'; // Fallback for pure garbage strings in SP
      }
    } else {
      // Capitalize properly for non-SP
      result = cityStr
        .trim()
        .toLowerCase()
        .replace(/[-\\/,\\s]+(sp|rj|mg|es|pr|sc|rs|ba|pe|ce|df|go)$/i, '')
        .split(/\\s+/)
        .map(word => {
          if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)) return word;
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    }
    
    cityCache.set(cacheKey, result);
    return result;
  };
`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
