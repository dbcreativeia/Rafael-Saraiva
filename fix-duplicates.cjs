const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// Current logic:
//         // Merge into existing lead
//         const existing = leads[targetIdx];
//         existing.actions.push(action);
//         existing.totalActions = existing.actions.length;

const oldMergeLogic = `        // Merge into existing lead
        const existing = leads[targetIdx];
        existing.actions.push(action);
        existing.totalActions = existing.actions.length;`;

const newMergeLogic = `        // Merge into existing lead
        const existing = leads[targetIdx];
        const isDuplicate = existing.actions.some(a => a.sourceCategory === action.sourceCategory);
        if (!isDuplicate) {
          existing.actions.push(action);
          existing.totalActions = existing.actions.length;
        }`;

content = content.replace(oldMergeLogic, newMergeLogic);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
