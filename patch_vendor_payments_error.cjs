const fs = require('fs');
let content = fs.readFileSync('src/lib/vendorPayments.ts', 'utf8');
content = content.replace(
  `}, (error) => { console.warn('Firestore snapshot error in src/lib/vendorPayments.ts:', error); });`,
  `}, (error) => { console.warn('Firestore snapshot error in src/lib/vendorPayments.ts:', error); callback([]); });`
);
fs.writeFileSync('src/lib/vendorPayments.ts', content);
