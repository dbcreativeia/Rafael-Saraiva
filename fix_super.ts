import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

const searchStr = `  const hasFullData = !!(lead.whatsapp && (lead.cep || lead.endereco));
  lead.isSuperSupporter = (
    totalInteractions >= 3 ||
    distinctSources.size >= 3 ||
    (hasMultipleSources && hasFullData && totalInteractions >= 2)
  );`;
  
const replaceStr = `  const hasFullData = !!(lead.whatsapp && (lead.cep || lead.endereco));
  lead.isSuperSupporter = (
    totalInteractions >= 3 ||
    distinctSources.size >= 3
  );`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync("leadsConsolidation.ts", content);
  console.log("Updated leadsConsolidation.ts!");
} else {
  console.log("Could not find the exact string.");
}
