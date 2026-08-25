const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// 1. superSupportersCount KPI
content = content.replace(
  "return consolidatedLeads.filter(l => l.totalActions >= 3).length;",
  "return consolidatedLeads.filter(l => l.distinctCampaigns.length >= 3).length;"
);

// 2. Filter logic
content = content.replace(
  "if (multiActionFilter === 'super' && lead.totalActions < 3) {",
  "if (multiActionFilter === 'super' && lead.distinctCampaigns.length < 3) {"
);

// 3. Table rendering badges
content = content.replace(
  "{lead.totalActions >= 3 ? (",
  "{lead.distinctCampaigns.length >= 3 ? ("
);

// 4. Table column color
content = content.replace(
  "lead.totalActions >= 3\\n                                ? 'bg-purple-600",
  "lead.distinctCampaigns.length >= 3\\n                                ? 'bg-purple-600"
);

// Regex approach for table column color because of whitespace
content = content.replace(
  /lead\.totalActions >= 3\s*\?\s*'bg-purple-600/g,
  "lead.distinctCampaigns.length >= 3 ? 'bg-purple-600"
);

// 5. Modal badge
content = content.replace(
  "{selectedLead.totalActions >= 3 ? (",
  "{selectedLead.distinctCampaigns.length >= 3 ? ("
);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
