/**
 * Advanced search engine utilities for flexible, typo-tolerant, accent-insensitive,
 * multi-word search with smart relevance scoring and rank ordering.
 * Supports school names, addresses, street numbers, neighborhoods, zones, CEP, TSE codes,
 * and natural language queries with common typos.
 */

// Portuguese electoral & educational abbreviations and title synonyms
const SYNONYMS: Record<string, string[]> = {
  'padre': ['pe', 'p'],
  'pe': ['padre', 'p'],
  'p': ['padre', 'pe'],
  'professora': ['profa', 'prof', 'p'],
  'professor': ['prof', 'professora', 'p'],
  'prof': ['professor', 'professora', 'profa'],
  'profa': ['professora', 'prof'],
  'doutor': ['dr'],
  'doutora': ['dra'],
  'dr': ['doutor'],
  'dra': ['doutora'],
  'santo': ['sto', 'st'],
  'santa': ['sta', 'st'],
  'sto': ['santo', 'st'],
  'sta': ['santa', 'st'],
  'st': ['santo', 'santa', 'sto', 'sta'],
  'sao': ['st', 'sto'],
  'colegio': ['col', 'escola', 'colegio'],
  'col': ['colegio'],
  'escola': ['ee', 'emef', 'emei', 'cei', 'ceu', 'colegio', 'escola', 'esc'],
  'ee': ['escola', 'estadual', 'estaduais'],
  'emef': ['escola', 'municipal'],
  'emei': ['escola', 'infantil'],
  'cei': ['escola', 'creche', 'infantil'],
  'rua': ['r'],
  'r': ['rua'],
  'avenida': ['av'],
  'av': ['avenida'],
  'praca': ['prc', 'pza', 'pc'],
  'alameda': ['al'],
  'saraiva': ['rafael', 'saraiva', '44077'],
  'passadore': ['nina', 'passadore', '4407']
};

// Words to ignore when parsing question context or generic filler
const FILLER_QUESTION_WORDS = new Set([
  'qual', 'quais', 'onde', 'votos', 'votacao', 'tem', 'para', 'com', 'que', 'quem',
  'sob', 'sobre', 'me', 'fale', 'diz', 'mostrar', 'sao', 'paulo', 'sp', 'como',
  'quantos', 'quanto', 'ficam', 'fica', 'teve', 'pontuou', 'obteve', 'resultados',
  'resultado', 'informacao', 'informacoes', 'dados'
]);

// Generic school, address, preposition, and title/honorific descriptor words
const GENERIC_DESCRIPTORS = new Set([
  // School / Educational Descriptors
  'escola', 'escolas', 'esc',
  'colegio', 'colegios', 'coleg', 'col',
  'ee', 'emef', 'emei', 'cei', 'ceu', 'etec', 'fatec', 'senai', 'senac', 'ciep',
  'unidade', 'local', 'votacao', 'predio', 'bloco', 'educacional', 'instituto', 'centro',
  // Prepositions & Articles
  'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'com', 'por', 'para',
  // Address & Location Descriptors
  'rua', 'r', 'avenida', 'av', 'praca', 'prc', 'pza', 'pc', 'alameda', 'al',
  'rodovia', 'rod', 'estrada', 'est', 'bairro', 'zona', 'secao', 'distrito', 'municipio', 'cidade',
  // Common Titles / Honorifics
  'padre', 'pe', 'p',
  'prof', 'professor', 'professora', 'profa',
  'dr', 'dra', 'doutor', 'doutora',
  'santo', 'santa', 'sto', 'sta', 'st', 'sao',
  'dom', 'dona',
  'presidente', 'pres', 'marechal', 'general', 'brigadeiro', 'almirante', 'coronel', 'major', 'capitao',
  'tenente', 'sargento', 'vereador', 'deputado', 'governador', 'prefeito', 'ministro',
  'pastor', 'bispo', 'irma', 'irmao', 'maestro', 'maestra', 'governo'
]);

/**
 * Calculates Levenshtein Distance between two normalized string tokens.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalizes text for accent-insensitive, punctuation-insensitive, case-insensitive searching.
 * e.g. "Rua Maria Cândida, 293 - Apt. 4" -> "rua maria candida 293 apt 4"
 */
export function normalizeForSearch(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if queryToken matches targetToken with typo tolerance (Levenshtein) or synonym expansion.
 */
export function matchesTokenWithFuzzy(queryToken: string, targetToken: string): { matches: boolean; score: number } {
  if (queryToken === targetToken) {
    return { matches: true, score: 100 };
  }

  // Synonym check (direct and reverse)
  const syns = SYNONYMS[queryToken];
  if (syns && syns.includes(targetToken)) {
    return { matches: true, score: 90 };
  }
  const revSyns = SYNONYMS[targetToken];
  if (revSyns && revSyns.includes(queryToken)) {
    return { matches: true, score: 90 };
  }

  // Target token contains queryToken as prefix or substring (ONLY if queryToken is at least 3 or 4 chars)
  if (queryToken.length >= 3 && targetToken.startsWith(queryToken)) {
    return { matches: true, score: 85 };
  }
  if (queryToken.length >= 4 && targetToken.includes(queryToken)) {
    return { matches: true, score: 70 };
  }

  // Typo tolerance (Levenshtein) for tokens >= 4 characters
  const len = queryToken.length;
  if (len >= 4 && targetToken.length >= 4 && /^[a-z]+$/.test(queryToken) && /^[a-z]+$/.test(targetToken)) {
    const maxAllowedDist = len >= 7 ? 2 : 1;
    if (Math.abs(targetToken.length - len) <= maxAllowedDist) {
      const dist = levenshteinDistance(queryToken, targetToken);
      if (dist <= maxAllowedDist) {
        return { matches: true, score: 80 - dist * 15 };
      }
    }
  }

  return { matches: false, score: 0 };
}

/**
 * Computes a numeric relevance score for target fields given a search query.
 * Higher score = higher relevance.
 * Returns 0 if the item is not a match.
 */
export type SearchTargetInput =
  | (string | number | undefined | null)[]
  | {
      primary?: (string | number | undefined | null)[];
      secondary?: (string | number | undefined | null)[];
      tertiary?: (string | number | undefined | null)[];
    };

/**
 * Computes a numeric relevance score for target fields given a search query.
 * Gives heavy priority/weight to primary name fields (e.g., school/local name)
 * so that entity names rank above street address matches.
 * Higher score = higher relevance.
 * Returns 0 if the item is not a match.
 */
export function scoreSearchMatch(
  targetInput: SearchTargetInput,
  searchInput: string
): number {
  if (!searchInput) return 100;
  const rawNormalizedQuery = normalizeForSearch(searchInput);
  if (!rawNormalizedQuery) return 100;

  const rawTokens = rawNormalizedQuery.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return 100;

  // Extract primary, secondary, and tertiary fields
  let primaryList: (string | number | undefined | null)[] = [];
  let secondaryList: (string | number | undefined | null)[] = [];
  let tertiaryList: (string | number | undefined | null)[] = [];

  if (Array.isArray(targetInput)) {
    // Legacy array input: first 2 items are primary, next items are secondary
    primaryList = targetInput.slice(0, 2);
    secondaryList = targetInput.slice(2);
  } else if (targetInput && typeof targetInput === 'object') {
    primaryList = targetInput.primary || [];
    secondaryList = targetInput.secondary || [];
    tertiaryList = targetInput.tertiary || [];
  }

  const normPrimary = primaryList.map(t => normalizeForSearch(t)).filter(Boolean).join(' ');
  const normSecondary = secondaryList.map(t => normalizeForSearch(t)).filter(Boolean).join(' ');
  const normTertiary = tertiaryList.map(t => normalizeForSearch(t)).filter(Boolean).join(' ');

  const combinedTarget = `${normPrimary} ${normSecondary} ${normTertiary}`.replace(/\s+/g, ' ').trim();
  if (!combinedTarget) return 0;

  let totalScore = 0;

  // 1. Exact full phrase match bonus
  if (normPrimary && normPrimary.includes(rawNormalizedQuery)) {
    totalScore += 3000 + (rawNormalizedQuery.length * 10);
  } else if (combinedTarget.includes(rawNormalizedQuery)) {
    totalScore += 800 + (rawNormalizedQuery.length * 5);
  }

  // Clean filler question words unless query is ONLY filler words
  let activeTokens = rawTokens.filter(t => !FILLER_QUESTION_WORDS.has(t));
  if (activeTokens.length === 0) activeTokens = rawTokens;

  // Identify numbers in query (e.g. street numbers "293", zone "257", TSE code)
  const queryNumbers = activeTokens.filter(t => /^\d+$/.test(t));
  const textTokens = activeTokens.filter(t => !/^\d+$/.test(t));

  const properTokens = textTokens.filter(t => !GENERIC_DESCRIPTORS.has(t));
  const descriptorTokens = textTokens.filter(t => GENERIC_DESCRIPTORS.has(t));

  // 2. Number matching rule
  if (queryNumbers.length > 0) {
    let numberMatchedCount = 0;
    for (const num of queryNumbers) {
      const numRegex = new RegExp(`(?:^|\\D)${num}(?:\\D|$)`);
      if (numRegex.test(combinedTarget)) {
        numberMatchedCount++;
        totalScore += 500;
      }
    }
    // Only return 0 if the query consisted ONLY of numbers and none matched
    if (textTokens.length === 0 && numberMatchedCount === 0) {
      return 0;
    }
  }

  // Helper to check token match across string
  const checkTokenInString = (tok: string, targetStr: string): number => {
    if (!targetStr) return 0;
    const tokens = targetStr.split(/\s+/).filter(Boolean);
    let maxS = 0;
    for (const tTok of tokens) {
      const { matches, score } = matchesTokenWithFuzzy(tok, tTok);
      if (matches && score > maxS) {
        maxS = score;
      }
    }
    return maxS;
  };

  // 3. Proper name tokens (e.g. 'anchieta' in 'Padre Anchieta')
  if (properTokens.length > 0) {
    let matchedProperCount = 0;

    for (const pTok of properTokens) {
      const scoreInPrim = checkTokenInString(pTok, normPrimary);
      const scoreInSec = checkTokenInString(pTok, normSecondary);
      const scoreInTert = checkTokenInString(pTok, normTertiary);

      if (scoreInPrim > 0) {
        matchedProperCount++;
        totalScore += scoreInPrim + 1500;
      } else if (scoreInSec > 0) {
        matchedProperCount++;
        totalScore += scoreInSec + 300;
      } else if (scoreInTert > 0) {
        matchedProperCount++;
        totalScore += scoreInTert + 100;
      }
    }

    // Must match AT LEAST ONE proper name token if query contains proper names!
    if (matchedProperCount === 0) {
      return 0;
    }

    if (matchedProperCount === properTokens.length) {
      totalScore += 400;
    }
  }

  // 4. Generic descriptor / title tokens (e.g. 'padre', 'escola', 'emei', 'rua')
  if (descriptorTokens.length > 0) {
    let matchedDescCount = 0;

    for (const dTok of descriptorTokens) {
      const scoreInPrim = checkTokenInString(dTok, normPrimary);
      const scoreInSec = checkTokenInString(dTok, normSecondary);
      const scoreInTert = checkTokenInString(dTok, normTertiary);

      if (scoreInPrim > 0) {
        matchedDescCount++;
        totalScore += scoreInPrim + 400;
      } else if (scoreInSec > 0) {
        matchedDescCount++;
        totalScore += scoreInSec + 80;
      } else if (scoreInTert > 0) {
        matchedDescCount++;
        totalScore += scoreInTert + 20;
      }
    }

    // If query consisted ONLY of descriptors (e.g. 'Padre' or 'Escola'), at least one must match
    if (properTokens.length === 0 && matchedDescCount === 0) {
      return 0;
    }
  }

  return Math.max(0, totalScore);
}

/**
 * Checks if searchInput matches target fields with maximum flexibility and typo tolerance.
 */
export function matchesSearchTerm(
  targetFields: (string | number | undefined | null)[],
  searchInput: string
): boolean {
  return scoreSearchMatch(targetFields, searchInput) > 0;
}

/**
 * Helper to filter and sort an array of items by search relevance score descending.
 */
export function filterAndSortBySearch<T>(
  items: T[],
  getTargetFieldsFn: (item: T) => (string | number | undefined | null)[],
  searchInput: string
): T[] {
  if (!searchInput || !searchInput.trim()) return items;

  const scored = items.map(item => {
    const fields = getTargetFieldsFn(item);
    const score = scoreSearchMatch(fields, searchInput);
    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}
