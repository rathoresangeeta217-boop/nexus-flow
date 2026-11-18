import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  Star, 
  ShoppingCart, 
  Zap, 
  Heart, 
  Truck, 
  RotateCcw, 
  Sparkles, 
  Package, 
  Scale, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Check, 
  Minus, 
  Plus, 
  FileText, 
  Layers, 
  ShieldCheck,
  CheckCircle2,
  Copy
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product, parsePriceNumber, resolveVariantPriceMode, loadProductMediaFromFirestore } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { getProductFile, getProductImages } from '../lib/fileStorage';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  vendor: Vendor | null;
  onAddToCart?: (product: Product, quantity: number, selectedVariant?: any) => void;
}

export function ProductDetailModal({ isOpen, onClose, product, vendor, onAddToCart }: ProductDetailModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isGiftWrap, setIsGiftWrap] = useState<boolean>(false);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  
  // Pincode checker state
  const [pincode, setPincode] = useState<string>('');
  const [pincodeResult, setPincodeResult] = useState<string | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState<boolean>(false);

  // Active Tab: DESCRIPTION | SPECIFICATIONS | SHIPPING | REVIEWS
  const [activeTab, setActiveTab] = useState<'DESCRIPTION' | 'SPECIFICATIONS' | 'SHIPPING' | 'REVIEWS'>('DESCRIPTION');

  // Share & Cart toast state
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [cartSuccess, setCartSuccess] = useState<boolean>(false);
  const [buyNowSuccess, setBuyNowSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (product && isOpen) {
      setQuantity(1);
      setIsGiftWrap(false);
      setPincode('');
      setPincodeResult(null);
      setActiveTab('DESCRIPTION');
      setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);

      const imgs: string[] = [];
      const firstDirectImg = product.productImageData || product.details?.productImageData || product.thumbnailData;
      if (product.productImageData) imgs.push(product.productImageData);
      if (product.details?.productImageData) imgs.push(product.details.productImageData);
      if (firstDirectImg) {
        setImageSrc(firstDirectImg);
      }

      if (Array.isArray(product.images)) imgs.push(...product.images);
      else if (Array.isArray(product.details?.images)) imgs.push(...product.details.images);

      if (product.variants) {
        product.variants.forEach(v => {
          if (v.imageData && !imgs.includes(v.imageData)) imgs.push(v.imageData);
        });
      }
      if (imgs.length === 0 && product.thumbnailData) {
        imgs.push(product.thumbnailData);
      }

      const uniqueList = Array.from(new Set(imgs.filter(Boolean)));
      setAllImages(uniqueList);
      if (uniqueList.length > 0 && !firstDirectImg) {
        setImageSrc(uniqueList[0]);
      }

      const lookupId = product.docId || product.id;
      if (lookupId) {
        getProductFile(lookupId).then((data) => {
          if (data) {
            setImageSrc(prev => prev || data);
            setAllImages(prev => Array.from(new Set([data, ...prev])));
          }
        }).catch(console.error);

        getProductImages(lookupId).then((loaded) => {
          if (loaded && loaded.length > 0) {
            setAllImages(prev => Array.from(new Set([...prev, ...loaded])));
          }
        }).catch(console.error);

        loadProductMediaFromFirestore(lookupId).then((cloud) => {
          const cloudList = [
            ...(cloud.primaryImage ? [cloud.primaryImage] : []),
            ...cloud.images,
            ...Object.values(cloud.variantImages)
          ].filter(Boolean);
          if (cloudList.length > 0) {
            setAllImages(prev => Array.from(new Set([...cloudList, ...prev])));
            setImageSrc(prev => (!prev || prev === product.thumbnailData) ? (cloud.primaryImage || cloudList[0]) : prev);
          }
        }).catch(console.error);
      }
    }
  }, [product, isOpen]);

  if (!product) return null;

  // STRICT REQUIREMENT: Only the actual typed description
  const typedDescription = product.description || product.details?.details || product.details?.description;
  const categoryName = (product.category || product.details?.category || 'MODULAR WORKSPACE').toUpperCase();

  // Pricing calculation
  const parseNum = parsePriceNumber;
  const baseProductPrice = parseNum(product.salesRate) || parseNum(product.details?.perUnitPrice) || parseNum(product.details?.totalUnitPrice) || parseNum(product.price) || 200;

  let rawPrice = baseProductPrice;
  if (selectedVariant) {
    const varPrice = parseNum(selectedVariant.price);
    const varMode = resolveVariantPriceMode(selectedVariant, baseProductPrice);
    if (varPrice > 0) {
      rawPrice = varMode === 'addon' ? baseProductPrice + varPrice : varPrice;
    }
  } else if (product.variants && product.variants.length > 0) {
    const validTotalPrices = product.variants
      .filter(v => resolveVariantPriceMode(v, baseProductPrice) === 'total')
      .map(v => parseNum(v.price))
      .filter(p => p > 0);
    if (validTotalPrices.length > 0) {
      rawPrice = Math.min(...validTotalPrices);
    }
  }

  // MRP calculation (either from product.details?.mrp or calculated ~25-40% higher or as shown in user catalog)
  const storedMrp = parseNum((product.details as any)?.mrp || (product as any).mrp);
  const mrp = storedMrp > rawPrice ? storedMrp : Math.round(rawPrice * 1.35);
  const discountPct = mrp > rawPrice ? Math.round(((mrp - rawPrice) / mrp) * 100) : 0;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on SRK Modular Portal`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(`${product.name} - ₹${rawPrice.toLocaleString()} | SRK Modular Portal`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      }
    } catch {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim()) return;
    setIsCheckingPincode(true);
    setTimeout(() => {
      setIsCheckingPincode(false);
      if (/^\d{6}$/.test(pincode.trim())) {
        setPincodeResult(`Delivery available in 3-5 business days for Pincode ${pincode.trim()}. Express dispatch eligible.`);
      } else {
        setPincodeResult('Please enter a valid 6-digit Indian postal code.');
      }
    }, 400);
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity, selectedVariant);
    }
    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 2500);
  };

  const handleBuyNow = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity, selectedVariant);
    }
    setBuyNowSuccess(true);
    setTimeout(() => {
      setBuyNowSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row z-10 border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button top right on mobile/desktop */}
            <button 
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-slate-100 rounded-full transition-colors shadow-xs border border-slate-200/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Product Images View */}
            <div className="w-full md:w-5/12 bg-slate-50/70 p-4 sm:p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-100 min-h-[300px] md:min-h-[460px]">
              {/* Main Image Display */}
              <div className="w-full flex-1 flex items-center justify-center relative min-h-[220px] sm:min-h-[280px]">
                {imageSrc ? (
                  <img 
                    src={imageSrc} 
                    alt={product.name} 
                    className="max-w-full max-h-[260px] sm:max-h-[320px] object-contain mix-blend-multiply transition-all duration-200 drop-shadow-sm" 
                  />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center py-10">
                    <Package className="w-16 h-16 sm:w-20 sm:h-20 mb-3 opacity-30" />
                    <span className="text-xs font-semibold text-slate-400">No image available</span>
                  </div>
                )}
              </div>

              {/* Horizontal Thumbnails Carousel below main image */}
              {allImages.length > 1 && (
                <div className="w-full mt-4 flex items-center justify-center gap-2 overflow-x-auto py-1 custom-scrollbar px-1">
                  {allImages.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageSrc(src)}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 overflow-hidden p-1 bg-white shrink-0 transition-all cursor-pointer ${
                        imageSrc === src 
                          ? 'border-slate-800 ring-2 ring-slate-400/30 shadow-xs scale-105' 
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                      title={`Photo ${idx + 1}`}
                    >
                      <img src={src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details & Ecommerce Controls matching user's design */}
            <div className="w-full md:w-7/12 flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-8 bg-white">
              
              {/* Top Category, Product Title & Share */}
              <div className="space-y-1.5 pr-8">
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-400 uppercase">
                  {categoryName}
                </span>

                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                    {product.name}
                  </h1>
                  <button 
                    type="button"
                    onClick={handleShare}
                    title="Share product"
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer border border-slate-200/80"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {copiedShare && (
                  <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Details copied to clipboard!
                  </div>
                )}
              </div>

              {/* Rating & Reviews row */}
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/70 rounded-md">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span className="font-bold text-slate-800">4.8</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="hover:text-slate-800 cursor-pointer underline-offset-2">12 Reviews</span>
                {product.vendorName && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-medium">By {product.vendorName}</span>
                  </>
                )}
              </div>

              {/* Price Section */}
              <div className="mt-4">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    ₹{rawPrice.toLocaleString()}
                  </span>
                  {mrp > rawPrice && (
                    <span className="text-base sm:text-lg text-slate-400 line-through font-medium">
                      ₹{mrp.toLocaleString()}
                    </span>
                  )}
                  {discountPct > 0 && (
                    <span className="text-sm sm:text-base font-bold text-emerald-600">
                      -{discountPct}%
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                  INCLUSIVE OF ALL TAXES
                </div>
              </div>

              {/* Variant Selector (if variants exist) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Select Variant:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.variants.map((v, i) => {
                      const isSelected = selectedVariant?.id ? selectedVariant.id === v.id : selectedVariant?.name === v.name;
                      return (
                        <button
                          key={v.id || i}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(v);
                            if (v.imageData) setImageSrc(v.imageData);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-slate-800 bg-slate-900 text-white shadow-xs' 
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {v.colorCode && (
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/50 shrink-0 shadow-2xs" 
                              style={{ backgroundColor: v.colorCode }} 
                            />
                          )}
                          <span>{v.name || v.color || v.size || `Option ${i + 1}`}</span>
                          {parseNum(v.price) > 0 && (
                            <span className={isSelected ? 'text-amber-300 font-bold' : 'text-indigo-600 font-bold'}>
                              {resolveVariantPriceMode(v, baseProductPrice) === 'addon' ? '+₹' : '₹'}{parseNum(v.price).toLocaleString()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARD 1: Customization, Quantity, Add to Cart & Buy It Now */}
              <div className="mt-5 border border-slate-300/80 rounded-2xl p-4 sm:p-5 bg-white space-y-4 shadow-2xs">
                
                {/* Gift Wrap Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <input 
                    type="checkbox"
                    checked={isGiftWrap}
                    onChange={(e) => setIsGiftWrap(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Is this a Gift? <span className="text-base">🎁</span> Wrap it for just (<span className="font-bold">₹50</span>)
                  </span>
                </label>

                {/* Quantity Section */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    QUANTITY
                  </div>
                  <div className="inline-flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2.5 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-slate-800 select-none">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="p-2.5 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cart Action Buttons */}
                <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 py-3 px-4 border border-slate-700 hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    ADD TO CART
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 py-3 px-4 bg-[#555d59] hover:bg-[#434b47] text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    BUY IT NOW
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                    className={`p-3 border rounded-xl transition-all cursor-pointer shrink-0 ${
                      isWishlisted 
                        ? 'border-rose-300 bg-rose-50 text-rose-600' 
                        : 'border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Toast Feedback */}
                {cartSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Added {quantity} unit(s) of "{product.name}" to cart!
                  </div>
                )}
                {buyNowSuccess && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white flex items-center gap-2 animate-fade-in">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    Proceeding to quick checkout...
                  </div>
                )}
              </div>

              {/* CARD 2: Check Delivery Support / Pincode */}
              <div className="mt-4 border border-slate-300/80 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  <Truck className="w-4 h-4 text-slate-500" />
                  CHECK DELIVERY SUPPORT
                </div>

                <form onSubmit={handleCheckPincode} className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter Pincode"
                    className="flex-1 bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingPincode || !pincode}
                    className="px-5 py-2.5 bg-[#555d59] hover:bg-[#434b47] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                  >
                    {isCheckingPincode ? '...' : 'CHECK'}
                  </button>
                </form>

                {pincodeResult && (
                  <div className={`mt-2.5 text-xs font-medium ${pincodeResult.includes('valid') ? 'text-rose-600' : 'text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5'}`}>
                    {pincodeResult.includes('Delivery available') && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {pincodeResult}
                  </div>
                )}
              </div>

              {/* DUAL HIGHLIGHT BADGES */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-700 shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 fill-slate-700" />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider">
                      TRENDING DESIGN
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Most loved by our community
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-700 shrink-0 mt-0.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider">
                      EASY 7 DAYS RETURN
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      No questions asked policy
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM TABBED NAVIGATION */}
              <div className="mt-6 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
                  {(['DESCRIPTION', 'SPECIFICATIONS', 'SHIPPING', 'REVIEWS'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2.5 text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer relative ${
                          isActive 
                            ? 'text-slate-900 border-b-2 border-slate-900' 
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                <div className="pt-4 min-h-[90px]">
                  {/* TAB 1: DESCRIPTION (Strictly only the actual typed description from user) */}
                  {activeTab === 'DESCRIPTION' && (
                    <div className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                      {typedDescription ? (
                        typedDescription
                      ) : (
                        <span className="text-slate-400 italic">No description provided for this product.</span>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SPECIFICATIONS */}
                  {activeTab === 'SPECIFICATIONS' && (
                    <div className="space-y-4 text-xs">
                      {Array.isArray(product.specifications || product.details?.specifications) &&
                       (product.specifications || product.details?.specifications || []).length > 0 && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-2 border-b border-slate-100">
                          {(product.specifications || product.details?.specifications || []).map((spec: any, idx: number) => (
                            <div key={idx}>
                              <div className="text-[11px] text-slate-500 mb-0.5">{spec.label || 'Specification'}</div>
                              <div className="text-sm font-bold text-slate-900">{spec.value || '-'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Category</span>
                          <span className="font-bold text-slate-800">{product.category || product.details?.category || 'Standard'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Unit of Measurement</span>
                          <span className="font-bold text-slate-800">{product.details?.measuringMetric || 'Pcs / Units'}</span>
                        </div>
                      </div>

                      {product.vendorName && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-400 font-semibold text-[10px] uppercase">Manufacturer / Vendor</span>
                          <span className="font-bold text-slate-800">{product.vendorName}</span>
                        </div>
                      )}

                      {vendor && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-slate-400 font-semibold text-[10px] uppercase block">Vendor Contact</span>
                          <div className="text-slate-700">{vendor.name} • {vendor.phone || vendor.email || 'Verified Supplier'}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: SHIPPING */}
                  {activeTab === 'SHIPPING' && (
                    <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800">Dispatch Timeline:</span>
                        <span>Orders dispatched within 24 to 48 hours.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-bold text-slate-800">Packaging:</span>
                        <span>Multi-layer edge-protected packaging with bubble wrap.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-bold text-slate-800">Hassle-Free Returns:</span>
                        <span>7-day replacement or store credit on reported transit damages.</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: REVIEWS */}
                  {activeTab === 'REVIEWS' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-2xl font-black text-slate-800">4.8</div>
                        <div>
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">Based on 12 verified company orders</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 border-l-2 border-slate-300 pl-3 py-1 italic">
                        "High durability finish, excellent quality materials and on-time site dispatch."
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
