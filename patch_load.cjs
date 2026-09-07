const fs = require('fs');

let content = fs.readFileSync('leadsConsolidation.ts', 'utf-8');

// Replace constructor logic
const constRegex = /constructor\(\) \{.*?this\.initMaps\(\);.*?const loaded = this\.loadFromDiskCache\(\);.*?if \(!loaded\) \{.*?setTimeout.*?this\.refreshFromDatabase.*?1500\);.*?}.*?}/s;
const newConst = `constructor() {
    this.initMaps();
    this.loadFromDiskCacheAsync().catch(err => console.error('Cache load error:', err));
  }`;
content = content.replace(constRegex, newConst);

// Change loadFromDiskCache to async
content = content.replace('private loadFromDiskCache(): boolean {', 'private async loadFromDiskCacheAsync(): Promise<boolean> {');
content = content.replace(/fs\.existsSync/g, 'fs.existsSync'); // existsSync is fine
content = content.replace(/fs\.readFileSync/g, 'await fs.promises.readFile');
content = content.replace(/return false;/g, 'this.refreshFromDatabase().catch(e=>console.error(e)); return false;');

// In loadFromDiskCacheAsync, replace synchronous legacy cache read
content = content.replace(/const content = await fs\.promises\.readFile\(CACHE_FILE, 'utf-8'\);/g, "const content = await fs.promises.readFile(CACHE_FILE, 'utf-8');");

fs.writeFileSync('leadsConsolidation.ts', content);
console.log('Patched constructor and loadFromDiskCache to be async');
