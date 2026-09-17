import fs from "fs";

let content = fs.readFileSync("run_dedup.ts", "utf-8");
fs.writeFileSync("deduplicate_db.ts", content);
console.log("Renamed script to match task!");
