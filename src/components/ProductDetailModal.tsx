import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, MapPin, Mail, Phone, Package, Scale, IndianRupee, FileText, Layers, Camera, Sparkles, Loader2, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { getProductFile, getProductImages } from '../lib/fileStorage';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  vendor: Vendor | null;
}

export function ProductDetailModal({ isOpen, onClose, product, vendor }: ProductDetailModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);

  useEffect(() => {
    if (product && isOpen) {
      const imgs: string[] = [];
      if (product.details?.productImageData) {
        imgs.push(product.details.productImageData);
        setImageSrc(product.details.productImageData);
      }

      if (Array.isArray(product.images)) imgs.push(...product.images);
      else if (Array.isArray(product.details?.images)) imgs.push(...product.details.images);

      if (product.variants) {
        product.variants.forEach(v => {
          if (v.imageData && !imgs.includes(v.imageData)) imgs.push(v.imageData);
        });
      }

      const uniqueList = Array.from(new Set(imgs));
      setAllImages(uniqueList);
      if (uniqueList.length > 0 && !imageSrc) {
        setImageSrc(uniqueList[0]);
      }

      if (!product.details?.productImageData && (product.docId || product.id)) {
        getProductFile(product.docId || product.id).then((data) => {
          if (data) {
            setImageSrc(data);
            setAllImages(prev => Array.from(new Set([data, ...prev])));
          }
        }).catch(console.error);

        getProductImages(product.docId || product.id).then((loaded) => {
          if (loaded && loaded.length > 0) {
            setAllImages(prev => Array.from(new Set([...prev, ...loaded])));
          }
        }).catch(console.error);
      }
    }
  }, [product, isOpen]);

  if (!product) return null;

  // STRICT REQUIREMENT #1: Only the actual typed description
  const typedDescription = product.description || product.details?.details || product.details?.description;
  const isSittingSeries = 
    product.category?.toLowerCase().includes('sitting') ||
    product.category?.toLowerCase().includes('seating') ||
    product.name?.toLowerCase().includes('chair');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full overflow-hidden flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            {/* Left: Product Images View */}
            <div className="w-full md:w-1/2 bg-slate-50 flex flex-col items-center justify-between p-6 relative min-h-[360px] border-r border-slate-100">
              
              {/* Main Visualizer Area */}
              <div className="w-full flex-1 flex items-center justify-center relative min-h-[260px]">
                {imageSrc ? (
                  <img src={imageSrc} alt={product.name} className="max-w-full max-h-64 object-contain mix-blend-multiply transition-all p-2" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <Package className="w-20 h-20 mb-3 opacity-40" />
                    <span className="text-xs font-semibold">No image available</span>
                  </div>
                )}
              </div>

              {/* Multiple Thumbnails Strip */}
              {allImages.length > 1 && (
                <div className="w-full mt-4 flex items-center justify-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                  {allImages.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageSrc(src)}
                      className={`relative w-12 h-12 rounded-lg border overflow-hidden p-0.5 bg-white shrink-0 transition-all cursor-pointer ${
                        imageSrc === src 
                          ? 'border-indigo-600 ring-2 ring-indigo-500/25 shadow-xs scale-105' 
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Right: Product Details Column */}
            <div className="w-full md:w-1/2 flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-1">{product.name}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                      {product.category || product.details?.category || 'Furniture'}
                    </span>
                    {product.vendorName && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                        {product.vendorName}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Pricing / Metric */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      Starting Price
                    </div>
                    <div className="font-black text-slate-900 text-xl">
                      {product.variants && product.variants.filter(Boolean).length > 0 ? (
                        <>₹{(Math.min(...product.variants.filter(Boolean).map(v => typeof v?.price === 'string' ? parseFloat(v.price.replace(/[^0-9.]/g, '')) || 0 : (Number(v?.price) || 0))) || 0).toLocaleString()}</>
                      ) : (
                        product.details?.perUnitPrice ? `₹${product.details.perUnitPrice}` : (product.price ? `₹${product.price}` : '-')
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                      <Scale className="w-3.5 h-3.5" />
                      Metric / Unit
                    </div>
                    <div className="font-bold text-slate-800 text-xl">
                      {product.details?.measuringMetric || 'Pcs'}
                    </div>
                  </div>
                </div>

                {/* PRODUCT DESCRIPTION (Strictly only the actual description typed by user - Requirement #1) */}
                {typedDescription && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      Description
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {typedDescription}
                    </p>
                  </div>
                )}

                {/* Product Variants (Color Variants & Prices - Requirement #2) */}
                {product.variants && product.variants.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        {isSittingSeries ? 'Sitting Series Color Variants & Prices' : `Available Variants (${product.variants.length})`}
                      </span>
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {product.variants.map((v, idx) => (
                        <div 
                          key={v.id || idx} 
                          onClick={() => {
                            if (v.imageData) setImageSrc(v.imageData);
                          }}
                          className={`p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs ${v.imageData ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            {v.imageData ? (
                              <img src={v.imageData} alt={v.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-white" />
                            ) : v.colorCode ? (
                              <div className="w-7 h-7 rounded-full border border-slate-300 shrink-0 shadow-2xs" style={{ backgroundColor: v.colorCode }} />
                            ) : null}
                            <div>
                              <div className="font-bold text-slate-800">{v.name}</div>
                              {v.color && <div className="text-slate-500 text-[11px] font-medium">{v.color}</div>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-indigo-600 font-black text-sm">
                              ₹{typeof v.price === 'string' ? parseFloat(v.price.replace(/[^0-9.]/g, '')).toLocaleString() : Number(v.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Vendor Info */}
                {vendor && (
                  <section className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      Vendor Details
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-slate-800 text-sm">{vendor.name}</div>
                      {(vendor.address || (vendor as any).location) && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{vendor.address || (vendor as any).location}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
