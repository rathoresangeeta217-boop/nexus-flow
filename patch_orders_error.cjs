const fs = require('fs');
let content = fs.readFileSync('src/lib/orders.ts', 'utf8');

const targetError = `      }, (error) => {
        console.warn("Error fetching orders:", error);
      });`;

const newError = `      }, (error) => {
        console.warn("Error fetching orders:", error);
        callback([]); // Unblock the UI if there is an error like Quota Exceeded
      });`;

content = content.replace(targetError, newError);
fs.writeFileSync('src/lib/orders.ts', content);
console.log("Patched orders error handler");
