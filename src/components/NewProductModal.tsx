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
  "Workstation": ["Linear Workstation", "L-Shape Workstation", "Cluster Workstation", "Face to Face", "Wall Facing", "Cubicle"],
  "Office Studio": ["Executive Table", "Conference Table", "Reception Table", "Workstations", "Storages", "Seating Series"],
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

  // Determine if this product belongs to Office Studio Executive/Conference/Reception Table
  const subCatLower = (formData.category || '').toLowerCase();
  const mainCatLower = (selectedMainCategory || '').toLowerCase();
  const isOfficeStudioTableCategory = 
    (mainCatLower.includes('office studio') || subCatLower.includes('office studio') || mainCatLower.includes('executive') || mainCatLower.includes('conference') || mainCatLower.includes('reception')) && (
      subCatLower.includes('executive') ||
      subCatLower.includes('conference') ||
      subCatLower.includes('conferene') ||
      subCatLower.includes('reception') ||
      subCatLower.includes('table') ||
      subCatLower.includes('desk')
    );

  const handleAddOfficeStudioVariant = (
    type: 'color' | 'size' | 'side_storage' | 'electric',
    defaultName?: string,
    defaultPrice?: string,
    defaultColorCode?: string
  ) => {
    const id = `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let name = defaultName || '';
    if (!name) {
      if (type === 'color') name = 'Classic Walnut';
      else if (type === 'size') name = '1800 x 900 x 750 mm';
      else if (type === 'side_storage') name = 'Left Side Storage (LHS)';
      else if (type === 'electric') name = 'Pop-up Electric Socket Box';
    }

    const newVar: ProductVariant = {
      id,
      variantType: type,
      name,
      color: type === 'color' ? name : undefined,
      colorCode: type === 'color' ? (defaultColorCode || '#4E342E') : undefined,
      size: type === 'size' ? name : undefined,
      sideStorage: type === 'side_storage' ? name : undefined,
      electricOption: type === 'electric' ? name : undefined,
      price: defaultPrice || '0',
      imageData: ''
    };

    setVariants(prev => [...prev, newVar]);
  };

  const [customGroupName, setCustomGroupName] = useState('');

  const handleAddCustomVariantGroup = (groupTitle?: string, initialSubOptions?: { name: string; price?: string; colorCode?: string }[]) => {
    const title = (groupTitle || customGroupName).trim() || 'Custom Option Group';
    const subOptions = initialSubOptions && initialSubOptions.length > 0 
      ? initialSubOptions 
      : [
          { name: 'Variant One / Sub-Option 1', price: '0' },
          { name: 'Variant Two / Sub-Option 2', price: '0' }
        ];

    const newVars: ProductVariant[] = subOptions.map((opt, i) => ({
      id: `var_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      variantType: 'custom',
      groupName: title,
      name: opt.name,
      price: opt.price || '0',
      colorCode: opt.colorCode,
      imageData: ''
    }));

    setVariants(prev => [...prev, ...newVars]);
    setCustomGroupName('');
  };

  const handleAddSingleSubOption = (groupName: string, name?: string, price?: string) => {
    const existingInGroup = variants.filter(v => 
      (v.groupName || '').toLowerCase() === groupName.toLowerCase()
    );
    const count = existingInGroup.length + 1;
    const oName = name || `Sub-Option ${count}`;

    const newVar: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      variantType: 'custom',
      groupName: groupName,
      name: oName,
      price: price || '0',
      imageData: ''
    };

    setVariants(prev => [...prev, newVar]);
  };

  const handleRenameGroup = (oldGroupName: string, newGroupName: string) => {
    if (!newGroupName.trim()) return;
    setVariants(prev => prev.map(v => {
      if ((v.groupName || '') === oldGroupName) {
        return { ...v, groupName: newGroupName.trim() };
      }
      return v;
    }));
  };

  const handleDeleteGroup = (groupName: string) => {
    setVariants(prev => prev.filter(v => (v.groupName || '') !== groupName));
  };

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
    
    if (!formData.productName || !formData.productName.trim()) {
      alert("Please enter a Product Name before saving.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const selectedVendor = vendors.find(v => v.id === formData.vendorId);
      const finalCategory = customCategoryMode && customCategoryVal.trim() 
        ? customCategoryVal.trim() 
        : (formData.category || selectedMainCategory || (isSittingSeries ? "Seating Series" : "Workstations"));
      
      const validImages = productImages.filter(img => typeof img === 'string' && img.trim().length > 0);
      const primaryImage = validImages[0] || undefined;
      const typedDescription = formData.details.trim();

      if (onAddProduct) {
        await onAddProduct({
          ...formData,
          name: formData.productName.trim(),
          productName: formData.productName.trim(),
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
            productName: formData.productName.trim(),
            category: finalCategory,
            totalUnitPrice: formData.totalUnitPrice,
            perUnitPrice: formData.perUnitPrice,
            measuringMetric: formData.measuringMetric,
            images: validImages
          }
        });
      }

      // Reset form on success
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
      
      stopCamera();
      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert(`❌ Failed to save product: ${error?.message || 'An unexpected error occurred. Please check your network connection and try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const seatingPresets = [
    {
      label: 'Armrest Types',
      title: 'Armrest Options',
      options: [
        { name: '3D Adjustable Armrests', price: '800' },
        { name: '2D Height Adjustable Armrests', price: '400' },
        { name: 'Fixed Ergonomic Armrests', price: '0' }
      ]
    },
    {
      label: 'Lumbar & Headrest',
      title: 'Support Options',
      options: [
        { name: '2D Adjustable Lumbar + Headrest', price: '1200' },
        { name: 'Standard Lumbar Support', price: '0' }
      ]
    },
    {
      label: 'Chair Base',
      title: 'Base & Castors',
      options: [
        { name: 'Heavy Duty Chrome Steel Base', price: '1500' },
        { name: 'High Tensile Nylon Base', price: '0' }
      ]
    }
  ];

  const tablePresets = [
    {
      label: 'Leg Finishes',
      title: 'Leg Finish',
      options: [
        { name: 'Black Powder Coated Metal', price: '0' },
        { name: 'White Powder Coated Metal', price: '0' },
        { name: 'Chrome Stainless Steel Base', price: '1200' }
      ]
    },
    {
      label: 'Board Materials',
      title: 'Table Top Material',
      options: [
        { name: '18mm Action TESA HDHMR', price: '0' },
        { name: '25mm Pre-Laminated Board', price: '1500' }
      ]
    }
  ];

  const generalPresets = [
    {
      label: 'Storage Options',
      title: 'Side Storage Options',
      options: [
        { name: 'Left Hand Side Storage (LHS)', price: '2500' },
        { name: 'Right Hand Side Storage (RHS)', price: '2500' },
        { name: 'Both Sides Storage (LHS + RHS)', price: '4800' },
        { name: 'Without Side Storage', price: '0' }
      ]
    },
    {
      label: 'Wood Shades',
      title: 'Table Top Finish',
      options: [
        { name: 'Classic Walnut', price: '0', colorCode: '#4E342E' },
        { name: 'Natural Teak', price: '0', colorCode: '#8D6E63' },
        { name: 'Frosty White', price: '0', colorCode: '#F8FAFC' },
        { name: 'Gothic Grey', price: '0', colorCode: '#78909C' }
      ]
    },
    {
      label: 'Power Outlets',
      title: 'Electric & Power Socket',
      options: [
        { name: 'Dual Pop-up Power Box', price: '1800' },
        { name: 'Wire Pass-Through Grommet', price: '350' },
        { name: 'Under-Desk Wire Tray', price: '650' }
      ]
    }
  ];

  const renderCustomVariantBuilder = (extraPresets?: { label: string; title: string; options: { name: string; price?: string; colorCode?: string }[] }[]) => {
    const customGroups: Record<string, ProductVariant[]> = {};
    variants.forEach(v => {
      if (v.variantType === 'custom' || (v.groupName && v.variantType !== 'color' && v.variantType !== 'size' && v.variantType !== 'side_storage' && v.variantType !== 'electric')) {
        const gName = v.groupName?.trim() || 'Custom Option Group';
        if (!customGroups[gName]) customGroups[gName] = [];
        customGroups[gName].push(v);
      }
    });

    const groupEntries = Object.entries(customGroups);

    return (
      <div className="mt-6 bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Custom Variant Categories & Sub-Options Builder
            </h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Create custom variant groups (e.g. "Table Top Finish", "Storage Drawer Position", "Leg Structure", "Armrest Type", "Upholstery") and add sub-options with custom prices & photos.
            </p>
          </div>

          {/* Quick Preset Group Adders */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
            {extraPresets?.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleAddCustomVariantGroup(p.title, p.options)}
                className="px-2 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                + {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleAddCustomVariantGroup('Side Storage Options', [
                { name: 'Left Hand Side Storage (LHS)', price: '2500' },
                { name: 'Right Hand Side Storage (RHS)', price: '2500' },
                { name: 'Both Sides Storage (LHS + RHS)', price: '4800' },
                { name: 'Without Side Storage', price: '0' }
              ])}
              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              + Storage Options
            </button>
            <button
              type="button"
              onClick={() => handleAddCustomVariantGroup('Table Top Finish', [
                { name: 'Classic Walnut', price: '0', colorCode: '#4E342E' },
                { name: 'Natural Teak', price: '0', colorCode: '#8D6E63' },
                { name: 'Frosty White', price: '0', colorCode: '#F8FAFC' },
                { name: 'Gothic Grey', price: '0', colorCode: '#78909C' }
              ])}
              className="px-2 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              + Wood Shades
            </button>
          </div>
        </div>

        {/* Input to create a new Custom Variant Category / Group */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-2xs">
          <div className="flex-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">New Variant Category Title</label>
            <input 
              type="text"
              value={customGroupName}
              onChange={(e) => setCustomGroupName(e.target.value)}
              placeholder="e.g. Leg Finish, Storage Position, Upholstery Fabric, Armrest Style..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddCustomVariantGroup()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-auto h-[38px] mt-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Variant Category</span>
          </button>
        </div>

        {/* Grouped Custom Variants Cards */}
        {groupEntries.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-white/60 text-center">
            <p className="text-xs text-slate-500 font-medium">No custom variant categories added yet. Type a category title above or click a preset shortcut.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupEntries.map(([gName, subOptions]) => (
              <div key={gName} className="bg-white rounded-xl border border-indigo-200 shadow-2xs overflow-hidden">
                {/* Group Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-slate-50 px-4 py-2.5 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider shrink-0">Category:</span>
                    <input
                      type="text"
                      value={gName}
                      onChange={(e) => handleRenameGroup(gName, e.target.value)}
                      placeholder="Group Title"
                      className="text-xs font-bold text-slate-900 bg-white/80 px-2 py-1 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
                    />
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md shrink-0">
                      {subOptions.length} sub-option(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleAddSingleSubOption(gName)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Sub-Option</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(gName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={`Delete category "${gName}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub Options Table / List */}
                <div className="p-3 divide-y divide-slate-100 space-y-2.5">
                  {subOptions.map((v, subIndex) => (
                    <div key={v.id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Sub-Option Name */}
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          Sub-Option {subIndex + 1} Name
                        </label>
                        <input 
                          type="text"
                          value={v.name || ''}
                          onChange={(e) => handleUpdateVariant(v.id, { name: e.target.value })}
                          placeholder="e.g. Sub-Option Name"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Price (₹) */}
                      <div className="sm:w-32 relative">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          Add-on Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input 
                            type="number" 
                            value={v.price || ''} 
                            onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })} 
                            placeholder="0" 
                            className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sub-Option Photo */}
                      <div className="sm:w-48">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Sub-Option Photo</label>
                        <input 
                          type="file" 
                          id={`sub-opt-file-${v.id}`} 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleVariantImageChange(v.id, e.target.files[0])}
                        />
                        {v.imageData ? (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
                            <img src={v.imageData} alt="Custom option" className="w-6 h-6 object-cover rounded bg-white shrink-0 border border-slate-200" />
                            <span className="text-[10px] font-bold text-emerald-800 flex-1 truncate">Photo Uploaded</span>
                            <button type="button" onClick={() => handleRemoveVariantImage(v.id)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => document.getElementById(`sub-opt-file-${v.id}`)?.click()} 
                            className="w-full py-1.5 border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-1.5 bg-slate-50 cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-slate-400" /> Upload Image
                          </button>
                        )}
                      </div>

                      {/* Delete Sub-Option */}
                      <div className="flex items-center justify-end pt-1 sm:pt-4">
                        <button 
                          type="button" 
                          onClick={() => handleDeleteVariant(v.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                          title="Delete sub-option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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

                {/* 4. VARIANTS SECTION: COLOR, SIZES, SIDE STORAGE & ELECTRIC OPTIONS */}
                <div className="border-t border-slate-200 pt-6">
                  {isOfficeStudioTableCategory ? (
                    /* OFFICE STUDIO EXECUTIVE/CONFERENCE/RECEPTION TABLE VARIANTS */
                    <div className="space-y-6">
                      <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-indigo-950">Office Studio Table Options & Variants</h4>
                          <p className="text-xs text-indigo-800 mt-0.5">
                            Configure Colour Options (with custom image upload), Sizes (with image + price), Side Storage (with image + price), and Electric Options (with image + price).
                          </p>
                        </div>
                      </div>

                      {/* 1. COLOUR OPTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4 text-amber-600" />
                            1. Colour Option (Upload Image)
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddOfficeStudioVariant('color')}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            + Add Colour Option
                          </button>
                        </div>

                        {/* Quick Add Colours */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                          {WORKSTATION_COLORS.map(c => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => handleAddOfficeStudioVariant('color', c.name, '0', c.hex)}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-amber-50 flex items-center gap-1 cursor-pointer"
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }} />
                              {c.name}
                            </button>
                          ))}
                        </div>

                        {/* List of Colour Variants */}
                        {variants.filter(v => v.variantType === 'color' || v.colorCode).map((v) => (
                          <div key={v.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input 
                              type="color"
                              value={v.colorCode || '#4E342E'}
                              onChange={(e) => handleUpdateVariant(v.id, { colorCode: e.target.value })}
                              className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer shrink-0"
                              title="Choose color swatch"
                            />
                            <input 
                              type="text"
                              value={v.color || v.name || ''}
                              onChange={(e) => handleUpdateVariant(v.id, { color: e.target.value, name: e.target.value })}
                              placeholder="Colour Name (e.g. Classic Walnut)"
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            {/* Image Upload */}
                            <div className="sm:w-52">
                              <input 
                                type="file" 
                                id={`office-col-${v.id}`} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleVariantImageChange(v.id, e.target.files[0])}
                              />
                              {v.imageData ? (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
                                  <img src={v.imageData} alt="Colour" className="w-7 h-7 object-cover rounded bg-white shrink-0 border border-slate-200" />
                                  <span className="text-[10px] font-bold text-emerald-800 flex-1 truncate">Image Uploaded</span>
                                  <button type="button" onClick={() => handleRemoveVariantImage(v.id)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                                </div>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => document.getElementById(`office-col-${v.id}`)?.click()} 
                                  className="w-full py-1.5 border border-dashed border-slate-300 hover:border-amber-500 rounded-lg text-xs font-semibold text-slate-600 hover:text-amber-700 flex items-center justify-center gap-1.5 bg-slate-50 cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-slate-400" /> Upload Colour Image
                                </button>
                              )}
                            </div>
                            <button type="button" onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* 2. SIZES OPTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            2. Sizes Option (Upload Image + Price)
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddOfficeStudioVariant('size')}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            + Add Size Option
                          </button>
                        </div>

                        {/* Quick Add Sizes */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                          {['1800 x 900 x 750 mm', '2100 x 1000 x 750 mm', '2400 x 1200 x 750 mm', '3000 x 1200 x 750 mm'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleAddOfficeStudioVariant('size', s, '0')}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                            >
                              + {s.split(' ')[0]} mm
                            </button>
                          ))}
                        </div>

                        {/* List of Size Variants */}
                        {variants.filter(v => v.variantType === 'size' || (v.size && !v.colorCode && !v.sideStorage && !v.electricOption)).map((v) => (
                          <div key={v.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input 
                              type="text"
                              value={v.size || v.name || ''}
                              onChange={(e) => handleUpdateVariant(v.id, { size: e.target.value, name: e.target.value })}
                              placeholder="Size / Dimensions (e.g. 1800 x 900 x 750 mm)"
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            {/* Price */}
                            <div className="sm:w-36 relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                              <input 
                                type="number" 
                                value={v.price || ''} 
                                onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })} 
                                placeholder="Price (₹)" 
                                className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            {/* Image Upload */}
                            <div className="sm:w-52">
                              <input 
                                type="file" 
                                id={`office-sz-${v.id}`} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleVariantImageChange(v.id, e.target.files[0])}
                              />
                              {v.imageData ? (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
                                  <img src={v.imageData} alt="Size" className="w-7 h-7 object-cover rounded bg-white shrink-0 border border-slate-200" />
                                  <span className="text-[10px] font-bold text-emerald-800 flex-1 truncate">Image Uploaded</span>
                                  <button type="button" onClick={() => handleRemoveVariantImage(v.id)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                                </div>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => document.getElementById(`office-sz-${v.id}`)?.click()} 
                                  className="w-full py-1.5 border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-1.5 bg-slate-50 cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-slate-400" /> Upload Size Image
                                </button>
                              )}
                            </div>
                            <button type="button" onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* 3. SIDE STORAGE OPTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Compass className="w-4 h-4 text-emerald-600" />
                            3. Side Storage Option (Upload Image + Price)
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddOfficeStudioVariant('side_storage')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            + Add Side Storage Option
                          </button>
                        </div>

                        {/* Quick Add Side Storage */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                          {['Left Side Storage (LHS)', 'Right Side Storage (RHS)', 'Mobile Pedestal 3-Drawer', 'None'].map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAddOfficeStudioVariant('side_storage', st, st === 'None' ? '0' : '4500')}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                            >
                              + {st}
                            </button>
                          ))}
                        </div>

                        {/* List of Side Storage Variants */}
                        {variants.filter(v => v.variantType === 'side_storage' || v.sideStorage).map((v) => (
                          <div key={v.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input 
                              type="text"
                              value={v.sideStorage || v.name || ''}
                              onChange={(e) => handleUpdateVariant(v.id, { sideStorage: e.target.value, name: e.target.value })}
                              placeholder="Side Storage Option (e.g. Left Side Storage)"
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            {/* Price */}
                            <div className="sm:w-36 relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                              <input 
                                type="number" 
                                value={v.price || ''} 
                                onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })} 
                                placeholder="Price (₹)" 
                                className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                            {/* Image Upload */}
                            <div className="sm:w-52">
                              <input 
                                type="file" 
                                id={`office-st-${v.id}`} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleVariantImageChange(v.id, e.target.files[0])}
                              />
                              {v.imageData ? (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
                                  <img src={v.imageData} alt="Storage" className="w-7 h-7 object-cover rounded bg-white shrink-0 border border-slate-200" />
                                  <span className="text-[10px] font-bold text-emerald-800 flex-1 truncate">Image Uploaded</span>
                                  <button type="button" onClick={() => handleRemoveVariantImage(v.id)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                                </div>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => document.getElementById(`office-st-${v.id}`)?.click()} 
                                  className="w-full py-1.5 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center justify-center gap-1.5 bg-slate-50 cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-slate-400" /> Upload Storage Image
                                </button>
                              )}
                            </div>
                            <button type="button" onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* 4. ELECTRIC OPTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            4. Electric Option (Upload Image + Price)
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddOfficeStudioVariant('electric')}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            + Add Electric Option
                          </button>
                        </div>

                        {/* Quick Add Electric */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                          {['Pop-up Electric Socket Box', 'Wireless Charger + Power', 'Motorized Cable Tray', 'None'].map(el => (
                            <button
                              key={el}
                              type="button"
                              onClick={() => handleAddOfficeStudioVariant('electric', el, el === 'None' ? '0' : '2200')}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-purple-50 flex items-center gap-1 cursor-pointer"
                            >
                              + {el}
                            </button>
                          ))}
                        </div>

                        {/* List of Electric Option Variants */}
                        {variants.filter(v => v.variantType === 'electric' || v.electricOption).map((v) => (
                          <div key={v.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input 
                              type="text"
                              value={v.electricOption || v.name || ''}
                              onChange={(e) => handleUpdateVariant(v.id, { electricOption: e.target.value, name: e.target.value })}
                              placeholder="Electric Option (e.g. Pop-up Socket Box)"
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            {/* Price */}
                            <div className="sm:w-36 relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                              <input 
                                type="number" 
                                value={v.price || ''} 
                                onChange={(e) => handleUpdateVariant(v.id, { price: e.target.value })} 
                                placeholder="Price (₹)" 
                                className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            </div>
                            {/* Image Upload */}
                            <div className="sm:w-52">
                              <input 
                                type="file" 
                                id={`office-el-${v.id}`} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleVariantImageChange(v.id, e.target.files[0])}
                              />
                              {v.imageData ? (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
                                  <img src={v.imageData} alt="Electric" className="w-7 h-7 object-cover rounded bg-white shrink-0 border border-slate-200" />
                                  <span className="text-[10px] font-bold text-emerald-800 flex-1 truncate">Image Uploaded</span>
                                  <button type="button" onClick={() => handleRemoveVariantImage(v.id)} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                                </div>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => document.getElementById(`office-el-${v.id}`)?.click()} 
                                  className="w-full py-1.5 border border-dashed border-slate-300 hover:border-purple-500 rounded-lg text-xs font-semibold text-slate-600 hover:text-purple-600 flex items-center justify-center gap-1.5 bg-slate-50 cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-slate-400" /> Upload Electric Image
                                </button>
                              )}
                            </div>
                            <button type="button" onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                        {/* 5. CUSTOM VARIANTS BUILDER */}
                        {renderCustomVariantBuilder(tablePresets)}
                      </div>
                    ) : isSittingSeries ? (
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
                      
                      {/* Custom Variant Builder for Seating/Sitting Series */}
                      {renderCustomVariantBuilder(seatingPresets)}
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
                      
                      {/* Custom Variant & Sub Options Builder */}
                      {renderCustomVariantBuilder(generalPresets)}
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
