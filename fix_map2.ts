import fs from "fs";
let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");
const target = `  private mapImportedRows(rows: any[]): ConsolidatedLead[] {
    return (rows || []).map((row: any) => {`;

const searchStr = `        estado: rowEstado,
        totalActions: isColdImportedBase(campaignName) ? 0 : 1,
        isMultiAction: false,
        isSuperSupporter: false,
        distinctCampaigns: [campaignName],`;

const replaceStr = `        estado: rowEstado,
        totalActions: row.is_super_supporter ? 3 : (row.is_multi_action ? 2 : (isColdImportedBase(campaignName) ? 0 : 1)),
        isMultiAction: !!row.is_multi_action,
        isSuperSupporter: !!row.is_super_supporter,
        distinctCampaigns: [campaignName],`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated mapImportedRows properly.");
