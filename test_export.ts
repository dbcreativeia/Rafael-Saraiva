import { leadsConsolidator } from './leadsConsolidation.js';

(async () => {
  try {
    // initialize cache by calling a getter
    console.log("Loading leads...");
    const summary = leadsConsolidator.getSummary();
    console.log("Total leads loaded:", summary.totalUniqueLeads);
    
    console.log("Exporting to CSV...");
    const buffer = leadsConsolidator.exportLeads({}, 'csv');
    console.log("Export successful, buffer size:", buffer.length);
  } catch (e) {
    console.error("Export failed:", e);
  }
  process.exit(0);
})();
