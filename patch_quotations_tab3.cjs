const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf8');

content = content.replace(
  `onClick={() => setActiveTab?.('Purchase')}`,
  `onClick={() => window.open('https://your-ecommerce-website.com/products', '_blank')}`
);

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
console.log("Patched QuotationsTab.tsx to open external website");
