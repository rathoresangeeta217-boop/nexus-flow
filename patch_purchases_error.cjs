const fs = require('fs');
let content = fs.readFileSync('src/lib/purchases.ts', 'utf8');
content = content.replace(
  `      }, (error) => {
        console.warn("Error fetching purchases:", error);
      });`,
  `      }, (error) => {
        console.warn("Error fetching purchases:", error);
        callback([]);
      });`
);
fs.writeFileSync('src/lib/purchases.ts', content);
