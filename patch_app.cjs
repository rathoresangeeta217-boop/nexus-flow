const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  "import { PurchaseTab } from './tabs/PurchaseTab';", 
  "import { PurchaseTab } from './tabs/PurchaseTab';\nimport { ProductsTab } from './tabs/ProductsTab';"
);

content = content.replace(
  "{currentTab === 'Purchase' && (profile.role === 'super_admin' || profile.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}",
  "{currentTab === 'Purchase' && (profile.role === 'super_admin' || profile.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}\n            {currentTab === 'Products' && (profile.role === 'super_admin' || profile.role === 'admin') && <ProductsTab searchQuery={searchQuery} />}"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
