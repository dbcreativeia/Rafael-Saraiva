import fs from "fs";
let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");
content = content.replace(
  /isMultiAction: false,\s*isSuperSupporter: false,/g,
  "isMultiAction: !!row.is_multi_action,\n        isSuperSupporter: !!row.is_super_supporter,"
);
fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated mapImportedRows!");
