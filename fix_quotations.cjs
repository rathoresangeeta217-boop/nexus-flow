const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf-8');

content = content.replace(
  "    </div>\n      <NewProductModal ",
  "      <NewProductModal "
);

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
