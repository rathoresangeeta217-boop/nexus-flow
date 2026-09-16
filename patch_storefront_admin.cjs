const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf-8');

const oldHeaderControls = `            <div className="flex items-center gap-4">
              <button className="relative p-2 text-black hover:text-red-600 transition-colors" onClick={() => setIsCartOpen(true)}>`;

const newHeaderControls = `            <div className="flex items-center gap-4">
              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales_executive' || profile?.role === 'employee') && setActiveTab && (
                <button 
                  onClick={() => setActiveTab('Orders')}
                  className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors mr-2"
                >
                  Admin Panel
                </button>
              )}
              <button className="relative p-2 text-black hover:text-red-600 transition-colors" onClick={() => setIsCartOpen(true)}>`;

content = content.replace(oldHeaderControls, newHeaderControls);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched StorefrontTab.tsx");
