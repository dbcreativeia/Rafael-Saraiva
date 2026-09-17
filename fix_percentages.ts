import fs from 'fs';
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf-8');

content = content.replace(
  '{summary ? ((summary.frequentLeadsCount / summary.totalUniqueLeads) * 100).toFixed(1) : "0"}%',
  '{totalUniqueLeads > 0 ? ((frequentLeadsCount / totalUniqueLeads) * 100).toFixed(1) : "0"}%'
);

content = content.replace(
  '{summary ? ((summary.superSupportersCount / summary.totalUniqueLeads) * 100).toFixed(3) : "0"}%',
  '{totalUniqueLeads > 0 ? ((superSupportersCount / totalUniqueLeads) * 100).toFixed(3) : "0"}%'
);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content, 'utf-8');
console.log("fixed percentages");
