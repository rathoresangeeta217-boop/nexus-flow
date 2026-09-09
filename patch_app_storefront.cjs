const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { StorefrontTab }')) {
  content = content.replace(
    `import { QuotationsTab } from './tabs/QuotationsTab';`,
    `import { QuotationsTab } from './tabs/QuotationsTab';\nimport { StorefrontTab } from './tabs/StorefrontTab';`
  );
}

if (!content.includes(`currentTab === 'Storefront'`)) {
  content = content.replace(
    `{currentTab === 'Quotations' && (profile.role === 'super_admin' || profile.role === 'admin') && <QuotationsTab searchQuery={searchQuery} setActiveTab={setActiveTab} />}`,
    `{currentTab === 'Quotations' && (profile.role === 'super_admin' || profile.role === 'admin') && <QuotationsTab searchQuery={searchQuery} setActiveTab={setActiveTab} />}\n            {currentTab === 'Storefront' && <StorefrontTab setActiveTab={setActiveTab} />}`
  );
}

fs.writeFileSync('src/App.tsx', content);
