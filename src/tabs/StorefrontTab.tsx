import React, { useState, useEffect } from 'react';
import { subscribeToProducts, Product } from '../lib/products';
import { ShoppingCart, Search, Menu, Star, Zap, ChevronRight, X, Upload, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// custom image component defined at bottom of file
import { getProductFile } from '../lib/fileStorage';
import { useAuth } from '../contexts/AuthContext';
import { set, get } from 'idb-keyval';

export function StorefrontTab({ setActiveTab }: { setActiveTab?: (tab: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { profile } = useAuth();
  useEffect(() => {
    get('storefront_banner').then(url => { if (url) setBannerUrl(url as string); });
  }, []);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBannerUrl(base64);
        set('storefront_banner', base64);
      };
      reader.readAsDataURL(file);
    }
  };


  useEffect(() => {
    const unsub = subscribeToProducts(setProducts);
    return () => unsub();
  }, []);

  const allProductCategories = Array.from(new Set([
    ...products.map(p => p.category || p.details?.category).filter(Boolean),
    "Office Studio", "Workstation's", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series",
    "Homes", "Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks",
    "Educational & Institutional", "School desks & chairs", "Library furniture", "Admin Furniture",
    "Factories & Warehouses", "Racks", "Lockers", "Customize",
    "Catalogues"
  ]));
  const categories = ['All', ...allProductCategories];
  
  let filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.specification?.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || c === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Inject dummy products for the preview if a specific category is selected and it's empty
  if (filteredProducts.length === 0 && selectedCategory !== 'All' && !searchQuery) {
    filteredProducts = [
      { id: 'dummy1', name: `Premium ${selectedCategory} Alpha`, specification: 'Ergonomic design with premium finish.', salesRate: 14500, category: selectedCategory },
      { id: 'dummy2', name: `Signature ${selectedCategory} Pro`, specification: 'Modern aesthetics with durable build quality.', salesRate: 22000, category: selectedCategory },
      { id: 'dummy3', name: `Compact ${selectedCategory} Lite`, specification: 'Space-saving design for modern offices.', salesRate: 8500, category: selectedCategory },
      { id: 'dummy4', name: `Executive ${selectedCategory} Elite`, specification: 'Top-tier materials and craftsmanship.', salesRate: 35000, category: selectedCategory }
    ] as any;
  }

  const searchMatchingCategories = searchQuery 
    ? Array.from(new Set([
        ...allProductCategories.filter(c => (c as string).toLowerCase().includes(searchQuery.toLowerCase())),
        ...filteredProducts.map(p => p.category || p.details?.category).filter(Boolean)
      ]))
    : [];

  

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.docId === product.docId);
      if (existing) {
        return prev.map(item => item.product.docId === product.docId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (docId: string) => {
    setCart(prev => prev.filter(item => item.product.docId !== docId));
  };

  const cartTotal = cart.reduce((total, item) => {
    const priceStr = item.product.details?.perUnitPrice || item.product.details?.totalUnitPrice || item.product.price || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    return total + price * item.quantity;
  }, 0);

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col -mx-4 -mt-4 -mb-24 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {/* Header */}
      <header className="bg-white text-black sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            <div className="flex items-center gap-6">
              <button className="md:hidden p-2 text-black"><Menu className="w-6 h-6" /></button>
              <div className="cursor-pointer flex items-center" onClick={() => setActiveTab?.('Orders')}>
                <img src="/logo.png" alt="SRK Modular Furniture co" className="h-16 md:h-20 w-auto object-contain" />
              </div>
            </div>
            
            
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
                {
                  name: 'Factories & Warehouses',
                  subItems: ["Racks", "Lockers", "Customize"]
                },
                { name: 'Catalogues' }
              ].map(item => (
                <div key={item.name} className="relative group">
                  <button 
                    onClick={() => setSelectedCategory(item.name)}
                    className={`text-[11px] xl:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap h-20 md:h-24 flex items-center ${selectedCategory === item.name ? 'text-red-600' : 'text-slate-500 hover:text-black'}`}
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
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-black hover:text-red-600 transition-colors" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100 border border-transparent text-slate-900 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors w-48 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="relative w-full overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center group">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Storefront Banner" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <ImagePlus className="w-12 h-12 mb-2 opacity-50" />
              <p className="font-medium uppercase tracking-widest text-sm opacity-50">No Banner Uploaded</p>
            </div>
          )}
          

        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {selectedProduct ? (
          <div className="w-full bg-white rounded-2xl p-6 lg:p-10 border border-slate-200">
            {/* Breadcrumbs */}
            <div className="flex items-center text-sm text-slate-500 mb-8">
              <span className="cursor-pointer hover:text-amber-600 transition-colors" onClick={() => setSelectedProduct(null)}>Home</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="cursor-pointer hover:text-amber-600 transition-colors" onClick={() => {
                setSelectedCategory(selectedProduct.category || 'All');
                setSelectedProduct(null);
              }}>
                {selectedProduct.category || 'Products'}
              </span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="font-medium text-slate-900">{selectedProduct.name}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
              {/* Left: Images */}
              <div className="w-full lg:w-3/5 flex gap-6 shrink-0">
                {/* Thumbnails */}
                <div className="w-20 shrink-0 flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`aspect-square rounded-lg border-2 flex items-center justify-center p-2 cursor-pointer transition-colors ${i === 1 ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300 bg-slate-50'}`}>
                      <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                    </div>
                  ))}
                </div>
                {/* Main Image */}
                <div className="flex-1 w-full bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative overflow-hidden">
                  <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                </div>
              </div>

              {/* Right: Info */}
              <div className="w-full lg:w-2/5 flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-600">4.9 (18 reviews)</span>
                  
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-2">{selectedProduct.name}</h1>
                <p className="text-slate-500 mb-6 leading-relaxed">
                  {selectedProduct.specification || 'Premium quality modular furniture designed for modern spaces. Features ergonomic design, durable materials, and a sleek aesthetic.'}
                </p>

                <div className="mb-6">
                  <div className="flex items-end gap-3 mb-1">
                    <span className="text-4xl font-black text-slate-900">
                      ₹{(selectedProduct.salesRate || selectedProduct.price || 14500).toLocaleString()}
                    </span>
                    <span className="text-lg text-slate-400 line-through mb-1">
                      ₹{Math.floor((selectedProduct.salesRate || selectedProduct.price || 14500) * 1.2).toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-green-600 mb-1">20% Off</span>
                  </div>
                  <p className="text-sm text-slate-500">MRP (Inclusive of all taxes)</p>
                </div>



                <div className="mb-6">
                  <p className="font-semibold text-slate-900 mb-3">Choose your color : <span className="font-normal text-slate-600">Classic Walnut</span></p>
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-amber-500 flex items-center justify-center cursor-pointer overflow-hidden p-1 bg-slate-50">
                       <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                    </div>
                    <div className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer hover:border-amber-300 overflow-hidden p-1 bg-slate-50 opacity-50">
                       <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <button className="w-full sm:w-auto px-8 py-3 rounded-lg border-2 border-slate-200 text-slate-900 font-semibold hover:border-slate-900 hover:bg-slate-50 transition-colors">
                    Check Availability
                  </button>
                </div>

                {selectedProduct.category === "Workstation's" && <WorkstationSetup />}
                
                <div className="mt-auto pt-6 flex gap-4">
                  <button 
                    onClick={() => addToCart(selectedProduct)}
                    className="flex-1 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingCart className="w-5 h-5" /> Add To Quote
                  </button>
                  <button 
                    onClick={() => {
                      addToCart(selectedProduct);
                      setIsCartOpen(true);
                    }}
                    className="flex-1 py-4 rounded-full bg-amber-400 text-slate-900 font-bold hover:bg-amber-500 transition-colors shadow-lg"
                  >
                    Buy Now
                  </button>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {searchQuery ? 'Categories' : selectedCategory === 'All' ? 'Trending Products' : selectedCategory}
              </h2>
              {!searchQuery && <div className="text-sm font-bold text-slate-500">{filteredProducts.length} items</div>}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left Sidebar: Filters */}
              {!searchQuery && selectedCategory !== 'All' && (
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
                          <span className={`text-sm transition-colors ${selectedCategory === cat ? 'text-amber-600 font-medium' : 'text-slate-600 group-hover:text-amber-600'}`}>
                            {cat}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Category Filters */}
                  {(() => {
                    const categoryFilters: Record<string, {title: string, options: string[]}[]> = {
                      "Workstation's": [
                        { title: "Type", options: ["Face to face", "Wall facing", "Cubical"] }
                      ],
                      "Executive Table": [
                        { title: "Type", options: ["Premium", "Luxery", "Economy"] },
                        { title: "Style", options: ["L-Shape", "Simple", "Metal Base"] }
                      ],
                      "Conference Table": [
                        { title: "Type", options: ["Premium", "Luxery", "Eco"] },
                        { title: "Style", options: ["Simple (Metal Structure)", "Simple (Wood structure)", "U Shape design", "Oval Design"] }
                      ]
                    };

                    const filters = categoryFilters[selectedCategory];

                    return (
                      <>
                        {filters && filters.map(filterGroup => (
                          <div key={filterGroup.title} className="mb-8">
                            <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">{filterGroup.title}</h4>
                            <div className="space-y-3">
                              {filterGroup.options.map(option => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer group">
                                  <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                                  <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        
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
                      </>
                    );
                  })()}
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
                        className="bg-white rounded-xl overflow-hidden group border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-6">
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
                              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
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
          </>
        )}
      </main>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                  Your Cart
                  <span className="bg-black text-white text-xs px-2 py-1 rounded-full">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium">Your cart is empty.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 px-6 py-3 bg-black text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-red-600 transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.docId} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 relative group">
                        <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex shrink-0 p-2">
                           <StorefrontProductImage productId={item.product.id} productName={item.product.name} />
                        </div>
                        <div className="flex-1 py-1">
                          <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug pr-6">{item.product.name}</h4>
                          <div className="font-black text-red-600 mt-2">
                            Rs. {item.product.details?.perUnitPrice || item.product.details?.totalUnitPrice || item.product.price || '0'}
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                              <button 
                                onClick={() => setCart(prev => prev.map(i => i.product.docId === item.product.docId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded shadow-sm font-medium transition-colors"
                              >-</button>
                              <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                              <button 
                                onClick={() => setCart(prev => prev.map(i => i.product.docId === item.product.docId ? { ...i, quantity: i.quantity + 1 } : i))}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded shadow-sm font-medium transition-colors"
                              >+</button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.product.docId!)}
                          className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="font-bold text-slate-900">Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-6 text-sm">
                    <span className="text-slate-500 font-medium">Shipping</span>
                    <span className="font-bold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100">
                    <span className="text-base font-bold text-slate-900 uppercase">Total</span>
                    <span className="font-black text-2xl text-red-600">Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <button className="w-full py-4 bg-black text-white font-bold uppercase tracking-wider text-sm rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-black/20 hover:shadow-red-600/30">
                    Checkout Now
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// Minimal image component since we can't easily import the complex one from PurchaseTab
function StorefrontProductImage({ productId, productName }: { productId: string, productName: string }) {
  const [src, setSrc] = useState<string | null>(null);
  
  useEffect(() => {
    if (!productId) return;
    getProductFile(productId).then(url => {
      if (url) setSrc(url);
    });
  }, [productId]);

  if (src) {
    return <img src={src} alt={productName} className="w-full h-full object-cover object-center" />;
  }
  
  return (
    <div className="w-full h-full bg-slate-200/50 flex items-center justify-center rounded-xl">
      <span className="text-5xl font-black text-slate-300 uppercase select-none opacity-50">
        {productName.substring(0, 2)}
      </span>
    </div>
  );
}


function WorkstationSetup() {
  const [sizeType, setSizeType] = useState<'per_person' | 'total'>('per_person');
  const [legMaterial, setLegMaterial] = useState<'metal' | 'wooden'>('metal');

  return (
    <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Let's make your Setup</h3>
      
      <div className="space-y-5">
        {/* 1. Size */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">1. Size</label>
          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${sizeType === 'per_person' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setSizeType('per_person')}
            >
              Per Person
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${sizeType === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setSizeType('total')}
            >
              Total
            </button>
          </div>

          {sizeType === 'per_person' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Width</label>
                <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option>800 mm</option>
                  <option>900 mm</option>
                  <option>1000 mm</option>
                  <option>1050 mm</option>
                  <option>1200 mm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Depth</label>
                <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option>600 mm</option>
                  <option>750 mm</option>
                  <option>800 mm</option>
                </select>
              </div>
            </div>
          )}

          {sizeType === 'total' && (
            <div>
              <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option>1200L x 600W mm</option>
                <option>1500L x 600W mm</option>
                <option>1800L x 750W mm</option>
                <option>2400L x 1200W mm</option>
              </select>
            </div>
          )}
        </div>

        {/* 2. Table Top Colour */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">2. Table Top Colour</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Frosty white</option>
            <option>Ghotic Gray</option>
            <option>Teak</option>
            <option>Beach</option>
            <option>Custom Colour</option>
          </select>
        </div>

        {/* 3. Legs */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">3. Legs</label>
          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${legMaterial === 'metal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setLegMaterial('metal')}
            >
              Metal
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${legMaterial === 'wooden' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setLegMaterial('wooden')}
            >
              Wooden
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Leg Style</label>
            <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
              {legMaterial === 'metal' ? (
                <>
                  <option>Straight legs</option>
                  <option>U shape legs</option>
                  <option>Angular legs</option>
                </>
              ) : (
                <option>Straight leg</option>
              )}
            </select>
          </div>
        </div>
        
        {/* 4. Front Screen's */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">4. Front Screen's</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Acrylic sheet</option>
            <option>Pin up board</option>
            <option>Aluminium framing</option>
            <option>Magnetic glass</option>
            <option>Wooden</option>
          </select>
        </div>

        {/* 5. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Front Screen Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
          </select>
        </div>

        {/* 6. Modesty */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">6. Modesty <span className="text-slate-400 font-normal">(Optional)</span></label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>None</option>
            <option>Include Modesty Panel</option>
          </select>
        </div>

        {/* 7. Electric Function */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">7. Electric Function</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Wire Raceway</option>
            <option>2 switch</option>
            <option>3 switch</option>
            <option>4 switch</option>
          </select>
        </div>
        
        {/* 8. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">8. Add-ons</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">3-Drawer Mobile Pedestal</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">Keyboard Tray</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">CPU Stand</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
