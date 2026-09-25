const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

// Add mode to props
content = content.replace(
  "  vendors: any[];",
  "  vendors: any[];\n  mode?: 'purchase' | 'catalog';"
);

content = content.replace(
  "vendors, initialData }: NewProductModalProps) {",
  "vendors, initialData, mode = 'catalog' }: NewProductModalProps) {"
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal props");
