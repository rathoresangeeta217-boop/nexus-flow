const fs = require('fs');
let content = fs.readFileSync('src/lib/quotes.ts', 'utf8');
content = content.replace(
  `    callback(quotes);\n  });`,
  `    callback(quotes);\n  }, (error) => { console.warn('Firestore snapshot error', error); });`
);
fs.writeFileSync('src/lib/quotes.ts', content);
