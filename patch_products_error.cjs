const fs = require('fs');
let content = fs.readFileSync('src/lib/products.ts', 'utf8');

const targetError = `      }, (error) => {
        console.warn("Error fetching products:", error);
      });`;

const newError = `      }, (error) => {
        console.warn("Error fetching products:", error);
        callback([]);
      });`;

content = content.replace(targetError, newError);
fs.writeFileSync('src/lib/products.ts', content);
console.log("Patched products error handler");
