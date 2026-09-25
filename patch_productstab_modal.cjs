const fs = require('fs');
let content = fs.readFileSync('src/tabs/ProductsTab.tsx', 'utf-8');

content = content.replace(
  "<NewProductModal \\n        isOpen={isModalOpen}",
  "<NewProductModal \\n        mode=\"catalog\"\\n        isOpen={isModalOpen}"
);

fs.writeFileSync('src/tabs/ProductsTab.tsx', content);
console.log("Patched ProductsTab");
