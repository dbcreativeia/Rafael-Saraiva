const fs = require('fs');
let code = fs.readFileSync('leadsConsolidation.ts', 'utf8');

code = code.replace(/private isRefreshing = false;\n  private refreshMessage = "";/, 'private isRefreshing = false;\n  private refreshMessage = "";\n  private refreshPending = false;');

code = code.replace(/if \(this\.isRefreshing\) return;/g, `if (this.isRefreshing) {
      this.refreshPending = true;
      this.updateRefreshState("Aguardando processo atual terminar para reiniciar...");
      return;
    }
    this.refreshPending = false;`);

code = code.replace(/this\.isRefreshing = false;\n\s*\}\n\s*\}\n\n\s*private computeSummary\(\) \{/g, `this.isRefreshing = false;
      if (this.refreshPending) {
        this.refreshFromDatabase().catch(console.error);
      }
    }
  }

  private computeSummary() {`);

fs.writeFileSync('leadsConsolidation.ts', code);
console.log('patched leadsConsolidation queueing');
