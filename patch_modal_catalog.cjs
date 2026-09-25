const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

const CATEGORIES_CONST = `
const CATALOG_CATEGORIES: Record<string, string[]> = {
  "Office Studio": ["Workstation's", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series"],
  "Homes": ["Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks"],
  "Educational & Institutional": ["School desks & chairs", "Library furniture", "Admin Furniture"],
  "Factories & Warehouses": ["Racks", "Lockers", "Customize"],
  "Catalogues": []
};
`;

if (!content.includes('CATALOG_CATEGORIES')) {
  content = content.replace("export function NewProductModal", CATEGORIES_CONST + "\nexport function NewProductModal");
}

const mainCategoryState = `
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  
  React.useEffect(() => {
    if (isOpen) {
      if (initialData?.category) {
        const foundMain = Object.entries(CATALOG_CATEGORIES).find(([main, subs]) => subs.includes(initialData.category) || main === initialData.category);
        if (foundMain) {
          setSelectedMainCategory(foundMain[0]);
        }
      } else {
        setSelectedMainCategory('');
      }
    }
  }, [isOpen, initialData]);
`;

if (!content.includes('selectedMainCategory')) {
  content = content.replace("  React.useEffect(() => {", mainCategoryState + "\n  React.useEffect(() => {");
}

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal category logic");
