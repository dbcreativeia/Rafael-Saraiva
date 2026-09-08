const fs = require('fs');
let content = fs.readFileSync('leadsConsolidation.ts', 'utf8');

// Change method signature
content = content.replace(
  "private saveToDiskCache() {",
  "private async saveToDiskCache(): Promise<void> {"
);

// Remove setImmediate and its closure
content = content.replace(
  "    setImmediate(async () => {\n      try {",
  "    try {"
);

// Fix the catch/finally block
content = content.replace(
  "        if (this.pendingDiskSave) {\n          this.saveToDiskCache();\n        }\n      }\n    });",
  "        if (this.pendingDiskSave) {\n          this.saveToDiskCache().catch(console.error);\n        }\n      }"
);

// Find refreshFromDatabase calls and await them
content = content.replace(
  "      this.saveToDiskCache();\n    } catch (err) {",
  "      await this.saveToDiskCache();\n    } catch (err) {"
);

fs.writeFileSync('leadsConsolidation.ts', content);
