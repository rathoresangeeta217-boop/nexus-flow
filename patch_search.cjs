const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// 1. Add logic to compute searchMatchingCategories
const categoriesLogic = `const categories = ['All', ...Array.from(new Set(products.map(p => p.category || p.details?.category).filter(Boolean)))];`;

const newCategoriesLogic = `const allProductCategories = Array.from(new Set(products.map(p => p.category || p.details?.category).filter(Boolean)));
  const categories = ['All', ...allProductCategories];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.specification?.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || c === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const searchMatchingCategories = searchQuery 
    ? Array.from(new Set([
        ...allProductCategories.filter(c => (c as string).toLowerCase().includes(searchQuery.toLowerCase())),
        ...filteredProducts.map(p => p.category || p.details?.category).filter(Boolean)
      ]))
    : [];`;

content = content.replace(categoriesLogic, newCategoriesLogic);

// We need to remove the existing filteredProducts logic so it isn't duplicated
const oldFilteredProductsStart = `const filteredProducts = products.filter(p => {`;
const oldFilteredProductsEnd = `  });`;
const startIndex = content.indexOf(oldFilteredProductsStart, content.indexOf("const searchMatchingCategories")); // skip the one we just inserted
if(startIndex !== -1) {
    const endIndex = content.indexOf(oldFilteredProductsEnd, startIndex) + oldFilteredProductsEnd.length;
    content = content.substring(0, startIndex) + content.substring(endIndex);
}

// 2. Modify the Main Content rendering
const mainContentStart = `{/* Main Content */}`;
const mainContentEnd = `</main>`;
const mainContentStartIndex = content.indexOf(mainContentStart);
const mainContentEndIndex = content.indexOf(mainContentEnd, mainContentStartIndex) + mainContentEnd.length;

if(mainContentStartIndex !== -1) {
    const newMainContent = `{/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {searchQuery ? 'Categories' : selectedCategory === 'All' ? 'Trending Products' : selectedCategory}
          </h2>
          {!searchQuery && <div className="text-sm font-bold text-slate-500">{filteredProducts.length} items</div>}
        </div>

        {searchQuery ? (
          searchMatchingCategories.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-200 rounded-full mb-6">
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
                  className="bg-white rounded-2xl border border-slate-200 hover:border-red-500 hover:shadow-lg transition-all duration-300 cursor-pointer p-8 flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-50 transition-colors">
                    <Search className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm group-hover:text-red-600 transition-colors">
                    {cat as string}
                  </h3>
                </motion.div>
              ))}
            </div>
          )
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-200 rounded-full mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No products found</h3>
            <p className="text-slate-500">Try adjusting your category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map((product, i) => (
              <motion.div 
                key={product.docId || product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden group border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden flex items-center justify-center p-6">
                  <div className="w-full h-full relative flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                     <StorefrontProductImage productId={product.id} productName={product.name} />
                  </div>
                  <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full z-10">
                    {product.category || 'Premium'}
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-slate-700">4.8</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{product.specification}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-black text-xl text-slate-900">
                      ₹{product.salesRate?.toLocaleString()}
                    </span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>`;
    content = content.substring(0, mainContentStartIndex) + newMainContent + content.substring(mainContentEndIndex);
}

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched search behavior");
