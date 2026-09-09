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
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
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
