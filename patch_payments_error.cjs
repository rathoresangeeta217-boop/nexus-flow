const fs = require('fs');
let content = fs.readFileSync('src/lib/payments.ts', 'utf8');
content = content.replace(
  `}, (error) => { console.warn('Firestore snapshot error in src/lib/payments.ts:', error); });`,
  `}, (error) => { console.warn('Firestore snapshot error in src/lib/payments.ts:', error); callback([]); });`
);
fs.writeFileSync('src/lib/payments.ts', content);
