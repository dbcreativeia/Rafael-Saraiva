const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { motion } from 'motion/react';\\nimport { Helmet } from 'react-helmet-async'; from 'motion/react';",
  "import { motion } from 'motion/react';\\nimport { Helmet } from 'react-helmet-async';"
);
// just to be sure:
code = code.replace("import { Helmet } from 'react-helmet-async'; from 'motion/react';", "import { Helmet } from 'react-helmet-async';");

fs.writeFileSync('src/App.tsx', code);
