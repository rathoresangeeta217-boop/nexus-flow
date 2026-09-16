const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  "const [activeTab, setActiveTab] = useState<TabName>('Orders');",
  `const [activeTab, setActiveTab] = useState<TabName>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return 'Products';
    return 'Storefront';
  });`
);

// We should also pushstate when activeTab changes so URL reflects it nicely? 
// The user didn't explicitly ask for a full router, just that /admin is used for product upload.
// But let's add a small effect to sync the URL for /admin if activeTab is Products or inside the admin panel.

fs.writeFileSync('src/App.tsx', content);
console.log("Patched route");
