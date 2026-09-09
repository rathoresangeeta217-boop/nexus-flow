const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf8');

content = content.replace(
  `onClick={() => window.open('https://your-ecommerce-website.com/products', '_blank')}`,
  `onClick={() => setActiveTab?.('Storefront')}`
);

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
