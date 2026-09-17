import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

// 1. Add import for autoCorrectCity
if (!content.includes("autoCorrectCity")) {
  content = content.replace(
    "import { fixMojibake } from './utils.ts';", 
    "import { fixMojibake } from './utils.ts';\nimport { autoCorrectCity } from './cityCorrector.ts';"
  );
}

// 2. Modify the normalizeEstado function OR just replace all instances
const searchStr = `const estado = normalizeEstado(r.estado, cidade, r.cep);`;
const replaceStr = `let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }`;

content = content.replaceAll(searchStr, replaceStr);

const searchStrSingle = `const estado = normalizeEstado(leadData.estado, cidade, leadData.cep);`;
const replaceStrSingle = `let estado = normalizeEstado(leadData.estado, cidade, leadData.cep);
    if (cidade && estado) {
      const corrected = autoCorrectCity(cidade, estado);
      cidade = corrected.city;
      estado = corrected.uf;
    }`;
    
content = content.replaceAll(searchStrSingle, replaceStrSingle);

fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated leadsConsolidation.ts!");
