const fs = require('fs');
let content = fs.readFileSync('src/tabs/PurchaseTab.tsx', 'utf-8');

content = content.replace(
  /<NewProductModal\s+mode="purchase"/g,
  '<NewProductModal \n        mode="catalog"'
);

fs.writeFileSync('src/tabs/PurchaseTab.tsx', content);
console.log("Patched PurchaseTab to use catalog mode");
