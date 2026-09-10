const fs = require('fs');
let content = fs.readFileSync('src/lib/installers.ts', 'utf8');

const targetError = `}, (error) => { console.warn('Firestore snapshot error in src/lib/installers.ts:', error); });`;
const newError = `}, (error) => { console.warn('Firestore snapshot error in src/lib/installers.ts:', error); callback([]); });`;

content = content.replace(targetError, newError);
fs.writeFileSync('src/lib/installers.ts', content);
console.log("Patched installers error handler");
