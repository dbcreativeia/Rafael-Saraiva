const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');
content = content.replace(
  "const [response, citizensResponse, petitionsResponse] = await Promise.all([",
  "const [response, citizensResponse, petitionsResponse, jogoUsersResponse] = await Promise.all(["
);
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
