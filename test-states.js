const normalizeState = (stateStr, deducedState) => {
  const defaultState = deducedState || 'SP';
  if (!stateStr) return defaultState;
  let s = stateStr.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (s === 'SAO PAULO' || s.startsWith('SAO') || s.startsWith('SÃ') || s === 'S.P' || s === 'SP.' || s === 'S/' || s === 'SA' || s === 'S') return 'SP';
  
  const stateMap = {
    'SAO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ', 'MINAS GERAIS': 'MG', 'ESPIRITO SANTO': 'ES',
    'PARANA': 'PR', 'SANTA CATARINA': 'SC', 'RIO GRANDE DO SUL': 'RS',
    'BAHIA': 'BA', 'SERGIPE': 'SE', 'ALAGOAS': 'AL', 'PERNAMBUCO': 'PE',
    'PARAIBA': 'PB', 'RIO GRANDE DO NORTE': 'RN', 'CEARA': 'CE', 'PIAUI': 'PI', 'MARANHAO': 'MA',
    'TOCANTINS': 'TO', 'GOIAS': 'GO', 'DISTRITO FEDERAL': 'DF', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
    'RONDONIA': 'RO', 'ACRE': 'AC', 'AMAZONAS': 'AM', 'RORAIMA': 'RR', 'AMAPA': 'AP', 'PARA': 'PA',
  };
  if (stateMap[s]) return stateMap[s];
  
  const officialStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  
  if (s.length === 2) {
    if (officialStates.includes(s)) return s;
    return defaultState;
  }
  
  return defaultState;
};
console.log(normalizeState("S/"));
console.log(normalizeState("SA"));
console.log(normalizeState("São Paulo"));
