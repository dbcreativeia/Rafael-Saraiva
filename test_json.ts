import fs from "fs";
const summary = JSON.parse(fs.readFileSync("leads_summary.json", "utf8"));
console.log(summary.cityOptions.slice(-30));
