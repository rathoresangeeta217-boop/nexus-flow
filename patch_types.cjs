const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  `export type TabName = 'Orders' | 'Production' | 'Dispatched' | 'Installation' | 'Payments' | 'Purchase' | 'Analytics' | 'Users' | 'Quotations';`,
  `export type TabName = 'Orders' | 'Production' | 'Dispatched' | 'Installation' | 'Payments' | 'Purchase' | 'Analytics' | 'Users' | 'Quotations' | 'Storefront';`
);

fs.writeFileSync('src/types.ts', content);
