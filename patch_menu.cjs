const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetMenu = `<div className="hidden md:flex items-center space-x-8 flex-1 justify-center">
              {categories.slice(0, 5).map(cat => (
                <button 
                  key={cat as string} 
                  onClick={() => setSelectedCategory(cat as string)}
                  className={\`text-sm font-bold uppercase tracking-wider transition-colors \${selectedCategory === cat ? 'text-red-600' : 'text-slate-500 hover:text-black'}\`}
                >
                  {cat as string}
                </button>
              ))}
            </div>`;
            
const newMenu = `<div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center flex-wrap">
              {['Office Studio', 'Homes', 'Educational & Institutional', 'Factories & Warehouses', 'Catalogues'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className={\`text-[11px] xl:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap \${selectedCategory === cat ? 'text-red-600' : 'text-slate-500 hover:text-black'}\`}
                >
                  {cat}
                </button>
              ))}
            </div>`;

content = content.replace(targetMenu, newMenu);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched menu");
