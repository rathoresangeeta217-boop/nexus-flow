const fs = require('fs');
let content = fs.readFileSync('src/lib/quotes.ts', 'utf8');
content = content.replace(
  `}, (error) => { console.warn('Firestore snapshot error', error); });`,
  `}, (error) => { console.warn('Firestore snapshot error', error); callback([]); });`
);
fs.writeFileSync('src/lib/quotes.ts', content);
