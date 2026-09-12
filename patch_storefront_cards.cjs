const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetGrid = `          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
          </div>`;

const newGrid = `          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
                      <ShoppingCart className="w-4 h-4" /> Add to cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>`;

content = content.replace(targetGrid, newGrid);

// Now let's inject dummy products if filteredProducts is empty but a specific category is selected
const targetFilterLogic = `  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.specification?.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || c === selectedCategory;
    return matchesSearch && matchesCategory;
  });`;

const newFilterLogic = `  let filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.specification?.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || c === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Inject dummy products for the preview if a specific category is selected and it's empty
  if (filteredProducts.length === 0 && selectedCategory !== 'All' && !searchQuery) {
    filteredProducts = [
      { id: 'dummy1', name: \`Premium \${selectedCategory} Alpha\`, specification: 'Ergonomic design with premium finish.', salesRate: 14500, category: selectedCategory },
      { id: 'dummy2', name: \`Signature \${selectedCategory} Pro\`, specification: 'Modern aesthetics with durable build quality.', salesRate: 22000, category: selectedCategory },
      { id: 'dummy3', name: \`Compact \${selectedCategory} Lite\`, specification: 'Space-saving design for modern offices.', salesRate: 8500, category: selectedCategory },
      { id: 'dummy4', name: \`Executive \${selectedCategory} Elite\`, specification: 'Top-tier materials and craftsmanship.', salesRate: 35000, category: selectedCategory }
    ] as any;
  }`;

content = content.replace(targetFilterLogic, newFilterLogic);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched storefront grid and dummy products");
