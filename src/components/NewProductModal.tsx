import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Upload, Image as ImageIcon, Loader2, Plus, Trash2, Sparkles, Layers, Check } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { isCategoryMatch, ProductVariant } from '../lib/products';
import { getVariantFile, compressImageFile } from '../lib/fileStorage';

interface NewProductModalProps {
  initialData?: any;
  isOpen: boolean;
  onClose: () => void;
  onAddProduct?: (product: any) => void;
  vendors: any[];
  mode?: 'purchase' | 'catalog';
  defaultCategory?: string;
}

export const WORKSTATION_SIZES = [
  "900 x 600 mm",
  "900 x 750 mm",
  "1000 x 600 mm",
  "1200 x 600 mm",
  "1200 x 750 mm",
  "1400 x 600 mm",
  "1500 x 600 mm",
  "1500 x 750 mm",
  "1800 x 600 mm",
  "1800 x 750 mm",
  "2400 x 600 mm (2-Seater Linear)",
  "1200 x 1200 mm (2-Seater Back-to-Back)",
  "2400 x 1200 mm (4-Seater Cluster)",
  "3600 x 1200 mm (6-Seater Cluster)",
  "1500 x 1500 mm (L-Shape Executive)"
];

export const POPULAR_SIZE_SHORTCUTS = [
  { size: "900 x 600 mm", label: "900 x 600" },
  { size: "900 x 750 mm", label: "900 x 750" },
  { size: "1000 x 600 mm", label: "1000 x 600" },
  { size: "1200 x 600 mm", label: "1200 x 600" },
  { size: "1200 x 750 mm", label: "1200 x 750" },
  { size: "1500 x 600 mm", label: "1500 x 600" }
];


export const WORKSTATION_COLORS = [
  { name: "Frosty White", hex: "#F8FAFC" },
  { name: "Classic Walnut", hex: "#4E342E" },
  { name: "Gothic Grey", hex: "#78909C" },
  { name: "Natural Teak", hex: "#8D6E63" },
  { name: "Oxford Cherry", hex: "#5D4037" },
  { name: "Charcoal Black", hex: "#263238" },
  { name: "Highland Pine", hex: "#D7CCC8" }
];

export const CATALOG_CATEGORIES: Record<string, string[]> = {
  "Workstation": ["Workstation's", "Linear Workstation", "L-Shape Workstation", "Cluster Workstation", "Face to face", "Wall facing", "Cubical"],
  "Office Studio": ["Workstation's", "Workstation", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series"],
  "Homes": ["Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks"],
  "Educational & Institutional": ["School desks & chairs", "Library furniture", "Admin Furniture"],
  "Factories & Warehouses": ["Racks", "Lockers", "Customize"],
  "Catalogues": []
};

export function NewProductModal({ isOpen, onClose, onAddProduct, vendors, initialData, mode = 'catalog', defaultCategory }: NewProductModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customCategoryVal, setCustomCategoryVal] = useState('');
  const [formData, setFormData] = useState({
    productName: '',
    specification: '',
    price: '',
    totalUnitPrice: '',
    perUnitPrice: '',
    measuringMetric: 'kg',
    category: '',
    vendorId: '',
    details: ''
  });

  const [selectedMainCategory, setSelectedMainCategory] = useState('Workstation');
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Load existing variants if editing
  useEffect(() => {
    if (isOpen && initialData?.variants && initialData.variants.length > 0) {
      const loadVariantImages = async () => {
        const loaded = await Promise.all(initialData.variants.map(async (v: ProductVariant) => {
          if (!v.imageData && v.id) {
            const data = await getVariantFile(v.id);
            if (data) return { ...v, imageData: data };
          }
          return v;
        }));
        setVariants(loaded);
      };
      loadVariantImages();
    } else if (isOpen && !initialData) {
      setVariants([]);
    }
  }, [isOpen, initialData]);
  
  React.useEffect(() => {
    if (isOpen) {
      const catToMatch = initialData?.category || defaultCategory;
      if (catToMatch) {
        const foundMain = Object.entries(CATALOG_CATEGORIES).find(([main, subs]) => 
          isCategoryMatch(catToMatch, main) || subs.some(s => isCategoryMatch(catToMatch, s))
        );
        if (foundMain) {
          setSelectedMainCategory(foundMain[0]);
          setFormData(prev => ({ ...prev, category: catToMatch }));
        } else {
          setSelectedMainCategory('Workstation');
          setFormData(prev => ({ ...prev, category: catToMatch }));
        }
      } else {
        setSelectedMainCategory('Workstation');
        setFormData(prev => ({ ...prev, category: "Workstation's" }));
      }
    }
  }, [isOpen, initialData, defaultCategory]);

  React.useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        productName: initialData.name || initialData.productName || '',
        specification: initialData.specification || '',
        price: initialData.price || '',
        totalUnitPrice: initialData.details?.totalUnitPrice || '',
        perUnitPrice: initialData.details?.perUnitPrice || '',
        measuringMetric: initialData.details?.measuringMetric || 'kg',
        category: initialData.category || defaultCategory || "Workstation's",
        vendorId: initialData.vendorId || '',
        details: initialData.details?.details || ''
      });
      setProductImage(null);
    } else if (isOpen) {
      setFormData({
        productName: '',
        specification: '',
        price: '',
        totalUnitPrice: '',
        perUnitPrice: '',
        measuringMetric: 'kg',
        category: defaultCategory || "Workstation's",
        vendorId: '',
        details: ''
      });
      setProductImage(null);
    }
  }, [isOpen, initialData, defaultCategory]);

  const [productImage, setProductImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);


    const handleGenerateDescription = async () => {
    if (!formData.productName || formData.details) return;
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: formData.productName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.description) {
          setFormData(prev => ({ ...prev, details: data.description }));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to auto-write details: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const readFileAsDataURL = (file: File | null): Promise<string | undefined> => {
    if (!file) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateWorkstationPresets = () => {
    const basePriceNum = parseFloat(formData.price || formData.totalUnitPrice || '14500') || 14500;
    const pName = formData.productName || 'Workstation';
    
    const presets: ProductVariant[] = [
      {
        id: `var_${Date.now()}_1`,
        name: `${pName} (900 x 600 mm)`,
        size: "900 x 600 mm",
        color: "Frosty White",
        colorCode: "#F8FAFC",
        price: Math.round(basePriceNum * 0.85).toString()
      },
      {
        id: `var_${Date.now()}_2`,
        name: `${pName} (900 x 750 mm)`,
        size: "900 x 750 mm",
        color: "Frosty White",
        colorCode: "#F8FAFC",
        price: Math.round(basePriceNum * 0.95).toString()
      },
      {
        id: `var_${Date.now()}_3`,
        name: `${pName} (1200 x 600 mm)`,
        size: "1200 x 600 mm",
        color: "Classic Walnut",
        colorCode: "#4E342E",
        price: Math.round(basePriceNum).toString()
      },
      {
        id: `var_${Date.now()}_4`,
        name: `${pName} (1500 x 600 mm)`,
        size: "1500 x 600 mm",
        color: "Natural Teak",
        colorCode: "#8D6E63",
        price: Math.round(basePriceNum * 1.2).toString()
      }
    ];

    setVariants(prev => [...prev, ...presets]);
  };

  const handleAddVariantWithSize = (chosenSize?: string) => {
    const pName = formData.productName || 'Workstation';
    const basePrice = formData.price || formData.totalUnitPrice || '14500';
    const targetSize = chosenSize || WORKSTATION_SIZES[Math.min(variants.length, WORKSTATION_SIZES.length - 1)];
    const cleanSizeLabel = targetSize.split(' (')[0];
    const newVar: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${pName} (${cleanSizeLabel})`,
      size: targetSize,
      color: WORKSTATION_COLORS[variants.length % WORKSTATION_COLORS.length].name,
      colorCode: WORKSTATION_COLORS[variants.length % WORKSTATION_COLORS.length].hex,
      price: basePrice
    };
    setVariants(prev => [...prev, newVar]);
  };

  const handleAddVariant = () => {
    handleAddVariantWithSize();
  };

  const handleUpdateVariant = (id: string, updates: Partial<ProductVariant>) => {
    setVariants(prev => prev.map(v => {
      if (v.id === id) {
        const updated = { ...v, ...updates };
        if (updates.color) {
          const match = WORKSTATION_COLORS.find(c => c.name.toLowerCase() === updates.color?.toLowerCase());
          if (match) updated.colorCode = match.hex;
        }
        return updated;
      }
      return v;
    }));
  };

  const handleDeleteVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleVariantImageChange = async (variantId: string, file: File) => {
    try {
      const dataUrl = await compressImageFile(file);
      if (!dataUrl) return;
      setVariants(prev => prev.map(v => v.id === variantId ? {
        ...v,
        imageName: file.name,
        imageData: dataUrl
      } : v));
    } catch (err) {
      console.error("Error compressing variant image", err);
    }
  };

  const handleRemoveVariantImage = (variantId: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? {
      ...v,
      imageName: undefined,
      imageData: undefined
    } : v));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const productImageData = await readFileAsDataURL(productImage);
      
      const selectedVendor = vendors.find(v => v.id === formData.vendorId);
      const finalCategory = customCategoryMode && customCategoryVal.trim() 
        ? customCategoryVal.trim() 
        : (formData.category || selectedMainCategory || "Workstation's");
      
      if (onAddProduct) {
        await onAddProduct({
          ...formData,
          name: formData.productName,
          productName: formData.productName,
          category: finalCategory,
          vendorName: selectedVendor?.name || '',
          productImageName: productImage?.name,
          productImageData,
          variants: variants,
          hasVariants: variants.length > 0,
          details: {
            details: formData.details,
            productName: formData.productName,
            category: finalCategory,
            totalUnitPrice: formData.totalUnitPrice,
            perUnitPrice: formData.perUnitPrice,
            measuringMetric: formData.measuringMetric,
          }
        });
      }
    } catch (error) {
      console.error("Error reading file", error);
    } finally {
      setIsProcessing(false);
      
      // Reset form
      setFormData({
        productName: '',
        specification: '',
        price: '',
        totalUnitPrice: '',
        perUnitPrice: '',
        measuringMetric: 'kg',
        category: '',
        vendorId: '',
        details: ''
      });
      setProductImage(null);
      setVariants([]);
      setCustomCategoryMode(false);
      setCustomCategoryVal('');
      
      onClose();
    }
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 sm:p-6">
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
            className="relative bg-white rounded-none md:rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{mode === 'catalog' ? 'Add Catalog Product' : 'Add Product'}</h3>
                  <p className="text-xs font-medium text-slate-500">{mode === 'catalog' ? 'Add a new product to your directory' : 'Add a new product to purchase'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="new-purchase-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Name</label>
                    <input 
                      type="text" 
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      placeholder={mode === 'catalog' ? 'e.g. 4-Seater Linear Workstation' : 'e.g. Raw Steel Sheets'}
                      required
                    />
                  </div>
                  
                  {mode === 'purchase' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Specification</label>
                      <input 
                        type="text" 
                        name="specification"
                        value={formData.specification}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="e.g. 5mm thickness, industrial grade"
                      />
                    </div>
                  )}

                  {mode === 'catalog' ? (
                    <>
                      {customCategoryMode ? (
                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Category</label>
                            <button
                              type="button"
                              onClick={() => setCustomCategoryMode(false)}
                              className="text-xs text-indigo-600 hover:underline font-medium"
                            >
                              Choose from catalog list
                            </button>
                          </div>
                          <input
                            type="text"
                            value={customCategoryVal}
                            onChange={(e) => {
                              setCustomCategoryVal(e.target.value);
                              setFormData(prev => ({ ...prev, category: e.target.value }));
                            }}
                            placeholder="e.g. Workstations, Office Pods"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                            required
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5 md:col-span-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Main Category</label>
                              <button
                                type="button"
                                onClick={() => setCustomCategoryMode(true)}
                                className="text-[11px] text-indigo-600 hover:underline font-medium"
                              >
                                + Custom
                              </button>
                            </div>
                            <select 
                              value={selectedMainCategory}
                              onChange={(e) => {
                                const main = e.target.value;
                                setSelectedMainCategory(main);
                                const subs = CATALOG_CATEGORIES[main] || [];
                                if (subs.length === 0) {
                                  setFormData(prev => ({ ...prev, category: main }));
                                } else {
                                  setFormData(prev => ({ ...prev, category: subs[0] }));
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                              required
                            >
                              <option value="" disabled>Select Menu</option>
                              {Object.keys(CATALOG_CATEGORIES).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5 md:col-span-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sub Category / Type</label>
                            <select 
                              name="category"
                              value={formData.category}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                              required
                              disabled={!selectedMainCategory || CATALOG_CATEGORIES[selectedMainCategory]?.length === 0}
                            >
                              <option value="" disabled>Select Sub Menu</option>
                              {selectedMainCategory && CATALOG_CATEGORIES[selectedMainCategory]?.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                              {selectedMainCategory && CATALOG_CATEGORIES[selectedMainCategory]?.length === 0 && (
                                <option value={selectedMainCategory}>{selectedMainCategory}</option>
                              )}
                            </select>
                          </div>
                        </>
                      )}
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price (₹)</label>
                        <input 
                          type="number" 
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. 15000"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</label>
                        <input 
                          type="text" 
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          list="product-categories"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          placeholder="Select or enter category (e.g. Hardware)"
                        />
                        <datalist id="product-categories">
                          {Array.from(new Set(vendors.map((v, i) => v.category).filter(Boolean))).map(cat => (
                            <option key={cat} value={cat as string} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Measuring Metric</label>
                        <select 
                          name="measuringMetric"
                          value={formData.measuringMetric}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required={mode === 'purchase'}
                        >
                          <option value="kg">kg</option>
                          <option value="sqft">sqft</option>
                          <option value="meters">meters</option>
                          <option value="liters">liters</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Unit Price</label>
                        <input 
                          type="text" 
                          name="totalUnitPrice"
                          value={formData.totalUnitPrice}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. ₹1000"
                          required={mode === 'purchase'}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Per Unit Price</label>
                        <input 
                          type="text" 
                          name="perUnitPrice"
                          value={formData.perUnitPrice}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. ₹10/kg"
                          required={mode === 'purchase'}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vendor</label>
                        <select 
                          name="vendorId"
                          value={formData.vendorId}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required={mode === 'purchase'}
                        >
                          <option value="" disabled>Select a vendor</option>
                          {vendors.map((v, i) => (
                            <option key={`${v.docId || v.id || 'k'}-${i}`} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between w-full">
                      <span>Details</span>
                      <button 
                        type="button" 
                        onClick={handleGenerateDescription}
                        disabled={isGeneratingDesc || !formData.productName}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1 text-[10px] lowercase px-2 py-1 bg-indigo-50 rounded"
                      >
                        {isGeneratingDesc ? <><Loader2 className="w-3 h-3 animate-spin" /> auto writing...</> : "✨ auto-write"}
                      </button>
                    </label>
                    <textarea 
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none custom-scrollbar"
                      placeholder="Additional details about the product..."
                    />
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Base Product Image</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => imageInputRef.current?.click()}>
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setProductImage(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-6 h-6 text-emerald-500" />
                      </div>
                      {productImage ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-800 break-all">{productImage.name}</p>
                          <p className="text-xs text-emerald-600 font-medium mt-1">Image selected successfully</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700">Click to upload base product image</p>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Simple Sizes & Images Section */}
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Sizes & Product Images
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add product sizes and upload an image for each size.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddVariantWithSize()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Size
                    </button>
                  </div>

                  {/* Quick Add Size Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Add:</span>
                    {POPULAR_SIZE_SHORTCUTS.map(shortcut => (
                      <button
                        key={shortcut.size}
                        type="button"
                        onClick={() => handleAddVariantWithSize(shortcut.size)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-md text-xs font-medium text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-slate-400" />
                        {shortcut.label} mm
                      </button>
                    ))}
                  </div>

                  {variants.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                      <p className="text-xs text-slate-600 font-medium mb-3">No sizes added yet. Click a quick size above or click below to start:</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddVariantWithSize("900 x 600 mm")}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          + Add 900 x 600 mm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariantWithSize("900 x 750 mm")}
                          className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                        >
                          + Add 900 x 750 mm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                      {variants.map((v, index) => (
                        <div 
                          key={v.id} 
                          className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Size Name / Dimension */}
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Size {index + 1}
                            </label>
                            <input
                              type="text"
                              list={`sizes-list-${v.id}`}
                              value={v.size || ''}
                              onChange={(e) => {
                                const newSize = e.target.value;
                                handleUpdateVariant(v.id, { 
                                  size: newSize,
                                  name: `${formData.productName || 'Product'} (${newSize})`
                                });
                              }}
                              placeholder="e.g. 900 x 600 mm"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <datalist id={`sizes-list-${v.id}`}>
                              {WORKSTATION_SIZES.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </div>

                          {/* Image for this Size */}
                          <div className="sm:w-72">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Product Image ({v.size || `Size ${index + 1}`})
                            </label>
                            <input
                              type="file"
                              id={`var-file-${v.id}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleVariantImageChange(v.id, e.target.files[0]);
                                }
                              }}
                            />
                            {v.imageData ? (
                              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                                <img 
                                  src={v.imageData} 
                                  alt={v.size || 'Size image'} 
                                  className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0 bg-white" 
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 truncate">
                                    <Check className="w-3 h-3 text-emerald-600" /> Image uploaded
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.getElementById(`var-file-${v.id}`);
                                        if (input) (input as HTMLInputElement).click();
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                      Change
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariantImage(v.id)}
                                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`var-file-${v.id}`);
                                  if (input) (input as HTMLInputElement).click();
                                }}
                                className="w-full h-10 px-3 border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors cursor-pointer bg-slate-50/50"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-400" />
                                <span>Upload Product Image</span>
                              </button>
                            )}
                          </div>

                          {/* Price (₹) for this Size */}
                          <div className="sm:w-36">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Price (₹)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                value={v.price || ''}
                                onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })}
                                placeholder="Price"
                                className="w-full pl-6 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Remove Row Button */}
                          <div className="flex sm:flex-col justify-end pt-1 sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete this size"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="new-purchase-form"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : initialData ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
