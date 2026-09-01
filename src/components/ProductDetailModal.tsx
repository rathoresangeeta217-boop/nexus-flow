import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, MapPin, Mail, Phone, Package, Scale, IndianRupee, FileText } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { getProductFile } from '../lib/fileStorage';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  vendor: Vendor | null;
}

export function ProductDetailModal({ isOpen, onClose, product, vendor }: ProductDetailModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (product && isOpen) {
      if (product.details?.productImageData) {
        setImageSrc(product.details.productImageData);
      } else if (product.docId || product.id) {
        getProductFile(product.docId || product.id).then((data) => {
          if (data) setImageSrc(data);
        }).catch(console.error);
      }
    }
  }, [product, isOpen]);

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-full overflow-hidden flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-8 relative min-h-[300px]">
              {imageSrc ? (
                <img src={imageSrc} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              ) : (
                <div className="text-slate-300 flex flex-col items-center">
                  <Package className="w-24 h-24 mb-4 opacity-50" />
                  <span className="text-sm font-medium">No image available</span>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col h-full max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">{product.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold">
                      {product.vendorName}
                    </span>
                    {product.specification && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                        {product.specification}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Product Details Section */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-500" />
                    Product Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        Unit Price
                      </div>
                      <div className="font-bold text-slate-800 text-lg">
                        {product.details?.perUnitPrice ? `₹${product.details.perUnitPrice}` : (product.price ? `₹${product.price}` : '-')}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                        <Scale className="w-3.5 h-3.5" />
                        Metric
                      </div>
                      <div className="font-bold text-slate-800 text-lg">
                        {product.details?.measuringMetric || '-'}
                      </div>
                    </div>
                  </div>
                  
                  {product.details?.details && (
                    <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        Description
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {product.details.details}
                      </p>
                    </div>
                  )}
                </section>

                {/* Vendor Information Section */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Vendor Information
                  </h3>
                  {vendor ? (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h4 className="font-bold text-slate-800">{vendor.name}</h4>
                        {vendor.contactPerson && (
                          <p className="text-xs text-slate-500 mt-0.5">Contact: {vendor.contactPerson}</p>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        {vendor.email && (
                          <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <a href={`mailto:${vendor.email}`} className="text-sm text-indigo-600 hover:underline">{vendor.email}</a>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <a href={`tel:${vendor.phone}`} className="text-sm text-slate-700">{vendor.phone}</a>
                          </div>
                        )}
                        {vendor.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-700 leading-relaxed">{vendor.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                      <p className="text-sm text-slate-500">Detailed vendor information not available.</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
