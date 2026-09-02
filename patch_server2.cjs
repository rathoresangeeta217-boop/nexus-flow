const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "const config = JSON.parse(require('fs').readFileSync('./firebase-applet-config.json', 'utf-8'));",
  "const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));"
);

fs.writeFileSync(file, content);
