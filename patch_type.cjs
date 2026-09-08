const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

code = code.replace(/spHeatmapPoints: any\[\];/g, `spHeatmapPoints: any[];
    isRefreshing?: boolean;
    isReady?: boolean;
    refreshMessage?: string;`);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
