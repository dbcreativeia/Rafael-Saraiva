const fs = require('fs');
let content = fs.readFileSync('leadsConsolidation.ts', 'utf8');

content = content.replace(
  "// Write to disk cache asynchronously\n      this.saveToDiskCache();",
  "// Write to disk cache and wait so Cloud Run stays awake\n      await this.saveToDiskCache();"
);

fs.writeFileSync('leadsConsolidation.ts', content);
