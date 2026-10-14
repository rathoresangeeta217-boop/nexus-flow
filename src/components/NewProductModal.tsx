import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  Plus, 
  Trash2, 
  Sparkles, 
  Layers, 
  Check, 
  Camera, 
  RotateCw, 
  Video, 
  VideoOff, 
  RefreshCw, 
  Star,
  Compass,
  Palette
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { isCategoryMatch, ProductVariant } from '../lib/products';
import { getVariantFile, compressImageFile, getProductImages } from '../lib/fileStorage';

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

export const SITTING_SERIES_POPULAR_COLORS = [
  { name: "Executive Black", hex: "#1E293B", priceOffset: 0 },
  { name: "Charcoal Grey", hex: "#475569", priceOffset: 0 },
  { name: "Navy Blue", hex: "#1E3A8A", priceOffset: 500 },
  { name: "Tan Brown", hex: "#92400E", priceOffset: 1200 },
  { name: "Burgundy Maroon", hex: "#831843", priceOffset: 1500 },
  { name: "Olive Green", hex: "#3F6212", priceOffset: 800 },
  { name: "Beige / Cream", hex: "#D97706", priceOffset: 600 },
  { name: "Pure White", hex: "#F8FAFC", priceOffset: 1000 }
];

export const PRODUCT_ANGLE_SLOTS = [
  { index: 0, title: 'Angle 1: Front View (Cover)', tag: 'Front 0°', desc: 'Main product front angle & card cover photo' },
  { index: 1, title: 'Angle 2: Side Profile', tag: 'Side 90°', desc: '90° side profile showing depth & structure' },
  { index: 2, title: 'Angle 3: Isometric 3/4 View', tag: '3/4 View', desc: 'Corner perspective showing front & side' },
  { index: 3, title: 'Angle 4: Back / Top View', tag: 'Back / Top', desc: 'Rear or overhead structure view' },
  { index: 4, title: 'Angle 5: Detail / Close-Up', tag: 'Detail', desc: 'Close-up material, texture, or joinery' },
] as const;

export const CATALOG_CATEGORIES: Record<string, string[]> = {
  "Workstation": ["Workstation's", "Linear Workstation", "L-Shape Workstation", "Cluster Workstation", "Face to face", "Wall facing", "Cubical"],
  "Office Studio": ["Workstation's", "Workstation", "Executive Table", "Conference Table", "Storages", "Reception's", "Seating Series", "Sitting Series"],
  "Homes": ["Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks"],
  "Educational & Institutional": ["School desks & chairs", "Library furniture", "Admin Furniture"],
  "Factories & Warehouses": ["Racks", "Lockers", "Customize"],
  "Catalogues": []
};

export function NewProductModal({ 
  isOpen, 
  onClose, 
  onAddProduct, 
  vendors, 
  initialData, 
  mode = 'catalog', 
  defaultCategory 
}: NewProductModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
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
    details: '' // This stores the actual product description typed by user
  });

  const [selectedMainCategory, setSelectedMainCategory] = useState('Workstation');
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // 5 Product Angles state
  const [productImages, setProductImages] = useState<string[]>([]);
  const targetSlotRef = useRef<number>(0);
  const specificSlotInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Determine if this product belongs to Sitting Series / Seating Series
  const isSittingSeries = 
    formData.category === 'Seating Series' ||
    formData.category === 'Sitting Series' ||
    formData.category?.toLowerCase().includes('sitting') ||
    formData.category?.toLowerCase().includes('seating') ||
    (selectedMainCategory === 'Office Studio' && (
      formData.category?.toLowerCase().includes('seat') || 
      formData.category?.toLowerCase().includes('sit')
    ));

  // Stop camera stream cleanup
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
    setCameraError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    try {
      stopCamera();
      setCameraLoading(true);
      setCameraError(null);
      setIsCameraActive(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.warn('Direct camera getUserMedia failed, falling back to camera file picker:', err);
      setCameraLoading(false);
      setCameraError(err?.message || 'Unable to open camera stream directly. You can use the device camera shutter below.');
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    await startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      setProductImages(prev => [...prev, dataUrl]);
      stopCamera();
    } catch (err: any) {
      console.error('Failed to capture photo:', err);
      setCameraError('Failed to capture photo. Please try again.');
    }
  };

  // Load existing variants, images, and 360 data if editing
  useEffect(() => {
    if (isOpen && initialData) {
      // Load variants
      if (initialData.variants && initialData.variants.length > 0) {
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
      } else {
        setVariants([]);
      }

      // Load product images
      const initialImgs: string[] = [];
      if (initialData.details?.productImageData) initialImgs.push(initialData.details.productImageData);
      if (Array.isArray(initialData.images)) initialImgs.push(...initialData.images);
      else if (Array.isArray(initialData.details?.images)) initialImgs.push(...initialData.details.images);

      if (initialImgs.length === 0 && (initialData.docId || initialData.id)) {
        getProductImages(initialData.docId || initialData.id).then(imgs => {
          if (imgs && imgs.length > 0) setProductImages(imgs);
        }).catch(console.error);
      } else {
        setProductImages(Array.from(new Set(initialImgs)));
      }
    } else if (isOpen && !initialData) {
      setVariants([]);
      setProductImages([]);
    }
  }, [isOpen, initialData]);
  
  // Category matching
  useEffect(() => {
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

  // Form data sync
  useEffect(() => {
    if (isOpen && initialData) {
      const typedDesc = initialData.description || initialData.details?.details || initialData.details?.description || '';
      setFormData({
        productName: initialData.name || initialData.productName || '',
        specification: initialData.specification || '',
        price: initialData.price || '',
        totalUnitPrice: initialData.details?.totalUnitPrice || initialData.price || '',
        perUnitPrice: initialData.details?.perUnitPrice || '',
        measuringMetric: initialData.details?.measuringMetric || 'kg',
        category: initialData.category || defaultCategory || (mode === 'catalog' ? "Workstation's" : ''),
        vendorId: initialData.vendorId || '',
        details: typedDesc
      });
    } else if (isOpen) {
      setFormData({
        productName: '',
        specification: '',
        price: '',
        totalUnitPrice: '',
        perUnitPrice: '',
        measuringMetric: 'kg',
        category: defaultCategory || (mode === 'catalog' ? "Workstation's" : ''),
        vendorId: '',
        details: ''
      });
    }
  }, [isOpen, initialData, defaultCategory, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Multiple image file handling
  const handleMultipleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await compressImageFile(file);
        if (dataUrl) newImages.push(dataUrl);
      }
      setProductImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error("Error processing product images", err);
    }
  };

  const removeProductImage = (indexToRemove: number) => {
    setProductImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const setPrimaryProductImage = (indexToPrimary: number) => {
    setProductImages(prev => {
      const selected = prev[indexToPrimary];
      const rest = prev.filter((_, idx) => idx !== indexToPrimary);
      return [selected, ...rest];
    });
  };


  // SITTING SERIES: Color Variant Management
  const handleAddSittingColorVariant = (presetColor?: { name: string, hex: string, priceOffset?: number }) => {
    const basePriceNum = parseFloat(formData.price || formData.totalUnitPrice || '8500') || 8500;
    const pName = formData.productName || 'Office Chair';
    
    const colorName = presetColor?.name || `Color Variant ${variants.length + 1}`;
    const colorHex = presetColor?.hex || '#1E293B';
    const variantPrice = Math.round(basePriceNum + (presetColor?.priceOffset || 0)).toString();

    const newVariant: ProductVariant = {
      id: `var_seat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${pName} (${colorName})`,
      color: colorName,
      colorCode: colorHex,
      price: variantPrice,
      imageData: productImages[0] || undefined
    };

    setVariants(prev => [...prev, newVariant]);
  };

  // WORKSTATION: Size Variant Calculation & Presets
  const calculateDefaultVariantPrice = (basePrice: number | string, sizeStr: string): string => {
    const base = parseFloat(basePrice.toString().replace(/[^0-9.]/g, '')) || 14500;
    const m = sizeStr.match(/(\d+)\s*[xX*×]\s*(\d+)/);
    if (!m) return Math.round(base).toString();
    const w = parseInt(m[1], 10) || 1200;
    const d = parseInt(m[2], 10) || 600;
    const stdArea = 1200 * 600;
    const currentArea = w * d;
    const areaRatio = currentArea / stdArea;
    let seaterMultiplier = 1;
    if (sizeStr.includes('6-Seater')) seaterMultiplier = 4.8;
    else if (sizeStr.includes('4-Seater')) seaterMultiplier = 3.4;
    else if (sizeStr.includes('2-Seater') || w >= 2400) seaterMultiplier = 1.9;
    const scaled = Math.round((base * (0.4 + 0.6 * areaRatio) * (seaterMultiplier > 1 ? seaterMultiplier / areaRatio : 1)) / 100) * 100;
    return Math.max(8000, scaled).toString();
  };

  const handleAddVariantWithSize = (chosenSize?: string) => {
    const pName = formData.productName || 'Workstation';
    const basePrice = formData.price || formData.totalUnitPrice || '14500';
    const targetSize = chosenSize || WORKSTATION_SIZES[Math.min(variants.length, WORKSTATION_SIZES.length - 1)];
    const cleanSizeLabel = targetSize.split(' (')[0];
    const calculatedPrice = calculateDefaultVariantPrice(basePrice, targetSize);
    
    const newVar: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${pName} (${cleanSizeLabel})`,
      size: targetSize,
      color: WORKSTATION_COLORS[variants.length % WORKSTATION_COLORS.length].name,
      colorCode: WORKSTATION_COLORS[variants.length % WORKSTATION_COLORS.length].hex,
      price: calculatedPrice
    };
    setVariants(prev => [...prev, newVar]);
  };

  const handleUpdateVariant = (id: string, updates: Partial<ProductVariant>) => {
    setVariants(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, ...updates };
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
      const selectedVendor = vendors.find(v => v.id === formData.vendorId);
      const finalCategory = customCategoryMode && customCategoryVal.trim() 
        ? customCategoryVal.trim() 
        : (formData.category || selectedMainCategory || (isSittingSeries ? "Seating Series" : "Workstation's"));
      
      const validImages = productImages.filter(img => typeof img === 'string' && img.trim().length > 0);
      const primaryImage = validImages[0] || undefined;
      const typedDescription = formData.details.trim();

      if (onAddProduct) {
        await onAddProduct({
          ...formData,
          name: formData.productName,
          productName: formData.productName,
          category: finalCategory,
          vendorName: selectedVendor?.name || '',
          productImageName: primaryImage ? `${formData.productName.toLowerCase().replace(/\s+/g, '_')}.jpg` : undefined,
          productImageData: primaryImage,
          images: validImages,
          description: typedDescription,
          specification: typedDescription,
          variants: variants,
          hasVariants: variants.length > 0,
          details: {
            details: typedDescription,
            description: typedDescription,
            specification: typedDescription,
            productName: formData.productName,
            category: finalCategory,
            totalUnitPrice: formData.totalUnitPrice,
            perUnitPrice: formData.perUnitPrice,
            measuringMetric: formData.measuringMetric,
            images: validImages
          }
        });
      }
    } catch (error) {
      console.error("Error saving product", error);
    } finally {
      setIsProcessing(false);
      stopCamera();
      
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
      setProductImages([]);
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
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {initialData ? 'Edit Product' : (mode === 'catalog' ? 'Add Catalog Product' : 'Add Quotation Product')}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {isSittingSeries 
                      ? 'Office Studio Sitting Series — color variants, prices & 360° photos'
                      : 'Create or update product specifications, images and variants'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="new-product-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Basic Product Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-semibold text-slate-800"
                      placeholder={isSittingSeries ? 'e.g. Ergonomic Mesh High-Back Executive Chair' : 'e.g. 4-Seater Linear Workstation'}
                      required
                    />
                  </div>

                  {/* Category Selector */}
                  {customCategoryMode ? (
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Category</label>
                        <button
                          type="button"
                          onClick={() => setCustomCategoryMode(false)}
                          className="text-xs text-indigo-600 hover:underline font-semibold"
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
                        placeholder="e.g. Workstations, Sitting Series, Executive Pods"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                            className="text-[11px] text-indigo-600 hover:underline font-semibold"
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
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-medium"
                          required
                        >
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
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-medium"
                          required
                        >
                          {selectedMainCategory && CATALOG_CATEGORIES[selectedMainCategory]?.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Base Price */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Base / Starting Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                      <input 
                        type="number" 
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900"
                        placeholder={isSittingSeries ? '8500' : '15000'}
                      />
                    </div>
                  </div>

                  {/* 2. PRODUCT DESCRIPTION (REQUIREMENT #1: Only the typed description will be visible) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Product Description
                      </label>
                      <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                        Displayed verbatim in quotations & catalog
                      </span>
                    </div>
                    <textarea 
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed text-slate-800 resize-y"
                      placeholder="Type the exact description for this product here (materials, warranty, ergonomic details, usage, etc.). Only what you type here will be displayed."
                    />
                    <p className="text-[11px] text-slate-500">
                      Note: Only what you type in this description box will be visible when viewing the product and adding it to quotations.
                    </p>
                  </div>
                </div>

                {/* 3. PRODUCT IMAGES SECTION (5 Studio Angles) */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        5 Product Angles (Shown in Left Corner on Product Page)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload up to 5 angles of your product (Front, Side, 3/4 View, Back, Detail). These thumbnails appear in the left corner strip on the product page.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Take Photo / Open Camera Button */}
                      <button
                        type="button"
                        onClick={() => isCameraActive ? stopCamera() : startCamera()}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                          isCameraActive 
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isCameraActive ? 'Close Camera' : 'Snap Live Photo'}</span>
                      </button>

                      {/* Upload Multiple Images Button */}
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload All 5 Angles</span>
                      </button>

                      {/* Hidden multi-file input */}
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        multiple
                        accept="image/*"
                        onChange={(e) => handleMultipleImageFiles(e.target.files)}
                      />

                      {/* Hidden native camera capture input fallback */}
                      <input
                        type="file"
                        ref={cameraInputRef}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleMultipleImageFiles(e.target.files)}
                      />
                    </div>
                  </div>

                  {/* Live Camera Viewport */}
                  <AnimatePresence>
                    {isCameraActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 bg-slate-900 rounded-2xl p-4 overflow-hidden border border-slate-800"
                      >
                        <div className="relative aspect-video max-h-72 mx-auto bg-black rounded-xl overflow-hidden flex items-center justify-center">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                          />

                          {cameraLoading && (
                            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white">
                              <Loader2 className="w-7 h-7 animate-spin text-indigo-400 mb-2" />
                              <span className="text-xs font-semibold">Starting camera...</span>
                            </div>
                          )}

                          {cameraError && (
                            <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center text-white">
                              <p className="text-xs text-rose-300 mb-3">{cameraError}</p>
                              <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold"
                              >
                                Use System Camera Shutter
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Camera Controls */}
                        <div className="flex items-center justify-center gap-4 mt-3">
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Flip camera front/back"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={cameraLoading}
                            className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Capture Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={stopCamera}
                            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Cancel camera"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 5 Dedicated Angle Upload Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                    {PRODUCT_ANGLE_SLOTS.map((slot) => {
                      const existingImage = productImages[slot.index];
                      return (
                        <div key={slot.index} className="flex flex-col">
                          <input 
                            type="file"
                            id={`angle-slot-input-${slot.index}`}
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const dataUrl = await compressImageFile(e.target.files[0]);
                                if (dataUrl) {
                                  setProductImages(prev => {
                                    const copy = [...prev];
                                    copy[slot.index] = dataUrl;
                                    return copy;
                                  });
                                }
                              }
                            }}
                          />
                          {existingImage ? (
                            <div className="relative group rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-2xs aspect-square flex flex-col items-center justify-center p-2">
                              <img 
                                src={existingImage} 
                                alt={slot.title} 
                                className="w-full h-full object-contain mix-blend-multiply" 
                              />
                              <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                {slot.tag}
                              </span>

                              <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-white z-10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const el = document.getElementById(`angle-slot-input-${slot.index}`);
                                    if (el) (el as HTMLInputElement).click();
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[10px] font-bold w-full cursor-pointer"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeProductImage(slot.index)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 rounded text-[10px] font-bold w-full cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`angle-slot-input-${slot.index}`);
                                if (el) (el as HTMLInputElement).click();
                              }}
                              className="rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 bg-slate-50/60 aspect-square flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer group"
                            >
                              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-1 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-700">{slot.tag}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{slot.desc.split(' ')[0]} photo</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Tip: Uploading all 5 angles displays a full left-corner gallery when users open your product page.
                  </p>
                </div>

                {/* 4. VARIANTS SECTION: COLOR VARIANTS WITH CUSTOM PHOTO & PRICE */}
                <div className="border-t border-slate-200 pt-6">
                  {isSittingSeries ? (
                    /* SITTING SERIES: COLOR VARIANTS & DISTINCT PRICES */
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-amber-600" />
                            Color Variants & Custom Images
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Upload a specific photo for each color variant. The color variant photo is shown when the user selects that color option.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSittingColorVariant()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Color Variant</span>
                        </button>
                      </div>

                      {/* Quick Add Popular Seating Colors */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add Color:</span>
                        {SITTING_SERIES_POPULAR_COLORS.map(colorItem => (
                          <button
                            key={colorItem.name}
                            type="button"
                            onClick={() => handleAddSittingColorVariant(colorItem)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span 
                              className="w-3 h-3 rounded-full border border-slate-300 shrink-0" 
                              style={{ backgroundColor: colorItem.hex }} 
                            />
                            <span>{colorItem.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Color Variants List */}
                      {variants.length === 0 ? (
                        <div className="p-6 border-2 border-dashed border-amber-200/80 rounded-2xl bg-amber-50/30 text-center">
                          <p className="text-xs text-slate-700 font-semibold mb-3">
                            No color variants added yet. Click a quick color above or click below to add:
                          </p>
                          <div className="flex items-center justify-center gap-2.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAddSittingColorVariant(SITTING_SERIES_POPULAR_COLORS[0])}
                              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700" />
                              <span>+ Add Executive Black</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSittingColorVariant(SITTING_SERIES_POPULAR_COLORS[3])}
                              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-900 border border-amber-700" />
                              <span>+ Add Tan Brown</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                          {variants.map((v, index) => (
                            <div 
                              key={v.id}
                              className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 hover:bg-slate-50/70 transition-colors"
                            >
                              {/* Color Name & Swatch */}
                              <div className="flex-1 min-w-[160px]">
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Color Variant {index + 1}
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color"
                                    value={v.colorCode || '#1E293B'}
                                    onChange={(e) => handleUpdateVariant(v.id, { colorCode: e.target.value })}
                                    className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer shrink-0"
                                    title="Choose color swatch"
                                  />
                                  <input 
                                    type="text"
                                    value={v.color || ''}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      handleUpdateVariant(v.id, {
                                        color: newColor,
                                        name: `${formData.productName || 'Office Chair'} (${newColor})`
                                      });
                                    }}
                                    placeholder="e.g. Tan Brown Leatherette"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Specific Price for this Color Variant */}
                              <div className="sm:w-44">
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Price for this color (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                  <input 
                                    type="number"
                                    value={v.price || ''}
                                    onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })}
                                    placeholder="e.g. 9800"
                                    className="w-full pl-6 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-black text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    required
                                  />
                                </div>
                              </div>

                              {/* Image for this Color */}
                              <div className="sm:w-56">
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Color Photo
                                </label>
                                <input 
                                  type="file"
                                  id={`seat-var-file-${v.id}`}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleVariantImageChange(v.id, e.target.files[0]);
                                    }
                                  }}
                                />
                                {v.imageData ? (
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                    <img 
                                      src={v.imageData} 
                                      alt={v.color || 'Variant'} 
                                      className="w-8 h-8 object-cover rounded border border-slate-200 shrink-0 bg-white" 
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[10px] font-bold text-emerald-700 truncate block">
                                        ✓ Photo attached
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById(`seat-var-file-${v.id}`);
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
                                      const input = document.getElementById(`seat-var-file-${v.id}`);
                                      if (input) (input as HTMLInputElement).click();
                                    }}
                                    className="w-full h-8 px-2 border border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-amber-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-50/50"
                                  >
                                    <Upload className="w-3 h-3 text-slate-400" />
                                    <span>Upload Photo</span>
                                  </button>
                                )}
                              </div>

                              {/* Delete Variant Button */}
                              <div className="flex sm:flex-col justify-end pt-1 sm:pt-4">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(v.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete this color variant"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* WORKSTATION / GENERAL: SIZES & PRODUCTS SECTION */
                    <div>
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
                  )}
                </div>

              </form>
            </div>
            
            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {productImages.length > 0 ? `${productImages.length} image(s) attached` : 'No images attached yet'}
                {productImages.length >= 5 ? ' • 5 Studio Angles Active' : ''}
              </span>
              <div className="flex items-center gap-3 ml-auto">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="new-product-form"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{initialData ? 'Save Changes' : (mode === 'catalog' ? 'Add to Catalog' : 'Add Product')}</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
