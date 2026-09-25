const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(
  "aiClient = new GoogleGenAI({ apiKey });",
  "aiClient = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });"
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts getAI");
