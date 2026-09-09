const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { QuotationsTab }')) {
  content = content.replace(
    `import { PurchaseTab } from './tabs/PurchaseTab';`,
    `import { PurchaseTab } from './tabs/PurchaseTab';\nimport { QuotationsTab } from './tabs/QuotationsTab';`
  );
}

content = content.replace(
  `{currentTab === 'Purchase' && (profile.role === 'super_admin' || profile.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}`,
  `{currentTab === 'Purchase' && (profile.role === 'super_admin' || profile.role === 'admin') && <PurchaseTab searchQuery={searchQuery} />}\n            {currentTab === 'Quotations' && (profile.role === 'super_admin' || profile.role === 'admin') && <QuotationsTab searchQuery={searchQuery} />}`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx for Quotations");
