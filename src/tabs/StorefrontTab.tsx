import React, { useState, useEffect } from 'react';
import { subscribeToProducts, Product, isCategoryMatch, saveProduct, ProductVariant } from '../lib/products';
import { subscribeToVendors, Vendor } from '../lib/vendors';
import { NewProductModal } from '../components/NewProductModal';
import { ShoppingCart, Search, Menu, Star, Zap, ChevronRight, X, Upload, ImagePlus, Plus, Layers, Check, ImageIcon, RotateCw, Boxes } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// custom image component defined at bottom of file
import { getProductFile, getVariantFile } from '../lib/fileStorage';
import { useAuth } from '../contexts/AuthContext';
import { set, get } from 'idb-keyval';
import { WorkstationLiveRenderer, getTableTopHex, getScreenHex, getLegHex } from '../components/WorkstationLiveRenderer';
import { Workstation3DViewer } from '../components/Workstation3DViewer';

export interface StorefrontCartItem {
  id: string;
  product: Product;
  quantity: number;
  workstationSetup?: any;
  selectedVariant?: ProductVariant;
}

export function StorefrontTab({ setActiveTab }: { setActiveTab?: (tab: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);
  const [currentWorkstationSetup, setCurrentWorkstationSetup] = useState<any>(null);
  const [visualizerView, setVisualizerView] = useState<'3d' | '2d' | 'photo'>('3d');
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
    const unsubVendors = subscribeToVendors(setVendors);
    return () => {
      unsub();
      unsubVendors();
    };
  }, []);

  const handleAddProduct = async (productData: any) => {
    try {
      const normalizedData = {
        ...productData,
        name: productData.name || productData.productName || 'Untitled Product',
        productName: productData.name || productData.productName || 'Untitled Product',
        category: productData.category || (selectedCategory !== 'All' ? selectedCategory : "Workstation's")
      };
      await saveProduct(normalizedData);
      setIsNewProductModalOpen(false);
    } catch (error) {
      console.error("Error saving product from storefront:", error);
    }
  };

  const allProductCategories = Array.from(new Set([
    ...products.map(p => p.category || p.details?.category).filter(Boolean),
    "Office Studio", "Workstation's", "Workstation", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series",
    "Homes", "Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks",
    "Educational & Institutional", "School desks & chairs", "Library furniture", "Admin Furniture",
    "Factories & Warehouses", "Racks", "Lockers", "Customize",
    "Catalogues"
  ]));
  const categories = ['All', ...allProductCategories];
  
  let filteredProducts = products.filter(p => {
    const pName = p.name || (p as any).productName || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.specification?.toLowerCase().includes(searchQuery.toLowerCase()));
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || isCategoryMatch(c, selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Inject preview products if category has no products
  const hasRealProductsInCategory = products.some(p => isCategoryMatch(p.category || p.details?.category, selectedCategory));
  if (filteredProducts.length === 0 && selectedCategory !== 'All' && !searchQuery && !hasRealProductsInCategory) {
    filteredProducts = [
      { id: 'dummy1', name: `Premium ${selectedCategory} Alpha`, specification: 'Ergonomic modular design with premium finish.', price: '14500', salesRate: 14500, category: selectedCategory },
      { id: 'dummy2', name: `Signature ${selectedCategory} Pro`, specification: 'Modern aesthetics with heavy-duty metal base.', price: '22000', salesRate: 22000, category: selectedCategory },
      { id: 'dummy3', name: `Compact ${selectedCategory} Lite`, specification: 'Space-saving layout for modern high-productivity offices.', price: '8500', salesRate: 8500, category: selectedCategory },
      { id: 'dummy4', name: `Executive ${selectedCategory} Elite`, specification: 'Top-tier materials and wire-raceway management.', price: '35000', salesRate: 35000, category: selectedCategory }
    ] as any;
  }

  const searchMatchingCategories = searchQuery 
    ? Array.from(new Set([
        ...allProductCategories.filter(c => (c as string).toLowerCase().includes(searchQuery.toLowerCase())),
        ...filteredProducts.map(p => p.category || p.details?.category).filter(Boolean)
      ]))
    : [];

  

  // Synchronize active variant and image when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.variants && selectedProduct.variants.length > 0) {
        const firstVariant = selectedProduct.variants[0];
        setSelectedVariantId(firstVariant.id);
        if (firstVariant.imageData) {
          setActiveImageSrc(firstVariant.imageData);
        } else {
          getVariantFile(firstVariant.id).then(data => {
            if (data) setActiveImageSrc(data);
            else setActiveImageSrc(null);
          });
        }
      } else {
        setSelectedVariantId(null);
        setActiveImageSrc(null);
      }
    } else {
      setSelectedVariantId(null);
      setActiveImageSrc(null);
    }
  }, [selectedProduct]);

  const handleSelectVariant = async (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    if (variant.imageData) {
      setActiveImageSrc(variant.imageData);
    } else {
      const storedImage = await getVariantFile(variant.id);
      if (storedImage) {
        setActiveImageSrc(storedImage);
      } else {
        setActiveImageSrc(null);
      }
    }
  };

  const addToCart = (product: Product, workstationSetup?: any, variant?: ProductVariant) => {
    setCart(prev => {
      const isWorkstation = isCategoryMatch(product.category, "Workstation");
      const configuredPrice = isWorkstation && workstationSetup?.calculatedPrice 
        ? workstationSetup.calculatedPrice 
        : undefined;

      const setupKey = workstationSetup 
        ? `_${workstationSetup.dimensions}_${workstationSetup.material}_${workstationSetup.thickness}_${workstationSetup.tableTopColor}_${workstationSetup.screenColor}_${workstationSetup.legColor}_${workstationSetup.legSize}_${workstationSetup.legStyle}` 
        : '';
      const cartItemId = `${product.docId || product.id}_${variant?.id || 'base'}${setupKey}`;
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        id: cartItemId, 
        product, 
        quantity: 1, 
        workstationSetup: workstationSetup ? { ...workstationSetup, calculatedPrice: configuredPrice } : undefined, 
        selectedVariant: variant 
      }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId && item.product.docId !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => {
    let price = 0;
    if (item.workstationSetup?.calculatedPrice) {
      price = item.workstationSetup.calculatedPrice;
    } else if (item.selectedVariant) {
      const p = typeof item.selectedVariant.price === 'string' 
        ? parseFloat(item.selectedVariant.price.replace(/[^0-9.]/g, '')) 
        : item.selectedVariant.price;
      price = p || 0;
    } else {
      const priceStr = item.product.details?.perUnitPrice || item.product.details?.totalUnitPrice || item.product.price || '0';
      price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    }
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
              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales_executive' || profile?.role === 'employee') && setActiveTab && (
                <button 
                  onClick={() => { window.history.pushState({}, '', '/admin'); setActiveTab('Products'); }}
                  className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors mr-2"
                >
                  Admin Panel
                </button>
              )}
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
              {(() => {
                const isWorkstation = isCategoryMatch(selectedProduct.category, "Workstation");
                const activeVariant = selectedProduct.variants?.find(v => v.id === selectedVariantId) || selectedProduct.variants?.[0];
                const workstationCalculatedPrice = isWorkstation && currentWorkstationSetup?.calculatedPrice ? currentWorkstationSetup.calculatedPrice : null;
                const currentPrice = workstationCalculatedPrice ?? (activeVariant 
                  ? (typeof activeVariant.price === 'string' ? parseFloat(activeVariant.price.replace(/[^0-9.]/g, '')) || 0 : activeVariant.price)
                  : (selectedProduct.salesRate || (typeof selectedProduct.price === 'string' ? parseFloat(selectedProduct.price.replace(/[^0-9.]/g, '')) : selectedProduct.price) || 14500));

                const availableSizes = Array.from(new Set((selectedProduct.variants || []).map(v => v.size).filter(Boolean))) as string[];
                const availableColors = Array.from(new Set((selectedProduct.variants || []).map(v => v.color).filter(Boolean))) as string[];

                return (
                  <>
                    <div className="w-full lg:w-3/5 flex gap-6 shrink-0 lg:sticky lg:top-28 lg:self-start z-20">
                      {/* Thumbnails */}
                      <div className="w-20 shrink-0 flex flex-col gap-3 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-1">
                        {/* 360 3D View Thumbnail for Workstations */}
                        {isWorkstation && (
                          <div 
                            onClick={() => setVisualizerView('3d')}
                            className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden group ${visualizerView === '3d' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}
                            title="Interactive 360° 3D View"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                              <RotateCw className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
                            </div>
                            <span className="text-[9px] font-black text-indigo-700 mt-1 uppercase tracking-tight">360° 3D</span>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                        )}

                        {/* Base Product Image Thumbnail */}
                        <div 
                          onClick={() => {
                            setActiveImageSrc(null);
                            setVisualizerView('photo');
                          }}
                          className={`aspect-square rounded-lg border-2 flex items-center justify-center p-1.5 cursor-pointer transition-colors relative overflow-hidden ${visualizerView === 'photo' && !activeImageSrc ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300 bg-slate-50'}`}
                          title="Base Product"
                        >
                          <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                          <span className="absolute top-1 left-1 bg-black/60 text-[8px] text-white px-1 py-0.2 rounded font-bold">Base</span>
                        </div>

                        {/* Variant Thumbnails */}
                        {selectedProduct.variants?.map((v, vIdx) => {
                          const isSelected = visualizerView === 'photo' && activeVariant?.id === v.id;
                          return (
                            <div 
                              key={v.id || vIdx} 
                              onClick={() => {
                                handleSelectVariant(v);
                                setVisualizerView('photo');
                              }}
                              className={`aspect-square rounded-lg border-2 flex items-center justify-center p-1 cursor-pointer transition-colors relative overflow-hidden group ${isSelected ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}
                              title={`${v.name} (${v.color || v.size})`}
                            >
                              <StorefrontProductImage 
                                variantId={v.id} 
                                customSrc={v.imageData} 
                                productId={selectedProduct.id} 
                                productName={v.name} 
                              />
                              {v.size && (
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 backdrop-blur-xs text-[8px] text-white text-center py-0.5 truncate font-bold group-hover:bg-indigo-600 transition-colors">
                                  {v.size.replace(' mm', '').replace(' (1-Seater)', '').replace(' (1-Seater Standard)', '')}
                                </span>
                              )}
                              {v.colorCode && (
                                <span 
                                  className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                                  style={{ backgroundColor: v.colorCode }} 
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Main Image View */}
                      <div className="flex-1 w-full bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-2 sm:p-4 aspect-square max-h-[calc(100vh-140px)] relative overflow-hidden group">
                        {/* View Toggle for Workstations */}
                        {isWorkstation && (
                          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                            <div className="flex items-center bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-0.5 shadow-sm text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setVisualizerView('3d')}
                                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${visualizerView === '3d' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-indigo-600'}`}
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                360° 3D View
                              </button>
                              <button
                                type="button"
                                onClick={() => setVisualizerView('2d')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${visualizerView === '2d' ? 'bg-slate-900 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                              >
                                2D Studio
                              </button>
                              <button
                                type="button"
                                onClick={() => setVisualizerView('photo')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${visualizerView === 'photo' ? 'bg-slate-900 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                              >
                                Photo
                              </button>
                            </div>

                            {visualizerView !== '3d' && (
                              <div className="hidden sm:flex bg-white/95 backdrop-blur-xs border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 shadow-xs items-center gap-1.5 flex-wrap">
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getTableTopHex(currentWorkstationSetup?.tableTopColor).main }} />
                                <span>Top: {currentWorkstationSetup?.tableTopColor || 'Frosty white'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getScreenHex(currentWorkstationSetup?.screenColor).fill }} />
                                <span>Screen: {currentWorkstationSetup?.screenColor || 'Blue'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getLegHex(currentWorkstationSetup?.legColor, currentWorkstationSetup?.legMaterial).main }} />
                                <span>Legs: {currentWorkstationSetup?.legColor || (currentWorkstationSetup?.legMaterial === 'wooden' ? 'Natural Teak' : 'Black')}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {isWorkstation && visualizerView === '3d' ? (
                          <Workstation3DViewer setup={currentWorkstationSetup} />
                        ) : isWorkstation && visualizerView === '2d' ? (
                          <WorkstationLiveRenderer setup={currentWorkstationSetup} />
                        ) : (
                          <>
                            {activeImageSrc ? (
                              <img src={activeImageSrc} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply transition-all duration-300" />
                            ) : activeVariant?.imageData ? (
                              <img src={activeVariant.imageData} alt={activeVariant.name} className="w-full h-full object-contain mix-blend-multiply transition-all duration-300" />
                            ) : (
                              <StorefrontProductImage 
                                variantId={activeVariant?.id} 
                                productId={selectedProduct.id} 
                                productName={activeVariant?.name || selectedProduct.name} 
                              />
                            )}
                          </>
                        )}

                        {/* Bottom Info Pill */}
                        {activeVariant && (
                          <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 shadow-md flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              <span className="truncate">
                                {isWorkstation && currentWorkstationSetup
                                  ? `${currentWorkstationSetup.dimensions} • ${currentWorkstationSetup.material} • ${currentWorkstationSetup.thickness}`
                                  : (activeVariant.size || activeVariant.name)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-indigo-600 font-black">
                                ₹{Number(currentPrice).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
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
                        {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {selectedProduct.variants.length} Sizes/Variants Available
                          </span>
                        )}
                      </div>

                      <h1 className="text-3xl font-black text-slate-900 mb-2">{selectedProduct.name}</h1>
                      <p className="text-slate-500 mb-6 leading-relaxed">
                        {selectedProduct.specification || 'Premium quality modular furniture designed for modern spaces. Features ergonomic design, durable materials, and a sleek aesthetic.'}
                      </p>

                      {/* Pricing with dynamic variant price update */}
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-end gap-3 mb-1">
                          <span className="text-4xl font-black text-slate-900">
                            ₹{Number(currentPrice).toLocaleString()}
                          </span>
                          <span className="text-lg text-slate-400 line-through mb-1">
                            ₹{Math.floor(Number(currentPrice) * 1.2).toLocaleString()}
                          </span>
                          <span className="text-sm font-bold text-green-600 mb-1">20% Off</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {isWorkstation 
                            ? 'Configured Workstation MRP (Includes selected size, material, thickness, legs & screen)'
                            : (activeVariant ? `Price for: ${activeVariant.name}` : 'MRP (Inclusive of all taxes)')}
                        </p>
                      </div>

                      {/* Variants: Size Selector (for non-workstations only, workstation sizes are in Let's make your Setup) */}
                      {!isCategoryMatch(selectedProduct.category, "Workstation") && availableSizes.length > 0 && (
                        <div className="mb-5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Select Size: <span className="text-indigo-600 font-bold">{activeVariant?.size || 'Standard'}</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {availableSizes.map(size => {
                              const isSelected = activeVariant?.size === size;
                              const matchedVariant = selectedProduct.variants!.find(v => v.size === size);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    if (matchedVariant) handleSelectVariant(matchedVariant);
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-600'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}


                      {/* Variants: Colour / Finish Selector (for non-workstations only; workstations choose colors in Let's make your Setup) */}
                      {!isCategoryMatch(selectedProduct.category, "Workstation") && availableColors.length > 0 && (
                        <div className="mb-6">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Choose Colour / Finish: <span className="text-indigo-600 font-semibold">{activeVariant?.color || 'Selected'}</span>
                          </label>
                          <div className="flex flex-wrap gap-2.5">
                            {availableColors.map(color => {
                              const matchingVariant = selectedProduct.variants!.find(v => v.color === color);
                              const isSelected = activeVariant?.color === color;
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    const matched = selectedProduct.variants!.find(v => v.color === color && (activeVariant?.size ? v.size === activeVariant.size : true))
                                      || selectedProduct.variants!.find(v => v.color === color);
                                    if (matched) handleSelectVariant(matched);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                    isSelected 
                                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20' 
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                  }`}
                                >
                                  {matchingVariant?.colorCode ? (
                                    <span 
                                      className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-xs" 
                                      style={{ backgroundColor: matchingVariant.colorCode }} 
                                    />
                                  ) : (
                                    <span className="w-4 h-4 rounded-full bg-slate-300 shrink-0" />
                                  )}
                                  <span>{color}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fallback Color Selector if no variants and not workstation */}
                      {!isCategoryMatch(selectedProduct.category, "Workstation") && (!selectedProduct.variants || selectedProduct.variants.length === 0) && (
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
                      )}

                      <div className="mb-6">
                        <button className="w-full sm:w-auto px-8 py-3 rounded-lg border-2 border-slate-200 text-slate-900 font-semibold hover:border-slate-900 hover:bg-slate-50 transition-colors">
                          Check Availability
                        </button>
                      </div>

                      {isCategoryMatch(selectedProduct.category, "Workstation") && (
                        <WorkstationSetup 
                          onChange={setCurrentWorkstationSetup} 
                          variants={selectedProduct.variants}
                          activeVariant={activeVariant}
                          onSelectVariant={handleSelectVariant}
                          onColorChange={() => setVisualizerView('3d')}
                        />
                      )}
                      
                      <div className="mt-auto pt-6 flex gap-4">
                        <button 
                          onClick={() => addToCart(selectedProduct, currentWorkstationSetup, activeVariant)}
                          className="flex-1 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                          <ShoppingCart className="w-5 h-5" /> Add To Quote
                        </button>
                        <button 
                          onClick={() => {
                            addToCart(selectedProduct, currentWorkstationSetup, activeVariant);
                            setIsCartOpen(true);
                          }}
                          className="flex-1 py-4 rounded-full bg-amber-400 text-slate-900 font-bold hover:bg-amber-500 transition-colors shadow-lg"
                        >
                          Buy Now
                        </button>
                      </div>

                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {searchQuery ? 'Categories' : selectedCategory === 'All' ? 'Trending Products' : selectedCategory}
                </h2>
                {!searchQuery && (
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {selectedCategory === 'All' ? 'Browse our complete catalog' : `Products in ${selectedCategory}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!searchQuery && (
                  <div className="text-sm font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    {filteredProducts.length} items
                  </div>
                )}
                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {isCategoryMatch(selectedCategory, "Workstation") ? "Add Product to Workstation" : "Add Product"}
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left Sidebar: Filters */}
              {!searchQuery && selectedCategory !== 'All' && (
                <aside className="w-full lg:w-64 shrink-0 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-28 hidden md:block">
                  <h3 className="font-bold text-lg text-slate-900 mb-6 uppercase tracking-wider">Filters</h3>
                  
                  <div className="mb-8">
                    <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Categories</h4>
                    <div className="space-y-3">
                      {['All', "Workstation's", "Workstation", "Executive Table", "Conference Table", "Storages"].map(cat => (
                        <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="category"
                            checked={selectedCategory === cat || (cat === "Workstation's" && isCategoryMatch(selectedCategory, "Workstation"))}
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
                  <div className="text-center py-20 bg-white rounded-xl border border-slate-200 p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-full mb-6">
                      <Plus className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No products found in {selectedCategory}</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">Add your first workstation or product to this category now.</p>
                    <button
                      onClick={() => setIsNewProductModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      {isCategoryMatch(selectedCategory, "Workstation") ? "Add Product to Workstation" : `Add Product to ${selectedCategory}`}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredProducts.map((product, i) => {
                      const hasVariants = Boolean(product.variants && product.variants.length > 0);
                      const lowestPrice = hasVariants
                        ? Math.min(...product.variants!.map(v => typeof v.price === 'string' ? parseFloat(v.price.replace(/[^0-9.]/g, '')) || 0 : v.price))
                        : (product.salesRate || (typeof product.price === 'string' ? parseFloat(product.price.replace(/[^0-9.]/g, '')) : product.price) || 14500);

                      return (
                        <motion.div 
                          key={product.docId || product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white rounded-xl overflow-hidden group border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-6">
                            <div className="w-full h-full relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                              <StorefrontProductImage productId={product.id} productName={product.name} />
                            </div>
                            {hasVariants && (
                              <span className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                {product.variants!.length} Options
                              </span>
                            )}
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
                            
                            {hasVariants ? (
                              <div className="flex items-center gap-1.5 mb-2 mt-1">
                                {Array.from(new Set(product.variants!.map(v => v.colorCode || v.color))).slice(0, 4).map((c, ci) => {
                                  const vMatch = product.variants!.find(v => v.colorCode === c || v.color === c);
                                  return (
                                    <span 
                                      key={ci} 
                                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" 
                                      style={{ backgroundColor: vMatch?.colorCode || '#CBD5E1' }}
                                      title={vMatch?.color || ''}
                                    />
                                  );
                                })}
                                {product.variants!.length > 4 && (
                                  <span className="text-[10px] text-slate-400 font-medium">+{product.variants!.length - 4}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mb-3 mt-1">
                                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-200"></span>
                                <span className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300"></span>
                                <span className="w-4 h-4 rounded-full bg-stone-500 border border-slate-200"></span>
                              </div>
                            )}
                            
                            <div className="text-xs text-slate-500 mb-3">
                              {hasVariants ? (
                                <span>Sizes: <strong className="text-slate-700">{Array.from(new Set(product.variants!.map(v => v.size).filter(Boolean))).join(', ')}</strong></span>
                              ) : (
                                <span>Size: <strong className="text-slate-700">Standard</strong></span>
                              )}
                            </div>
                            
                            <div className="mt-auto pt-2">
                              <div className="text-2xl font-semibold text-slate-900 mb-3 flex items-start">
                                <span className="text-sm font-normal mt-1 mr-0.5">₹</span>
                                <span className="text-xs font-normal text-slate-500 mt-2 mr-1">{hasVariants ? 'From ' : ''}</span>
                                {lowestPrice.toLocaleString()}
                              </div>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  addToCart(product, undefined, hasVariants ? product.variants![0] : undefined); 
                                }}
                                className="w-full py-2.5 rounded-full bg-amber-400 text-slate-900 font-medium hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 shadow-sm"
                              >
                                <ShoppingCart className="w-4 h-4" /> Add to Quote
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
                    {cart.map(item => {
                      const itemPrice = item.workstationSetup?.calculatedPrice
                        ? item.workstationSetup.calculatedPrice
                        : item.selectedVariant
                          ? (typeof item.selectedVariant.price === 'string' ? parseFloat(item.selectedVariant.price.replace(/[^0-9.]/g, '')) || 0 : item.selectedVariant.price)
                          : (parseFloat((item.product.details?.perUnitPrice || item.product.details?.totalUnitPrice || item.product.price || '0').replace(/[^0-9.]/g, '')) || 0);

                      return (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 relative group">
                          <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex shrink-0 p-2">
                             <StorefrontProductImage 
                               variantId={item.selectedVariant?.id} 
                               customSrc={item.selectedVariant?.imageData} 
                               productId={item.product.id} 
                               productName={item.selectedVariant?.name || item.product.name} 
                             />
                          </div>
                          <div className="flex-1 py-1">
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1 leading-snug pr-6">{item.product.name}</h4>
                            {item.selectedVariant && (
                              <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {item.selectedVariant.size || 'Standard'}
                                </span>
                                {item.selectedVariant.color && (
                                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                    {item.selectedVariant.colorCode && (
                                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: item.selectedVariant.colorCode }} />
                                    )}
                                    {item.selectedVariant.color}
                                  </span>
                                )}
                              </div>
                            )}
                            {item.workstationSetup && (
                              <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                                {item.workstationSetup.dimensions && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                                    {item.workstationSetup.dimensions}
                                  </span>
                                )}
                                {item.workstationSetup.material && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                    {item.workstationSetup.material}
                                  </span>
                                )}
                                {item.workstationSetup.thickness && (
                                  <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-800 font-semibold">
                                    {item.workstationSetup.thickness}
                                  </span>
                                )}
                                {item.workstationSetup.tableTopColor && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getTableTopHex(item.workstationSetup.tableTopColor).main }} />
                                    Top: {item.workstationSetup.tableTopColor}
                                  </span>
                                )}
                                {item.workstationSetup.screenColor && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getScreenHex(item.workstationSetup.screenColor).fill }} />
                                    Screen: {item.workstationSetup.screenColor}
                                  </span>
                                )}
                                {item.workstationSetup.legColor && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: getLegHex(item.workstationSetup.legColor, item.workstationSetup.legMaterial).main }} />
                                    Legs: {item.workstationSetup.legColor}
                                  </span>
                                )}
                                {item.workstationSetup.legSize && (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                                    Leg Size: {item.workstationSetup.legSize}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="font-black text-red-600 mt-2">
                              Rs. {Number(itemPrice).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                <button 
                                  onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded shadow-sm font-medium transition-colors"
                                >-</button>
                                <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                <button 
                                  onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded shadow-sm font-medium transition-colors"
                                >+</button>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
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

      <NewProductModal 
        mode="catalog"
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        vendors={vendors}
        onAddProduct={handleAddProduct}
        defaultCategory={selectedCategory !== 'All' ? selectedCategory : "Workstation's"}
      />

    </div>
  );
}

// Image component supporting products, variants, and custom data URLs
function StorefrontProductImage({ 
  productId, 
  variantId, 
  customSrc, 
  productName, 
  className = "w-full h-full object-cover object-center" 
}: { 
  productId?: string; 
  variantId?: string; 
  customSrc?: string; 
  productName: string; 
  className?: string; 
}) {
  const [src, setSrc] = useState<string | null>(customSrc || null);
  
  useEffect(() => {
    if (customSrc) {
      setSrc(customSrc);
      return;
    }
    if (variantId) {
      getVariantFile(variantId).then(url => {
        if (url) {
          setSrc(url);
        } else if (productId) {
          getProductFile(productId).then(pUrl => {
            if (pUrl) setSrc(pUrl);
            else setSrc(null);
          });
        } else {
          setSrc(null);
        }
      });
      return;
    }
    if (!productId) {
      setSrc(null);
      return;
    }
    getProductFile(productId).then(url => {
      if (url) setSrc(url);
      else setSrc(null);
    });
  }, [productId, variantId, customSrc]);

  if (src) {
    return <img src={src} alt={productName} className={className} />;
  }
  
  return (
    <div className="w-full h-full bg-slate-200/50 flex items-center justify-center rounded-xl">
      <span className="text-4xl font-black text-slate-300 uppercase select-none opacity-50">
        {productName ? productName.substring(0, 2) : 'PR'}
      </span>
    </div>
  );
}



function parseSizeDimensions(sizeStr?: string): { width?: string; depth?: string } {
  if (!sizeStr) return {};
  const m = sizeStr.match(/(\d+)\s*[xX*×]\s*(\d+)/);
  if (m) {
    return {
      width: `${m[1]} mm`,
      depth: `${m[2]} mm`
    };
  }
  return {};
}

export const WORKSTATION_PRICING = {
  material: {
    'PLPB': 0,
    'MDF': 1200,
    'HDHMR': 2400,
    'Plywood': 3800
  } as Record<string, number>,
  thickness: {
    '18 mm': 0,
    '25 mm': 1500,
    '36 mm': 3200
  } as Record<string, number>,
  legs: {
    'metal': {
      'Straight legs': 0,
      'U shape legs': 1200,
      'Angular legs': 1800
    } as Record<string, number>,
    'wooden': {
      'Straight leg': 2500
    } as Record<string, number>
  },
  frontScreen: {
    'Acrylic sheet': 0,
    'Pin up board': 600,
    'Aluminium framing': 1800,
    'Magnetic glass': 2500,
    'Wooden': 1200
  } as Record<string, number>,
  screenHeight: {
    '300MM': 0,
    '400MM': 500,
    '450MM': 900
  } as Record<string, number>,
  modesty: {
    'None': 0,
    'Include Modesty Panel': 1200
  } as Record<string, number>,
  electricFunction: {
    'Wire Raceway': 0,
    '2 switch': 650,
    '3 switch': 950,
    '4 switch': 1350
  } as Record<string, number>,
  addons: {
    '3-Drawer Mobile Pedestal': 3500,
    'Keyboard Tray': 1200,
    'CPU Stand': 800
  } as Record<string, number>,
  // Table Top Color and Front Screen Color strictly DO NOT affect price (₹0)
  tableTopColor: {
    'Frosty white': 0,
    'Ghotic Gray': 0,
    'Teak': 0,
    'Beach': 0,
    'Custom Colour': 0
  } as Record<string, number>,
  screenColor: {
    'Blue': 0,
    'Grey': 0,
    'Green': 0,
    'Red': 0,
    'Orange': 0,
    'Custom Colour': 0
  } as Record<string, number>,
  legColor: {
    'Black': 0,
    'White': 0,
    'Silver / Grey': 0,
    'Anthracite': 0,
    'Custom Colour': 0,
    'Natural Teak': 0,
    'Beach Wood': 0,
    'Walnut': 0,
    'Black Wood': 0
  } as Record<string, number>,
  legSize: {
    '40 x 40': 0,
    '50 x 50': 800
  } as Record<string, number>
};

function WorkstationSetup({ 
  onChange,
  variants = [],
  activeVariant = null,
  onSelectVariant,
  onColorChange
}: { 
  onChange?: (setup: any) => void;
  variants?: ProductVariant[];
  activeVariant?: ProductVariant | null;
  onSelectVariant?: (variant: ProductVariant) => void;
  onColorChange?: () => void;
}) {
  const [sizeType, setSizeType] = useState<'per_person' | 'total'>('per_person');
  const [width, setWidth] = useState('1000 mm');
  const [depth, setDepth] = useState('600 mm');
  const [totalSize, setTotalSize] = useState('1500L x 600W mm');
  const [material, setMaterial] = useState('PLPB');
  const [thickness, setThickness] = useState('25 mm');
  const [tableTopColor, setTableTopColor] = useState('Frosty white');
  const [legMaterial, setLegMaterial] = useState<'metal' | 'wooden'>('metal');
  const [legStyle, setLegStyle] = useState('Straight legs');
  const [legSize, setLegSize] = useState('40 x 40');
  const [legColor, setLegColor] = useState('Black');
  const [frontScreen, setFrontScreen] = useState('Acrylic sheet');
  const [screenHeight, setScreenHeight] = useState('300MM');
  const [screenColor, setScreenColor] = useState('Blue');
  const [modesty, setModesty] = useState('None');
  const [electricFunction, setElectricFunction] = useState('Wire Raceway');
  const [addons, setAddons] = useState<string[]>([]);

  // Collect available widths and depths from variants to ensure they exist in dropdowns
  const availableWidths = React.useMemo(() => {
    const list = new Set(['800 mm', '900 mm', '1000 mm', '1050 mm', '1200 mm', '1500 mm']);
    variants.forEach(v => {
      const parsed = parseSizeDimensions(v.size);
      if (parsed.width) list.add(parsed.width);
    });
    return Array.from(list).sort((a, b) => parseInt(a) - parseInt(b));
  }, [variants]);

  const availableDepths = React.useMemo(() => {
    const list = new Set(['600 mm', '750 mm', '800 mm']);
    variants.forEach(v => {
      const parsed = parseSizeDimensions(v.size);
      if (parsed.depth) list.add(parsed.depth);
    });
    return Array.from(list).sort((a, b) => parseInt(a) - parseInt(b));
  }, [variants]);

  // Sync width and depth when activeVariant changes
  useEffect(() => {
    if (activeVariant?.size) {
      const parsed = parseSizeDimensions(activeVariant.size);
      if (parsed.width) setWidth(parsed.width);
      if (parsed.depth) setDepth(parsed.depth);
    }
  }, [activeVariant]);

  // Helper to match options to a variant and trigger image update
  const tryMatchVariant = (
    targetWidth: string, 
    targetDepth: string, 
    targetTopColor?: string, 
    targetScreenColor?: string,
    targetLegColor?: string
  ) => {
    if (!variants || variants.length === 0 || !onSelectVariant) return;
    const wNum = targetWidth.replace(/[^0-9]/g, '');
    const dNum = targetDepth.replace(/[^0-9]/g, '');
    const searchTop = targetTopColor ?? tableTopColor;
    const searchScreen = targetScreenColor ?? screenColor;
    const searchLeg = targetLegColor ?? legColor;

    // 1. Check if variant matches size AND color
    const exactMatch = variants.find(v => {
      if (!v.size) return false;
      const sizeOk = v.size.includes(wNum) && v.size.includes(dNum);
      const colorOk = v.color && (
        v.color.toLowerCase().includes(searchTop.toLowerCase()) || 
        searchTop.toLowerCase().includes(v.color.toLowerCase()) ||
        v.color.toLowerCase().includes(searchScreen.toLowerCase()) ||
        v.color.toLowerCase().includes(searchLeg.toLowerCase())
      );
      return sizeOk && colorOk;
    });

    if (exactMatch) {
      onSelectVariant(exactMatch);
      return;
    }

    // 2. Check if variant matches tabletop, screen or leg color
    const colorMatch = variants.find(v => {
      if (!v.color) return false;
      return v.color.toLowerCase().includes(searchTop.toLowerCase()) || 
             searchTop.toLowerCase().includes(v.color.toLowerCase()) ||
             v.color.toLowerCase().includes(searchScreen.toLowerCase()) ||
             v.color.toLowerCase().includes(searchLeg.toLowerCase());
    });

    if (colorMatch && !colorMatch.size) {
      onSelectVariant(colorMatch);
      return;
    }

    // 3. Fallback to size match
    const sizeMatch = variants.find(v => {
      if (!v.size) return false;
      const parsed = parseSizeDimensions(v.size);
      if (parsed.width && parsed.depth) {
        return parsed.width.replace(/[^0-9]/g, '') === wNum && parsed.depth.replace(/[^0-9]/g, '') === dNum;
      }
      return v.size.includes(wNum) && v.size.includes(dNum);
    });

    if (sizeMatch) {
      onSelectVariant(sizeMatch);
    }
  };

  const handleWidthChange = (val: string) => {
    setWidth(val);
    tryMatchVariant(val, depth);
  };

  const handleDepthChange = (val: string) => {
    setDepth(val);
    tryMatchVariant(width, val);
  };

  const handleTableTopColorChange = (newColor: string) => {
    setTableTopColor(newColor);
    onColorChange?.();
    tryMatchVariant(width, depth, newColor, screenColor, legColor);
  };

  const handleScreenColorChange = (newColor: string) => {
    setScreenColor(newColor);
    onColorChange?.();
    tryMatchVariant(width, depth, tableTopColor, newColor, legColor);
  };

  const handleLegColorChange = (newColor: string) => {
    setLegColor(newColor);
    onColorChange?.();
    tryMatchVariant(width, depth, tableTopColor, screenColor, newColor);
  };

  // Base price for size (from matched variant if exists, or calculated default size price)
  const baseSizePrice = React.useMemo(() => {
    if (activeVariant?.price) {
      const p = typeof activeVariant.price === 'string' 
        ? parseFloat(activeVariant.price.replace(/[^0-9.]/g, '')) 
        : activeVariant.price;
      if (p) return p;
    }
    if (sizeType === 'per_person') {
      const wNum = parseInt(width) || 1000;
      const dNum = parseInt(depth) || 600;
      const wDiff = Math.max(0, wNum - 800);
      const dDiff = Math.max(0, dNum - 600);
      return 12000 + Math.round((wDiff / 100) * 600 + (dDiff / 100) * 500);
    } else {
      if (totalSize.includes('2400L')) return 28000;
      if (totalSize.includes('1800L')) return 21000;
      if (totalSize.includes('1500L')) return 16500;
      return 14000;
    }
  }, [activeVariant, sizeType, width, depth, totalSize]);

  // Price adders for configurations that change price
  const materialCost = WORKSTATION_PRICING.material[material] || 0;
  const thicknessCost = WORKSTATION_PRICING.thickness[thickness] || 0;
  const legsCost = (WORKSTATION_PRICING.legs[legMaterial] as any)?.[legStyle] || 0;
  const legSizeCost = WORKSTATION_PRICING.legSize[legSize] || 0;
  const screenCost = WORKSTATION_PRICING.frontScreen[frontScreen] || 0;
  const screenHeightCost = WORKSTATION_PRICING.screenHeight[screenHeight] || 0;
  const modestyCost = WORKSTATION_PRICING.modesty[modesty] || 0;
  const electricCost = WORKSTATION_PRICING.electricFunction[electricFunction] || 0;
  const addonsCost = addons.reduce((sum, item) => sum + (WORKSTATION_PRICING.addons[item] || 0), 0);

  // Table Top Color, Screen Colors & Legs Colour: STRICTLY ₹0 (No price change)
  const tableTopColorCost = 0;
  const screenColorCost = 0;
  const legColorCost = 0;

  const totalCalculatedPrice = Math.round(
    baseSizePrice + 
    materialCost + 
    thicknessCost + 
    legsCost + 
    legSizeCost + 
    screenCost + 
    screenHeightCost + 
    modestyCost + 
    electricCost + 
    addonsCost + 
    tableTopColorCost + 
    screenColorCost + 
    legColorCost
  );

  useEffect(() => {
    if (onChange) {
      onChange({
        sizeType,
        dimensions: sizeType === 'per_person' ? `${width} x ${depth}` : totalSize,
        material,
        thickness,
        tableTopColor,
        legMaterial,
        legStyle,
        legSize,
        legColor,
        frontScreen,
        screenHeight,
        screenColor,
        modesty,
        electricFunction,
        addons,
        calculatedPrice: totalCalculatedPrice,
        priceBreakdown: {
          baseSizePrice,
          materialCost,
          thicknessCost,
          legsCost,
          legSizeCost,
          screenCost,
          screenHeightCost,
          modestyCost,
          electricCost,
          addonsCost,
          tableTopColorCost: 0,
          screenColorCost: 0,
          legColorCost: 0
        }
      });
    }
  }, [sizeType, width, depth, totalSize, material, thickness, tableTopColor, legMaterial, legStyle, legSize, legColor, frontScreen, screenHeight, screenColor, modesty, electricFunction, addons, totalCalculatedPrice, onChange]);

  const toggleAddon = (item: string) => {
    setAddons(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  return (
    <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900">Let's make your Setup</h3>
      </div>
      
      <div className="space-y-5">
        {/* 1. Size */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">1. Size</label>

          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${sizeType === 'per_person' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setSizeType('per_person')}
            >
              Per Person
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${sizeType === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setSizeType('total')}
            >
              Total
            </button>
          </div>

          {sizeType === 'per_person' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Width</label>
                <select 
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {availableWidths.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Depth</label>
                <select 
                  value={depth}
                  onChange={(e) => handleDepthChange(e.target.value)}
                  className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {availableDepths.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {sizeType === 'total' && (
            <div>
              <select 
                value={totalSize}
                onChange={(e) => setTotalSize(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option>1200L x 600W mm</option>
                <option>1500L x 600W mm</option>
                <option>1800L x 750W mm</option>
                <option>2400L x 1200W mm</option>
              </select>
            </div>
          )}
        </div>

        {/* 2. Material */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">2. Material</label>
          <select 
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="PLPB">PLPB</option>
            <option value="MDF">MDF</option>
            <option value="HDHMR">HDHMR</option>
            <option value="Plywood">Plywood</option>
          </select>
        </div>

        {/* 3. Thickness */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">3. Thickness</label>
          <select 
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="18 mm">18 mm</option>
            <option value="25 mm">25 mm</option>
            <option value="36 mm">36 mm</option>
          </select>
        </div>

        {/* 4. Table Top Colour */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              4. Table Top Colour
              <span 
                className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-xs" 
                style={{ backgroundColor: getTableTopHex(tableTopColor).main }} 
              />
            </span>
          </label>
          <select 
            value={tableTopColor}
            onChange={(e) => handleTableTopColorChange(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="Frosty white">Frosty white</option>
            <option value="Ghotic Gray">Ghotic Gray</option>
            <option value="Teak">Teak</option>
            <option value="Beach">Beach</option>
            <option value="Custom Colour">Custom Colour</option>
          </select>
        </div>

        {/* 5. Legs */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">5. Legs</label>
          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${legMaterial === 'metal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => { setLegMaterial('metal'); setLegStyle('Straight legs'); setLegColor('Black'); onColorChange?.(); }}
            >
              Metal
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${legMaterial === 'wooden' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => { setLegMaterial('wooden'); setLegStyle('Straight leg'); setLegColor('Natural Teak'); onColorChange?.(); }}
            >
              Wooden
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Leg Style</label>
              <select 
                value={legStyle}
                onChange={(e) => setLegStyle(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {legMaterial === 'metal' ? (
                  <>
                    <option value="Straight legs">Straight legs</option>
                    <option value="U shape legs">U shape legs</option>
                    <option value="Angular legs">Angular legs</option>
                  </>
                ) : (
                  <option value="Straight leg">Straight solid wood leg</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Legs Size</label>
              <select 
                value={legSize}
                onChange={(e) => setLegSize(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              >
                <option value="40 x 40">40 x 40</option>
                <option value="50 x 50">50 x 50</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5 font-semibold">
                Legs Colour
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block shadow-xs" 
                  style={{ backgroundColor: getLegHex(legColor, legMaterial).main }} 
                />
              </label>
              <select 
                value={legColor}
                onChange={(e) => handleLegColorChange(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              >
                {legMaterial === 'metal' ? (
                  <>
                    <option value="Black">Black</option>
                    <option value="White">White</option>
                    <option value="Silver / Grey">Silver / Grey</option>
                    <option value="Anthracite">Anthracite</option>
                    <option value="Custom Colour">Custom Colour</option>
                  </>
                ) : (
                  <>
                    <option value="Natural Teak">Natural Teak</option>
                    <option value="Beach Wood">Beach Wood</option>
                    <option value="Walnut">Walnut</option>
                    <option value="Black Wood">Black Wood</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
        
        {/* 6. Front Screen's */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">6. Front Screen's</label>
          <select 
            value={frontScreen}
            onChange={(e) => setFrontScreen(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="Acrylic sheet">Acrylic sheet</option>
            <option value="Pin up board">Pin up board</option>
            <option value="Aluminium framing">Aluminium framing</option>
            <option value="Magnetic glass">Magnetic glass</option>
            <option value="Wooden">Wooden</option>
          </select>
        </div>

        {/* 7. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">7. Front Screen Height</label>
          <select 
            value={screenHeight}
            onChange={(e) => setScreenHeight(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="300MM">300MM</option>
            <option value="400MM">400MM</option>
            <option value="450MM">450MM</option>
          </select>
        </div>

        {/* 8. Screen Colours */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              8. Screen Colours (Acrylic / Partition)
              <span 
                className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-xs" 
                style={{ backgroundColor: getScreenHex(screenColor).fill }} 
              />
            </span>
          </label>
          <select 
            value={screenColor}
            onChange={(e) => handleScreenColorChange(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="Blue">Blue</option>
            <option value="Grey">Grey</option>
            <option value="Green">Green</option>
            <option value="Red">Red</option>
            <option value="Orange">Orange</option>
            <option value="Custom Colour">Custom Colour</option>
          </select>
        </div>

        {/* 9. Modesty */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            9. Modesty <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <select 
            value={modesty}
            onChange={(e) => setModesty(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="None">None</option>
            <option value="Include Modesty Panel">Include Modesty Panel</option>
          </select>
        </div>

        {/* 10. Electric Function */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">10. Electric Function</label>
          <select 
            value={electricFunction}
            onChange={(e) => setElectricFunction(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="Wire Raceway">Wire Raceway</option>
            <option value="2 switch">2 switch</option>
            <option value="3 switch">3 switch</option>
            <option value="4 switch">4 switch</option>
          </select>
        </div>
        
        {/* 11. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">11. Add-ons</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={addons.includes('3-Drawer Mobile Pedestal')}
                onChange={() => toggleAddon('3-Drawer Mobile Pedestal')}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" 
              />
              <span className="text-sm text-slate-700">3-Drawer Mobile Pedestal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={addons.includes('Keyboard Tray')}
                onChange={() => toggleAddon('Keyboard Tray')}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" 
              />
              <span className="text-sm text-slate-700">Keyboard Tray</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={addons.includes('CPU Stand')}
                onChange={() => toggleAddon('CPU Stand')}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" 
              />
              <span className="text-sm text-slate-700">CPU Stand</span>
            </label>
          </div>
        </div>

        {/* Real-time Configured Pricing Summary */}
        <div className="pt-4 border-t border-slate-200">
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Custom Workstation Configuration Price
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-white">₹{totalCalculatedPrice.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 line-through">₹{Math.floor(totalCalculatedPrice * 1.2).toLocaleString()}</span>
                  <span className="text-xs font-bold text-emerald-400">20% Off</span>
                </div>
              </div>
            </div>

            {/* Quick Spec Highlights */}
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">SIZE</span>
                <span className="font-semibold text-white truncate block">{sizeType === 'per_person' ? `${width} x ${depth}` : totalSize}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MATERIAL & THICKNESS</span>
                <span className="font-semibold text-white truncate block">{material} • {thickness}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TABLE TOP FINISH</span>
                <span className="font-semibold text-amber-300 truncate block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border border-slate-600" style={{ backgroundColor: getTableTopHex(tableTopColor).main }} />
                  {tableTopColor}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SCREEN & LEGS</span>
                <span className="font-semibold text-blue-300 truncate block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border border-slate-600" style={{ backgroundColor: getScreenHex(screenColor).fill }} />
                  {screenColor} • <span className="w-2 h-2 rounded-full border border-slate-600 inline-block" style={{ backgroundColor: getLegHex(legColor, legMaterial).main }} /> {legColor} ({legSize})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
