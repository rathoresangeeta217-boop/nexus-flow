const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

content = content.replace(
  "                      onBlur={handleGenerateDescription}\n",
  ""
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
