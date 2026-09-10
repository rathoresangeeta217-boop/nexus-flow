const fs = require('fs');
let content = fs.readFileSync('src/lib/projects.ts', 'utf8');
content = content.replace(
  `      }, (error) => {
        console.warn("Error fetching projects:", error);
      });`,
  `      }, (error) => {
        console.warn("Error fetching projects:", error);
        callback([]);
      });`
);
fs.writeFileSync('src/lib/projects.ts', content);
