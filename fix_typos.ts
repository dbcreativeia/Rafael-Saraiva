import { getDbConnection } from "./db.ts";
import { leadsConsolidator } from "./leadsConsolidation.ts";
import fs from "fs";

// Levenshtein distance function
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1) // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const UF_MAP: Record<number, string> = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF"
};

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Loading official cities...");
  const rawText = fs.readFileSync("public/municipios.json", "utf-8").replace(/^\uFEFF/, "");
  const mun = JSON.parse(rawText);
  
  // Create map of state -> array of normalized official cities
  const officialCitiesByState: Record<string, { norm: string, original: string }[]> = {};
  for (const m of mun) {
    const uf = UF_MAP[m.codigo_uf];
    if (uf) {
      if (!officialCitiesByState[uf]) officialCitiesByState[uf] = [];
      const norm = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      officialCitiesByState[uf].push({ norm, original: m.nome });
    }
  }

  console.log("Fetching distinct cities typed by users...");
  const [rows] = await db.query(`SELECT DISTINCT cidade, estado FROM imported_leads WHERE cidade IS NOT NULL AND cidade != "" AND estado IS NOT NULL`);
  
  const correctionMap = new Map<string, string>(); // "oldCity|UF" -> "CorrectCity"
  
  let correctionsFound = 0;
  for (const row of rows as any[]) {
    const uf = row.estado;
    const rawCity = row.cidade;
    const normTyped = rawCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (!officialCitiesByState[uf]) continue;
    
    const officials = officialCitiesByState[uf];
    
    // Exact match first
    let bestMatch = officials.find(o => o.norm === normTyped);
    
    if (!bestMatch) {
      // Find closest
      let minDistance = 999;
      for (const off of officials) {
        const dist = levenshtein(normTyped, off.norm);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = off;
        }
      }
      
      // Accept corrections if the distance is small enough (e.g. <= 2 chars difference for short names, <= 3 for long)
      const allowedDistance = normTyped.length > 8 ? 3 : (normTyped.length > 5 ? 2 : 1);
      if (bestMatch && minDistance <= allowedDistance) {
        correctionMap.set(`${rawCity}|${uf}`, bestMatch.original);
        correctionsFound++;
      } else if (normTyped === "sao paulo" || normTyped === "s paulo" || normTyped === "spo" || normTyped === "s. paulo") {
         // hardcode biggest offender just in case
         if (uf === "SP") {
           correctionMap.set(`${rawCity}|SP`, "São Paulo");
           correctionsFound++;
         }
      }
    } else {
      // It perfectly matches (ignoring accents). But does it match the casing/accents exactly?
      if (rawCity !== bestMatch.original) {
        correctionMap.set(`${rawCity}|${uf}`, bestMatch.original);
        correctionsFound++;
      }
    }
  }

  console.log(`Found ${correctionsFound} distinct typo versions to fix out of ${(rows as any[]).length} pairs.`);

  if (correctionMap.size > 0) {
    const updates = Array.from(correctionMap.entries());
    const chunkSize = 1000;
    let queries = 0;
    console.log("Updating database in chunks...");
    
    // To speed up, we update all users that have this exact string + uf
    for (const [key, correctCity] of updates) {
      const [rawCity, uf] = key.split("|");
      await db.query(`UPDATE imported_leads SET cidade = ? WHERE cidade = ? AND estado = ?`, [correctCity, rawCity, uf]);
      queries++;
      if (queries % 500 === 0) console.log(`Processed ${queries} updates...`);
    }
    
    console.log("Database cities corrected!");
    console.log("Triggering leadsConsolidation refresh...");
    await leadsConsolidator.refreshFromDatabase();
    console.log("Done.");
  }
  process.exit(0);
})();
