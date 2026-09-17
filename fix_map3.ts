import fs from "fs";
let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");
content = content.replace(
  "        totalActions: row.is_super_supporter ? 3 : (row.is_multi_action ? 2 : (isColdImportedBase(campaignName) ? 0 : 1)),",
  "        totalActions: row.is_super_supporter ? 5 : (row.is_multi_action ? 3 : (row.is_frequent ? 2 : (isColdImportedBase(campaignName) ? 0 : 1))),"
);
fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated mapImportedRows totalActions");
