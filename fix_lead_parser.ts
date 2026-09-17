import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

content = content.replace(
  /lead\.totalActions = Math\.max\(totalInteractions, distinctSources\.size\);/g,
  "lead.totalActions = distinctSources.size > 0 ? distinctSources.size : totalInteractions;"
);

content = content.replace(
  /lead\.isFrequent = \(totalInteractions >= 2 \|\| distinctSources\.size >= 2 \|\| distinctDates\.size >= 2\);/g,
  "lead.isFrequent = (distinctSources.size >= 2);"
);

content = content.replace(
  /lead\.isMultiAction = \(totalInteractions >= 3 \|\| distinctSources\.size >= 3 \|\| distinctDates\.size >= 3\);/g,
  "lead.isMultiAction = (distinctSources.size >= 3);"
);

content = content.replace(
  /lead\.isSuperSupporter = \(totalInteractions >= 5 \|\| distinctSources\.size >= 5 \|\| distinctDates\.size >= 5\);/g,
  "lead.isSuperSupporter = (distinctSources.size >= 5);"
);

content = content.replace(
  /totalActions: row\.is_super_supporter \? 5 : \(row\.is_multi_action \? 3 : \(row\.is_frequent \? 2 : \(isColdImportedBase\(campaignName\) \? 0 : 1\)\)\)/g,
  "totalActions: distinctCampaigns.length || 1"
);

fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated via Regex!");
