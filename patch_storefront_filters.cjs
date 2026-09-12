const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const mainStart = content.indexOf('<main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">');
if (mainStart === -1) {
  console.log("Could not find main start");
  process.exit(1);
}
// Find the closing main tag that corresponds to this opening tag.
const mainEndMatch = content.slice(mainStart).indexOf('</main>');
if (mainEndMatch === -1) {
  console.log("Could not find main end");
  process.exit(1);
}
const mainEnd = mainStart + mainEndMatch + '</main>'.length;

const originalMainContent = content.slice(mainStart, mainEnd);

// I'll reconstruct the main area
const newMainContent = `
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {searchQuery ? 'Categories' : selectedCategory === 'All' ? 'Trending Products' : selectedCategory}
          </h2>
          {!searchQuery && <div className="text-sm font-bold text-slate-500">{filteredProducts.length} items</div>}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar: Filters */}
          {!searchQuery && (
            <aside className="w-full lg:w-64 shrink-0 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-28 hidden md:block">
              <h3 className="font-bold text-lg text-slate-900 mb-6 uppercase tracking-wider">Filters</h3>
              
              <div className="mb-8">
                <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Categories</h4>
                <div className="space-y-3">
                  {['All', "Workstation's", "Executive Table", "Conference Table", "Storages"].map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="category"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-slate-300" 
                      />
                      <span className={\`text-sm transition-colors \${selectedCategory === cat ? 'text-amber-600 font-medium' : 'text-slate-600 group-hover:text-amber-600'}\`}>
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Price</h4>
                <div className="space-y-3">
                  {['Under ₹10,000', '₹10,000 - ₹20,000', '₹20,000 - ₹50,000', 'Over ₹50,000'].map(price => (
                    <label key={price} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                      <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{price}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {['Small', 'Medium', 'Large'].map(size => (
                    <button key={size} className="px-4 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Right Content: Products Grid */}
          <div className="flex-1 w-full">
            {searchQuery ? (
              searchMatchingCategories.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">No categories found</h3>
                  <p className="text-slate-500">Try adjusting your search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {searchMatchingCategories.map((cat, i) => (
                    <motion.div
                      key={cat as string}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setSelectedCategory(cat as string);
                        setSearchQuery('');
                      }}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all duration-300 cursor-pointer p-8 flex flex-col items-center justify-center text-center group"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-50 transition-colors">
                        <Search className="w-6 h-6 text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm group-hover:text-amber-600 transition-colors">
                        {cat as string}
                      </h3>
                    </motion.div>
                  ))}
                </div>
              )
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No products found</h3>
                <p className="text-slate-500">Try adjusting your category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredProducts.map((product, i) => (
                  <motion.div 
                    key={product.docId || product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl overflow-hidden group border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-6 mix-blend-multiply">
                      <div className="w-full h-full relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                        <StorefrontProductImage productId={product.id} productName={product.name} />
                      </div>
                    </div>
                    
                    <div className="p-4 flex flex-col flex-1 bg-white">
                      <h3 className="font-medium text-slate-900 mb-1 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 ml-1">4.8</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3 mt-1">
                        <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-200 cursor-pointer hover:scale-110 transition-transform"></span>
                        <span className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 cursor-pointer hover:scale-110 transition-transform"></span>
                        <span className="w-4 h-4 rounded-full bg-stone-500 border border-slate-200 cursor-pointer hover:scale-110 transition-transform"></span>
                      </div>
                      
                      <div className="text-sm text-slate-600 mb-3">
                        Size: <span className="font-semibold">Medium</span>
                      </div>
                      
                      <div className="mt-auto pt-2">
                        <div className="text-2xl font-semibold text-slate-900 mb-3 flex items-start">
                          <span className="text-sm font-normal mt-1 mr-0.5">₹</span>
                          {(product.salesRate || product.price || 14500).toLocaleString()}
                        </div>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-full py-2.5 rounded-full bg-amber-400 text-slate-900 font-medium hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <ShoppingCart className="w-4 h-4" /> Add to Quote
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
`;

content = content.replace(originalMainContent, newMainContent.trim());
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched filters panel");
