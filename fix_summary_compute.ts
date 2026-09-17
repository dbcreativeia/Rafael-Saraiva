import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

const searchStr = `        const allCampaigns = Array.from(new Set([...defaultCamps, ...(this.summary.campaignOptions || []), ...dbCamps]));
        this.summary.campaignOptions = allCampaigns;
      }`;
      
const replaceStr = `        const allCampaigns = Array.from(new Set([...defaultCamps, ...(this.summary.campaignOptions || []), ...dbCamps]));
        this.summary.campaignOptions = allCampaigns;

        this.updateRefreshState("Atualizando opções de cidades e estados...");
        const [cidades] = await db.query(\`
          SELECT cidade as name, estado, count(*) as count 
          FROM imported_leads 
          WHERE cidade IS NOT NULL AND cidade != "" 
          GROUP BY cidade, estado 
          ORDER BY count DESC 
        \`);
        
        const [estados] = await db.query(\`
          SELECT estado, count(*) as count 
          FROM imported_leads 
          WHERE estado IS NOT NULL AND estado != "" 
          GROUP BY estado 
          ORDER BY count DESC 
        \`);

        this.summary.cityOptions = cidades as any;
        this.summary.stateOptions = (estados as any).map((e: any) => e.estado);
      }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync("leadsConsolidation.ts", content);
  console.log("Updated leadsConsolidation.ts!");
} else {
  console.log("Could not find the exact string.");
}
