import React, { useState, useEffect } from 'react';
import { subscribeToProducts, Product, isCategoryMatch, saveProduct, ProductVariant } from '../lib/products';
import { subscribeToVendors, Vendor } from '../lib/vendors';
import { NewProductModal } from '../components/NewProductModal';
import { ShoppingCart, Search, Menu, Star, Zap, ChevronRight, X, Upload, ImagePlus, Plus, Layers, Check, ImageIcon, RotateCw, Boxes, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// custom image component defined at bottom of file
import { getProductFile, getVariantFile } from '../lib/fileStorage';
import { useAuth } from '../contexts/AuthContext';
import { set, get } from 'idb-keyval';
import { getTableTopHex, getScreenHex, getLegHex } from '../components/WorkstationLiveRenderer';
import { Workstation3DViewer } from '../components/Workstation3DViewer';
import { WorkstationTechnicalInfographicModal } from '../components/WorkstationTechnicalInfographicModal';

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
  const [visualizerView, setVisualizerView] = useState<'3d' | 'photo'>('photo');
  const [isPhotoFullscreen, setIsPhotoFullscreen] = useState(false);
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [storeMiddlePartition, setStoreMiddlePartition] = useState<'Included' | 'None'>('Included');
  const { profile } = useAuth();
  useEffect(() => {
    get('storefront_banner')
      .then(url => { if (url) setBannerUrl(url as string); })
      .catch(err => console.warn('Could not read cached banner:', err));
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
    "Office Studio", "Workstation's", "Workstation", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series", "Sitting Series",
    "Homes", "Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks",
    "Educational & Institutional", "School desks & chairs", "Library furniture", "Admin Furniture",
    "Factories & Warehouses", "Racks", "Lockers", "Customize",
    "Catalogues"
  ]));
  const categories = ['All', ...allProductCategories];
  
  let filteredProducts = products.filter(p => {
    if (!p) return false;
    const pName = p.name || (p as any).productName || '';
    const pSpec = p.specification || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pSpec.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || isCategoryMatch(c, selectedCategory);
    return Boolean(matchesSearch && matchesCategory);
  });

  // Inject preview products if category has no products or if database has no products yet
  const hasRealProductsInCategory = products.some(p => p && isCategoryMatch(p.category || p.details?.category, selectedCategory));
  if (filteredProducts.length === 0 && !searchQuery && (!hasRealProductsInCategory || products.length === 0)) {
    const defaultProducts: Product[] = [
      { 
        id: 'dummy1', 
        name: `Premium ${selectedCategory === 'All' ? "Workstation's" : selectedCategory} Alpha`, 
        specification: 'Ergonomic modular design with premium finish and wire-raceway management.', 
        price: '14500', 
        salesRate: 14500, 
        category: selectedCategory === 'All' ? "Workstation's" : selectedCategory,
        variants: [
          { id: 'v1', name: '1200 x 600 mm', size: '1200 x 600 mm', color: 'Classic Walnut', colorCode: '#78350F', price: 14500 },
          { id: 'v2', name: '1350 x 600 mm', size: '1350 x 600 mm', color: 'Warm Oak', colorCode: '#D97706', price: 17500 }
        ]
      } as any,
      { 
        id: 'dummy2', 
        name: `Signature ${selectedCategory === 'All' ? 'Executive Table' : selectedCategory} Pro`, 
        specification: 'Modern aesthetics with heavy-duty metal base and flip box power module.', 
        price: '22000', 
        salesRate: 22000, 
        category: selectedCategory === 'All' ? 'Executive Table' : selectedCategory,
        variants: [
          { id: 'v3', name: '1500 x 750 mm', size: '1500 x 750 mm', color: 'Smoked Walnut', colorCode: '#451A03', price: 22000 }
        ]
      } as any,
      { 
        id: 'dummy3', 
        name: `ErgoMesh ${selectedCategory === 'All' ? 'Sitting Series' : selectedCategory} Lite`, 
        specification: 'Space-saving layout and breathable mesh for modern high-productivity offices.', 
        price: '8500', 
        salesRate: 8500, 
        category: selectedCategory === 'All' ? 'Sitting Series' : selectedCategory,
        variants: [
          { id: 'v4', name: 'Jet Black Mesh', color: 'Jet Black', colorCode: '#0F172A', price: 8500 },
          { id: 'v5', name: 'Slate Grey Mesh', color: 'Slate Grey', colorCode: '#64748B', price: 8900 }
        ]
      } as any,
      { 
        id: 'dummy4', 
        name: `Conference ${selectedCategory === 'All' ? 'Conference Table' : selectedCategory} Elite`, 
        specification: 'Top-tier commercial laminates and dual pop-up flip connectivity boxes.', 
        price: '35000', 
        salesRate: 35000, 
        category: selectedCategory === 'All' ? 'Conference Table' : selectedCategory,
        variants: [
          { id: 'v6', name: '2400 x 1200 mm', size: '2400 x 1200 mm', color: 'Bavarian Beech', colorCode: '#CA8A04', price: 35000 }
        ]
      } as any
    ];
    filteredProducts = defaultProducts.filter(p => selectedCategory === 'All' || isCategoryMatch(p.category, selectedCategory));
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
        ? `_${workstationSetup.dimensions}_${workstationSetup.material}_${workstationSetup.thickness}_${workstationSetup.tableTopColor}_${workstationSetup.screenColor}_${workstationSetup.middlePartition}_${workstationSetup.legColor}_${workstationSetup.legSize}_${workstationSetup.legStyle}` 
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
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col -mx-0 -mt-0 -mb-12">
      {/* Header */}
      <header className="bg-white text-slate-900 sticky top-0 z-50 border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20 md:h-22">
            <div className="flex items-center gap-6">
              <button className="md:hidden p-2 text-slate-700 hover:text-slate-900"><Menu className="w-6 h-6" /></button>
              <div className="cursor-pointer flex items-center" onClick={() => setActiveTab?.('Orders')}>
                <img src="/logo.png" alt="SRK Modular Furniture co" className="h-14 md:h-18 w-auto object-contain" />
              </div>
            </div>
            
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center flex-wrap">
              {[
                {
                  name: 'Office Studio',
                  subItems: ["Workstation's", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series", "Sitting Series"]
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
                    className={`text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap h-20 md:h-22 flex items-center cursor-pointer ${selectedCategory === item.name ? 'text-red-600 font-black' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {item.name}
                  </button>
                  {item.subItems && (
                    <div className="absolute left-0 top-[100%] w-60 bg-white border border-slate-200 shadow-xl rounded-b-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2 border-t-2 border-t-red-600 flex flex-col">
                      {item.subItems.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSelectedCategory(sub)}
                          className="block w-full text-left px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors cursor-pointer"
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
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Admin Panel
                </button>
              )}
              <button 
                className="relative p-2.5 text-slate-700 hover:text-red-600 transition-colors rounded-xl hover:bg-slate-100 cursor-pointer" 
                onClick={() => setIsCartOpen(true)}
                title="View Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search modular furniture..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100/90 border border-slate-200/80 text-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all w-52 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="relative w-full overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[380px] lg:min-h-[460px] flex items-center justify-center group">
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
      <main className="flex-1 w-full max-w-none px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
        {selectedProduct ? (
          <div className="w-full bg-white rounded-3xl p-4 sm:p-6 lg:p-7 xl:p-9 border border-slate-200/80 shadow-xs">
            {/* Breadcrumbs */}
            <div className="flex items-center text-xs font-medium text-slate-500 mb-5">
              <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setSelectedProduct(null)}>Home</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
              <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => {
                setSelectedCategory(selectedProduct.category || 'All');
                setSelectedProduct(null);
              }}>
                {selectedProduct.category || 'Products'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
              <span className="font-semibold text-slate-900 truncate">{selectedProduct.name}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 xl:gap-10 items-start">
              {/* Left: 3D Visualizer & Studio Media Column */}
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
                    <div className="w-full lg:w-[60%] xl:w-[64%] 2xl:w-[68%] flex gap-3 sm:gap-4 shrink-0 lg:sticky lg:top-20 lg:self-start z-20">
                      {/* Thumbnails Sidebar (Left Corner 5 Product Angles) */}
                      <div className="w-16 sm:w-20 shrink-0 flex flex-col gap-2.5 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pr-1">
                        {/* 360 3D View Thumbnail for Workstations */}
                        {isWorkstation && (
                          <div 
                            onClick={() => setVisualizerView('3d')}
                            className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden group ${visualizerView === '3d' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}
                            title="Interactive 360° 3D CAD Visualizer"
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                              <RotateCw className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
                            </div>
                            <span className="text-[9px] font-black text-indigo-700 mt-1 uppercase tracking-tight">360° 3D</span>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-2xs"></span>
                          </div>
                        )}

                        {/* 5 Product Angles Thumbnails in Left Corner */}
                        {(() => {
                          const angleImages: string[] = [];
                          if (selectedProduct.details?.productImageData) angleImages.push(selectedProduct.details.productImageData);
                          if (Array.isArray(selectedProduct.images)) angleImages.push(...selectedProduct.images);
                          if (Array.isArray(selectedProduct.details?.images)) angleImages.push(...selectedProduct.details.images);
                          const uniqueAngles = Array.from(new Set(angleImages.filter(Boolean))).slice(0, 5);

                          if (uniqueAngles.length === 0) {
                            return (
                              <div 
                                onClick={() => {
                                  setActiveImageSrc(null);
                                  setVisualizerView('photo');
                                }}
                                className={`aspect-square rounded-xl border-2 flex items-center justify-center p-1.5 cursor-pointer transition-colors relative overflow-hidden ${visualizerView === 'photo' && !activeImageSrc ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 shadow-xs' : 'border-slate-200 hover:border-amber-300 bg-slate-50'}`}
                                title="Base Studio Photo"
                              >
                                <StorefrontProductImage productId={selectedProduct.id} productName={selectedProduct.name} />
                                <span className="absolute top-1 left-1 bg-black/70 text-[8px] text-white px-1 py-0.2 rounded font-bold">Photo</span>
                              </div>
                            );
                          }

                          return uniqueAngles.map((src, aIdx) => {
                            const isSelected = visualizerView === 'photo' && activeImageSrc === src;
                            const labels = ['Front', 'Side', '3/4 View', 'Back', 'Detail'];
                            return (
                              <div 
                                key={aIdx} 
                                onClick={() => {
                                  setActiveImageSrc(src);
                                  setVisualizerView('photo');
                                }}
                                className={`aspect-square rounded-xl border-2 flex items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden group ${
                                  isSelected 
                                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 shadow-xs' 
                                    : 'border-slate-200 hover:border-indigo-300 bg-slate-50'
                                }`}
                                title={`Angle ${aIdx + 1}: ${labels[aIdx] || 'View'}`}
                              >
                                <img src={src} alt={`Angle ${aIdx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 backdrop-blur-xs text-[8px] text-white text-center py-0.5 truncate font-bold group-hover:bg-indigo-600 transition-colors">
                                  Angle {aIdx + 1}
                                </span>
                              </div>
                            );
                          });
                        })()}

                        {/* Active Color Variant Thumbnail (Only visible when color option with photo is selected) */}
                        {activeVariant?.imageData && (
                          <div 
                            onClick={() => {
                              setActiveImageSrc(activeVariant.imageData!);
                              setVisualizerView('photo');
                            }}
                            className={`aspect-square rounded-xl border-2 flex items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden group ${
                              activeImageSrc === activeVariant.imageData
                                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 shadow-xs'
                                : 'border-slate-200 hover:border-amber-300 bg-slate-50'
                            }`}
                            title={`Color Variant: ${activeVariant.color || activeVariant.name}`}
                          >
                            <img src={activeVariant.imageData} alt={activeVariant.name} className="w-full h-full object-contain mix-blend-multiply" />
                            {activeVariant.colorCode && (
                              <span 
                                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                                style={{ backgroundColor: activeVariant.colorCode }} 
                              />
                            )}
                            <span className="absolute bottom-0 inset-x-0 bg-amber-600 text-[8px] text-white text-center py-0.5 truncate font-bold">
                              {activeVariant.color || 'Color'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Main Visualizer Stage Canvas */}
                      <div className="flex-1 w-full bg-slate-900/[0.02] rounded-2xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center p-0 h-[580px] sm:h-[660px] lg:h-[740px] xl:h-[820px] 2xl:h-[880px] relative overflow-hidden group">
                        {/* View Toggle for Workstations (Studio Photo Mode Switcher) */}
                        {/* View Toggle for Workstations (Studio Photo Mode Switcher & Fullscreen Button) */}
                        {/* Top Visualizer Mode Switcher Toolbar */}
                        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                          <div className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-1 shadow-sm text-xs font-semibold gap-1">
                            <button
                              type="button"
                              onClick={() => setVisualizerView('photo')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                                visualizerView === 'photo' 
                                  ? 'bg-slate-900 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <span>Studio Photos & Angles</span>
                            </button>

                            {isWorkstation && (
                              <button
                                type="button"
                                onClick={() => setVisualizerView('3d')}
                                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                                  visualizerView === '3d' 
                                    ? 'bg-slate-900 text-white shadow-xs' 
                                    : 'text-slate-600 hover:text-indigo-600'
                                }`}
                              >
                                <Boxes className="w-3.5 h-3.5" />
                                <span>3D CAD</span>
                              </button>
                            )}
                          </div>

                          {/* Right Actions: 2D Infographic Spec Sheet & Fullscreen Photo Button */}
                          <div className="flex items-center gap-2">
                            {isWorkstation && (
                              <button
                                type="button"
                                onClick={() => setIsInfographicOpen(true)}
                                className="px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-amber-500/20"
                                title="Download 2D Technical Line Drawing Infographic Specs Sheet"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-100" />
                                <span>2D CAD & A4 PDF</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setIsPhotoFullscreen(true)}
                              className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 hover:bg-slate-100 shadow-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              title="Open Fullscreen Studio Photo"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="hidden sm:inline">Fullscreen Photo</span>
                            </button>
                          </div>
                        </div>

                        {/* Stage Body */}
                        {isWorkstation && visualizerView === '3d' ? (
                          <Workstation3DViewer 
                            setup={currentWorkstationSetup} 
                            onToggleMiddlePartition={() => {
                              const nextVal = currentWorkstationSetup?.middlePartition === 'None' ? 'Included' : 'None';
                              setStoreMiddlePartition(nextVal);
                              setCurrentWorkstationSetup((prev: any) => prev ? { ...prev, middlePartition: nextVal } : prev);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center relative">
                            {(() => {
                              const extraImages: string[] = [];
                              if (selectedProduct.details?.productImageData) extraImages.push(selectedProduct.details.productImageData);
                              if (Array.isArray(selectedProduct.images)) extraImages.push(...selectedProduct.images);
                              if (selectedProduct.variants) {
                                selectedProduct.variants.forEach(v => {
                                  if (v.imageData && !extraImages.includes(v.imageData)) extraImages.push(v.imageData);
                                });
                              }
                              const uniqueImgs = Array.from(new Set(extraImages));

                              return (
                                <>
                                  {/* Center Main Photo Stage */}
                                  <div 
                                    className="w-full flex-1 flex items-center justify-center cursor-zoom-in p-4"
                                    onClick={() => setIsPhotoFullscreen(true)}
                                    title="Click to view full screen"
                                  >
                                    {activeImageSrc ? (
                                      <img src={activeImageSrc} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 p-4" />
                                    ) : activeVariant?.imageData ? (
                                      <img src={activeVariant.imageData} alt={activeVariant.name} className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 p-4" />
                                    ) : (
                                      <StorefrontProductImage 
                                        variantId={activeVariant?.id} 
                                        productId={selectedProduct.id} 
                                        productName={activeVariant?.name || selectedProduct.name} 
                                      />
                                    )}
                                  </div>

                                  {/* Multiple Images Thumbnail Strip Below Main Photo */}
                                  {uniqueImgs.length > 1 && (
                                    <div className="absolute bottom-4 inset-x-4 bg-white/95 backdrop-blur-md rounded-xl p-2 border border-slate-200/90 shadow-md flex items-center justify-center gap-2 overflow-x-auto z-10 custom-scrollbar">
                                      {uniqueImgs.map((src, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setActiveImageSrc(src)}
                                          className={`relative w-11 h-11 rounded-lg border overflow-hidden p-0.5 bg-white shrink-0 transition-all cursor-pointer ${
                                            activeImageSrc === src ? 'border-indigo-600 ring-2 ring-indigo-500/25 shadow-xs scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                                          }`}
                                        >
                                          <img src={src} alt={`Product Photo ${i + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Bottom Info Bar for Studio Photo Mode */}
                        {activeVariant && visualizerView !== '3d' && (
                          <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-md border border-slate-200/90 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 shadow-md flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="truncate">
                                {isWorkstation && currentWorkstationSetup
                                  ? `${currentWorkstationSetup.frontScreen || 'Acrylic sheet'} · ${currentWorkstationSetup.material ? `${currentWorkstationSetup.material} Board` : 'PLPB Board'} ${currentWorkstationSetup.thickness || '25 mm'} · Modesty Included · Flip Box · ${currentWorkstationSetup.dimensions}`
                                  : (activeVariant.size || activeVariant.name)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-indigo-600 font-black text-sm">
                                ₹{Number(currentPrice).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Fullscreen Photo Lightbox Modal */}
                        {isPhotoFullscreen && (
                          <div className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
                            {/* Top Bar */}
                            <div className="absolute top-4 inset-x-4 z-10 flex items-center justify-between text-white">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-sm sm:text-base">{selectedProduct.name}</span>
                                {activeVariant?.size && (
                                  <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-medium">
                                    {activeVariant.size}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsPhotoFullscreen(false)}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                                title="Close Fullscreen (Esc)"
                              >
                                <X className="w-6 h-6" />
                              </button>
                            </div>

                            {/* Main Image */}
                            <div className="w-full h-full flex items-center justify-center p-8 max-w-6xl max-h-[85vh]">
                              {activeImageSrc ? (
                                <img src={activeImageSrc} alt={selectedProduct.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                              ) : activeVariant?.imageData ? (
                                <img src={activeVariant.imageData} alt={activeVariant.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                              ) : (
                                <StorefrontProductImage 
                                  variantId={activeVariant?.id} 
                                  productId={selectedProduct.id} 
                                  productName={activeVariant?.name || selectedProduct.name} 
                                />
                              )}
                            </div>

                            {/* Bottom Note */}
                            <div className="absolute bottom-4 text-center text-xs text-slate-400">
                              Press <kbd className="px-2 py-1 bg-white/10 rounded text-white font-mono">Esc</kbd> or click Close to exit
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Product Details & Configurator Column */}
                    <div className="w-full lg:w-[42%] xl:w-[38%] 2xl:w-[35%] flex flex-col min-w-0">
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
                      {(() => {
                        const typedDesc = selectedProduct.description || selectedProduct.details?.details || selectedProduct.details?.description;
                        if (typedDesc) {
                          return (
                            <p className="text-slate-600 mb-6 leading-relaxed whitespace-pre-wrap text-sm bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                              {typedDesc}
                            </p>
                          );
                        }
                        return null;
                      })()}

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

                      {/* Variants: Size Selector (for non-workstations only; hidden for Sitting Series since Sitting Series has ONLY color variants) */}
                      {(() => {
                        const isSittingSeriesProduct = 
                          selectedProduct.category?.toLowerCase().includes('sitting') ||
                          selectedProduct.category?.toLowerCase().includes('seating') ||
                          selectedProduct.name?.toLowerCase().includes('chair');

                        if (!isCategoryMatch(selectedProduct.category, "Workstation") && !isSittingSeriesProduct && availableSizes.length > 0) {
                          return (
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
                          );
                        }
                        return null;
                      })()}


                      {/* Variants: Colour / Finish Selector (For Sitting Series: shows ONLY color variants & their distinct prices) */}
                      {!isCategoryMatch(selectedProduct.category, "Workstation") && availableColors.length > 0 && (
                        <div className="mb-6">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            {(selectedProduct.category?.toLowerCase().includes('sit') || selectedProduct.category?.toLowerCase().includes('seat') || selectedProduct.name?.toLowerCase().includes('chair'))
                              ? 'Sitting Series Color Variants & Pricing:'
                              : 'Choose Colour / Finish:'} <span className="text-indigo-600 font-semibold">{activeVariant?.color || 'Selected'}</span>
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
                                    if (matched) {
                                      handleSelectVariant(matched);
                                      if (matched.imageData) {
                                        setActiveImageSrc(matched.imageData);
                                      }
                                      setVisualizerView('photo');
                                    }
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
                                  {matchingVariant?.price && (
                                    <span className="text-indigo-600 font-bold text-[11px] ml-1 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-2xs">
                                      ₹{Number(matchingVariant.price).toLocaleString()}
                                    </span>
                                  )}
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
                          externalMiddlePartition={storeMiddlePartition}
                          onMiddlePartitionChange={setStoreMiddlePartition}
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
                      if (!product) return null;
                      const validVariants = (product.variants || []).filter(Boolean);
                      const hasVariants = validVariants.length > 0;
                      const lowestPrice = hasVariants
                        ? Math.min(...validVariants.map(v => typeof v?.price === 'string' ? parseFloat(v.price.replace(/[^0-9.]/g, '')) || 0 : (Number(v?.price) || 0)))
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
                                {validVariants.length} Options
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
                                {Array.from(new Set(validVariants.map(v => v?.colorCode || v?.color).filter(Boolean))).slice(0, 4).map((c, ci) => {
                                  const vMatch = validVariants.find(v => v && (v.colorCode === c || v.color === c));
                                  return (
                                    <span 
                                      key={ci} 
                                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" 
                                      style={{ backgroundColor: vMatch?.colorCode || '#CBD5E1' }}
                                      title={vMatch?.color || ''}
                                    />
                                  );
                                })}
                                {validVariants.length > 4 && (
                                  <span className="text-[10px] text-slate-400 font-medium">+{validVariants.length - 4}</span>
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
                                <span>Sizes: <strong className="text-slate-700">{Array.from(new Set(validVariants.map(v => v?.size).filter(Boolean))).join(', ')}</strong></span>
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

      {/* 2D Technical Infographic Specification Modal */}
      <WorkstationTechnicalInfographicModal
        isOpen={isInfographicOpen}
        onClose={() => setIsInfographicOpen(false)}
        setup={currentWorkstationSetup}
        previewImageSrc={activeImageSrc || selectedProduct?.variants?.find(v => v.id === selectedVariantId)?.imageData || null}
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
    'None': 0,
    'Flip Box': 450,
    'Wire Raceway': 350,
    'Wire Raceway (1 Switch Hole)': 400,
    'Wire Raceway (2 Switch Holes)': 550,
    'Wire Raceway (3 Switch Holes)': 700,
    'Flip Box with Wire Raceway': 650,
    '1 switch': 400,
    '2 switch': 550,
    '3 switch': 700,
    '4 switch': 900
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
  onColorChange,
  externalMiddlePartition,
  onMiddlePartitionChange
}: { 
  onChange?: (setup: any) => void;
  variants?: ProductVariant[];
  activeVariant?: ProductVariant | null;
  onSelectVariant?: (variant: ProductVariant) => void;
  onColorChange?: () => void;
  externalMiddlePartition?: 'Included' | 'None';
  onMiddlePartitionChange?: (val: 'Included' | 'None') => void;
}) {
  const [sizeType, setSizeType] = useState<'per_person' | 'total'>('per_person');
  const [width, setWidth] = useState('1000 mm');
  const [depth, setDepth] = useState('600 mm');
  const [totalSize, setTotalSize] = useState('1500L x 600W mm');
  const [personQuantity, setPersonQuantity] = useState<number>(1);
  const [layoutType, setLayoutType] = useState<'cluster' | 'linear'>('cluster');
  const [material, setMaterial] = useState('PLPB');
  const [thickness, setThickness] = useState('25 mm');
  const [tableTopColor, setTableTopColor] = useState('Frosty white');
  const [legMaterial, setLegMaterial] = useState<'metal' | 'wooden'>('metal');
  const [legStyle, setLegStyle] = useState('Straight legs');
  const [legSize, setLegSize] = useState('40 x 40');
  const [legColor, setLegColor] = useState('Black');
  const [frontScreen, setFrontScreen] = useState('Acrylic sheet');
  const [middlePartition, setMiddlePartitionState] = useState<'Included' | 'None'>(externalMiddlePartition || 'Included');

  const setMiddlePartition = (val: 'Included' | 'None') => {
    setMiddlePartitionState(val);
    onMiddlePartitionChange?.(val);
  };

  useEffect(() => {
    if (externalMiddlePartition && externalMiddlePartition !== middlePartition) {
      setMiddlePartitionState(externalMiddlePartition);
    }
  }, [externalMiddlePartition]);

  const [screenQuantity, setScreenQuantity] = useState<number>(1);
  const [screenHeight, setScreenHeight] = useState('300MM');
  const [screenColor, setScreenColor] = useState('Blue');
  const [modesty, setModesty] = useState('Include Modesty Panel');
  const [electricFunction, setElectricFunction] = useState('None');
  const [addons, setAddons] = useState<string[]>([]);

  // Collect available widths and depths from variants to ensure they exist in dropdowns
  const availableWidths = React.useMemo(() => {
    const list = new Set(['800 mm', '900 mm', '1000 mm', '1050 mm', '1200 mm', '1500 mm', '1600 mm', '1800 mm', '2100 mm', '2400 mm']);
    variants.forEach(v => {
      const parsed = parseSizeDimensions(v.size);
      if (parsed.width) list.add(parsed.width);
    });
    return Array.from(list).sort((a, b) => parseInt(a) - parseInt(b));
  }, [variants]);

  const availableDepths = React.useMemo(() => {
    const list = new Set(['600 mm', '750 mm', '800 mm', '900 mm']);
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

  // Exact Seater Standard Mapping:
  // 800 mm: 1PRS | 900 mm: 1PRS | 1050 mm: 1PRS | 1200 mm: 1PRS | 1500/1600 mm: 1PRS
  // 1800 mm: 2PRS | 2100 mm: 2PRS | 2400 mm: 3PRS
  const getStandardPersonsForWidth = (w: number): number => {
    if (w >= 2400) return 3;
    if (w >= 1800) return 2;
    return 1;
  };

  // Determine numeric width and check if multi-person seating is allowed (>= 1800mm)
  const widthNum = React.useMemo(() => {
    if (sizeType === 'per_person') {
      return parseInt(width.replace(/[^0-9]/g, ''), 10) || 1000;
    } else {
      const match = totalSize.match(/(\d+)L/);
      if (match) return parseInt(match[1], 10);
      return parseInt(totalSize.replace(/[^0-9]/g, ''), 10) || 1200;
    }
  }, [sizeType, width, totalSize]);

  const isMultiPersonAllowed = widthNum >= 1800;

  // Enforce standard person capacity rules based on width
  useEffect(() => {
    if (!isMultiPersonAllowed && personQuantity !== 1) {
      setPersonQuantity(1);
    }
  }, [isMultiPersonAllowed, personQuantity]);

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
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 1000;
    const stdPersons = getStandardPersonsForWidth(num);
    setPersonQuantity(stdPersons);
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

  // Match specific variant for current width & depth to retrieve its custom variant price
  const matchedSizeVariant = React.useMemo(() => {
    if (!variants || variants.length === 0) return null;
    const wNum = width.replace(/[^0-9]/g, '');
    const dNum = depth.replace(/[^0-9]/g, '');
    return variants.find(v => {
      if (!v.size) return false;
      const parsed = parseSizeDimensions(v.size);
      if (parsed.width && parsed.depth) {
        return parsed.width.replace(/[^0-9]/g, '') === wNum && parsed.depth.replace(/[^0-9]/g, '') === dNum;
      }
      return v.size.includes(wNum) && v.size.includes(dNum);
    }) || activeVariant;
  }, [variants, width, depth, activeVariant]);

  // Base price for size (from matched variant's specific price, activeVariant, or calculated default size price)
  const baseSizePrice = React.useMemo(() => {
    if (matchedSizeVariant?.price) {
      const p = typeof matchedSizeVariant.price === 'string' 
        ? parseFloat(matchedSizeVariant.price.replace(/[^0-9.]/g, '')) 
        : matchedSizeVariant.price;
      if (p && !isNaN(p)) return p;
    }
    if (activeVariant?.price) {
      const p = typeof activeVariant.price === 'string' 
        ? parseFloat(activeVariant.price.replace(/[^0-9.]/g, '')) 
        : activeVariant.price;
      if (p && !isNaN(p)) return p;
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
  }, [matchedSizeVariant, activeVariant, sizeType, width, depth, totalSize]);

  // Price adders for configurations that change price
  const personMultiplier = sizeType === 'per_person' ? personQuantity : 1;
  const materialCost = (WORKSTATION_PRICING.material[material] || 0) * personMultiplier;
  const thicknessCost = (WORKSTATION_PRICING.thickness[thickness] || 0) * personMultiplier;
  const legsCost = ((WORKSTATION_PRICING.legs[legMaterial] as any)?.[legStyle] || 0) * (personMultiplier > 1 ? Math.ceil(personMultiplier * 0.75) : 1);
  const legSizeCost = (WORKSTATION_PRICING.legSize[legSize] || 0) * personMultiplier;
  const screenQty = frontScreen === 'No Screen' ? 0 : screenQuantity;
  const screenCost = (WORKSTATION_PRICING.frontScreen[frontScreen] || 0) * screenQty * (personMultiplier > 1 ? Math.ceil(personMultiplier / 2) : 1);
  const screenHeightCost = (WORKSTATION_PRICING.screenHeight[screenHeight] || 0) * screenQty * (personMultiplier > 1 ? Math.ceil(personMultiplier / 2) : 1);
  const modestyCost = (WORKSTATION_PRICING.modesty[modesty] || 0) * personMultiplier;
  const electricCost = (WORKSTATION_PRICING.electricFunction[electricFunction] || 0) * personMultiplier;
  const addonsCost = addons.reduce((sum, item) => sum + (WORKSTATION_PRICING.addons[item] || 0), 0) * personMultiplier;

  // Table Top Color, Screen Colors & Legs Colour: STRICTLY ₹0 (No price change)
  const tableTopColorCost = 0;
  const screenColorCost = 0;
  const legColorCost = 0;

  const effectiveBaseSizePrice = baseSizePrice * personMultiplier;

  const totalCalculatedPrice = Math.round(
    effectiveBaseSizePrice + 
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
        dimensions: sizeType === 'per_person' ? `${width} x ${depth} (${personQuantity} Person)` : totalSize,
        personQuantity,
        layoutType,
        material,
        thickness,
        tableTopColor,
        legMaterial,
        legStyle,
        legSize,
        legColor,
        frontScreen,
        middlePartition,
        screenQuantity,
        screenHeight,
        screenColor,
        modesty,
        electricFunction,
        addons,
        calculatedPrice: totalCalculatedPrice,
        priceBreakdown: {
          baseSizePrice: effectiveBaseSizePrice,
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
  }, [sizeType, width, depth, totalSize, personQuantity, layoutType, material, thickness, tableTopColor, legMaterial, legStyle, legSize, legColor, frontScreen, middlePartition, screenQuantity, screenHeight, screenColor, modesty, electricFunction, addons, totalCalculatedPrice, onChange]);

  const toggleAddon = (item: string) => {
    setAddons(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  return (
    <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900">Let's make your Setup</h3>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Base Variant Price</span>
          <span className="text-sm font-black text-indigo-700">₹{Number(baseSizePrice).toLocaleString()}</span>
        </div>
      </div>
      
      <div className="space-y-5">
        {/* 1. Size & Variant Pricing */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-slate-900">1. Size & Variant</label>
            {matchedSizeVariant && (
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Selected: {matchedSizeVariant.name || `${width} x ${depth}`}
              </span>
            )}
          </div>

          {/* Quick Size Variant Pills with Individual Prices */}
          {variants && variants.length > 0 && (
            <div className="mb-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Workstation Size Variants (Select to apply variant price):
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.filter(v => v.size).map(v => {
                  const parsed = parseSizeDimensions(v.size);
                  const wNum = width.replace(/[^0-9]/g, '');
                  const dNum = depth.replace(/[^0-9]/g, '');
                  const isSelected = (parsed.width && parsed.depth && parsed.width.replace(/[^0-9]/g, '') === wNum && parsed.depth.replace(/[^0-9]/g, '') === dNum) || activeVariant?.id === v.id;
                  const vPrice = typeof v.price === 'string' ? parseFloat(v.price.replace(/[^0-9.]/g, '')) || 0 : v.price;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        if (parsed.width) setWidth(parsed.width);
                        if (parsed.depth) setDepth(parsed.depth);
                        const num = parseInt((parsed.width || '').replace(/[^0-9]/g, ''), 10) || 1000;
                        setPersonQuantity(getStandardPersonsForWidth(num));
                        onSelectVariant?.(v);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs border transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold">{v.size?.replace(' mm', '')}</span>
                      <span className={`font-black text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        ₹{vPrice.toLocaleString()}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Custom Width</label>
              <select 
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium text-sm"
              >
                {availableWidths.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Custom Depth</label>
              <select 
                value={depth}
                onChange={(e) => handleDepthChange(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium text-sm"
              >
                {availableDepths.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Person Quantity (Workstation Seater Capacity) */}
        {isMultiPersonAllowed && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                2. Person Quantity
              </label>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {personQuantity} {personQuantity === 1 ? 'Person' : `${personQuantity} Persons`}
              </span>
            </div>

            {/* Preset Seater Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2.5">
              {[1, 2, 3, 4, 6, 8, 10, 12].map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setPersonQuantity(qty)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    personQuantity === qty
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/25 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-sm">{qty}P</span>
                  <span className="text-[9px] text-slate-500 font-medium">
                    {qty === 1 ? 'Single' : qty === 2 ? '2-Pod' : qty === 3 ? '3-Pod' : qty === 4 ? '4-Pod' : `${qty}P`}
                  </span>
                </button>
              ))}
            </div>

            {/* Stepper for custom person count & Pod Footprint Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Custom Seater Count:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonQuantity(prev => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Decrease person count"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={personQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 48) {
                        setPersonQuantity(val);
                      }
                    }}
                    className="w-10 text-center font-black text-sm text-slate-900 border border-slate-200 rounded py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => setPersonQuantity(prev => Math.min(48, prev + 1))}
                    className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Increase person count"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Calculated Pod Footprint */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-lg text-xs flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-0.5">
                  Table Layout
                </span>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>
                    {personQuantity > 1 ? `Shared ${widthNum} mm Table • ${personQuantity} Workstations` : `Single ${widthNum} mm Desk`}
                  </span>
                </div>
              </div>
            </div>

            {/* Layout arrangement selector if 2 or more persons */}
            {personQuantity > 1 && (
              <div className="mt-2 flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg">
                <span className="text-[11px] font-bold text-slate-700 ml-1">Arrangement:</span>
                <button
                  type="button"
                  onClick={() => setLayoutType('linear')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    layoutType === 'linear' ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>➡️ Side-by-Side on {widthNum}mm Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutType('cluster')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    layoutType === 'cluster' ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>👥 Face-to-Face Pods</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Material */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">3. Material</label>
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

        {/* 4. Thickness */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">4. Thickness</label>
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

        {/* 5. Table Top Colour */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              5. Table Top Colour
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

        {/* 6. Legs */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">6. Legs</label>
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
        
        {/* 7. Front & Side Screen's */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-800">7. Screen Type (Privacy Partition)</label>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {frontScreen} • {screenHeight} {screenQuantity > 1 && `(${screenQuantity} Screens)`}
            </span>
          </div>
          <select 
            value={frontScreen}
            onChange={(e) => setFrontScreen(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="Acrylic sheet">Acrylic sheet (Privacy Screen)</option>
            <option value="Pin up board">Pin up board (Fabric Acoustic)</option>
            <option value="Aluminium framing">Aluminium framing (Framed Glass/Acrylic)</option>
            <option value="Magnetic glass">Magnetic glass</option>
            <option value="Wooden">Wooden</option>
            <option value="No Screen">No Screen</option>
          </select>

          {/* Screen Quantity Option */}
          {frontScreen !== 'No Screen' && (
            <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Screen Quantity & Placement:
                </label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {screenQuantity === 1 ? '1 Screen (Front)' : screenQuantity === 2 ? '2 Screens (Front + 1 Side)' : '3 Screens (U-Shape Cubicle)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScreenQuantity(1)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    screenQuantity === 1
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black text-sm">1 Screen</span>
                  <span className="text-[10px] text-slate-500 font-normal">Front Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScreenQuantity(2)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    screenQuantity === 2
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black text-sm">2 Screens</span>
                  <span className="text-[10px] text-slate-500 font-normal">Front + 1 Side</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScreenQuantity(3)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    screenQuantity === 3
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black text-sm">3 Screens</span>
                  <span className="text-[10px] text-slate-500 font-normal">U-Shape Cubicle</span>
                </button>
              </div>
            </div>
          )}

          {/* Vertical Middle Partition Option (Divider Between Seaters) */}
          {frontScreen !== 'No Screen' && (
            <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Vertical Middle Partition (Divider Between Seaters):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Perpendicular divider partition running front-to-back between workstations for individual privacy
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  middlePartition === 'Included' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {middlePartition === 'Included' ? 'Middle Partition: Included' : 'No Middle Partition'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMiddlePartition('Included')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    middlePartition === 'Included'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-black text-xs">✓ Include Vertical Middle Partition</span>
                    <span className="text-[10px] text-slate-500 font-normal">Cross-divider with clamp mounts</span>
                  </div>
                  {middlePartition === 'Included' && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMiddlePartition('None')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    middlePartition === 'None'
                      ? 'border-slate-600 bg-slate-100 text-slate-900 ring-2 ring-slate-400/30 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-black text-xs">No Middle Partition (Optional)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Open continuous workspace</span>
                  </div>
                  {middlePartition === 'None' && <Check className="w-4 h-4 text-slate-600 shrink-0 ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 8. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">8. Front Screen Height</label>
          <select 
            value={screenHeight}
            onChange={(e) => setScreenHeight(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="300MM">300MM (Standard)</option>
            <option value="400MM">400MM (Medium)</option>
            <option value="450MM">450MM (Tall Privacy)</option>
          </select>
        </div>

        {/* 9. Screen Colours */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              9. Screen Colours (Acrylic / Partition)
              <span 
                className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-xs" 
                style={{ backgroundColor: getScreenHex(screenColor).fill }} 
              />
            </span>
            <span className="text-xs font-bold text-slate-500">{screenColor}</span>
          </label>
          <select 
            value={screenColor}
            onChange={(e) => handleScreenColorChange(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="Blue">Blue (Standard Translucent)</option>
            <option value="Grey">Grey (Frosted Smoke)</option>
            <option value="Green">Green (Fresh Tint)</option>
            <option value="Red">Red (Ruby Tint)</option>
            <option value="Orange">Orange (Amber Tint)</option>
            <option value="Custom Colour">Custom Colour</option>
          </select>
        </div>

        {/* 10. Modesty Panel */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              10. Modesty Panel (Under-Desk Privacy Board)
            </label>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${modesty === 'None' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
              {modesty === 'None' ? 'Not Included' : 'Included in Workstation'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setModesty('Include Modesty Panel')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                modesty !== 'None'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>Include Modesty Panel</span>
              {modesty !== 'None' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
            <button
              type="button"
              onClick={() => setModesty('None')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                modesty === 'None'
                  ? 'border-slate-500 bg-slate-100 text-slate-900 ring-1 ring-slate-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>No Modesty Panel</span>
              {modesty === 'None' && <Check className="w-3.5 h-3.5 text-slate-600" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            A 18mm modesty board installed beneath the desktop for legroom privacy and cable concealment.
          </p>
        </div>

        {/* 11. Flip Box / Wire Raceway (Only one: Either Flip Box OR Wire Raceway OR None) */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              11. Flip Box / Wire Raceway
            </label>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              electricFunction === 'None'
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : electricFunction === 'Flip Box'
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {electricFunction === 'None' ? 'None (Plain Top)' : electricFunction}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setElectricFunction('None')}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                electricFunction === 'None'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>🚫 None</span>
              <span className="text-[10px] text-slate-400 font-normal">Plain Tabletop</span>
            </button>

            <button
              type="button"
              onClick={() => setElectricFunction('Flip Box')}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                electricFunction === 'Flip Box'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-950 ring-1 ring-cyan-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>🔌 Flip Box</span>
              <span className="text-[10px] text-slate-400 font-normal">1 Box / Person</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!electricFunction.startsWith('Wire Raceway')) {
                  setElectricFunction('Wire Raceway (2 Switch Holes)');
                }
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                electricFunction.startsWith('Wire Raceway')
                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>⚡ Wire Raceway</span>
              <span className="text-[10px] text-slate-400 font-normal">1 Tray / Person</span>
            </button>
          </div>

          {/* Wire Raceway Switch Cutout Holes Sub-Options (1, 2, or 3 Holes per person) */}
          {electricFunction.startsWith('Wire Raceway') && (
            <div className="mt-2.5 p-2.5 bg-amber-50/60 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-950 flex items-center gap-1">
                  <span>⚡ Switch Cutout Holes (Per Person):</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  1 Tray Each
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'Wire Raceway (1 Switch Hole)', label: '1 Switch Hole', desc: '1 Module / Skt' },
                  { id: 'Wire Raceway (2 Switch Holes)', label: '2 Switch Holes', desc: '2 Modules (Std)' },
                  { id: 'Wire Raceway (3 Switch Holes)', label: '3 Switch Holes', desc: '3 Modules' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setElectricFunction(opt.id)}
                    className={`p-1.5 rounded-md text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                      electricFunction === opt.id || (electricFunction === 'Wire Raceway' && opt.id === 'Wire Raceway (2 Switch Holes)')
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100/50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[9px] font-normal ${
                      electricFunction === opt.id || (electricFunction === 'Wire Raceway' && opt.id === 'Wire Raceway (2 Switch Holes)')
                        ? 'text-amber-100'
                        : 'text-amber-700'
                    }`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-1.5">
            Each person gets their own dedicated Flip Box on top or Under-Desk Wire Raceway tray with custom switch cutouts.
          </p>
        </div>
        
        {/* 12. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">12. Add-ons</label>
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
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={addons.includes('CPU Stand')}
                onChange={() => toggleAddon('CPU Stand')}
                className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" 
              />
              <div>
                <span className="text-sm font-medium text-slate-800">Mobile Metal CPU Stand on Wheels</span>
                <p className="text-[11px] text-slate-500">Adjustable black steel dolly with 4 swivel caster wheels & protective rubber side grips.</p>
              </div>
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
