const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const oldLogic = `const allProductCategories = Array.from(new Set(products.map(p => p.category || p.details?.category).filter(Boolean)));`;

const newLogic = `const allProductCategories = Array.from(new Set([
    ...products.map(p => p.category || p.details?.category).filter(Boolean),
    "Office Studio", "Workstation's", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series",
    "Homes", "Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks",
    "Educational & Institutional", "School desks & chairs", "Library furniture", "Admin Furniture",
    "Factories & Warehouses", "Racks", "Lockers", "Customize",
    "Catalogues"
  ]));`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched search logic to include all menu subcategories");
