import fs from "fs";
let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");
content = content.replace(/!!row\.is_multi_action/g, "false");
content = content.replace(/!!row\.is_super_supporter/g, "false");
fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Reverted globally.");
