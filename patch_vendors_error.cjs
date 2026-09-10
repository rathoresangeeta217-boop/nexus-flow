const fs = require('fs');
let content = fs.readFileSync('src/lib/vendors.ts', 'utf8');
content = content.replace(
  `      }, (error) => {
        console.warn("Error fetching vendors:", error);
      });`,
  `      }, (error) => {
        console.warn("Error fetching vendors:", error);
        callback([]);
      });`
);
fs.writeFileSync('src/lib/vendors.ts', content);
