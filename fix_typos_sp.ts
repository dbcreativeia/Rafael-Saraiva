import { getDbConnection } from "./db.ts";
import { leadsConsolidator } from "./leadsConsolidation.ts";
import fs from "fs";

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

  const rawText = fs.readFileSync("public/municipios.json", "utf-8").replace(/^\uFEFF/, "");
  const mun = JSON.parse(rawText);
  
  const officialCitiesByState: Record<string, { norm: string, original: string }[]> = {};
  for (const m of mun) {
    const uf = UF_MAP[m.codigo_uf];
    if (uf) {
      if (!officialCitiesByState[uf]) officialCitiesByState[uf] = [];
      const norm = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      officialCitiesByState[uf].push({ norm, original: m.nome });
    }
  }

  const [rows] = await db.query(`SELECT DISTINCT cidade, estado FROM imported_leads WHERE cidade IS NOT NULL AND cidade != ""`);
  
  const correctionMap = new Map<string, { city: string, uf: string }>(); 
  
  for (const row of rows as any[]) {
    const uf = row.estado;
    const rawCity = row.cidade;
    const normTyped = rawCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // First, verify if it's official in its current state
    if (officialCitiesByState[uf]) {
        const isOfficial = officialCitiesByState[uf].find(o => o.norm === normTyped);
        if (isOfficial) {
            // Check exact casing
            if (rawCity !== isOfficial.original) {
                correctionMap.set(`${rawCity}|${uf}`, { city: isOfficial.original, uf });
            }
            continue;
        }
    }
    
    // If not official in its current state, let's search all states to see if they typed the correct city for another state!
    let foundCorrectState = null;
    let foundCorrectCity = null;
    for (const testUf of Object.keys(officialCitiesByState)) {
       const match = officialCitiesByState[testUf].find(o => o.norm === normTyped);
       if (match) {
           foundCorrectState = testUf;
           foundCorrectCity = match.original;
           break;
       }
    }
    
    if (foundCorrectState && foundCorrectCity) {
        // We found that this city actually belongs to another state officially!
        correctionMap.set(`${rawCity}|${uf}`, { city: foundCorrectCity, uf: foundCorrectState });
    }
  }

  console.log(`Found ${correctionMap.size} distinct misplaced cities to reallocate.`);

  if (correctionMap.size > 0) {
    const updates = Array.from(correctionMap.entries());
    console.log("Updating database...");
    let queries = 0;
    
    for (const [key, correction] of updates) {
      const [rawCity, uf] = key.split("|");
      await db.query(`UPDATE imported_leads SET cidade = ?, estado = ? WHERE cidade = ? AND estado = ?`, [correction.city, correction.uf, rawCity, uf]);
      queries++;
    }
    
    console.log("Database cities corrected!");
    console.log("Triggering leadsConsolidation refresh...");
    await leadsConsolidator.refreshFromDatabase();
    console.log("Done.");
  }
  process.exit(0);
})();
