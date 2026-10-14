export interface Candidate {
  id: string;
  cargo: 'deputado_estadual' | 'deputado_federal' | string;
  nome: string;
  nome_urna: string;
  numero: string;
  partido: string;
  nome_civil?: string;
  criterio?: string;
  criterio_inclusao?: 'atuacao_campanha' | 'adesao_pauta' | string;
  tipo_inclusao?: string;
  fonte_inclusao?: string;
  universo_a?: boolean;
  universo_b?: boolean;
  recorte_anterior?: boolean;
  notas?: string;
  fontes?: string[];
  [key: string]: any;
}

export interface TerritorialCargoData {
  votos_validos: number;
  votos_candidatos: number[];
  total_A: number;
  total_B: number;
  total_recorte_anterior: number;
  total_a?: number;
  total_b?: number;
  total_anterior?: number;
  recorte_anterior?: number;
  [key: string]: any;
}

export interface TerritorialRecord {
  codigo_tse?: string;
  municipio?: string;
  nome?: string;
  zona?: string;
  local?: string;
  numero_local?: string;
  local_id?: string;
  secao?: string;
  secao_id?: string;
  bairro?: string;
  endereco?: string;
  eleitorado_apto: number;
  cargos: {
    deputado_estadual?: TerritorialCargoData;
    deputado_federal?: TerritorialCargoData;
    estadual?: TerritorialCargoData;
    federal?: TerritorialCargoData;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface CausaAnimalDatasetV2 {
  versao: number;
  dataset_id: string;
  somente_amostra_de_estrutura: boolean;
  metadados?: {
    titulo?: string;
    descricao?: string;
    ano?: number;
    turno?: number;
    estado?: string;
    data_geracao?: string;
    [key: string]: any;
  };
  candidatos: Candidate[];
  ordem_candidatos_por_cargo: {
    deputado_estadual: string[];
    deputado_federal: string[];
  };
  indices_por_universo: {
    deputado_estadual: {
      universo_a: number[];
      universo_b: number[];
      recorte_anterior: number[];
    };
    deputado_federal: {
      universo_a: number[];
      universo_b: number[];
      recorte_anterior: number[];
    };
  };
  bases: {
    municipios: { registros: TerritorialRecord[] };
    zonas: { registros: TerritorialRecord[] };
    locais: { registros: TerritorialRecord[] };
    bairros: { registros: TerritorialRecord[] };
    secoes: { registros: TerritorialRecord[] };
  };
}

export interface ValidationItem {
  id: string;
  titulo: string;
  esperado: string | number;
  obtido: string | number;
  passou: boolean;
  detalhe?: string;
}

export interface ValidationReceipt {
  valido: boolean;
  dataset_id: string;
  versao: number;
  data_importacao: string;
  checksum_sha256: string;
  tamanho_bytes: number;
  conferencias: ValidationItem[];
  erros: string[];
  avisos: string[];
  resumo: {
    total_candidatos: number;
    candidatos_estaduais: number;
    candidatos_federais: number;
    total_municipios: number;
    total_zonas: number;
    total_locais: number;
    total_bairros: number;
    total_secoes: number;
    eleitorado_total_sp: number;
    validos_estadual: number;
    validos_federal: number;
    universo_a_estadual: number;
    universo_a_federal: number;
    universo_b_estadual: number;
    universo_b_federal: number;
    recorte_anterior_estadual: number;
    recorte_anterior_federal: number;
    rafael_saraiva_sp: number;
    rafael_saraiva_capital: number;
    nina_passadore_sp: number;
    nina_passadore_capital: number;
  };
}

export const OFFICIAL_VALIDATION_TARGETS = {
  versao: 2,
  dataset_id: 'causa_animal_SP_2026_v2',
  candidatos_total: 58,
  candidatos_estadual: 28,
  candidatos_federal: 30,
  municipios: 645,
  zonas: 57,
  locais: 2057,
  bairros: 899,
  secoes: 26683,
  eleitorado_total: 34081699,
  validos_estadual: 23290014,
  validos_federal: 23674188,
  universo_a_estadual: 1227736,
  universo_a_federal: 1413512,
  universo_b_estadual: 1243263,
  universo_b_federal: 1418796,
  recorte_anterior_estadual: 532110,
  recorte_anterior_federal: 543284,
  rafael_sp: 105174,
  rafael_capital: 32407,
  nina_sp: 26290,
  nina_capital: 7149,
  tse_capital: '71072'
};

export async function computeSHA256(content: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof content === 'string') {
    buffer = new TextEncoder().encode(content).buffer;
  } else {
    buffer = content;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface UniverseIndicesResult {
  universo_a: number[];
  universo_b: number[];
  recorte_anterior: number[];
}

export function resolveUniverseIndices(
  rawIndices: any,
  cargoKey: 'deputado_estadual' | 'deputado_federal',
  candidatos: Candidate[],
  ordem: string[]
): UniverseIndicesResult {
  const shortCargo = cargoKey === 'deputado_estadual' ? 'estadual' : 'federal';
  const cargoBlock = rawIndices?.[cargoKey] || rawIndices?.[shortCargo] || {};

  const findArray = (...candidates: any[]): number[] | null => {
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
    return null;
  };

  // Localizar array para Universo A
  let arrA = findArray(
    cargoBlock.universo_a,
    cargoBlock.universo_A,
    cargoBlock.A,
    cargoBlock.a,
    cargoBlock.indices_A,
    cargoBlock.indices_a,
    rawIndices?.universo_a?.[cargoKey],
    rawIndices?.universo_a?.[shortCargo],
    rawIndices?.universo_A?.[cargoKey],
    rawIndices?.universo_A?.[shortCargo],
    rawIndices?.A?.[cargoKey],
    rawIndices?.A?.[shortCargo],
    rawIndices?.a?.[cargoKey],
    rawIndices?.a?.[shortCargo]
  );

  // Localizar array para Universo B
  let arrB = findArray(
    cargoBlock.universo_b,
    cargoBlock.universo_B,
    cargoBlock.B,
    cargoBlock.b,
    cargoBlock.indices_B,
    cargoBlock.indices_b,
    rawIndices?.universo_b?.[cargoKey],
    rawIndices?.universo_b?.[shortCargo],
    rawIndices?.universo_B?.[cargoKey],
    rawIndices?.universo_B?.[shortCargo],
    rawIndices?.B?.[cargoKey],
    rawIndices?.B?.[shortCargo],
    rawIndices?.b?.[cargoKey],
    rawIndices?.b?.[shortCargo]
  );

  // Localizar array para Recorte Anterior
  let arrR = findArray(
    cargoBlock.recorte_anterior,
    cargoBlock.anterior,
    cargoBlock.recorte,
    cargoBlock.universo_recorte_anterior,
    cargoBlock.indices_recorte_anterior,
    cargoBlock.indices_anterior,
    cargoBlock.recorteAnterior,
    rawIndices?.recorte_anterior?.[cargoKey],
    rawIndices?.recorte_anterior?.[shortCargo],
    rawIndices?.anterior?.[cargoKey],
    rawIndices?.anterior?.[shortCargo],
    rawIndices?.recorte?.[cargoKey],
    rawIndices?.recorte?.[shortCargo]
  );

  // Mapear IDs de candidatos para suas posições no vetor ordem
  const idToIdx: Record<string, number> = {};
  (ordem || []).forEach((id, idx) => {
    idToIdx[String(id)] = idx;
    idToIdx[String(id).toLowerCase()] = idx;
  });

  const candsForCargo = (candidatos || []).filter(c =>
    c.cargo === cargoKey || c.cargo === shortCargo || String(c.cargo).toLowerCase().includes(shortCargo)
  );

  // Derivação de A se necessário
  if (!arrA || arrA.length === 0) {
    const derivedA: number[] = [];
    candsForCargo.forEach(c => {
      const isA = c.universo_a === true || c.universo_A === true || c.A === true ||
        c.criterio_inclusao === 'atuacao_campanha' || c.criterio_inclusao === 'adesao_pauta' ||
        c.tipo_inclusao === 'atuacao_campanha' || c.tipo_inclusao === 'adesao_pauta' ||
        c.atuacao_campanha === true || c.adesao_pauta === true || c.adesao_publica === true;
      const idx = idToIdx[String(c.id)];
      if (isA && idx !== undefined && !derivedA.includes(idx)) {
        derivedA.push(idx);
      }
    });
    if (derivedA.length > 0) arrA = derivedA;
  }

  // Derivação de B se necessário
  if (!arrB || arrB.length === 0) {
    const derivedB: number[] = [];
    candsForCargo.forEach(c => {
      const idx = idToIdx[String(c.id)];
      const isA = arrA && idx !== undefined && arrA.includes(idx);
      const isB = c.universo_b === true || c.universo_B === true || c.B === true ||
        c.criterio_inclusao === 'nome_urna_explicito' || c.tipo_inclusao === 'nome_urna_explicito' ||
        c.nome_urna_explicito === true || isA;
      if (isB && idx !== undefined && !derivedB.includes(idx)) {
        derivedB.push(idx);
      }
    });
    if (derivedB.length > 0) arrB = derivedB;
  }

  // Derivação de Recorte Anterior se necessário
  if (!arrR || arrR.length === 0) {
    const derivedR: number[] = [];
    candsForCargo.forEach(c => {
      const isR = c.recorte_anterior === true || c.anterior === true || c.recorte === true;
      const idx = idToIdx[String(c.id)];
      if (isR && idx !== undefined && !derivedR.includes(idx)) {
        derivedR.push(idx);
      }
    });
    if (derivedR.length > 0) arrR = derivedR;
  }

  return {
    universo_a: Array.isArray(arrA) ? arrA : [],
    universo_b: Array.isArray(arrB) ? arrB : [],
    recorte_anterior: Array.isArray(arrR) ? arrR : []
  };
}

export function validateCausaAnimalDataset(
  data: any,
  checksum: string = '',
  fileSize: number = 0
): ValidationReceipt {
  const conferencias: ValidationItem[] = [];
  const erros: string[] = [];
  const avisos: string[] = [];

  // 1. Identificação e Versão
  const isV2 = data?.versao === OFFICIAL_VALIDATION_TARGETS.versao;
  conferencias.push({
    id: 'versao',
    titulo: 'Versão do pacote',
    esperado: OFFICIAL_VALIDATION_TARGETS.versao,
    obtido: data?.versao ?? 'ausente',
    passou: isV2
  });
  if (!isV2) erros.push(`Versão incorreta: esperado ${OFFICIAL_VALIDATION_TARGETS.versao}, obtido ${data?.versao}`);

  const isDatasetId = data?.dataset_id === OFFICIAL_VALIDATION_TARGETS.dataset_id;
  conferencias.push({
    id: 'dataset_id',
    titulo: 'Identificador do dataset',
    esperado: OFFICIAL_VALIDATION_TARGETS.dataset_id,
    obtido: data?.dataset_id ?? 'ausente',
    passou: isDatasetId
  });
  if (!isDatasetId) erros.push(`Dataset ID incorreto: esperado ${OFFICIAL_VALIDATION_TARGETS.dataset_id}, obtido ${data?.dataset_id}`);

  // Rejeição estrita de amostra
  const isSample = data?.somente_amostra_de_estrutura === true;
  conferencias.push({
    id: 'amostra',
    titulo: 'Base completa (não amostra)',
    esperado: 'somente_amostra_de_estrutura: false',
    obtido: isSample ? 'somente_amostra_de_estrutura: true (AMOSTRA)' : 'false (BASE COMPLETA)',
    passou: !isSample
  });
  if (isSample) {
    erros.push('Arquivo rejeitado: Trata-se de uma AMOSTRA DE ESTRUTURA (somente_amostra_de_estrutura=true). O importador aceita exclusivamente o arquivo completo da base oficial.');
  }

  // 2. Cadastro de Candidatos
  const candidatos: Candidate[] = Array.isArray(data?.candidatos) ? data.candidatos : [];
  const estaduais = candidatos.filter(c =>
    c.cargo === 'deputado_estadual' || c.cargo === 'estadual' || String(c.cargo).toLowerCase().includes('estadual')
  );
  const federais = candidatos.filter(c =>
    c.cargo === 'deputado_federal' || c.cargo === 'federal' || String(c.cargo).toLowerCase().includes('federal')
  );
  const ids = candidatos.map(c => String(c.id));
  const uniqueIds = new Set(ids);

  const passedCandTotal = candidatos.length === OFFICIAL_VALIDATION_TARGETS.candidatos_total;
  conferencias.push({
    id: 'candidatos_total',
    titulo: 'Total de candidatos cadastrados',
    esperado: OFFICIAL_VALIDATION_TARGETS.candidatos_total,
    obtido: candidatos.length,
    passou: passedCandTotal
  });
  if (!passedCandTotal) erros.push(`Total de candidatos divergente: ${candidatos.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.candidatos_total})`);

  const passedCandEstadual = estaduais.length === OFFICIAL_VALIDATION_TARGETS.candidatos_estadual;
  conferencias.push({
    id: 'candidatos_estadual',
    titulo: 'Candidaturas a Deputado Estadual',
    esperado: OFFICIAL_VALIDATION_TARGETS.candidatos_estadual,
    obtido: estaduais.length,
    passou: passedCandEstadual
  });

  const passedCandFederal = federais.length === OFFICIAL_VALIDATION_TARGETS.candidatos_federal;
  conferencias.push({
    id: 'candidatos_federal',
    titulo: 'Candidaturas a Deputado Federal',
    esperado: OFFICIAL_VALIDATION_TARGETS.candidatos_federal,
    obtido: federais.length,
    passou: passedCandFederal
  });

  const passedIdsUnicos = uniqueIds.size === candidatos.length && candidatos.length > 0;
  conferencias.push({
    id: 'candidatos_ids_unicos',
    titulo: 'Unicidade de IDs de candidatos',
    esperado: `${candidatos.length} IDs únicos`,
    obtido: `${uniqueIds.size} IDs únicos`,
    passou: passedIdsUnicos
  });
  if (!passedIdsUnicos) erros.push(`IDs de candidatos duplicados detectados.`);

  // Vetores de ordenação
  const ordemEstadual = data?.ordem_candidatos_por_cargo?.deputado_estadual || data?.ordem_candidatos_por_cargo?.estadual || [];
  const ordemFederal = data?.ordem_candidatos_por_cargo?.deputado_federal || data?.ordem_candidatos_por_cargo?.federal || [];
  const mapIdToIndexEstadual: Record<string, number> = {};
  ordemEstadual.forEach((id: string, idx: number) => {
    mapIdToIndexEstadual[String(id)] = idx;
    mapIdToIndexEstadual[String(id).toLowerCase()] = idx;
  });
  const mapIdToIndexFederal: Record<string, number> = {};
  ordemFederal.forEach((id: string, idx: number) => {
    mapIdToIndexFederal[String(id)] = idx;
    mapIdToIndexFederal[String(id).toLowerCase()] = idx;
  });

  const passedOrdem = ordemEstadual.length === 28 && ordemFederal.length === 30;
  conferencias.push({
    id: 'ordem_candidatos',
    titulo: 'Vetores de ordenação por cargo (28 estaduais, 30 federais)',
    esperado: '28 estaduais e 30 federais',
    obtido: `${ordemEstadual.length} estaduais e ${ordemFederal.length} federais`,
    passou: passedOrdem
  });

  // Índices por universo (robusto contra qualquer convenção de casing/chaves)
  const indicesEstadual = resolveUniverseIndices(data?.indices_por_universo, 'deputado_estadual', candidatos, ordemEstadual);
  const indicesFederal = resolveUniverseIndices(data?.indices_por_universo, 'deputado_federal', candidatos, ordemFederal);

  // Normalizar no objeto data para consumo uniforme pelo frontend
  if (!data.indices_por_universo) data.indices_por_universo = {};
  data.indices_por_universo.deputado_estadual = {
    universo_a: indicesEstadual.universo_a,
    universo_b: indicesEstadual.universo_b,
    recorte_anterior: indicesEstadual.recorte_anterior,
    ...(data.indices_por_universo.deputado_estadual || {})
  };
  data.indices_por_universo.deputado_federal = {
    universo_a: indicesFederal.universo_a,
    universo_b: indicesFederal.universo_b,
    recorte_anterior: indicesFederal.recorte_anterior,
    ...(data.indices_por_universo.deputado_federal || {})
  };

  // 3. Contagens de Bases Territoriais
  const getRegistros = (baseObj: any): TerritorialRecord[] => {
    if (Array.isArray(baseObj)) return baseObj;
    if (Array.isArray(baseObj?.registros)) return baseObj.registros;
    return [];
  };

  const municipios: TerritorialRecord[] = getRegistros(data?.bases?.municipios);
  const zonas: TerritorialRecord[] = getRegistros(data?.bases?.zonas);
  const locais: TerritorialRecord[] = getRegistros(data?.bases?.locais);
  const bairros: TerritorialRecord[] = getRegistros(data?.bases?.bairros);
  const secoes: TerritorialRecord[] = getRegistros(data?.bases?.secoes);

  conferencias.push({
    id: 'count_municipios',
    titulo: 'Municípios do Estado de São Paulo',
    esperado: OFFICIAL_VALIDATION_TARGETS.municipios,
    obtido: municipios.length,
    passou: municipios.length === OFFICIAL_VALIDATION_TARGETS.municipios
  });
  if (municipios.length !== OFFICIAL_VALIDATION_TARGETS.municipios) {
    erros.push(`Municípios: ${municipios.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.municipios})`);
  }

  conferencias.push({
    id: 'count_zonas',
    titulo: 'Zonas Eleitorais da Capital',
    esperado: OFFICIAL_VALIDATION_TARGETS.zonas,
    obtido: zonas.length,
    passou: zonas.length === OFFICIAL_VALIDATION_TARGETS.zonas
  });
  if (zonas.length !== OFFICIAL_VALIDATION_TARGETS.zonas) {
    erros.push(`Zonas: ${zonas.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.zonas})`);
  }

  conferencias.push({
    id: 'count_locais',
    titulo: 'Locais de Votação da Capital',
    esperado: OFFICIAL_VALIDATION_TARGETS.locais,
    obtido: locais.length,
    passou: locais.length === OFFICIAL_VALIDATION_TARGETS.locais
  });
  if (locais.length !== OFFICIAL_VALIDATION_TARGETS.locais) {
    erros.push(`Locais: ${locais.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.locais})`);
  }

  conferencias.push({
    id: 'count_bairros',
    titulo: 'Rótulos de Bairro Cadastrados dos Locais',
    esperado: OFFICIAL_VALIDATION_TARGETS.bairros,
    obtido: bairros.length,
    passou: bairros.length === OFFICIAL_VALIDATION_TARGETS.bairros
  });
  if (bairros.length !== OFFICIAL_VALIDATION_TARGETS.bairros) {
    erros.push(`Bairros: ${bairros.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.bairros})`);
  }

  conferencias.push({
    id: 'count_secoes',
    titulo: 'Seções Principais da Capital',
    esperado: OFFICIAL_VALIDATION_TARGETS.secoes,
    obtido: secoes.length,
    passou: secoes.length === OFFICIAL_VALIDATION_TARGETS.secoes
  });
  if (secoes.length !== OFFICIAL_VALIDATION_TARGETS.secoes) {
    erros.push(`Seções: ${secoes.length} (esperado ${OFFICIAL_VALIDATION_TARGETS.secoes})`);
  }

  // 4. Integridade Referencial de Locais e Zonas
  const locaisKeys = new Set<string>();
  let duplicateLocais = 0;
  locais.forEach(l => {
    const rawZona = String(l.zona || '');
    const padZona = rawZona.padStart(4, '0');
    const rawLoc = String(l.local || l.numero_local || '');
    const padLoc = rawLoc.padStart(4, '0');

    if (l.local_id) {
      if (locaisKeys.has(l.local_id)) duplicateLocais++;
      locaisKeys.add(l.local_id);
    }
    locaisKeys.add(`${rawZona}:${rawLoc}`);
    locaisKeys.add(`${padZona}:${padLoc}`);
    locaisKeys.add(`${rawZona}:${padLoc}`);
    locaisKeys.add(`${padZona}:${rawLoc}`);
  });

  const zonasKeys = new Set<string>();
  zonas.forEach(z => {
    const raw = String(z.zona || z.zona_eleitoral || '');
    zonasKeys.add(raw);
    zonasKeys.add(raw.padStart(4, '0'));
  });

  let secoesOrphasLocais = 0;
  let secoesOrphasZonas = 0;
  secoes.forEach(s => {
    const sLocalId = s.local_id || `${s.zona}:${s.local || s.numero_local}`;
    const rawZona = String(s.zona || '');
    const padZona = rawZona.padStart(4, '0');
    const rawLoc = String(s.local || s.numero_local || '');
    const padLoc = rawLoc.padStart(4, '0');

    const hasLocal = locaisKeys.has(sLocalId) ||
      locaisKeys.has(`${rawZona}:${rawLoc}`) ||
      locaisKeys.has(`${padZona}:${padLoc}`);

    if (!hasLocal) {
      secoesOrphasLocais++;
    }

    const hasZona = zonasKeys.has(rawZona) || zonasKeys.has(padZona);
    if (!hasZona) {
      secoesOrphasZonas++;
    }
  });

  const passedRefIntegrity = duplicateLocais === 0 && secoesOrphasLocais === 0 && secoesOrphasZonas === 0;
  conferencias.push({
    id: 'integridade_referencial',
    titulo: 'Integridade referencial de locais e zonas nas seções',
    esperado: '0 seções órfãs e locais únicos por zona',
    obtido: `${secoesOrphasLocais} órfãs de local, ${secoesOrphasZonas} órfãs de zona, ${duplicateLocais} duplicidades`,
    passou: passedRefIntegrity
  });
  if (!passedRefIntegrity) {
    erros.push(`Falha de integridade referencial: ${secoesOrphasLocais} seções sem local, ${secoesOrphasZonas} sem zona, ${duplicateLocais} locais duplicados.`);
  }

  // 5. Soma municipal de eleitorado (uma única vez)
  let somaEleitorado = 0;
  let somaValidosEstadual = 0;
  let somaValidosFederal = 0;
  let somaTotalAEstadual = 0;
  let somaTotalAFederal = 0;
  let somaTotalBEstadual = 0;
  let somaTotalBFederal = 0;
  let somaRecorteEstadual = 0;
  let somaRecorteFederal = 0;

  // Localizar Rafael Saraiva e Nina Passadore
  const candRafael = candidatos.find(c => {
    const isEst = c.cargo === 'deputado_estadual' || c.cargo === 'estadual' || String(c.cargo).toLowerCase().includes('estadual');
    if (!isEst) return false;
    const cid = String(c.id || '').toLowerCase();
    const cnome = String(c.nome || '').toLowerCase();
    const curna = String(c.nome_urna || '').toLowerCase();
    return cid.includes('rafael') || cnome.includes('rafael saraiva') || curna.includes('rafael saraiva');
  });

  let idxRafael = -1;
  if (candRafael) {
    if (mapIdToIndexEstadual[String(candRafael.id)] !== undefined) {
      idxRafael = mapIdToIndexEstadual[String(candRafael.id)];
    } else {
      idxRafael = ordemEstadual.findIndex(id => String(id).toLowerCase() === String(candRafael.id).toLowerCase());
    }
  }

  const candNina = candidatos.find(c => {
    const isFed = c.cargo === 'deputado_federal' || c.cargo === 'federal' || String(c.cargo).toLowerCase().includes('federal');
    if (!isFed) return false;
    const cid = String(c.id || '').toLowerCase();
    const cnome = String(c.nome || '').toLowerCase();
    const curna = String(c.nome_urna || '').toLowerCase();
    return cid.includes('nina') || cnome.includes('nina passadore') || curna.includes('nina passadore');
  });

  let idxNina = -1;
  if (candNina) {
    if (mapIdToIndexFederal[String(candNina.id)] !== undefined) {
      idxNina = mapIdToIndexFederal[String(candNina.id)];
    } else {
      idxNina = ordemFederal.findIndex(id => String(id).toLowerCase() === String(candNina.id).toLowerCase());
    }
  }

  let votosRafaelSp = 0;
  let votosRafaelCapital = 0;
  let votosNinaSp = 0;
  let votosNinaCapital = 0;

  let internalVectorSumMismatches = 0;

  municipios.forEach(m => {
    somaEleitorado += Number(m.eleitorado_apto || 0);

    const est = m.cargos?.deputado_estadual || m.cargos?.estadual;
    if (est) {
      const valEst = Number(est.votos_validos ?? 0);
      const totA = Number(est.total_A ?? est.total_a ?? 0);
      const totB = Number(est.total_B ?? est.total_b ?? 0);
      const totR = Number(est.total_recorte_anterior ?? est.total_anterior ?? est.recorte_anterior ?? 0);

      somaValidosEstadual += valEst;
      somaTotalAEstadual += totA;
      somaTotalBEstadual += totB;
      somaRecorteEstadual += totR;

      if (idxRafael >= 0 && Array.isArray(est.votos_candidatos)) {
        const v = est.votos_candidatos[idxRafael] || 0;
        votosRafaelSp += v;
        if (String(m.codigo_tse) === OFFICIAL_VALIDATION_TARGETS.tse_capital || String(m.codigo_tse) === '71072') {
          votosRafaelCapital += v;
        }
      }

      // Conferir se total_A, total_B e total_recorte_anterior batem com a soma do vetor
      if (Array.isArray(est.votos_candidatos)) {
        const sumA = (indicesEstadual.universo_a || []).reduce((acc: number, i: number) => acc + (est.votos_candidatos[i] || 0), 0);
        const sumB = (indicesEstadual.universo_b || []).reduce((acc: number, i: number) => acc + (est.votos_candidatos[i] || 0), 0);
        const sumR = (indicesEstadual.recorte_anterior || []).reduce((acc: number, i: number) => acc + (est.votos_candidatos[i] || 0), 0);
        if (sumA !== totA || sumB !== totB || sumR !== totR) {
          internalVectorSumMismatches++;
        }
      }
    }

    const fed = m.cargos?.deputado_federal || m.cargos?.federal;
    if (fed) {
      const valFed = Number(fed.votos_validos ?? 0);
      const totA = Number(fed.total_A ?? fed.total_a ?? 0);
      const totB = Number(fed.total_B ?? fed.total_b ?? 0);
      const totR = Number(fed.total_recorte_anterior ?? fed.total_anterior ?? fed.recorte_anterior ?? 0);

      somaValidosFederal += valFed;
      somaTotalAFederal += totA;
      somaTotalBFederal += totB;
      somaRecorteFederal += totR;

      if (idxNina >= 0 && Array.isArray(fed.votos_candidatos)) {
        const v = fed.votos_candidatos[idxNina] || 0;
        votosNinaSp += v;
        if (String(m.codigo_tse) === OFFICIAL_VALIDATION_TARGETS.tse_capital || String(m.codigo_tse) === '71072') {
          votosNinaCapital += v;
        }
      }

      if (Array.isArray(fed.votos_candidatos)) {
        const sumA = (indicesFederal.universo_a || []).reduce((acc: number, i: number) => acc + (fed.votos_candidatos[i] || 0), 0);
        const sumB = (indicesFederal.universo_b || []).reduce((acc: number, i: number) => acc + (fed.votos_candidatos[i] || 0), 0);
        const sumR = (indicesFederal.recorte_anterior || []).reduce((acc: number, i: number) => acc + (fed.votos_candidatos[i] || 0), 0);
        if (sumA !== totA || sumB !== totB || sumR !== totR) {
          internalVectorSumMismatches++;
        }
      }
    }
  });

  // Conferência Eleitorado
  const passedEleitorado = somaEleitorado === OFFICIAL_VALIDATION_TARGETS.eleitorado_total;
  conferencias.push({
    id: 'soma_eleitorado',
    titulo: 'Soma Municipal de Eleitorado Estadual (uma única vez)',
    esperado: OFFICIAL_VALIDATION_TARGETS.eleitorado_total,
    obtido: somaEleitorado,
    passou: passedEleitorado
  });
  if (!passedEleitorado) erros.push(`Soma de eleitorado estadual divergente: ${somaEleitorado} (esperado ${OFFICIAL_VALIDATION_TARGETS.eleitorado_total})`);

  // Conferência Válidos Estadual
  const passedValidosEst = somaValidosEstadual === OFFICIAL_VALIDATION_TARGETS.validos_estadual;
  conferencias.push({
    id: 'validos_estadual',
    titulo: 'Total de Votos Válidos Estadual',
    esperado: OFFICIAL_VALIDATION_TARGETS.validos_estadual,
    obtido: somaValidosEstadual,
    passou: passedValidosEst
  });
  if (!passedValidosEst) erros.push(`Válidos estaduais divergentes: ${somaValidosEstadual} (esperado ${OFFICIAL_VALIDATION_TARGETS.validos_estadual})`);

  // Conferência Válidos Federal
  const passedValidosFed = somaValidosFederal === OFFICIAL_VALIDATION_TARGETS.validos_federal;
  conferencias.push({
    id: 'validos_federal',
    titulo: 'Total de Votos Válidos Federal',
    esperado: OFFICIAL_VALIDATION_TARGETS.validos_federal,
    obtido: somaValidosFederal,
    passou: passedValidosFed
  });
  if (!passedValidosFed) erros.push(`Válidos federais divergentes: ${somaValidosFederal} (esperado ${OFFICIAL_VALIDATION_TARGETS.validos_federal})`);

  // Universo A Estadual
  const passedUAEst = somaTotalAEstadual === OFFICIAL_VALIDATION_TARGETS.universo_a_estadual;
  conferencias.push({
    id: 'universo_a_estadual',
    titulo: 'Universo A Estadual (Consolidado: Atuação ou Adesão)',
    esperado: OFFICIAL_VALIDATION_TARGETS.universo_a_estadual,
    obtido: somaTotalAEstadual,
    passou: passedUAEst
  });
  if (!passedUAEst) erros.push(`Universo A Estadual divergente: ${somaTotalAEstadual} (esperado ${OFFICIAL_VALIDATION_TARGETS.universo_a_estadual})`);

  // Universo A Federal
  const passedUAFed = somaTotalAFederal === OFFICIAL_VALIDATION_TARGETS.universo_a_federal;
  conferencias.push({
    id: 'universo_a_federal',
    titulo: 'Universo A Federal (Consolidado: Atuação ou Adesão)',
    esperado: OFFICIAL_VALIDATION_TARGETS.universo_a_federal,
    obtido: somaTotalAFederal,
    passou: passedUAFed
  });
  if (!passedUAFed) erros.push(`Universo A Federal divergente: ${somaTotalAFederal} (esperado ${OFFICIAL_VALIDATION_TARGETS.universo_a_federal})`);

  // Universo B Estadual
  const passedUBEst = somaTotalBEstadual === OFFICIAL_VALIDATION_TARGETS.universo_b_estadual;
  conferencias.push({
    id: 'universo_b_estadual',
    titulo: 'Universo B Estadual (Universo A + Nome de Urna Explícito)',
    esperado: OFFICIAL_VALIDATION_TARGETS.universo_b_estadual,
    obtido: somaTotalBEstadual,
    passou: passedUBEst
  });
  if (!passedUBEst) erros.push(`Universo B Estadual divergente: ${somaTotalBEstadual} (esperado ${OFFICIAL_VALIDATION_TARGETS.universo_b_estadual})`);

  // Universo B Federal
  const passedUBFed = somaTotalBFederal === OFFICIAL_VALIDATION_TARGETS.universo_b_federal;
  conferencias.push({
    id: 'universo_b_federal',
    titulo: 'Universo B Federal (Universo A + Nome de Urna Explícito)',
    esperado: OFFICIAL_VALIDATION_TARGETS.universo_b_federal,
    obtido: somaTotalBFederal,
    passou: passedUBFed
  });
  if (!passedUBFed) erros.push(`Universo B Federal divergente: ${somaTotalBFederal} (esperado ${OFFICIAL_VALIDATION_TARGETS.universo_b_federal})`);

  // Recorte Anterior Estadual
  const passedRecorteEst = somaRecorteEstadual === OFFICIAL_VALIDATION_TARGETS.recorte_anterior_estadual;
  conferencias.push({
    id: 'recorte_anterior_estadual',
    titulo: 'Recorte Anterior Estadual (14 nomes históricos)',
    esperado: OFFICIAL_VALIDATION_TARGETS.recorte_anterior_estadual,
    obtido: somaRecorteEstadual,
    passou: passedRecorteEst
  });
  if (!passedRecorteEst) erros.push(`Recorte Anterior Estadual divergente: ${somaRecorteEstadual} (esperado ${OFFICIAL_VALIDATION_TARGETS.recorte_anterior_estadual})`);

  // Recorte Anterior Federal
  const passedRecorteFed = somaRecorteFederal === OFFICIAL_VALIDATION_TARGETS.recorte_anterior_federal;
  conferencias.push({
    id: 'recorte_anterior_federal',
    titulo: 'Recorte Anterior Federal (11 nomes históricos)',
    esperado: OFFICIAL_VALIDATION_TARGETS.recorte_anterior_federal,
    obtido: somaRecorteFederal,
    passou: passedRecorteFed
  });
  if (!passedRecorteFed) erros.push(`Recorte Anterior Federal divergente: ${somaRecorteFederal} (esperado ${OFFICIAL_VALIDATION_TARGETS.recorte_anterior_federal})`);

  // Rafael Saraiva SP
  const passedRafaelSp = votosRafaelSp === OFFICIAL_VALIDATION_TARGETS.rafael_sp;
  conferencias.push({
    id: 'rafael_sp',
    titulo: 'Rafael Saraiva (Dep. Estadual) - Total Estado de SP',
    esperado: OFFICIAL_VALIDATION_TARGETS.rafael_sp,
    obtido: votosRafaelSp,
    passou: passedRafaelSp
  });
  if (!passedRafaelSp) erros.push(`Total de Rafael Saraiva em SP divergente: ${votosRafaelSp} (esperado ${OFFICIAL_VALIDATION_TARGETS.rafael_sp})`);

  // Rafael Saraiva Capital
  const passedRafaelCap = votosRafaelCapital === OFFICIAL_VALIDATION_TARGETS.rafael_capital;
  conferencias.push({
    id: 'rafael_capital',
    titulo: 'Rafael Saraiva (Dep. Estadual) - Capital (TSE 71072)',
    esperado: OFFICIAL_VALIDATION_TARGETS.rafael_capital,
    obtido: votosRafaelCapital,
    passou: passedRafaelCap
  });
  if (!passedRafaelCap) erros.push(`Total de Rafael Saraiva na Capital divergente: ${votosRafaelCapital} (esperado ${OFFICIAL_VALIDATION_TARGETS.rafael_capital})`);

  // Nina Passadore SP
  const passedNinaSp = votosNinaSp === OFFICIAL_VALIDATION_TARGETS.nina_sp;
  conferencias.push({
    id: 'nina_sp',
    titulo: 'Nina Passadore (Dep. Federal) - Total Estado de SP',
    esperado: OFFICIAL_VALIDATION_TARGETS.nina_sp,
    obtido: votosNinaSp,
    passou: passedNinaSp
  });
  if (!passedNinaSp) erros.push(`Total de Nina Passadore em SP divergente: ${votosNinaSp} (esperado ${OFFICIAL_VALIDATION_TARGETS.nina_sp})`);

  // Nina Passadore Capital
  const passedNinaCap = votosNinaCapital === OFFICIAL_VALIDATION_TARGETS.nina_capital;
  conferencias.push({
    id: 'nina_capital',
    titulo: 'Nina Passadore (Dep. Federal) - Capital (TSE 71072)',
    esperado: OFFICIAL_VALIDATION_TARGETS.nina_capital,
    obtido: votosNinaCapital,
    passou: passedNinaCap
  });
  if (!passedNinaCap) erros.push(`Total de Nina Passadore na Capital divergente: ${votosNinaCapital} (esperado ${OFFICIAL_VALIDATION_TARGETS.nina_capital})`);

  // 6. Reconciliação dos Níveis da Capital (Zonas = Locais = Bairros = Seções = Município 71072)
  const spMunicipio = municipios.find(m =>
    String(m.codigo_tse) === OFFICIAL_VALIDATION_TARGETS.tse_capital ||
    String(m.codigo_tse) === '71072' ||
    String(m.municipio || '').toLowerCase().trim() === 'são paulo' ||
    String(m.nome || '').toLowerCase().trim() === 'são paulo'
  );
  let passedReconciliation = true;
  let reconciliationDetails = '';

  if (spMunicipio) {
    const spEst = spMunicipio.cargos?.deputado_estadual?.votos_candidatos ||
      spMunicipio.cargos?.estadual?.votos_candidatos || [];
    const spFed = spMunicipio.cargos?.deputado_federal?.votos_candidatos ||
      spMunicipio.cargos?.federal?.votos_candidatos || [];

    // Helper para somar votos por candidato
    const sumLevels = (list: TerritorialRecord[], cargo: 'deputado_estadual' | 'deputado_federal', numCands: number) => {
      const totals = new Array(numCands).fill(0);
      list.forEach(r => {
        const cargoObj = r.cargos?.[cargo] || (cargo === 'deputado_estadual' ? r.cargos?.estadual : r.cargos?.federal);
        const v = cargoObj?.votos_candidatos;
        if (Array.isArray(v)) {
          for (let i = 0; i < numCands; i++) {
            totals[i] += Number(v[i] || 0);
          }
        }
      });
      return totals;
    };

    const zonasEstSum = sumLevels(zonas, 'deputado_estadual', 28);
    const locaisEstSum = sumLevels(locais, 'deputado_estadual', 28);
    const bairrosEstSum = sumLevels(bairros, 'deputado_estadual', 28);
    const secoesEstSum = sumLevels(secoes, 'deputado_estadual', 28);

    const zonasFedSum = sumLevels(zonas, 'deputado_federal', 30);
    const locaisFedSum = sumLevels(locais, 'deputado_federal', 30);
    const bairrosFedSum = sumLevels(bairros, 'deputado_federal', 30);
    const secoesFedSum = sumLevels(secoes, 'deputado_federal', 30);

    for (let i = 0; i < 28; i++) {
      const target = spEst[i] || 0;
      if (zonasEstSum[i] !== target || locaisEstSum[i] !== target || bairrosEstSum[i] !== target || secoesEstSum[i] !== target) {
        passedReconciliation = false;
        reconciliationDetails = `Divergência estadual no candidato índice ${i}: Município=${target}, Zonas=${zonasEstSum[i]}, Locais=${locaisEstSum[i]}, Bairros=${bairrosEstSum[i]}, Seções=${secoesEstSum[i]}`;
        break;
      }
    }

    if (passedReconciliation) {
      for (let i = 0; i < 30; i++) {
        const target = spFed[i] || 0;
        if (zonasFedSum[i] !== target || locaisFedSum[i] !== target || bairrosFedSum[i] !== target || secoesFedSum[i] !== target) {
          passedReconciliation = false;
          reconciliationDetails = `Divergência federal no candidato índice ${i}: Município=${target}, Zonas=${zonasFedSum[i]}, Locais=${locaisFedSum[i]}, Bairros=${bairrosFedSum[i]}, Seções=${secoesFedSum[i]}`;
          break;
        }
      }
    }
  } else {
    passedReconciliation = false;
    reconciliationDetails = 'Município de São Paulo (código TSE 71072) não encontrado na base de municípios.';
  }

  conferencias.push({
    id: 'reconciliacao_capital',
    titulo: 'Reconciliação Exata da Capital (Zonas = Locais = Bairros = Seções = TSE 71072)',
    esperado: 'Igualdade em todos os 58 candidatos nos 4 níveis territoriais',
    obtido: passedReconciliation ? 'Reconciliação 100% perfeita em todos os níveis' : (reconciliationDetails || 'Divergência encontrada'),
    passou: passedReconciliation
  });
  if (!passedReconciliation) {
    erros.push(`Falha na reconciliação dos níveis da Capital: ${reconciliationDetails}`);
  }

  // Conferência dos vetores internos
  conferencias.push({
    id: 'totais_vetores_internos',
    titulo: 'Consistência de soma interna dos vetores (total_A, total_B, total_recorte_anterior)',
    esperado: '0 divergências',
    obtido: `${internalVectorSumMismatches} divergências`,
    passou: internalVectorSumMismatches === 0
  });
  if (internalVectorSumMismatches > 0) {
    erros.push(`Há ${internalVectorSumMismatches} registros territoriais onde os campos total_A/total_B/recorte não batem com a soma do vetor.`);
  }

  const valido = conferencias.every(c => c.passou) && erros.length === 0;

  return {
    valido,
    dataset_id: data?.dataset_id || 'desconhecido',
    versao: data?.versao || 0,
    data_importacao: new Date().toISOString(),
    checksum_sha256: checksum,
    tamanho_bytes: fileSize,
    conferencias,
    erros,
    avisos,
    resumo: {
      total_candidatos: candidatos.length,
      candidatos_estaduais: estaduais.length,
      candidatos_federais: federais.length,
      total_municipios: municipios.length,
      total_zonas: zonas.length,
      total_locais: locais.length,
      total_bairros: bairros.length,
      total_secoes: secoes.length,
      eleitorado_total_sp: somaEleitorado,
      validos_estadual: somaValidosEstadual,
      validos_federal: somaValidosFederal,
      universo_a_estadual: somaTotalAEstadual,
      universo_a_federal: somaTotalAFederal,
      universo_b_estadual: somaTotalBEstadual,
      universo_b_federal: somaTotalBFederal,
      recorte_anterior_estadual: somaRecorteEstadual,
      recorte_anterior_federal: somaRecorteFederal,
      rafael_saraiva_sp: votosRafaelSp,
      rafael_saraiva_capital: votosRafaelCapital,
      nina_passadore_sp: votosNinaSp,
      nina_passadore_capital: votosNinaCapital
    }
  };
}
