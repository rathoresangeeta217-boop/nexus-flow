const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

content = content.replace(
  "      console.error(e);\n    } finally {",
  "      console.error(e);\n      alert('Failed to auto-write details: ' + (e.message || 'Unknown error'));\n    } finally {"
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal error handling");
