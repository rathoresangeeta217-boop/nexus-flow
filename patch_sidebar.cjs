const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
content = content.replace(
  `{ name: 'Purchase', icon: ShoppingBag, section: 'Core' },`,
  `{ name: 'Purchase', icon: ShoppingBag, section: 'Core' },\n  { name: 'Quotations', icon: FileText, section: 'Core' },`
);
fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log("Patched Sidebar.tsx");
