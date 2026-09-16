const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf-8');

content = content.replace(
  "onClick={() => setActiveTab('Orders')}",
  "onClick={() => { window.history.pushState({}, '', '/admin'); setActiveTab('Products'); }}"
);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched admin button");
