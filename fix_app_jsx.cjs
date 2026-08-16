const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  '    <Footer />\n    </main>\n  );\n}',
  '    <Footer />\n    </main>\n    </>\n  );\n}'
);

fs.writeFileSync('src/App.tsx', code);
