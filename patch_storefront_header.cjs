const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetHeader = `<header className="bg-black text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 text-white"><Menu className="w-6 h-6" /></button>
              <div className="font-black text-2xl tracking-tighter cursor-pointer" onClick={() => setActiveTab?.('Orders')}>
                <span className="text-red-500">S</span><span className="text-white">R</span><span className="text-red-500">K</span>
                <span className="text-white ml-2 text-lg uppercase tracking-widest font-bold">Store</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {categories.slice(0, 5).map(cat => (
                <button 
                  key={cat as string} 
                  onClick={() => setSelectedCategory(cat as string)}
                  className={\`text-sm font-bold uppercase tracking-wider transition-colors \${selectedCategory === cat ? 'text-red-500' : 'text-gray-300 hover:text-white'}\`}
                >
                  {cat as string}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-800 text-white rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors w-48"
                />
              </div>
              <button className="relative p-2 text-white hover:text-red-500 transition-colors" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-black">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>`;

const newHeader = `<header className="bg-white text-black sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 text-black"><Menu className="w-6 h-6" /></button>
              <div className="font-black text-2xl tracking-tighter cursor-pointer" onClick={() => setActiveTab?.('Orders')}>
                <span className="text-red-500">S</span><span className="text-black">R</span><span className="text-red-500">K</span>
                <span className="text-black ml-2 text-lg uppercase tracking-widest font-bold">Store</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {categories.slice(0, 5).map(cat => (
                <button 
                  key={cat as string} 
                  onClick={() => setSelectedCategory(cat as string)}
                  className={\`text-sm font-bold uppercase tracking-wider transition-colors \${selectedCategory === cat ? 'text-red-600' : 'text-slate-500 hover:text-black'}\`}
                >
                  {cat as string}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100 border border-transparent text-slate-900 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors w-48 placeholder:text-slate-400"
                />
              </div>
              <button className="relative p-2 text-black hover:text-red-600 transition-colors" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>`;

content = content.replace(targetHeader, newHeader);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched StorefrontTab header to white");
