const fs = require('fs');
let code = fs.readFileSync('leadsConsolidation.ts', 'utf8');

code = code.replace(/setTimeout\(\(\) => \{\n\s*this\.refreshFromDatabase\(\)\.catch\(err => console\.error\('Auto startup refresh error:', err\)\);\n\s*\}, 1500\);/g, `setTimeout(() => {\n        this.refreshFromDatabase().catch(err => console.error('Auto startup refresh error:', err));\n      }, 15000);`);

code = code.replace(/const limit = 50000;/g, `const limit = 15000;`);

code = code.replace(/offset \+= limit;\n\s*\} catch \(err\) \{/g, `offset += limit;\n          await new Promise(r => setTimeout(r, 100)); // Yield to event loop\n        } catch (err) {`);

fs.writeFileSync('leadsConsolidation.ts', code);
console.log('Fixed leadsConsolidation.ts');
