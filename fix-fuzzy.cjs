const fs = require('fs');
const cities = JSON.parse(fs.readFileSync('sp-cities.json', 'utf8'));

const normalizedCitiesMap = {};
for (const city of cities) {
  const norm = city.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  normalizedCitiesMap[norm] = city;
}

const cityMappingCode = `
  const spCitiesMap = ${JSON.stringify(normalizedCitiesMap, null, 2)};
  
  const getIbgeCityName = (cityStr, stateStr, cepStr) => {
    let deducedState = getStateFromCep(cepStr);
    let finalState = normalizeState(stateStr, deducedState);

    if (!cityStr) {
      if (finalState === 'SP') return 'São Paulo';
      return 'Não Informada';
    }
    
    let originalNorm = cityStr.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    let normalized = originalNorm;
    
    // Remove trailing state codes or slashes (e.g. "sao paulo - sp", "sao paulo/sp", "sao paulo, sp", "sao paulo sp")
    normalized = normalized.replace(/[-\\/,\\s]+sp$/, '').trim();
    normalized = normalized.replace(/[-\\/,\\s]+rj$/, '').trim();
    normalized = normalized.replace(/[-\\/,\\s]+mg$/, '').trim();
    
    // Very aggressive common mappings to official IBGE names
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
      's. b. do campo': 'São Bernardo do Campo', 's.b.c': 'São Bernardo do Campo', 's.b.c.': 'São Bernardo do Campo',
      's. andre': 'Santo André', 'sta barbara': 'Santa Bárbara d\\'Oeste', 'santa barbara': 'Santa Bárbara d\\'Oeste',
      'santa barbara d oeste': 'Santa Bárbara d\\'Oeste', 'sta barbara d oeste': 'Santa Bárbara d\\'Oeste'
    };

    if (cityMap[normalized]) {
      return cityMap[normalized];
    }
    
    if (finalState === 'SP') {
      if (spCitiesMap[normalized]) return spCitiesMap[normalized];
      
      // Try to find the closest match by simple string inclusion if length is decent
      if (normalized.length > 4) {
        for (const [normCity, officialCity] of Object.entries(spCitiesMap)) {
          if (normCity.includes(normalized) || normalized.includes(normCity)) {
            // Be careful not to match too broad
            if (Math.abs(normCity.length - normalized.length) < 4) {
              return officialCity;
            }
          }
        }
      }
    }
    
    // Capitalize properly for non-SP or fallback
    return cityStr
      .trim()
      .toLowerCase()
      .replace(/[-\\/,\\s]+(sp|rj|mg|es|pr|sc|rs|ba|pe|ce|df|go)$/i, '')
      .split(/\\s+/)
      .map(word => {
        if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };
`;

let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const regex = /  const getIbgeCityName = \([\s\S]*?      \.join\(' '\);\n  };\n/m;
content = content.replace(regex, cityMappingCode);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
