const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetMenu = `{ name: 'Factories & Warehouses' },`;
const newMenu = `{
                  name: 'Factories & Warehouses',
                  subItems: ["Racks", "Lockers", "Customize"]
                },`;

content = content.replace(targetMenu, newMenu);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched Factories menu");
