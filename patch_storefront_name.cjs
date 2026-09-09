const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetLogo = `<div className="font-black text-2xl tracking-tighter cursor-pointer flex items-center" onClick={() => setActiveTab?.('Orders')}>
                <span className="text-red-600">S</span><span className="text-black">R</span><span className="text-red-600">K</span>
                <span className="text-black ml-2 text-lg uppercase tracking-widest font-bold">STORE</span>
              </div>`;
              
const newLogo = `<div className="font-black text-2xl tracking-tighter cursor-pointer flex items-center" onClick={() => setActiveTab?.('Orders')}>
                <span className="text-red-600">S</span><span className="text-black">R</span><span className="text-red-600">K</span>
                <span className="text-black ml-2 text-sm sm:text-base md:text-lg uppercase tracking-widest font-bold">Modular Furniture co</span>
              </div>`;

content = content.replace(targetLogo, newLogo);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched Storefront name");
