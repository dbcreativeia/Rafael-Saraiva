import { leadsConsolidator } from './leadsConsolidation.js';

(async () => {
  await leadsConsolidator.refreshFromDatabase();
  console.log("Done.");
  process.exit(0);
})();
