const fs = require('fs');
let content = fs.readFileSync('src/tabs/PurchaseTab.tsx', 'utf-8');

content = content.replace(
  "<NewProductModal \\n        isOpen={isNewProductModalOpen}",
  "<NewProductModal \\n        mode=\"purchase\"\\n        isOpen={isNewProductModalOpen}"
);
content = content.replace(
  "<NewProductModal \n        isOpen={isNewProductModalOpen}",
  "<NewProductModal \n        mode=\"purchase\"\n        isOpen={isNewProductModalOpen}"
);

fs.writeFileSync('src/tabs/PurchaseTab.tsx', content);
console.log("Patched PurchaseTab");
