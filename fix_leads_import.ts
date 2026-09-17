import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

// 1. Add import for autoCorrectCity
if (!content.includes("import { autoCorrectCity } from './cityCorrector.ts';")) {
  content = content.replace(
    "import { normalizeKey } from './utils.ts';", 
    "import { normalizeKey } from './utils.ts';\nimport { autoCorrectCity } from './cityCorrector.ts';"
  );
}

// 2. Modify processLead helper or loop where it sets up the final lead
const searchStr = `const estado = normalizeEstado(raw.estado || raw.state || raw.uf, cidade, raw.cep);`;
const replaceStr = `let estado = normalizeEstado(raw.estado || raw.state || raw.uf, cidade, raw.cep);
      
      if (cidade && estado) {
        const corrected = autoCorrectCity(cidade, estado);
        cidade = corrected.city;
        estado = corrected.uf;
      }
`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync("leadsConsolidation.ts", content);
  console.log("Updated leadsConsolidation.ts!");
} else {
  console.log("Could not find the exact line in leadsConsolidation.ts to replace.");
}

