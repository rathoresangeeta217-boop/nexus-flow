const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetMenu = `<div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center flex-wrap">
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
            
const newMenu = `
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center flex-wrap">
              {[
                {
                  name: 'Office Studio',
                  subItems: ["Workstation's", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series"]
                },
                {
                  name: 'Homes',
                  subItems: ["Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks"]
                },
                {
                  name: 'Educational & Institutional',
                  subItems: ["School desks & chairs", "Library furniture", "Admin Furniture"]
                },
                { name: 'Factories & Warehouses' },
                { name: 'Catalogues' }
              ].map(item => (
                <div key={item.name} className="relative group">
                  <button 
                    onClick={() => setSelectedCategory(item.name)}
                    className={\`text-[11px] xl:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap h-20 md:h-24 flex items-center \${selectedCategory === item.name ? 'text-red-600' : 'text-slate-500 hover:text-black'}\`}
                  >
                    {item.name}
                  </button>
                  {item.subItems && (
                    <div className="absolute left-0 top-[100%] w-60 bg-white border border-slate-200 shadow-xl rounded-b-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2 border-t-2 border-t-red-600 flex flex-col">
                      {item.subItems.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSelectedCategory(sub)}
                          className="block w-full text-left px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>`;

content = content.replace(targetMenu, newMenu);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched dropdown menus");
