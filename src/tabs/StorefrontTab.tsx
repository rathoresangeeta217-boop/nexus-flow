import React, { useState, useEffect } from 'react';
import { subscribeToProducts, Product, isCategoryMatch, saveProduct, updateProductData, ProductVariant, deduplicateCategories, parsePriceNumber, resolveVariantPriceMode, loadProductMediaFromFirestore, LoadedProductMedia } from '../lib/products';
import { subscribeToVendors, Vendor } from '../lib/vendors';
import { NewProductModal } from '../components/NewProductModal';
import { ShoppingCart, Search, Menu, Star, Zap, ChevronLeft, ChevronRight, CheckCircle2, Truck, Share2, X, Upload, ImagePlus, Plus, Layers, Check, ImageIcon, RotateCw, Boxes, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, Sparkles, Loader2, Camera, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// custom image component defined at bottom of file
import { getProductFile, getVariantFile, compressImageFile } from '../lib/fileStorage';
import { useAuth } from '../contexts/AuthContext';
import { set, get } from 'idb-keyval';
import { getTableTopHex, getScreenHex, getLegHex } from '../components/WorkstationLiveRenderer';
import { Workstation3DViewer } from '../components/Workstation3DViewer';
import { WorkstationTechnicalInfographicModal } from '../components/WorkstationTechnicalInfographicModal';
import { CreateQuotationModal, QuotationCheckoutCartItem } from '../components/CreateQuotationModal';

export interface StorefrontCartItem {
  id: string;
  product: Product;
  quantity: number;
  workstationSetup?: any;
  selectedVariant?: ProductVariant;
  selectedVariantIds?: string[];
  imageSrc?: string;
  configuredPrice?: number;
  selectedOptionsSummary?: string;
}

export function StorefrontTab({ setActiveTab }: { setActiveTab?: (tab: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingStorefrontProduct, setEditingStorefrontProduct] = useState<Product | null>(null);
  const [isQuickUploadingPhoto, setIsQuickUploadingPhoto] = useState(false);
  const quickPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const prevSelectedProductIdRef = React.useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedSizeVariantId, setSelectedSizeVariantId] = useState<string | null>(null);
  const [selectedSideStorageVariantId, setSelectedSideStorageVariantId] = useState<string | null>(null);
  const [selectedElectricVariantId, setSelectedElectricVariantId] = useState<string | null>(null);
  const [selectedColorVariantId, setSelectedColorVariantId] = useState<string | null>(null);
  const [selectedCustomVariantIds, setSelectedCustomVariantIds] = useState<Record<string, string>>({});
  const [lastTotalSelectionKey, setLastTotalSelectionKey] = useState<string | null>(null);
  const [lastSelectedVariantId, setLastSelectedVariantId] = useState<string | null>(null);
  const [lastImageVariantId, setLastImageVariantId] = useState<string | null>(null);
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);
  const [selectedProductCloudMedia, setSelectedProductCloudMedia] = useState<LoadedProductMedia | null>(null);
  const [currentWorkstationSetup, setCurrentWorkstationSetup] = useState<any>(null);
  const [visualizerView, setVisualizerView] = useState<'3d' | 'photo'>('3d');
  const [isPhotoFullscreen, setIsPhotoFullscreen] = useState(false);
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [storeMiddlePartition, setStoreMiddlePartition] = useState<'Included' | 'None'>('Included');
  const [selectedLegStyle, setSelectedLegStyle] = useState<string>('Square Loop Leg');
  const [selectedLegColor, setSelectedLegColor] = useState<string>('Metallic Grey');
  const [selectedThickness, setSelectedThickness] = useState<string>('25 mm');
  const [selectedScreenColor, setSelectedScreenColor] = useState<string>('Frosty White');
  const [selectedFrontScreen, setSelectedFrontScreen] = useState<string>('Acrylic Privacy Screen');
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [quotationProduct, setQuotationProduct] = useState<Product | null>(null);
  const [quotationVariant, setQuotationVariant] = useState<ProductVariant | null>(null);
  const [quotationImageSrc, setQuotationImageSrc] = useState<string | null>(null);
  const [quotationVariantIds, setQuotationVariantIds] = useState<string[] | undefined>(undefined);
  const [quotationCartItems, setQuotationCartItems] = useState<QuotationCheckoutCartItem[] | null>(null);
  const [checkoutSuccessToast, setCheckoutSuccessToast] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pictureToast, setPictureToast] = useState(false);
  const [copiedShareToast, setCopiedShareToast] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState('122008');
  const [checkedPincode, setCheckedPincode] = useState('122008');
  const { profile } = useAuth();
  const isStaffOrAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'sales_executive' || profile?.role === 'employee';

  const handleCaptureSnapshotPicture = () => {
    // If in 3D mode, export current WebGL canvas as a crisp high-resolution PNG
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas && visualizerView === '3d') {
      try {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        const cleanName = (selectedProduct?.name || 'workstation').toLowerCase().replace(/[^a-z0-9]/g, '-');
        link.download = `${cleanName}-3d-custom-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setPictureToast(true);
        setTimeout(() => setPictureToast(false), 2600);
        return;
      } catch (e) {
        console.warn('Canvas snapshot error:', e);
      }
    }

    // Otherwise download the active product image
    const activeVarImg = selectedProduct?.variants?.find(v => v.id === selectedVariantId)?.imageData;
    const targetImg = activeImageSrc || activeVarImg;
    if (targetImg) {
      const link = document.createElement('a');
      const cleanName = (selectedProduct?.name || 'workstation').toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `${cleanName}-picture-${Date.now()}.png`;
      link.href = targetImg;
      link.click();
      setPictureToast(true);
      setTimeout(() => setPictureToast(false), 2600);
    }
  };
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

  // Keep selectedProduct synced with live Firestore updates (e.g., after uploading/editing photos)
  useEffect(() => {
    if (!selectedProduct) return;
    const targetId = selectedProduct.docId || selectedProduct.id;
    if (!targetId || targetId === 'alfa_workstation_default') return;
    const fresh = products.find(p => (p.docId || p.id) === targetId);
    if (fresh) {
      setSelectedProduct(prev => {
        if (!prev) return prev;
        if (
          prev.mediaSyncedAt === fresh.mediaSyncedAt &&
          prev.productImageData === fresh.productImageData &&
          prev.thumbnailData === fresh.thumbnailData &&
          prev.variants?.length === fresh.variants?.length &&
          prev.name === fresh.name &&
          prev.price === fresh.price
        ) {
          return prev;
        }
        return fresh;
      });
    }
  }, [products, selectedProduct]);

  const handleQuickUploadProductPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProduct) return;
    const targetId = selectedProduct.docId || selectedProduct.id;
    if (!targetId || targetId === 'alfa_workstation_default') return;
    setIsQuickUploadingPhoto(true);
    try {
      const compressed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await compressImageFile(files[i]);
        if (dataUrl) compressed.push(dataUrl);
      }
      if (compressed.length === 0) return;

      const existing = [
        ...(selectedProductCloudMedia?.images || []),
        ...(selectedProduct.images || []),
        ...(selectedProduct.productImageData ? [selectedProduct.productImageData] : [])
      ].filter(Boolean);
      const merged = Array.from(new Set([...compressed, ...existing]));

      await updateProductData(targetId, {
        productImageData: merged[0],
        images: merged
      });

      const refreshedCloud = await loadProductMediaFromFirestore(targetId, true);
      setSelectedProductCloudMedia(refreshedCloud);
      setActiveImageSrc(merged[0]);
      setVisualizerView('photo');
    } catch (error: any) {
      console.error('Quick photo upload failed:', error);
      alert(`Failed to upload product photo: ${error?.message || 'Unexpected error'}`);
    } finally {
      setIsQuickUploadingPhoto(false);
      if (quickPhotoInputRef.current) quickPhotoInputRef.current.value = '';
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const normalizedData = {
        ...productData,
        name: productData.name || productData.productName || 'Untitled Product',
        productName: productData.name || productData.productName || 'Untitled Product',
        category: productData.category || (selectedCategory !== 'All' ? selectedCategory : "Workstation's")
      };
      if (editingStorefrontProduct?.docId) {
        await updateProductData(editingStorefrontProduct.docId, normalizedData);
        const refreshedCloud = await loadProductMediaFromFirestore(editingStorefrontProduct.docId, true);
        setSelectedProductCloudMedia(refreshedCloud);
        if (normalizedData.productImageData || refreshedCloud.primaryImage) {
          setActiveImageSrc(normalizedData.productImageData || refreshedCloud.primaryImage || null);
        }
        setEditingStorefrontProduct(null);
      } else {
        await saveProduct(normalizedData);
      }
      setIsNewProductModalOpen(false);
    } catch (error) {
      console.error("Error saving product from storefront:", error);
      throw error;
    }
  };

  const allProductCategories = deduplicateCategories([
    ...products.map(p => p.category || p.details?.category).filter(Boolean),
    "Office Studio", "Executive Table", "Conference Table", "Reception Table", "Workstations", "Storages", "Seating Series",
    "Homes", "Sofa/couch", "Armchairs/recliners", "Coffee table", "TV unit/entertainment console", "Side/end tables", "Dining sets", "Beds", "Wardrobes", "Desks",
    "Educational & Institutional", "School desks & chairs", "Library furniture", "Admin Furniture",
    "Factories & Warehouses", "Racks", "Lockers", "Customize",
    "Catalogues"
  ]);
  const categories = ['All', ...allProductCategories];
  
  // Ensure Alfa Modular Workstation is always available in catalog
  const hasAlfaWorkstation = products.some(p => {
    if (!p) return false;
    const n = (p.name || (p as any).productName || '').toLowerCase();
    return n.includes('alfa') || n.includes('alpha');
  });

  const defaultAlfaWorkstation: Product = {
    id: 'alfa_workstation_default',
    docId: 'alfa_workstation_default',
    name: "Alfa Modular Workstation Pro",
    productName: "Alfa Modular Workstation Pro",
    category: "Workstation's",
    specification: "Ergonomic modular office workstation with heavy-duty metal legs, acrylic front privacy screen, PLPB board top, and integrated flip-box wire-raceway power management.",
    description: "The Alfa Modular Workstation is engineered for modern high-productivity corporate offices. Built with high-density particle board (PLPB) with 25mm thickness, robust powder-coated steel understructure, integrated wire raceway, and front privacy screen.",
    price: "14500",
    salesRate: 14500,
    vendorId: "v_srk",
    vendorName: "SRK Modular Systems",
    createdAt: new Date(),
    variants: [
      // Sizes
      { id: 'alfa_v1', variantType: 'size', name: '1200 x 600 mm (Single Linear Desk)', size: '1200 x 600 mm', price: 14500 },
      { id: 'alfa_v2', variantType: 'size', name: '1200 x 750 mm (Deep Work Surface)', size: '1200 x 750 mm', price: 16200 },
      { id: 'alfa_v3', variantType: 'size', name: '1500 x 600 mm (Executive Length)', size: '1500 x 600 mm', price: 18500 },
      { id: 'alfa_v4', variantType: 'size', name: '1500 x 750 mm (Spacious Studio)', size: '1500 x 750 mm', price: 21000 },
      { id: 'alfa_v5', variantType: 'size', name: '1800 x 750 mm (Director Desk)', size: '1800 x 750 mm', price: 24500 },
      { id: 'alfa_v6', variantType: 'size', name: '2400 x 1200 mm (4-Person Cluster)', size: '2400 x 1200 mm (4-Person)', price: 42000 },
      // Side Storage
      { id: 'alfa_v7', variantType: 'side_storage', name: 'Mobile Pedestal 3-Drawer', sideStorage: 'Mobile Pedestal 3-Drawer', price: 3800 },
      { id: 'alfa_v8', variantType: 'side_storage', name: 'Fixed Underdesk Pedestal', sideStorage: 'Fixed Underdesk Pedestal', price: 3200 },
      { id: 'alfa_v9', variantType: 'side_storage', name: 'Side Credenza Storage Unit', sideStorage: 'Side Credenza Storage Unit', price: 6500 },
      { id: 'alfa_v10', variantType: 'side_storage', name: 'Slim CPU Holder & Drawer', sideStorage: 'Slim CPU Holder & Drawer', price: 2900 },
      // Electric
      { id: 'alfa_v11', variantType: 'electric', name: 'Dual Flip Box & Cable Raceway', electricOption: 'Dual Flip Box & Cable Raceway', price: 1800 },
      { id: 'alfa_v12', variantType: 'electric', name: 'Pop-up Power Box (USB-C & Fast Charge)', electricOption: 'Pop-up Power Box (USB-C & Fast Charge)', price: 2500 },
      { id: 'alfa_v13', variantType: 'electric', name: 'Aluminium Raceway & Wireless Charger', electricOption: 'Aluminium Raceway & Wireless Charger', price: 3400 },
      // Colors / Board Finish
      { id: 'alfa_v14', variantType: 'color', name: 'Classic Walnut', color: 'Classic Walnut', colorCode: '#4E342E', price: 0 },
      { id: 'alfa_v15', variantType: 'color', name: 'Swedish White', color: 'Swedish White', colorCode: '#F8FAFC', price: 0 },
      { id: 'alfa_v16', variantType: 'color', name: 'Natural Teak', color: 'Natural Teak', colorCode: '#8D6E63', price: 0 },
      { id: 'alfa_v17', variantType: 'color', name: 'Slate Grey', color: 'Slate Grey', colorCode: '#374151', price: 0 },
      { id: 'alfa_v18', variantType: 'color', name: 'Bavarian Beech', color: 'Bavarian Beech', colorCode: '#D7CCC8', price: 0 },
      { id: 'alfa_v19', variantType: 'color', name: 'Charcoal Black', color: 'Charcoal Black', colorCode: '#1E293B', price: 0 }
    ],
    details: {
      productName: "Alfa Modular Workstation Pro",
      category: "Workstation's",
      specification: "Ergonomic modular office workstation with heavy-duty metal legs, acrylic front privacy screen, PLPB board top, flip-box wire-raceway power management.",
      details: "The Alfa Modular Workstation is engineered for modern high-productivity corporate offices.",
      description: "The Alfa Modular Workstation is engineered for modern high-productivity corporate offices."
    }
  } as any;

  const displayProducts = hasAlfaWorkstation ? products : [defaultAlfaWorkstation, ...products];

  let filteredProducts = displayProducts.filter(p => {
    if (!p) return false;
    const pName = p.name || (p as any).productName || '';
    const pSpec = p.specification || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pSpec.toLowerCase().includes(searchQuery.toLowerCase());
    const c = p.category || p.details?.category;
    const matchesCategory = selectedCategory === 'All' || isCategoryMatch(c, selectedCategory);
    return Boolean(matchesSearch && matchesCategory);
  });

  const searchMatchingCategories = searchQuery 
    ? Array.from(new Set([
        ...allProductCategories.filter(c => (c as string).toLowerCase().includes(searchQuery.toLowerCase())),
        ...filteredProducts.map(p => p.category || p.details?.category).filter(Boolean)
      ]))
    : [];

  

  // Synchronize active variants and preselect 1 default option in each section when product changes
  useEffect(() => {
    let cancelled = false;
    const nextProdId = selectedProduct ? (selectedProduct.docId || selectedProduct.id) : null;
    const isDifferentProduct = prevSelectedProductIdRef.current !== nextProdId;
    prevSelectedProductIdRef.current = nextProdId;

    if (isDifferentProduct) {
      setLastTotalSelectionKey(null);
      setLastSelectedVariantId(null);
      setLastImageVariantId(null);
      setSelectedProductCloudMedia(null);
    }

    if (selectedProduct) {
      if (isDifferentProduct) {
        setVisualizerView('3d');
      }
      const prodDocId = selectedProduct.docId || selectedProduct.id;
      const immediateProductFallback =
        selectedProduct.productImageData ||
        selectedProduct.details?.productImageData ||
        selectedProduct.images?.[0] ||
        selectedProduct.details?.images?.[0] ||
        selectedProduct.thumbnailData ||
        null;

      const all = (selectedProduct.variants || []).filter(Boolean);
      if (all.length > 0) {
        const sizeVars = all.filter(v => v.variantType === 'size' || Boolean(v.size));
        const sideStorageVars = all.filter(v => v.variantType === 'side_storage' || Boolean(v.sideStorage));
        const electricVars = all.filter(v => v.variantType === 'electric' || Boolean(v.electricOption));
        const colorVars = all.filter(v => v.variantType === 'color' || Boolean((v.colorCode || v.color) && !v.sideStorage && !v.electricOption && v.variantType !== 'custom'));
        const customVars = all.filter(v => v.variantType === 'custom' || Boolean(v.groupName && v.variantType !== 'color' && v.variantType !== 'size' && v.variantType !== 'side_storage' && v.variantType !== 'electric'));

        const firstSize = sizeVars[0];
        const firstStorage = sideStorageVars[0];
        const firstElectric = electricVars[0];
        const firstColor = colorVars[0];

        const initialCustomMap: Record<string, string> = {};
        const groupNames = Array.from(new Set(customVars.map(v => v.groupName || 'Additional Options')));
        const defaultCustomVars: ProductVariant[] = [];
        for (const gName of groupNames) {
          const gItem = customVars.find(v => (v.groupName || 'Additional Options') === gName);
          if (gItem) {
            initialCustomMap[gName] = gItem.id;
            defaultCustomVars.push(gItem);
          }
        }

        const firstVar = firstSize || firstStorage || firstElectric || firstColor || defaultCustomVars[0] || all[0];

        if (isDifferentProduct) {
          setSelectedSizeVariantId(firstSize ? firstSize.id : null);
          setSelectedSideStorageVariantId(firstStorage ? firstStorage.id : null);
          setSelectedElectricVariantId(firstElectric ? firstElectric.id : null);
          setSelectedColorVariantId(firstColor ? firstColor.id : null);
          setSelectedCustomVariantIds(initialCustomMap);
          setSelectedVariantId(firstVar ? firstVar.id : null);
        }

        const initCandidates = [
          firstVar,
          ...defaultCustomVars,
          firstColor,
          firstSize,
          firstStorage,
          firstElectric,
          all[0]
        ].filter((v): v is ProductVariant => Boolean(v));

        (async () => {
          let resolvedImg: string | null = null;
          let resolvedVarId: string | null = null;

          for (const candidate of initCandidates) {
            if (cancelled) return;
            if (candidate.imageData) {
              resolvedImg = candidate.imageData;
              resolvedVarId = candidate.id;
              break;
            }
            const data = await getVariantFile(candidate.id);
            if (!cancelled && data) {
              resolvedImg = data;
              resolvedVarId = candidate.id;
              break;
            }
          }

          if (!resolvedImg && immediateProductFallback) {
            resolvedImg = immediateProductFallback;
          }
          if (!resolvedImg && prodDocId) {
            const pFile = await getProductFile(prodDocId);
            if (!cancelled && pFile) resolvedImg = pFile;
          }

          if (!cancelled && resolvedImg) {
            if (resolvedVarId) setLastImageVariantId(resolvedVarId);
            setActiveImageSrc(resolvedImg);
          } else if (!cancelled) {
            setActiveImageSrc(null);
          }

          // Hydrate full gallery & variant images from Firestore subcollection (works across all origins/devices)
          if (prodDocId) {
            const cloud = await loadProductMediaFromFirestore(prodDocId, !isDifferentProduct);
            if (cancelled) return;
            setSelectedProductCloudMedia(cloud);
            const cloudVarMatch = initCandidates.find(c => cloud.variantImages[c.id]);
            const bestCloudImg =
              (cloudVarMatch ? cloud.variantImages[cloudVarMatch.id] : undefined) ||
              cloud.primaryImage ||
              cloud.images[0];
            if (bestCloudImg && (!resolvedImg || resolvedImg === selectedProduct.thumbnailData || cloudVarMatch)) {
              if (cloudVarMatch) setLastImageVariantId(cloudVarMatch.id);
              setActiveImageSrc(bestCloudImg);
            }
          }
        })();
      } else {
        if (isDifferentProduct) {
          setSelectedVariantId(null);
          setSelectedSizeVariantId(null);
          setSelectedSideStorageVariantId(null);
          setSelectedElectricVariantId(null);
          setSelectedColorVariantId(null);
          setSelectedCustomVariantIds({});
        }
        setActiveImageSrc(immediateProductFallback);

        (async () => {
          if (!immediateProductFallback && prodDocId) {
            const localFile = await getProductFile(prodDocId);
            if (!cancelled && localFile) setActiveImageSrc(localFile);
          }
          if (prodDocId) {
            const cloud = await loadProductMediaFromFirestore(prodDocId, !isDifferentProduct);
            if (cancelled) return;
            setSelectedProductCloudMedia(cloud);
            const cloudBest = cloud.primaryImage || cloud.images[0];
            if (cloudBest) setActiveImageSrc(cloudBest);
          }
        })();
      }
    } else {
      setSelectedVariantId(null);
      setSelectedSizeVariantId(null);
      setSelectedSideStorageVariantId(null);
      setSelectedElectricVariantId(null);
      setSelectedColorVariantId(null);
      setSelectedCustomVariantIds({});
      setActiveImageSrc(null);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedProduct]);

  const activateVariantImage = async (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    setLastSelectedVariantId(variant.id);
    if (variant.imageData) {
      setLastImageVariantId(variant.id);
      setActiveImageSrc(variant.imageData);
      return;
    }
    const cloudVarImg = selectedProductCloudMedia?.variantImages?.[variant.id];
    if (cloudVarImg) {
      setLastImageVariantId(variant.id);
      setActiveImageSrc(cloudVarImg);
      return;
    }
    try {
      const storedImage = await getVariantFile(variant.id);
      if (storedImage) {
        setLastImageVariantId(variant.id);
        setActiveImageSrc(storedImage);
        return;
      }
      const prodDocId = selectedProduct?.docId || selectedProduct?.id;
      if (prodDocId) {
        const cloud = await loadProductMediaFromFirestore(prodDocId);
        setSelectedProductCloudMedia(cloud);
        if (cloud.variantImages[variant.id]) {
          setLastImageVariantId(variant.id);
          setActiveImageSrc(cloud.variantImages[variant.id]);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load variant image', e);
    }
  };

  const addToCart = (
    product: Product, 
    workstationSetup?: any, 
    variant?: ProductVariant,
    configuredPrice?: number,
    selectedOptionsSummary?: string,
    imageSrc?: string,
    selectedVariantIds?: string[]
  ) => {
    setCart(prev => {
      const isWorkstation = isCategoryMatch(product.category, "Workstation");
      const finalPrice = configuredPrice ?? (
        isWorkstation && workstationSetup?.calculatedPrice 
          ? workstationSetup.calculatedPrice 
          : undefined
      );

      const setupKey = workstationSetup 
        ? `_${workstationSetup.dimensions}_${workstationSetup.material}_${workstationSetup.thickness}_${workstationSetup.tableTopColor}_${workstationSetup.screenColor}_${workstationSetup.middlePartition}_${workstationSetup.legColor}_${workstationSetup.legSize}_${workstationSetup.legStyle}` 
        : (selectedOptionsSummary ? `_${selectedOptionsSummary}` : '');

      const cartItemId = `${product.docId || product.id}_${variant?.id || 'base'}${setupKey}`;
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + 1, imageSrc: imageSrc || item.imageSrc }
            : item
        );
      }
      return [...prev, { 
        id: cartItemId, 
        product, 
        quantity: 1, 
        workstationSetup: workstationSetup ? { ...workstationSetup, calculatedPrice: finalPrice } : undefined, 
        selectedVariant: variant,
        selectedVariantIds,
        imageSrc: imageSrc || variant?.imageData,
        configuredPrice: finalPrice,
        selectedOptionsSummary: selectedOptionsSummary || (variant ? (variant.size || variant.name) : undefined)
      }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId && item.product.docId !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => {
    let price = 0;
    if (item.configuredPrice !== undefined && item.configuredPrice !== null) {
      price = item.configuredPrice;
    } else if (item.workstationSetup?.calculatedPrice) {
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
    <div className={`${selectedProduct ? 'bg-white' : 'bg-slate-50'} min-h-screen font-sans flex flex-col -mx-0 -mt-0 -mb-12`}>
      {/* Header */}
      <header className="bg-white text-slate-900 sticky top-0 z-50 border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20 md:h-22">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-red-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div 
                className="cursor-pointer flex items-center" 
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedProduct(null);
                  setSearchQuery('');
                }}
              >
                <img src="/logo.png" alt="SRK Modular Furniture co" className="h-14 md:h-18 w-auto object-contain" />
              </div>
            </div>
            
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 flex-1 justify-center flex-wrap">
              {[
                {
                  name: 'Office Studio',
                  subItems: ["Executive Table", "Conference Table", "Reception Table", "Workstations", "Storages", "Seating Series"]
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
                    onClick={() => {
                      setSelectedCategory(item.name);
                      setSelectedProduct(null);
                      setSearchQuery('');
                    }}
                    className={`text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap h-20 md:h-22 flex items-center cursor-pointer ${selectedCategory === item.name ? 'text-red-600 font-black' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {item.name}
                  </button>
                  {item.subItems && (
                    <div className="absolute left-0 top-[100%] w-60 bg-white border border-slate-200 shadow-xl rounded-b-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2 border-t-2 border-t-red-600 flex flex-col">
                      {item.subItems.map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            setSelectedCategory(sub);
                            setSelectedProduct(null);
                            setSearchQuery('');
                          }}
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
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) {
                      setSelectedProduct(null);
                    }
                  }}
                  className="bg-slate-100/90 border border-slate-200/80 text-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all w-52 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-4 shadow-xl">
            {[
              {
                name: 'Office Studio',
                subItems: ["Executive Table", "Conference Table", "Reception Table", "Workstations", "Storages", "Seating Series"]
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
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory(item.name);
                    setSelectedProduct(null);
                    setSearchQuery('');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left font-bold text-sm text-slate-800 uppercase tracking-wide py-1.5 hover:text-red-600 transition-colors"
                >
                  {item.name}
                </button>
                {item.subItems && (
                  <div className="pl-4 border-l-2 border-red-100 space-y-1">
                    {item.subItems.map(sub => (
                      <button
                        key={sub}
                        onClick={() => {
                          setSelectedCategory(sub);
                          setSelectedProduct(null);
                          setSearchQuery('');
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-left text-xs text-slate-600 hover:text-red-600 py-1 transition-colors"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
      <main className="flex-1 w-full max-w-none px-4 sm:px-8 lg:px-12 py-5 lg:py-7">
        {selectedProduct ? (
          <div className="max-w-[1520px] mx-auto w-full">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center text-xs sm:text-[13px] font-medium text-slate-500 mb-6">
              <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setSelectedProduct(null)}>Home</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
              <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => {
                setSelectedCategory(selectedProduct.category || 'All');
                setSelectedProduct(null);
              }}>
                {selectedProduct.category || 'Products'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">{selectedProduct.name}</span>
            </nav>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              {/* Left: Gallery & 3D Visualizer Column */}
              {(() => {
                const isWorkstation = isCategoryMatch(selectedProduct.category, "Workstation") || 
                                      (selectedProduct.name || '').toLowerCase().includes('workstation') ||
                                      (selectedProduct.name || '').toLowerCase().includes('alfa') ||
                                      (selectedProduct.name || '').toLowerCase().includes('alpha');
                const isPhotoMode = !isWorkstation || visualizerView === 'photo';
                const allVariants = (selectedProduct.variants || []).filter(Boolean);
                const allSizeVariants = allVariants.filter(v => v.variantType === 'size' || Boolean(v.size));
                const sideStorageVariants = allVariants.filter(v => v.variantType === 'side_storage' || Boolean(v.sideStorage));
                const electricVariants = allVariants.filter(v => v.variantType === 'electric' || Boolean(v.electricOption));
                const colorVariants = allVariants.filter(v => v.variantType === 'color' || Boolean((v.colorCode || v.color) && !v.sideStorage && !v.electricOption && v.variantType !== 'custom'));
                const customVariants = allVariants.filter(v => v.variantType === 'custom' || Boolean(v.groupName && v.variantType !== 'color' && v.variantType !== 'size' && v.variantType !== 'side_storage' && v.variantType !== 'electric'));

                const resolveColorSwatchHex = (label: string, explicitHex?: string): string => {
                  if (explicitHex) return explicitHex;
                  const key = label.trim().toLowerCase();
                  const colorMap: Record<string, string> = {
                    gray: '#71717a',
                    grey: '#71717a',
                    black: '#18181b',
                    pink: '#ec4899',
                    white: '#f8fafc',
                    blue: '#2563eb',
                    navy: '#1e3a8a',
                    red: '#dc2626',
                    green: '#16a34a',
                    mint: '#5eead4',
                    walnut: '#5c4033',
                    teak: '#b5651d',
                    oak: '#c8a165',
                    brown: '#78350f',
                    cream: '#fef3c7',
                    beige: '#e7e5e4',
                    yellow: '#eab308',
                    orange: '#ea580c',
                    purple: '#9333ea',
                    silver: '#cbd5e1',
                    charcoal: '#27272a',
                  };
                  for (const [k, hex] of Object.entries(colorMap)) {
                    if (key.includes(k)) return hex;
                  }
                  return '#94a3b8';
                };

                // Dynamically adjust size options when side storage, color, or option choices change
                const sizeVariants = (() => {
                  let list = allSizeVariants;
                  if (selectedSideStorageVariantId) {
                    const activeStorage = sideStorageVariants.find(s => s.id === selectedSideStorageVariantId);
                    if (activeStorage) {
                      const storageText = (activeStorage.sideStorage || activeStorage.name || '').toLowerCase().trim();
                      if (storageText) {
                        const matched = allSizeVariants.filter(v => {
                          const vStorage = (v.sideStorage || v.name || '').toLowerCase();
                          return vStorage.includes(storageText) || storageText.includes(vStorage);
                        });
                        if (matched.length > 0) list = matched;
                      }
                    }
                  }
                  if (selectedColorVariantId) {
                    const activeColor = colorVariants.find(c => c.id === selectedColorVariantId);
                    if (activeColor) {
                      const colorText = (activeColor.color || activeColor.name || '').toLowerCase().trim();
                      if (colorText) {
                        const matched = list.filter(v => {
                          const vColor = (v.color || v.name || '').toLowerCase();
                          return vColor.includes(colorText) || colorText.includes(vColor);
                        });
                        if (matched.length > 0) list = matched;
                      }
                    }
                  }
                  return list;
                })();

                const activeSizeVar = sizeVariants.find(v => v.id === selectedSizeVariantId) || sizeVariants[0];
                const activeStorageVar = sideStorageVariants.find(v => v.id === selectedSideStorageVariantId);
                const activeElectricVar = electricVariants.find(v => v.id === selectedElectricVariantId);
                const activeColorVar = colorVariants.find(v => v.id === selectedColorVariantId);

                const baseProductPrice =
                  selectedProduct.salesRate ||
                  parsePriceNumber(selectedProduct.price || selectedProduct.details?.perUnitPrice || selectedProduct.details?.totalUnitPrice) ||
                  0;

                const selectedCustomEntries = (() => {
                  const grouped = customVariants.reduce((acc, v) => {
                    const g = v.groupName || 'Additional Options';
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(v);
                    return acc;
                  }, {} as Record<string, ProductVariant[]>);
                  return Object.entries(grouped).map(([gName, vList]) => {
                    const selId = selectedCustomVariantIds[gName];
                    const matched = vList.find(v => v.id === selId) || vList[0];
                    return { gName, variant: matched };
                  }).filter((entry): entry is { gName: string; variant: ProductVariant } => Boolean(entry.variant));
                })();

                const firstCustomSelectedVar = selectedCustomEntries[0]?.variant;
                const activeVariant = activeSizeVar || activeStorageVar || activeElectricVar || activeColorVar || firstCustomSelectedVar || allVariants[0];

                const workstationCalculatedPrice = isWorkstation && currentWorkstationSetup?.calculatedPrice ? currentWorkstationSetup.calculatedPrice : null;

                let currentPrice = 0;
                if (isWorkstation && workstationCalculatedPrice) {
                  currentPrice = workstationCalculatedPrice;
                } else {
                  const totalCandidates: { key: string; price: number }[] = [];
                  let addonTotal = 0;

                  if (activeSizeVar) {
                    const sPrice = parsePriceNumber(activeSizeVar.price);
                    if (sPrice > 0) totalCandidates.push({ key: 'size', price: sPrice });
                  }

                  if (activeColorVar) {
                    const cPrice = parsePriceNumber(activeColorVar.price);
                    const cMode = resolveVariantPriceMode(activeColorVar, baseProductPrice);
                    if (cPrice > 0) {
                      if (cMode === 'total') {
                        totalCandidates.push({ key: 'color', price: cPrice });
                      } else {
                        addonTotal += cPrice;
                      }
                    }
                  }

                  if (activeStorageVar) {
                    const stPrice = parsePriceNumber(activeStorageVar.price);
                    const stMode = resolveVariantPriceMode(activeStorageVar, baseProductPrice);
                    if (stPrice > 0) {
                      if (stMode === 'total') totalCandidates.push({ key: 'side_storage', price: stPrice });
                      else addonTotal += stPrice;
                    }
                  }

                  if (activeElectricVar) {
                    const elPrice = parsePriceNumber(activeElectricVar.price);
                    const elMode = resolveVariantPriceMode(activeElectricVar, baseProductPrice);
                    if (elPrice > 0) {
                      if (elMode === 'total') totalCandidates.push({ key: 'electric', price: elPrice });
                      else addonTotal += elPrice;
                    }
                  }

                  selectedCustomEntries.forEach(({ gName, variant }) => {
                    const cPrice = parsePriceNumber(variant.price);
                    const cMode = resolveVariantPriceMode(variant, baseProductPrice);
                    if (cPrice > 0) {
                      if (cMode === 'total') {
                        totalCandidates.push({ key: `custom:${gName}`, price: cPrice });
                      } else {
                        addonTotal += cPrice;
                      }
                    }
                  });

                  const pickedTotalCandidate =
                    (lastTotalSelectionKey && totalCandidates.find(c => c.key === lastTotalSelectionKey)) ||
                    totalCandidates.find(c => c.key === 'size') ||
                    totalCandidates.find(c => c.key.startsWith('custom:')) ||
                    totalCandidates[0];

                  const resolvedBase = pickedTotalCandidate ? pickedTotalCandidate.price : baseProductPrice;
                  currentPrice = resolvedBase + addonTotal;
                }

                const summaryParts: string[] = [];
                if (activeSizeVar) summaryParts.push(`Size: ${activeSizeVar.size || activeSizeVar.name}`);
                if (activeStorageVar) summaryParts.push(`Storage: ${activeStorageVar.sideStorage || activeStorageVar.name}`);
                if (activeElectricVar) summaryParts.push(`Electric: ${activeElectricVar.electricOption || activeElectricVar.name}`);
                if (activeColorVar) summaryParts.push(`Top Finish: ${activeColorVar.color || activeColorVar.name}`);
                if (isWorkstation) {
                  summaryParts.push(`Thickness: ${selectedThickness}`);
                  summaryParts.push(`Leg: ${selectedLegStyle} (${selectedLegColor})`);
                  summaryParts.push(`Screen: ${selectedFrontScreen} (${selectedScreenColor})`);
                  summaryParts.push(`Partition: ${storeMiddlePartition}`);
                }
                selectedCustomEntries.forEach(({ gName, variant }) => {
                  summaryParts.push(`${gName}: ${variant.name}`);
                });
                const optionsSummary = summaryParts.join(' | ');
                const allSelectedVariants = [
                  activeColorVar,
                  ...selectedCustomEntries.map(e => e.variant),
                  activeSizeVar,
                  activeStorageVar,
                  activeElectricVar
                ].filter((v): v is ProductVariant => Boolean(v));
                const selectedVariantIds = Array.from(new Set(allSelectedVariants.map(v => v.id).filter(Boolean)));
                const imageVariant =
                  allSelectedVariants.find(v => v.id === lastImageVariantId) ||
                  allSelectedVariants.find(v => v.id === lastSelectedVariantId) ||
                  allSelectedVariants.find(v => Boolean(v.imageData)) ||
                  activeVariant;
                const resolvedCurrentImageSrc =
                  activeImageSrc ||
                  imageVariant?.imageData ||
                  (imageVariant?.id ? selectedProductCloudMedia?.variantImages?.[imageVariant.id] : undefined) ||
                  selectedProductCloudMedia?.primaryImage ||
                  selectedProduct.productImageData ||
                  selectedProduct.images?.[0] ||
                  selectedProduct.thumbnailData ||
                  undefined;
                const quotationResolvedVariant: ProductVariant | null = imageVariant
                  ? {
                      ...imageVariant,
                      name: optionsSummary || imageVariant.name,
                      price: currentPrice,
                      ...(resolvedCurrentImageSrc ? { imageData: resolvedCurrentImageSrc } : {})
                    }
                  : null;

                const effectiveSetup = currentWorkstationSetup || {
                  structure: 'wall-facing',
                  workstationStructure: 'wall-facing',
                  layoutType: 'linear',
                  sizeType: 'per_person',
                  widthPerPerson: '1200 mm',
                  depthPerPerson: '600 mm',
                  personQuantity: 1,
                  dimensions: activeSizeVar?.size || '1200 x 600 mm',
                  material: `${selectedThickness} PLPB Board`,
                  thickness: selectedThickness,
                  tableTopColor: activeColorVar?.color || activeColorVar?.name || 'Classic Walnut',
                  screenColor: selectedScreenColor,
                  middlePartition: storeMiddlePartition,
                  legColor: selectedLegColor,
                  legSize: '50x50',
                  legStyle: selectedLegStyle,
                  frontScreen: selectedFrontScreen,
                  electricFunction: activeElectricVar?.electricOption || activeElectricVar?.name || 'Dual Flip Box & Wire Raceway',
                  sideStorage: activeStorageVar?.sideStorage || activeStorageVar?.name || 'Without Side Storage',
                  calculatedPrice: currentPrice
                };

                const cleanPin = checkedPincode.replace(/\D/g, '');
                const dispatchDays = cleanPin.startsWith('12') || cleanPin.startsWith('11')
                  ? '2–3 business days'
                  : ['40', '56', '60', '50', '30', '41'].some(p => cleanPin.startsWith(p))
                  ? '3–5 business days'
                  : '5–7 business days';

                return (
                  <>
                    <div className="w-full lg:w-[54%] flex gap-4 shrink-0 lg:sticky lg:top-20 lg:self-start z-20">
                      {/* Left Vertical Thumbnails Sidebar */}
                      {(() => {
                        const angleImages: string[] = [];
                        if (selectedProductCloudMedia?.primaryImage) angleImages.push(selectedProductCloudMedia.primaryImage);
                        if (selectedProduct.productImageData) angleImages.push(selectedProduct.productImageData);
                        if (selectedProduct.details?.productImageData) angleImages.push(selectedProduct.details.productImageData);
                        if (Array.isArray(selectedProductCloudMedia?.images)) angleImages.push(...selectedProductCloudMedia.images);
                        if (Array.isArray(selectedProduct.images)) angleImages.push(...selectedProduct.images);
                        if (Array.isArray(selectedProduct.details?.images)) angleImages.push(...selectedProduct.details.images);
                        if (Array.isArray(selectedProduct.variants)) {
                          selectedProduct.variants.forEach(v => {
                            const vImg = v.imageData || selectedProductCloudMedia?.variantImages?.[v.id];
                            if (vImg && !angleImages.includes(vImg)) {
                              angleImages.push(vImg);
                            }
                          });
                        }
                        if (angleImages.length === 0 && selectedProduct.thumbnailData) {
                          angleImages.push(selectedProduct.thumbnailData);
                        }
                        const uniqueAngles = Array.from(new Set(angleImages.filter(Boolean)));
                        const currentImgIdx = uniqueAngles.indexOf(activeImageSrc || '');

                        const handlePrevImg = () => {
                          if (uniqueAngles.length === 0) return;
                          const nextIdx = currentImgIdx <= 0 ? uniqueAngles.length - 1 : currentImgIdx - 1;
                          setActiveImageSrc(uniqueAngles[nextIdx]);
                          setVisualizerView('photo');
                        };

                        const handleNextImg = () => {
                          if (uniqueAngles.length === 0) return;
                          const nextIdx = currentImgIdx >= uniqueAngles.length - 1 ? 0 : currentImgIdx + 1;
                          setActiveImageSrc(uniqueAngles[nextIdx]);
                          setVisualizerView('photo');
                        };

                        return (
                          <>
                            <div className="w-16 lg:w-[72px] shrink-0 flex flex-col gap-3 max-h-[660px] overflow-y-auto custom-scrollbar pr-0.5">
                              {/* 3D CAD Visualizer Thumbnail for Workstations */}
                              {isWorkstation && (
                                <button
                                  type="button"
                                  onClick={() => setVisualizerView('3d')}
                                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
                                    visualizerView === '3d' 
                                      ? 'border-slate-900 bg-slate-100' 
                                      : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                                  }`}
                                  title="Interactive 3D CAD Visualizer"
                                >
                                  <RotateCw className="w-4 h-4 text-slate-800" />
                                  <span className="text-[10px] font-bold text-slate-900 mt-0.5 uppercase tracking-tight">3D</span>
                                </button>
                              )}

                              {uniqueAngles.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageSrc(null);
                                    setVisualizerView('photo');
                                  }}
                                  className={`aspect-square rounded-xl border-2 flex items-center justify-center p-1 cursor-pointer transition-colors overflow-hidden bg-white ${
                                    isPhotoMode && !activeImageSrc ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
                                  }`}
                                  title="Product Photo"
                                >
                                  <StorefrontProductImage
                                    productId={selectedProduct.docId || selectedProduct.id}
                                    docId={selectedProduct.docId}
                                    customSrc={selectedProduct.productImageData || selectedProduct.thumbnailData}
                                    productName={selectedProduct.name}
                                  />
                                </button>
                              ) : (
                                uniqueAngles.map((src, aIdx) => {
                                  const isSelected = isPhotoMode && (activeImageSrc === src || (!activeImageSrc && aIdx === 0));
                                  return (
                                    <button 
                                      key={aIdx}
                                      type="button"
                                      onClick={() => {
                                        setActiveImageSrc(src);
                                        setVisualizerView('photo');
                                      }}
                                      className={`aspect-square rounded-xl flex items-center justify-center p-1.5 cursor-pointer transition-colors overflow-hidden bg-white ${
                                        isSelected 
                                          ? 'border-2 border-slate-900' 
                                          : 'border border-slate-200 hover:border-slate-400 opacity-85 hover:opacity-100'
                                      }`}
                                      title={`View ${aIdx + 1}`}
                                    >
                                      <img src={src} alt={`Angle ${aIdx + 1}`} className="w-full h-full object-contain" />
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Main Studio Gallery Stage */}
                            <div className={`flex-1 w-full ${isWorkstation && visualizerView === '3d' ? 'h-[480px] sm:h-[560px] lg:h-[640px] bg-[#F7F8FA]' : 'h-[440px] sm:h-[540px] lg:h-[630px] xl:h-[660px] bg-white'} rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group`}>
                              {/* Top-left 3D / Photo Switcher (Workstations only) */}
                              {isWorkstation && (
                                <div className="absolute top-3 left-3 z-20 flex items-center bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-lg p-0.5 shadow-2xs text-xs font-semibold gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setVisualizerView('photo')}
                                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-semibold ${
                                      visualizerView === 'photo' 
                                        ? 'bg-slate-900 text-white' 
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Photos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVisualizerView('3d')}
                                    className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer font-semibold ${
                                      visualizerView === '3d' 
                                        ? 'bg-slate-900 text-white' 
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    <Boxes className="w-3.5 h-3.5" />
                                    <span>3D View</span>
                                  </button>
                                </div>
                              )}

                              {/* Bottom-right subtle image actions */}
                              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCaptureSnapshotPicture}
                                  className="px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white border border-slate-200 text-slate-700 shadow-xs text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                                  title="Download product image"
                                >
                                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Save Image</span>
                                </button>

                                {isWorkstation && (
                                  <button
                                    type="button"
                                    onClick={() => setIsInfographicOpen(true)}
                                    className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white shadow-xs text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                                    title="2D CAD Specs Sheet"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">2D Specs</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIsPhotoFullscreen(true)}
                                  className="p-2 rounded-full bg-white/95 hover:bg-white border border-slate-200 text-slate-700 shadow-xs transition-colors cursor-pointer"
                                  title="Fullscreen View"
                                >
                                  <Maximize2 className="w-4 h-4 text-slate-700" />
                                </button>
                              </div>

                              {/* Snapshot feedback toast */}
                              {pictureToast && (
                                <div className="absolute top-3 z-30 bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Image downloaded</span>
                                </div>
                              )}

                              {/* Stage Canvas Body */}
                              {isWorkstation && visualizerView === '3d' ? (
                                <div className="w-full h-full pt-12 pb-10">
                                  <Workstation3DViewer 
                                    setup={effectiveSetup} 
                                    onToggleMiddlePartition={() => {
                                      const nextVal = storeMiddlePartition === 'None' ? 'Included' : 'None';
                                      setStoreMiddlePartition(nextVal);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="w-full h-full flex items-center justify-center cursor-zoom-in relative p-2"
                                  onClick={() => setIsPhotoFullscreen(true)}
                                >
                                  {activeImageSrc ? (
                                    <img src={activeImageSrc} alt={selectedProduct.name} className="max-w-full max-h-full object-contain transition-opacity duration-200" />
                                  ) : activeVariant?.imageData ? (
                                    <img src={activeVariant.imageData} alt={activeVariant.name} className="max-w-full max-h-full object-contain transition-opacity duration-200" />
                                  ) : (
                                    <StorefrontProductImage 
                                      variantId={activeVariant?.id} 
                                      productId={selectedProduct.docId || selectedProduct.id}
                                      docId={selectedProduct.docId}
                                      customSrc={resolvedCurrentImageSrc}
                                      productName={selectedProduct.name}
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  )}

                                  {isStaffOrAdmin && selectedProduct.docId && selectedProduct.docId !== 'alfa_workstation_default' && !activeImageSrc && !activeVariant?.imageData && !resolvedCurrentImageSrc && (
                                    <div
                                      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-3.5 py-2 shadow-md"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <input
                                        ref={quickPhotoInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={e => void handleQuickUploadProductPhotos(e.target.files)}
                                      />
                                      <button
                                        type="button"
                                        disabled={isQuickUploadingPhoto}
                                        onClick={() => quickPhotoInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                                      >
                                        {isQuickUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        <span>{isQuickUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingStorefrontProduct(selectedProduct);
                                          setIsNewProductModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Add Color / Angle Photos</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Circular Dark Navigation Arrows in Photo Mode */}
                              {isPhotoMode && uniqueAngles.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handlePrevImg(); }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-black text-white shadow-md flex items-center justify-center transition-colors cursor-pointer"
                                    title="Previous Image"
                                  >
                                    <ChevronLeft className="w-5 h-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleNextImg(); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-black text-white shadow-md flex items-center justify-center transition-colors cursor-pointer"
                                    title="Next Image"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                </>
                              )}

                              {/* Fullscreen Photo Lightbox Modal */}
                              {isPhotoFullscreen && (
                                <div 
                                  className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-md flex flex-row items-center justify-center p-4 cursor-pointer"
                                  onClick={() => setIsPhotoFullscreen(false)}
                                >
                                  <div 
                                    className="absolute top-4 inset-x-4 z-20 flex items-center justify-between text-white"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                                      <span className="font-bold text-sm sm:text-base">{selectedProduct.name}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setIsPhotoFullscreen(false)}
                                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                      <X className="w-5 h-5" />
                                      <span>Close</span>
                                    </button>
                                  </div>

                                  <div 
                                    className="w-full h-full flex items-center justify-center p-8 max-w-6xl max-h-[85vh]"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {visualizerView === '3d' ? (
                                      <div className="w-full h-full max-w-4xl max-h-[80vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                                        <Workstation3DViewer setup={effectiveSetup} />
                                      </div>
                                    ) : activeImageSrc ? (
                                      <img src={activeImageSrc} alt={selectedProduct.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                    ) : activeVariant?.imageData ? (
                                      <img src={activeVariant.imageData} alt={activeVariant.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                    ) : (
                                      <StorefrontProductImage 
                                        variantId={activeVariant?.id} 
                                        productId={selectedProduct.docId || selectedProduct.id}
                                        docId={selectedProduct.docId}
                                        customSrc={resolvedCurrentImageSrc}
                                        productName={selectedProduct.name}
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Right: Clean Editorial D2C Purchase Column */}
                    <div className="w-full lg:w-[46%] flex flex-col min-w-0">
                      {/* Rating Line + Promo Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-semibold text-slate-800">4.9</span>
                          <span className="text-slate-400">(18)</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/15" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuotationCartItems(null);
                            setQuotationProduct(selectedProduct);
                            setQuotationVariant(quotationResolvedVariant);
                            setQuotationImageSrc(resolvedCurrentImageSrc || null);
                            setQuotationVariantIds(selectedVariantIds);
                            setIsQuotationModalOpen(true);
                          }}
                          className="text-xs font-medium text-rose-600 border border-rose-300 bg-rose-50/50 hover:bg-rose-50 rounded-full px-3.5 py-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Save extra on bulk &amp; GST quotes
                        </button>
                      </div>

                      {/* Product Headline + Share */}
                      <div className="flex items-start justify-between gap-3">
                        <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 tracking-tight leading-snug mb-1.5" style={{ textWrap: 'balance' }}>
                          {selectedProduct.name}
                        </h1>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isStaffOrAdmin && selectedProduct.docId && selectedProduct.docId !== 'alfa_workstation_default' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStorefrontProduct(selectedProduct);
                                setIsNewProductModalOpen(true);
                              }}
                              title="Edit product details & upload photos"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit / Photos</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(window.location.href).catch(() => {});
                              }
                              setCopiedShareToast(true);
                              setTimeout(() => setCopiedShareToast(false), 2000);
                            }}
                            title="Copy product link"
                            className="p-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0 relative"
                          >
                            {copiedShareToast ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Share2 className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Clean Subtitle / Description */}
                      {(() => {
                        const typedDesc = (selectedProduct.description || selectedProduct.details?.details || selectedProduct.details?.description || '').trim();
                        if (typedDesc && typedDesc.length > 2) {
                          return (
                            <p className="text-slate-500 mb-4 leading-relaxed text-sm sm:text-[15px]">
                              {typedDesc}
                            </p>
                          );
                        }
                        return null;
                      })()}

                      {/* Pricing Block */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl lg:text-[34px] font-bold text-slate-900 tracking-tight tabular-nums">
                            ₹{Number(currentPrice).toLocaleString()}
                          </span>
                          <span className="text-base text-slate-400 line-through font-normal tabular-nums">
                            ₹{Math.floor(Number(currentPrice) * 1.25).toLocaleString()}.00
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-emerald-600">
                            20% Off
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          MRP(Inclusive of all taxes)
                        </p>
                      </div>

                      {/* Slim Commercial GST Quote Bar */}
                      <div className="mb-5 px-4 py-3 rounded-lg bg-[#EFF4F8] flex items-center justify-between gap-3">
                        <span className="text-xs sm:text-sm text-slate-700 leading-tight">
                          Instant GST invoice &amp; project quote <span className="text-slate-400 mx-1">|</span> Dispatch from factory
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuotationCartItems(null);
                            setQuotationProduct(selectedProduct);
                            setQuotationVariant(quotationResolvedVariant);
                            setQuotationImageSrc(resolvedCurrentImageSrc || null);
                            setQuotationVariantIds(selectedVariantIds);
                            setIsQuotationModalOpen(true);
                          }}
                          className="shrink-0 bg-[#1A2024] hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap"
                        >
                          GET QUOTE ▸
                        </button>
                      </div>

                      {/* Standard Product Variant Options (Hidden for Workstation, which uses Alfa Configurator below) */}
                      {!isWorkstation && (
                        <>
                          {/* Color Swatch Selector (Dedicated Color Variants) */}
                          {colorVariants.length > 0 && (() => {
                            const getVarImg = (v: ProductVariant) => v.imageData || selectedProductCloudMedia?.variantImages?.[v.id];
                            const distinctImgs = new Set(colorVariants.map(getVarImg).filter(Boolean));
                            const usePhotoSwatches = distinctImgs.size > 1;
                            return (
                              <div className="mb-5">
                                <p className="text-sm font-normal text-slate-900 mb-2.5">
                                  <span className="font-bold">Choose your color :</span>{' '}
                                  <span className="font-medium text-slate-700 capitalize">{activeColorVar ? (activeColorVar.color || activeColorVar.name) : 'Standard'}</span>
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {colorVariants.map(v => {
                                    const colorLabel = v.color || v.name;
                                    const isSelected = selectedColorVariantId === v.id;
                                    const swatchHex = resolveColorSwatchHex(colorLabel, v.colorCode);
                                    const swatchImg = getVarImg(v);
                                    if (usePhotoSwatches && swatchImg) {
                                      return (
                                        <button
                                          key={v.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedColorVariantId(v.id);
                                            if (parsePriceNumber(v.price) > 0 && resolveVariantPriceMode(v, baseProductPrice) === 'total') {
                                              setLastTotalSelectionKey('color');
                                            }
                                            void activateVariantImage(v);
                                          }}
                                          title={colorLabel}
                                          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white cursor-pointer transition-colors ${
                                            isSelected ? 'border-2 border-slate-900' : 'border border-slate-200 hover:border-slate-400'
                                          }`}
                                        >
                                          <img src={swatchImg} alt={colorLabel} className="w-11 h-11 lg:w-12 lg:h-12 object-contain rounded" />
                                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 capitalize">
                                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: swatchHex }} />
                                            {colorLabel}
                                          </span>
                                        </button>
                                      );
                                    }
                                    return (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedColorVariantId(v.id);
                                          if (parsePriceNumber(v.price) > 0 && resolveVariantPriceMode(v, baseProductPrice) === 'total') {
                                            setLastTotalSelectionKey('color');
                                          }
                                          void activateVariantImage(v);
                                        }}
                                        title={colorLabel}
                                        className={`px-3.5 py-2 rounded-lg border text-xs sm:text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                                          isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                                        }`}
                                      >
                                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: swatchHex }} />
                                        <span className="capitalize">{colorLabel}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Dynamic Custom Variant Groups */}
                          {(() => {
                            const allVars = (selectedProduct.variants || []).filter(Boolean);
                            const customVars = allVars.filter(v => v.variantType === 'custom' || Boolean(v.groupName && v.variantType !== 'color' && v.variantType !== 'size' && v.variantType !== 'side_storage' && v.variantType !== 'electric'));
                            if (customVars.length === 0) return null;

                            const grouped = customVars.reduce((acc, v) => {
                              const g = v.groupName || 'Additional Options';
                              if (!acc[g]) acc[g] = [];
                              acc[g].push(v);
                              return acc;
                            }, {} as Record<string, ProductVariant[]>);

                            return Object.entries(grouped).map(([gName, vList]) => {
                              const selId = selectedCustomVariantIds[gName];
                              const selVar = vList.find(v => v.id === selId) || vList[0];
                              const isColorGroup = /colou?r|finish|shade/i.test(gName);

                              if (isColorGroup) {
                                const getCustomImg = (v: ProductVariant) => v.imageData || selectedProductCloudMedia?.variantImages?.[v.id];
                                const distinctImgs = new Set(vList.map(getCustomImg).filter(Boolean));
                                const usePhotoSwatches = distinctImgs.size > 1;
                                return (
                                  <div key={gName} className="mb-5">
                                    <p className="text-sm text-slate-900 mb-2.5">
                                      <span className="font-bold">Choose your color :</span>{' '}
                                      <span className="font-medium text-slate-700 capitalize">{selVar ? selVar.name : 'Default'}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                      {vList.map(v => {
                                        const isSel = selId === v.id || (!selId && v.id === vList[0]?.id);
                                        const swatchHex = resolveColorSwatchHex(v.name, v.colorCode);
                                        const vPrice = parsePriceNumber(v.price);
                                        const vMode = resolveVariantPriceMode(v, baseProductPrice);
                                        const pricePrefix = vMode === 'addon' ? '+₹' : '₹';
                                        const customSwatchImg = getCustomImg(v);
                                        if (usePhotoSwatches && customSwatchImg) {
                                          return (
                                            <button
                                              key={v.id}
                                              type="button"
                                              onClick={() => {
                                                setSelectedCustomVariantIds(prev => ({ ...prev, [gName]: v.id }));
                                                if (vPrice > 0 && vMode === 'total') {
                                                  setLastTotalSelectionKey(`custom:${gName}`);
                                                }
                                                void activateVariantImage(v);
                                              }}
                                              title={`${v.name}${vPrice > 0 ? ` (${pricePrefix}${vPrice.toLocaleString()})` : ''}`}
                                              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white cursor-pointer transition-colors ${
                                                isSel ? 'border-2 border-slate-900' : 'border border-slate-200 hover:border-slate-400'
                                              }`}
                                            >
                                              <img src={customSwatchImg} alt={v.name} className="w-11 h-11 lg:w-12 lg:h-12 object-contain rounded" />
                                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 capitalize">
                                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: swatchHex }} />
                                                {v.name}
                                              </span>
                                            </button>
                                          );
                                        }
                                        return (
                                          <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedCustomVariantIds(prev => ({ ...prev, [gName]: v.id }));
                                              if (vPrice > 0 && vMode === 'total') {
                                                setLastTotalSelectionKey(`custom:${gName}`);
                                              }
                                              void activateVariantImage(v);
                                            }}
                                            title={`${v.name}${vPrice > 0 ? ` (${pricePrefix}${vPrice.toLocaleString()})` : ''}`}
                                            className={`px-3.5 py-2 rounded-lg border text-xs sm:text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                                              isSel ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                                            }`}
                                          >
                                            <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: swatchHex }} />
                                            <span className="capitalize">{v.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={gName} className="mb-4">
                                  <p className="text-[13px] text-slate-900 mb-2">
                                    <span className="font-bold">{gName} :</span>{' '}
                                    <span className="font-medium text-slate-700 capitalize">{selVar ? selVar.name : 'Default'}</span>
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {vList.map(v => {
                                      const isSel = selId === v.id || (!selId && v.id === vList[0]?.id);
                                      const vPrice = parsePriceNumber(v.price);
                                      const vMode = resolveVariantPriceMode(v, baseProductPrice);
                                      const pricePrefix = vMode === 'addon' ? '+₹' : '₹';
                                      return (
                                        <button
                                          key={v.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedCustomVariantIds(prev => ({ ...prev, [gName]: v.id }));
                                            if (vPrice > 0 && vMode === 'total') {
                                              setLastTotalSelectionKey(`custom:${gName}`);
                                            }
                                            void activateVariantImage(v);
                                          }}
                                          className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-2 text-left cursor-pointer ${
                                            isSel
                                              ? 'border-slate-900 bg-slate-900 text-white'
                                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                          }`}
                                        >
                                          <span className="capitalize">{v.name}</span>
                                          {vPrice > 0 && (
                                            <span className={`font-bold text-xs tabular-nums ${isSel ? 'text-slate-300' : 'text-slate-900'}`}>
                                              {pricePrefix}{vPrice.toLocaleString()}
                                            </span>
                                          )}
                                          {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}

                          {/* 1. Size Variants */}
                          {sizeVariants.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[13px] text-slate-900 mb-2">
                                <span className="font-bold">Size / Model :</span>{' '}
                                <span className="font-medium text-slate-700">{activeSizeVar ? (activeSizeVar.size || activeSizeVar.name) : 'Standard'}</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sizeVariants.map(v => {
                                  const sizeLabel = v.size || v.name;
                                  const isSelected = selectedSizeVariantId === v.id;
                                  const vPrice = parsePriceNumber(v.price);
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSizeVariantId(v.id);
                                        if (vPrice > 0) setLastTotalSelectionKey('size');
                                        void activateVariantImage(v);
                                      }}
                                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between gap-2 text-left cursor-pointer ${
                                        isSelected
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                      }`}
                                    >
                                      <span className="truncate">{sizeLabel}</span>
                                      <div className="shrink-0 flex items-center gap-1.5 tabular-nums">
                                        {vPrice > 0 && (
                                          <span className={`font-bold text-xs ${isSelected ? 'text-slate-200' : 'text-slate-900'}`}>
                                            ₹{vPrice.toLocaleString()}
                                          </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. Side Storage Option */}
                          {sideStorageVariants.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[13px] text-slate-900 mb-2">
                                <span className="font-bold">Side Storage :</span>{' '}
                                <span className="font-medium text-slate-700">{activeStorageVar ? (activeStorageVar.sideStorage || activeStorageVar.name) : 'Without Side Storage'}</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSideStorageVariantId(null)}
                                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between gap-2 text-left cursor-pointer ${
                                    !selectedSideStorageVariantId
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                  }`}
                                >
                                  <span>Without Side Storage</span>
                                  {!selectedSideStorageVariantId && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                </button>

                                {sideStorageVariants.map(v => {
                                  const storageLabel = v.sideStorage || v.name;
                                  const isSelected = selectedSideStorageVariantId === v.id;
                                  const vPrice = parseFloat(String(v.price).replace(/[^0-9.]/g, '')) || 0;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSideStorageVariantId(v.id);
                                        void activateVariantImage(v);
                                      }}
                                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between gap-2 text-left cursor-pointer ${
                                        isSelected
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                      }`}
                                    >
                                      <span className="truncate">{storageLabel}</span>
                                      <div className="shrink-0 flex items-center gap-1.5 tabular-nums">
                                        {vPrice > 0 && (
                                          <span className={`font-bold text-xs ${isSelected ? 'text-slate-200' : 'text-slate-900'}`}>+₹{vPrice.toLocaleString()}</span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3. Electric & Cabling */}
                          {electricVariants.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[13px] text-slate-900 mb-2">
                                <span className="font-bold">Electric &amp; Cabling :</span>{' '}
                                <span className="font-medium text-slate-700">{activeElectricVar ? (activeElectricVar.electricOption || activeElectricVar.name) : 'Standard / None'}</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {electricVariants.map(v => {
                                  const electricLabel = v.electricOption || v.name;
                                  const isSelected = selectedElectricVariantId === v.id;
                                  const vPrice = parseFloat(String(v.price).replace(/[^0-9.]/g, '')) || 0;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedElectricVariantId(selectedElectricVariantId === v.id ? null : v.id);
                                        void activateVariantImage(v);
                                      }}
                                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between gap-2 text-left cursor-pointer ${
                                        isSelected
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                      }`}
                                    >
                                      <span className="truncate">{electricLabel}</span>
                                      <div className="shrink-0 flex items-center gap-1.5 tabular-nums">
                                        {vPrice > 0 && <span className={`font-bold text-xs ${isSelected ? 'text-slate-200' : 'text-slate-900'}`}>+₹{vPrice.toLocaleString()}</span>}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Check Delivery Box (D2C Pincode & Dispatch Timeline) */}
                      {!isWorkstation && (
                        <>
                          <div className="mb-5 bg-[#F7F9FA] rounded-xl p-4 sm:p-5">
                            <h3 className="text-sm font-bold text-slate-900 mb-3">Check Delivery</h3>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-white border border-slate-200/80 rounded-lg px-3.5 py-2 flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={deliveryPincode}
                                  onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, ''))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && deliveryPincode.length === 6) {
                                      setCheckedPincode(deliveryPincode);
                                    }
                                  }}
                                  placeholder="Enter 6-digit pincode"
                                  className="w-full text-sm font-medium text-slate-900 bg-transparent focus:outline-none tabular-nums"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (deliveryPincode.length >= 4) setCheckedPincode(deliveryPincode);
                                  }}
                                  className="px-4 py-1.5 bg-[#1A2024] hover:bg-black text-white text-xs sm:text-[13px] font-semibold rounded-md transition-colors cursor-pointer shrink-0"
                                >
                                  Change
                                </button>
                              </div>
                              <Truck className="w-5 h-5 text-slate-600 shrink-0" />
                            </div>
                            <p className="text-xs sm:text-[13px] mt-2.5 font-medium">
                              <span className="text-emerald-700 font-semibold">Free delivery</span>{' '}
                              <span className="text-slate-600">| Dispatches in {dispatchDays} ({checkedPincode})</span>
                            </p>
                          </div>

                          {/* Active Offers Tier Cards */}
                          <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-900 mb-3.5">Active Offers</h3>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { tag: 'MOST POPULAR', label: 'Buy 2 or more', discount: '5% off', qty: 2, tagBg: 'bg-emerald-600' },
                                { tag: 'BEST VALUE', label: 'Buy 5 or more', discount: '10% off', qty: 5, tagBg: 'bg-[#1A2024]' },
                                { tag: 'MOST SAVINGS', label: 'Buy 10 or more', discount: '15% off', qty: 10, tagBg: 'bg-[#1A2024]' },
                              ].map((offer) => (
                                <button
                                  key={offer.qty}
                                  type="button"
                                  onClick={() => {
                                    for (let i = 0; i < offer.qty; i++) {
                                      addToCart(selectedProduct, currentWorkstationSetup, quotationResolvedVariant || activeVariant, currentPrice, optionsSummary, resolvedCurrentImageSrc, selectedVariantIds);
                                    }
                                    setIsCartOpen(true);
                                  }}
                                  className="relative pt-4 pb-3 px-2.5 rounded-xl border border-emerald-200/90 bg-[#F3FAF6] hover:border-emerald-400 transition-colors text-center cursor-pointer flex flex-col items-center"
                                >
                                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${offer.tagBg} text-white text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded whitespace-nowrap`}>
                                    {offer.tag}
                                  </span>
                                  <span className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-tight mt-0.5">{offer.label}</span>
                                  <span className="text-xs sm:text-[13px] font-bold text-emerald-700 mt-0.5">{offer.discount}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Alfa Modular Workstation Pro - Full CAD Configurator */}
                      {isWorkstation && (
                        <WorkstationSetup
                          onChange={(setup) => {
                            setCurrentWorkstationSetup(setup);
                          }}
                          variants={selectedProduct.variants}
                          activeVariant={activeVariant}
                          onSelectVariant={(v) => {
                            if (v.variantType === 'size' || v.size) setSelectedSizeVariantId(v.id);
                            if (v.variantType === 'color' || v.color) setSelectedColorVariantId(v.id);
                            void activateVariantImage(v);
                          }}
                          onColorChange={() => {}}
                          externalMiddlePartition={storeMiddlePartition}
                          onMiddlePartitionChange={(val) => setStoreMiddlePartition(val)}
                        />
                      )}

                      {/* Action Buttons */}
                      <div className="mt-auto pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button 
                          onClick={() => addToCart(selectedProduct, currentWorkstationSetup, quotationResolvedVariant || activeVariant, currentPrice, optionsSummary, resolvedCurrentImageSrc, selectedVariantIds)}
                          className="h-12 px-4 rounded-xl bg-[#1A2024] text-white font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm whitespace-nowrap"
                        >
                          <ShoppingCart className="w-4 h-4 shrink-0" />
                          <span>Add To Quote</span>
                        </button>
                        <button 
                          onClick={() => {
                            addToCart(selectedProduct, currentWorkstationSetup, quotationResolvedVariant || activeVariant, currentPrice, optionsSummary, resolvedCurrentImageSrc, selectedVariantIds);
                            setIsCartOpen(true);
                          }}
                          className="h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold transition-colors flex items-center justify-center cursor-pointer text-sm whitespace-nowrap"
                        >
                          Buy Now
                        </button>
                        <button 
                          onClick={() => {
                            setQuotationCartItems(null);
                            setQuotationProduct(selectedProduct);
                            setQuotationVariant(quotationResolvedVariant);
                            setQuotationImageSrc(resolvedCurrentImageSrc || null);
                            setQuotationVariantIds(selectedVariantIds);
                            setIsQuotationModalOpen(true);
                          }}
                          className="h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm whitespace-nowrap"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>Create Quotation</span>
                        </button>
                      </div>

                    </div>
                  </>
                );
              })()}
            </div>

            {/* Structured Product Specifications Section */}
            {(() => {
              const specs = (selectedProduct.specifications || selectedProduct.details?.specifications || [])
                .filter(s => s && (s.label?.trim() || s.value?.trim()));
              if (specs.length === 0) return null;
              return (
                <section className="mt-12 pt-8 border-t border-slate-200/80">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">
                    Specifications
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-6 max-w-4xl">
                    {specs.map((spec, sIdx) => (
                      <div key={sIdx} className="min-w-0">
                        <div className="text-xs sm:text-[13px] text-slate-500 font-normal mb-1">
                          {spec.label || 'Specification'}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-900">
                          {spec.value || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

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
                      {['All', "Executive Table", "Conference Table", "Reception Table", "Workstations", "Storages", "Seating Series"].map(cat => (
                        <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="category"
                            checked={selectedCategory === cat || (cat === "Workstations" && isCategoryMatch(selectedCategory, "Workstation"))}
                            onChange={() => {
                              setSelectedCategory(cat);
                              setSelectedProduct(null);
                            }}
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
                            setSelectedProduct(null);
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
                      const baseCardPrice =
                        product.salesRate ||
                        parsePriceNumber(product.price || product.details?.perUnitPrice || product.details?.totalUnitPrice) ||
                        14500;
                      const totalVariantPrices = validVariants
                        .filter(v => resolveVariantPriceMode(v, baseCardPrice) === 'total')
                        .map(v => parsePriceNumber(v?.price))
                        .filter(p => p > 0);
                      const lowestPrice = totalVariantPrices.length > 0
                        ? Math.min(...totalVariantPrices)
                        : baseCardPrice;

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
                              <StorefrontProductImage
                                productId={product.docId || product.id}
                                docId={product.docId}
                                customSrc={product.productImageData || product.images?.[0] || product.thumbnailData || product.variants?.find(v => v?.imageData)?.imageData}
                                productName={product.name}
                              />
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
                              <div className="space-y-2">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    addToCart(product, undefined, hasVariants ? product.variants![0] : undefined); 
                                  }}
                                  className="w-full py-2.5 rounded-full bg-amber-400 text-slate-900 font-medium hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <ShoppingCart className="w-4 h-4" /> Add to Quote
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuotationCartItems(null);
                                    setQuotationProduct(product);
                                    setQuotationVariant(hasVariants ? product.variants![0] : null);
                                    setQuotationImageSrc(null);
                                    setQuotationVariantIds(hasVariants && product.variants![0]?.id ? [product.variants![0].id] : undefined);
                                    setIsQuotationModalOpen(true);
                                  }}
                                  className="w-full py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <FileText className="w-4 h-4" /> Create Quotation
                                </button>
                              </div>
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
                      const itemPrice = item.configuredPrice ?? (
                        item.workstationSetup?.calculatedPrice
                          ? item.workstationSetup.calculatedPrice
                          : item.selectedVariant
                            ? (typeof item.selectedVariant.price === 'string' ? parseFloat(item.selectedVariant.price.replace(/[^0-9.]/g, '')) || 0 : item.selectedVariant.price)
                            : (parseFloat((item.product.details?.perUnitPrice || item.product.details?.totalUnitPrice || item.product.price || '0').replace(/[^0-9.]/g, '')) || 0)
                      );

                      return (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 relative group">
                          <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex shrink-0 p-2">
                             <StorefrontProductImage 
                               variantId={item.selectedVariant?.id} 
                               customSrc={item.imageSrc || item.selectedVariant?.imageData} 
                               productId={item.product.id} 
                               productName={item.selectedVariant?.name || item.product.name} 
                             />
                          </div>
                          <div className="flex-1 py-1">
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1 leading-snug pr-6">{item.product.name}</h4>
                            {item.selectedOptionsSummary ? (
                              <div className="text-[11px] text-indigo-700 font-semibold mt-1 leading-relaxed flex items-center flex-wrap gap-1">
                                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {item.selectedOptionsSummary}
                                </span>
                              </div>
                            ) : item.selectedVariant && (
                              <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {item.selectedVariant.size || item.selectedVariant.name || 'Standard'}
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
                  <button
                    type="button"
                    onClick={() => {
                      setQuotationProduct(null);
                      setQuotationVariant(null);
                      setQuotationCartItems([...cart]);
                      setIsCartOpen(false);
                      setIsQuotationModalOpen(true);
                    }}
                    className="w-full py-4 bg-black text-white font-bold uppercase tracking-wider text-sm rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-black/20 hover:shadow-red-600/30 cursor-pointer"
                  >
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
        onClose={() => {
          setIsNewProductModalOpen(false);
          setEditingStorefrontProduct(null);
        }}
        initialData={editingStorefrontProduct}
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

      {/* Commercial Quotation Generator Modal */}
      <CreateQuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setQuotationCartItems(null);
          setQuotationImageSrc(null);
          setQuotationVariantIds(undefined);
        }}
        initialProduct={quotationProduct}
        initialVariant={quotationVariant}
        initialImageSrc={quotationImageSrc}
        initialVariantIds={quotationVariantIds}
        initialCartItems={quotationCartItems}
        allProducts={products}
        onSaved={() => {
          if (quotationCartItems && quotationCartItems.length > 0) {
            setCart([]);
            setQuotationCartItems(null);
            setCheckoutSuccessToast(true);
            setTimeout(() => setCheckoutSuccessToast(false), 4500);
          }
        }}
      />

      {checkoutSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[90] bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Quotation created and saved to Quotations tab.</span>
        </div>
      )}

    </div>
  );
}

// Image component supporting products, variants, IndexedDB cache, and Firestore media fallback
function StorefrontProductImage({ 
  productId, 
  docId,
  variantId, 
  customSrc, 
  productName, 
  className = "w-full h-full object-cover object-center" 
}: { 
  productId?: string; 
  docId?: string;
  variantId?: string; 
  customSrc?: string; 
  productName: string; 
  className?: string; 
}) {
  const [src, setSrc] = useState<string | null>(customSrc || null);
  const [loadFailed, setLoadFailed] = useState(false);
  const lookupId = docId || productId;

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    if (customSrc) {
      setSrc(customSrc);
      return;
    }

    const resolveImage = async () => {
      if (variantId) {
        try {
          const vUrl = await getVariantFile(variantId);
          if (!cancelled && vUrl) {
            setSrc(vUrl);
            return;
          }
        } catch {}
      }

      if (lookupId) {
        try {
          const pUrl = await getProductFile(lookupId);
          if (!cancelled && pUrl) {
            setSrc(pUrl);
            return;
          }
        } catch {}

        try {
          const cloud = await loadProductMediaFromFirestore(lookupId);
          const cloudBest =
            (variantId ? cloud.variantImages[variantId] : undefined) ||
            cloud.primaryImage ||
            cloud.images[0];
          if (!cancelled && cloudBest) {
            setSrc(cloudBest);
            return;
          }
        } catch {}
      }

      if (!cancelled) setSrc(null);
    };

    void resolveImage();
    return () => {
      cancelled = true;
    };
  }, [lookupId, variantId, customSrc]);

  if (src && !loadFailed) {
    return (
      <img
        src={src}
        alt={productName}
        className={className}
        referrerPolicy="no-referrer"
        onError={() => setLoadFailed(true)}
      />
    );
  }
  
  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center rounded-xl text-slate-300 gap-1.5">
      <ImageIcon className="w-8 h-8 opacity-60" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        No Photo
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
    'HDFM': 2400,
    'HDHMR': 2400,
    'Plywood': 3800
  } as Record<string, number>,
  thickness: {
    '18 mm': 0,
    '25 g': 1500,
    '25 mm': 1500,
    '36 mm': 3200
  } as Record<string, number>,
  laminate: {
    front: 800,
    back: 800
  },
  metalPipeThickness: {
    '40x40': 0,
    '50x50': 800,
    '40 x 40': 0,
    '50 x 50': 800
  } as Record<string, number>,
  legStyle: {
    'Straight legs': 0,
    'U-shaped leg': 1200,
    'U shape legs': 1200,
    'Angular leg': 1800,
    'Angular legs': 1800
  } as Record<string, number>,
  cncSheet: 1500,
  frontScreen: {
    'Acrylic sheet': 0,
    'Pinna board': 600,
    'Pin up board': 600,
    'Wooden partition': 1200,
    'Wooden': 1200,
    'Magnetic glass': 2500,
    'Aluminum framing': 1800,
    'Aluminium framing': 1800,
    '6 mm lacquer glass': 2800,
    'No Screen': 0
  } as Record<string, number>,
  screenHeight: {
    '300 mm': 0,
    '300MM': 0,
    '400 mm': 500,
    '400MM': 500,
    '450 mm': 900,
    '450MM': 900
  } as Record<string, number>,
  wireManagement: 350,
  wireRaceway: 500,
  racewaySwitches: {
    '1 switch': 400,
    '2 switches': 550,
    '3 switches': 700
  } as Record<string, number>,
  storage: {
    '3-drawer pedestal': 3500,
    'drawer': 1200,
    'condrawer': 950
  } as Record<string, number>,
  addons: {
    '3-Drawer Pedestal': 3500,
    '3-Drawer Mobile Pedestal': 3500,
    'Drawer': 1200,
    'Condrawer': 950
  } as Record<string, number>,
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
    'Custom Colour': 0
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
  // Heading & Edge Option
  const [edgeOption] = useState('Less Billiard Workstation');

  // 1. Structure: Wall-facing or Face-to-face
  const [workstationStructure, setWorkstationStructure] = useState<'wall-facing' | 'face-to-face'>('wall-facing');

  // 2. Size: Width and Depth per person
  const [width, setWidth] = useState('1200 mm');
  const [depth, setDepth] = useState('600 mm');
  const [personQuantity, setPersonQuantity] = useState<number>(1);

  // 3. Tabletop Thickness: 25 mm, 18 mm, 36 mm
  const [thickness, setThickness] = useState('25 mm');

  // 4. Tabletop Material: PLPB, MDF, HDHMR, Plywood
  const [material, setMaterial] = useState('PLPB');

  // 5. Laminate tick boxes for Front or Another side (N/A for PLPB)
  const [laminateFront, setLaminateFront] = useState(true);
  const [laminateBack, setLaminateBack] = useState(false);

  // 6. Understructure metal pipe thickness: 40x40 or 50x50
  const [metalPipeThickness, setMetalPipeThickness] = useState<'40x40' | '50x50'>('50x50');

  // 7. Leg Style: Straight legs, U-shaped leg, Angular leg
  const [legStyle, setLegStyle] = useState('Straight legs');

  // 8. CNC Sheet (Optional): placed between two legs of understructure
  const [includeCncSheet, setIncludeCncSheet] = useState(false);

  // 9. Front Screen Options: 6 options + Height (300 mm, 400 mm, 450 mm)
  const [frontScreen, setFrontScreen] = useState('Acrylic sheet');
  const [screenHeight, setScreenHeight] = useState('300 mm');
  const [screenColor, setScreenColor] = useState('Blue');

  // 10. Wiring & electrical: Wire management, Wire raceway (default checked), switches (1 switch, 2 switches, 3 switches)
  const [wireManagement, setWireManagement] = useState(true);
  const [wireRaceway, setWireRaceway] = useState(true);
  const [racewaySwitches, setRacewaySwitches] = useState<'1 switch' | '2 switches' | '3 switches'>('2 switches');

  // 11. Storage & Pedestal checkboxes: 3-drawer pedestal, Drawer, Condrawer (NO keyboard tray!)
  const [pedestal3Drawer, setPedestal3Drawer] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [condrawer, setCondrawer] = useState(false);

  // Aesthetics: tabletop and leg colors for 3D visualizer
  const [tableTopColor, setTableTopColor] = useState('Frosty white');
  const [legColor, setLegColor] = useState('Black');

  // Sync width and depth when activeVariant changes
  useEffect(() => {
    if (activeVariant?.size) {
      const parsed = parseSizeDimensions(activeVariant.size);
      if (parsed.width) setWidth(parsed.width);
      if (parsed.depth) setDepth(parsed.depth);
    }
  }, [activeVariant]);

  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (variants && onSelectVariant) {
      const wNum = val.replace(/[^0-9]/g, '');
      const dNum = depth.replace(/[^0-9]/g, '');
      const matched = variants.find(v => v.size && v.size.includes(wNum) && v.size.includes(dNum));
      if (matched) onSelectVariant(matched);
    }
  };

  const handleDepthChange = (val: string) => {
    setDepth(val);
    if (variants && onSelectVariant) {
      const wNum = width.replace(/[^0-9]/g, '');
      const dNum = val.replace(/[^0-9]/g, '');
      const matched = variants.find(v => v.size && v.size.includes(wNum) && v.size.includes(dNum));
      if (matched) onSelectVariant(matched);
    }
  };

  // Base price calculation per person
  const personMultiplier = personQuantity || 1;
  const wNum = parseInt(width.replace(/[^0-9]/g, ''), 10) || 1200;
  const dNum = parseInt(depth.replace(/[^0-9]/g, ''), 10) || 600;
  const wDiff = Math.max(0, wNum - 800);
  const dDiff = Math.max(0, dNum - 600);
  const basePerPerson = 12000 + Math.round((wDiff / 100) * 600 + (dDiff / 100) * 500);
  const effectiveBasePrice = basePerPerson * personMultiplier;

  // Material cost
  const materialCost = (WORKSTATION_PRICING.material[material] || 0) * personMultiplier;

  // Thickness cost
  const thicknessCost = (WORKSTATION_PRICING.thickness[thickness] || 0) * personMultiplier;

  // Laminate cost (Only applies if not PLPB)
  const isLaminateApplicable = material !== 'PLPB';
  const laminateFrontCost = (isLaminateApplicable && laminateFront ? 800 : 0) * personMultiplier;
  const laminateBackCost = (isLaminateApplicable && laminateBack ? 800 : 0) * personMultiplier;
  const totalLaminateCost = laminateFrontCost + laminateBackCost;

  // Metal pipe thickness cost
  const pipeCost = (WORKSTATION_PRICING.metalPipeThickness[metalPipeThickness] || 0) * personMultiplier;

  // Leg style cost
  const legStyleCost = (WORKSTATION_PRICING.legStyle[legStyle] || 0) * (personMultiplier > 1 ? Math.ceil(personMultiplier * 0.75) : 1);

  // CNC sheet cost
  const cncCost = includeCncSheet ? (WORKSTATION_PRICING.cncSheet * (personMultiplier > 1 ? Math.ceil(personMultiplier * 0.75) : 1)) : 0;

  // Front screen cost
  const screenQtyMultiplier = personMultiplier > 1 ? Math.ceil(personMultiplier / 2) : 1;
  const screenCost = (WORKSTATION_PRICING.frontScreen[frontScreen] || 0) * screenQtyMultiplier;
  const screenHeightCost = (WORKSTATION_PRICING.screenHeight[screenHeight] || 0) * screenQtyMultiplier;

  // Wiring & electrical cost
  const wireMgmtCost = (wireManagement ? WORKSTATION_PRICING.wireManagement : 0) * personMultiplier;
  const wireRacewayCost = (wireRaceway ? WORKSTATION_PRICING.wireRaceway : 0) * personMultiplier;
  const switchesCost = (wireRaceway ? (WORKSTATION_PRICING.racewaySwitches[racewaySwitches] || 400) : 0) * personMultiplier;
  const totalElectricCost = wireMgmtCost + wireRacewayCost + switchesCost;

  // Storage cost (3-drawer pedestal, drawer, condrawer)
  const pedestalCost = (pedestal3Drawer ? WORKSTATION_PRICING.storage['3-drawer pedestal'] : 0) * personMultiplier;
  const drawerCost = (drawer ? WORKSTATION_PRICING.storage['drawer'] : 0) * personMultiplier;
  const condrawerCost = (condrawer ? WORKSTATION_PRICING.storage['condrawer'] : 0) * personMultiplier;
  const totalStorageCost = pedestalCost + drawerCost + condrawerCost;

  const totalCalculatedPrice = Math.round(
    effectiveBasePrice +
    materialCost +
    thicknessCost +
    totalLaminateCost +
    pipeCost +
    legStyleCost +
    cncCost +
    screenCost +
    screenHeightCost +
    totalElectricCost +
    totalStorageCost
  );

  useEffect(() => {
    if (onChange) {
      const activeAddons: string[] = [];
      if (pedestal3Drawer) activeAddons.push('3-Drawer Pedestal');
      if (drawer) activeAddons.push('Drawer');
      if (condrawer) activeAddons.push('Condrawer');

      onChange({
        edgeOption,
        structure: workstationStructure,
        workstationStructure,
        layoutType: workstationStructure === 'wall-facing' ? 'linear' : 'cluster',
        sizeType: 'per_person',
        dimensions: `${width} x ${depth} (${personQuantity}P ${workstationStructure === 'wall-facing' ? 'Wall-Facing' : 'Face-to-Face'})`,
        widthPerPerson: width,
        depthPerPerson: depth,
        personQuantity,
        material,
        thickness,
        laminateFront: isLaminateApplicable ? laminateFront : false,
        laminateBack: isLaminateApplicable ? laminateBack : false,
        metalPipeThickness,
        legStyle,
        legSize: metalPipeThickness,
        includeCncSheet,
        cncSheet: includeCncSheet,
        frontScreen,
        screenHeight,
        screenColor,
        middlePartition: workstationStructure === 'face-to-face' ? 'Included' : externalMiddlePartition || 'Included',
        wireManagement,
        wireRaceway,
        racewaySwitches: wireRaceway ? racewaySwitches : 'None',
        electricFunction: wireRaceway ? `Wire Raceway (${racewaySwitches})` : wireManagement ? 'Wire Management' : 'None',
        pedestal3Drawer,
        drawer,
        condrawer,
        addons: activeAddons,
        tableTopColor,
        legColor,
        calculatedPrice: totalCalculatedPrice,
        priceBreakdown: {
          effectiveBasePrice,
          materialCost,
          thicknessCost,
          totalLaminateCost,
          pipeCost,
          legStyleCost,
          cncCost,
          screenCost,
          screenHeightCost,
          totalElectricCost,
          totalStorageCost
        }
      });
    }
  }, [
    edgeOption,
    workstationStructure,
    width,
    depth,
    personQuantity,
    material,
    thickness,
    laminateFront,
    laminateBack,
    isLaminateApplicable,
    metalPipeThickness,
    legStyle,
    includeCncSheet,
    frontScreen,
    screenHeight,
    screenColor,
    externalMiddlePartition,
    wireManagement,
    wireRaceway,
    racewaySwitches,
    pedestal3Drawer,
    drawer,
    condrawer,
    tableTopColor,
    legColor,
    totalCalculatedPrice,
    effectiveBasePrice,
    materialCost,
    thicknessCost,
    totalLaminateCost,
    pipeCost,
    legStyleCost,
    cncCost,
    screenCost,
    screenHeightCost,
    totalElectricCost,
    totalStorageCost,
    onChange
  ]);

  return (
    <div className="mb-6 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
      {/* Edge 1 Heading with "Less Billiard Workstation" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-sm mb-4 border border-indigo-700/40">
        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-lg uppercase tracking-wider shadow-xs">
            Edge 1
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Workstation Pro</span>
            <span className="text-sm sm:text-base font-extrabold text-white">Alfa Modular Workstation Pro</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-indigo-900/90 border border-indigo-400/40 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-100 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>Option: Less Billiard Workstation</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Structure of the Workstation: Wall-facing or Face-to-face */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              1. Workstation Structure
            </label>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {workstationStructure === 'wall-facing' ? 'Wall-facing' : 'Face-to-face'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setWorkstationStructure('wall-facing')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                workstationStructure === 'wall-facing'
                  ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                  : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm">🧱 Wall-Facing</span>
                {workstationStructure === 'wall-facing' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Line-by-line single-row seating facing a wall</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkstationStructure('face-to-face');
                if (personQuantity < 2) {
                  setPersonQuantity(2);
                }
                if (externalMiddlePartition !== 'Included') {
                  onMiddlePartitionChange?.('Included');
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                workstationStructure === 'face-to-face'
                  ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                  : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm">👥 Face-to-Face</span>
                {workstationStructure === 'face-to-face' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Dual-facing pod cluster with central partition / raceway</span>
            </button>
          </div>
        </div>

        {/* 2. Choose the Size: Width and Depth per person */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
                2. Workstation Size (Per Person)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Choose width and depth per person for {workstationStructure === 'wall-facing' ? 'wall-facing' : 'face-to-face'} structure
              </span>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              {width} × {depth} / Person
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Width Per Person
              </label>
              <select
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg shadow-2xs px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {['800 mm', '900 mm', '1000 mm', '1050 mm', '1200 mm', '1500 mm', '1600 mm', '1800 mm', '2100 mm', '2400 mm'].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Depth Per Person
              </label>
              <select
                value={depth}
                onChange={(e) => handleDepthChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg shadow-2xs px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {['600 mm', '750 mm', '800 mm', '900 mm'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick presets & Seater count */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">Seater Capacity:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 4, 6, 8].map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setPersonQuantity(qty)}
                  className={`px-2.5 py-1 text-xs font-black rounded-md border transition-all cursor-pointer ${
                    personQuantity === qty
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {qty} {qty === 1 ? 'Seater' : 'Seaters'}
                </button>
              ))}
              <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setPersonQuantity(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 text-xs font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Decrease Seater"
                >-</button>
                <span className="px-2 text-xs font-black text-slate-900">{personQuantity}</span>
                <button
                  type="button"
                  onClick={() => setPersonQuantity(prev => prev + 1)}
                  className="px-2 py-0.5 text-xs font-black text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Increase Seater"
                >+</button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tabletop Thickness: 25 mm, 18 mm, 36 mm */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            3. Tabletop Thickness: <span className="text-amber-700">{thickness}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '25 mm', label: '25 mm', desc: 'Standard 25 mm Spec' },
              { id: '18 mm', label: '18 mm', desc: 'Sleek 18 mm Spec' },
              { id: '36 mm', label: '36 mm', desc: 'Heavy Duty 36 mm Spec' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThickness(opt.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  thickness === opt.id
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/25 text-amber-950 font-bold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-extrabold text-sm">{opt.label}</span>
                <span className="text-[10px] text-slate-500">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Tabletop Material: PLPB, MDF, HDHMR, Plywood */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            4. Tabletop Material: <span className="text-indigo-700">{material}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'PLPB', label: 'PLPB', desc: 'Pre-laminated Board' },
              { id: 'MDF', label: 'MDF', desc: 'Medium Density Fibre' },
              { id: 'HDHMR', label: 'HDHMR', desc: 'High Density High Moisture Resistance' },
              { id: 'Plywood', label: 'Plywood', desc: 'Commercial BWP Plywood' }
            ].map(mat => (
              <button
                key={mat.id}
                type="button"
                onClick={() => setMaterial(mat.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  material === mat.id
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-extrabold text-sm">{mat.label}</span>
                <span className="text-[10px] text-slate-500">{mat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Laminate Application: For PLPB N/A; For MDF, HDHMR, Plywood tick boxes */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              5. Laminate Application on Board
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              material === 'PLPB' 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {material === 'PLPB' ? 'Not Applicable for PLPB' : 'Laminate Customization Active'}
            </span>
          </div>

          {material === 'PLPB' ? (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base leading-none">ℹ️</span>
              <div>
                <span className="font-bold block">For PLPB, laminate does not apply.</span>
                <span className="text-amber-700 text-[11px]">
                  Pre-Laminated Particle Board (PLPB) arrives pre-laminated from the board manufacturer with melamine surface. Additional laminate is not applicable.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 mb-2">
                Check whether laminate is present on the front or another side of the {material} board:
              </p>
              <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                laminateFront ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={laminateFront}
                  onChange={(e) => setLaminateFront(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800">Laminate Present on Front Side (Top)</span>
                  <span className="text-[10px] text-slate-500 block">Top workstation work surface finished in premium decorative laminate</span>
                </div>
                <span className="text-xs font-bold text-indigo-700">+₹800</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                laminateBack ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={laminateBack}
                  onChange={(e) => setLaminateBack(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800">Laminate Present on Another Side (Bottom / Back)</span>
                  <span className="text-[10px] text-slate-500 block">Balancing under-surface laminate to prevent board warping</span>
                </div>
                <span className="text-xs font-bold text-indigo-700">+₹800</span>
              </label>
            </div>
          )}
        </div>

        {/* 6. Understructure Metal Pipe Thickness: 40x40 or 50x50 */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            6. Understructure Metal Pipe Thickness: <span className="text-indigo-700">{metalPipeThickness}</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: '40x40', label: '40x40', desc: 'Standard 40×40 mm Steel Pipe', price: 'Standard' },
              { id: '50x50', label: '50x50', desc: 'Heavy-Gauge 50×50 mm Steel Pipe', price: '+₹800' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMetalPipeThickness(p.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  metalPipeThickness === p.id
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm">{p.label}</span>
                  <span className="text-xs font-bold text-indigo-700">{p.price}</span>
                </div>
                <span className="text-[10px] text-slate-500">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 7. Leg Style: Straight legs, U-shaped leg, Angular leg */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            7. Leg Style: <span className="text-indigo-700">{legStyle}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Straight legs', label: 'Straight legs', desc: 'Vertical Tubular' },
              { id: 'U-shaped leg', label: 'U-shaped leg', desc: 'Continuous Loop' },
              { id: 'Angular leg', label: 'Angular leg', desc: 'Slanted A-Frame' }
            ].map(ls => (
              <button
                key={ls.id}
                type="button"
                onClick={() => setLegStyle(ls.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  legStyle === ls.id
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-extrabold text-xs">{ls.label}</span>
                <span className="text-[10px] text-slate-500">{ls.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 8. CNC Sheet (Optional): placed between two legs of understructure */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-1">
            8. CNC Sheet (Understructure Modesty Panel)
          </label>
          <p className="text-[11px] text-slate-500 mb-2.5">
            Placed between the two legs of the understructure as a decorative CNC-designed laser-cut steel sheet.
          </p>
          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            includeCncSheet
              ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
          }`}>
            <input
              type="checkbox"
              checked={includeCncSheet}
              onChange={(e) => setIncludeCncSheet(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="flex-1">
              <span className="font-bold text-xs">Include CNC Sheet (Between the Two Legs)</span>
              <span className="text-[10px] text-slate-500 block">Laser-cut perforated architectural metal panel</span>
            </div>
            <span className="text-xs font-bold text-indigo-700">+₹1,500</span>
          </label>
        </div>

        {/* 9. Front Screen Options: 6 options + Height (300 mm, 400 mm, 450 mm) */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              9. Front Screen Options: <span className="text-indigo-700">{frontScreen}</span>
            </label>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Height: {screenHeight}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {[
              { id: 'Acrylic sheet', label: 'Acrylic sheet', desc: 'Translucent Privacy' },
              { id: 'Pin up board', label: 'Pin up board', desc: 'Fabric Pin-up Board' },
              { id: 'Wooden partition', label: 'Wooden partition', desc: 'Laminated Timber' },
              { id: 'Magnetic glass', label: 'Magnetic glass', desc: 'Tempered Glass' },
              { id: 'Aluminum framing', label: 'Aluminum framing', desc: 'Extruded Frame' },
              { id: '6 mm lacquer glass', label: '6 mm lacquer glass', desc: 'Back-Coated Gloss' }
            ].map(sc => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setFrontScreen(sc.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  frontScreen === sc.id
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-extrabold text-xs">{sc.label}</span>
                <span className="text-[9px] text-slate-500">{sc.desc}</span>
              </button>
            ))}
          </div>

          {/* Height of front partition: 300 mm, 400 mm, 450 mm */}
          <div className="pt-2.5 border-t border-slate-100">
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5">
              Height of Front Partition:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '300 mm', label: '300 mm', desc: 'Standard (₹0)' },
                { id: '400 mm', label: '400 mm', desc: 'Medium (+₹500)' },
                { id: '450 mm', label: '450 mm', desc: 'Tall Privacy (+₹900)' }
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setScreenHeight(h.id)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    screenHeight === h.id
                      ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs">{h.label}</span>
                  <span className={`text-[9px] ${screenHeight === h.id ? 'text-indigo-100' : 'text-slate-500'}`}>{h.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 10. Wiring and Electrical Options: Compulsory and already checked */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              10. Wiring and Electrical Options
            </label>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Compulsory & Checked by Default
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-2.5">
            Compulsory and already checked. You may deselect them if you do not want wiring integration.
          </p>

          <div className="space-y-2 mb-3">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
              wireManagement ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={wireManagement}
                onChange={(e) => setWireManagement(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800">Wire Management</span>
                <span className="text-[10px] text-slate-500 block">Under-desk clips, routing guides & vertical snake wire manager</span>
              </div>
              <span className="text-xs font-bold text-slate-600">+₹350</span>
            </label>

            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
              wireRaceway ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={wireRaceway}
                onChange={(e) => setWireRaceway(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800">Wire Raceway</span>
                <span className="text-[10px] text-slate-500 block">Horizontal under-desk metal cable raceway channel</span>
              </div>
              <span className="text-xs font-bold text-slate-600">+₹500</span>
            </label>
          </div>

          {/* When Wire Raceway is checked, choose switches: 1 switch, 2 switches, 3 switches */}
          {wireRaceway && (
            <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <label className="block text-[11px] font-bold uppercase text-indigo-900 mb-1.5">
                Number of Switches in Wire Raceway:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1 switch', label: '1 switch', desc: '1 Module (+₹400)' },
                  { id: '2 switches', label: '2 switches', desc: '2 Modules (+₹550)' },
                  { id: '3 switches', label: '3 switches', desc: '3 Modules (+₹700)' }
                ].map(sw => (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => setRacewaySwitches(sw.id as any)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      racewaySwitches === sw.id
                        ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100/50'
                    }`}
                  >
                    <span className="font-bold text-xs">{sw.label}</span>
                    <span className={`text-[9px] ${racewaySwitches === sw.id ? 'text-indigo-100' : 'text-indigo-600'}`}>
                      {sw.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 11. Storage & Pedestal Options (3-drawer pedestal, Drawer, Condrawer - NO keyboard tray!) */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            11. Storage & Pedestal Options
          </label>
          <div className="space-y-2">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
              pedestal3Drawer ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={pedestal3Drawer}
                onChange={(e) => setPedestal3Drawer(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800">3-Drawer Pedestal</span>
                <span className="text-[10px] text-slate-500 block">Mobile 3-drawer lockable storage pedestal unit</span>
              </div>
              <span className="text-xs font-bold text-indigo-700">+₹3,500</span>
            </label>

            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
              drawer ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={drawer}
                onChange={(e) => setDrawer(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800">Drawer</span>
                <span className="text-[10px] text-slate-500 block">Single under-desk personal slide-out storage drawer</span>
              </div>
              <span className="text-xs font-bold text-indigo-700">+₹1,200</span>
            </label>

            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
              condrawer ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={condrawer}
                onChange={(e) => setCondrawer(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800">Condrawer</span>
                <span className="text-[10px] text-slate-500 block">Concealed slim stationary & document condrawer</span>
              </div>
              <span className="text-xs font-bold text-indigo-700">+₹950</span>
            </label>
          </div>
        </div>

        {/* 12. Colors & Finishes (Updates 3D View Live!) */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
              12. Colors & Surface Finishes
            </label>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Live 3D Update
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Select tabletop, privacy screen, and understructure metal colors. Any change immediately reflects in the 3D model.
          </p>

          <div className="space-y-3.5">
            {/* Tabletop Color / Finish */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">Tabletop Finish:</span>
                <span className="text-xs font-bold text-indigo-700">{tableTopColor}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Frosty white', bg: '#F8FAFC', border: '#cbd5e1', text: '#0f172a', desc: 'Clean White' },
                  { name: 'Classic Walnut', bg: '#3e2723', border: '#23140b', text: '#ffffff', desc: 'Rich Walnut Wood' },
                  { name: 'Natural Teak', bg: '#854d0e', border: '#713f12', text: '#ffffff', desc: 'Warm Teak Wood' },
                  { name: 'Bavarian Beech', bg: '#d4a373', border: '#b58351', text: '#451a03', desc: 'Light Natural Beech' },
                  { name: 'Ghotic Gray', bg: '#475569', border: '#334155', text: '#ffffff', desc: 'Architectural Stone' },
                  { name: 'Charcoal Black', bg: '#1e293b', border: '#0f172a', text: '#ffffff', desc: 'Matte Charcoal' }
                ].map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setTableTopColor(c.name)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      tableTopColor === c.name
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shrink-0 shadow-xs border"
                      style={{ backgroundColor: c.bg, borderColor: c.border }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">{c.name}</span>
                      <span className="text-[9px] text-slate-500 block truncate">{c.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Front Screen Color */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">Front Screen Color:</span>
                <span className="text-xs font-bold text-indigo-700">{screenColor}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { name: 'Blue', bg: '#2563eb', border: '#1d4ed8', label: 'Ocean Blue' },
                  { name: 'Grey', bg: '#64748b', border: '#475569', label: 'Slate Grey' },
                  { name: 'Green', bg: '#16a34a', border: '#15803d', label: 'Forest Green' },
                  { name: 'Red', bg: '#dc2626', border: '#b91c1c', label: 'Crimson Red' },
                  { name: 'Orange', bg: '#ea580c', border: '#c2410c', label: 'Sunset Orange' },
                  { name: 'Amber', bg: '#d97706', border: '#b45309', label: 'Warm Amber' }
                ].map(sc => (
                  <button
                    key={sc.name}
                    type="button"
                    onClick={() => setScreenColor(sc.name)}
                    className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      screenColor === sc.name
                        ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/25'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shadow-xs mb-1"
                      style={{ backgroundColor: sc.bg }}
                    />
                    <span className="text-[10px] font-bold text-slate-800 truncate">{sc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Leg & Understructure Metal Color */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">Understructure Leg Color:</span>
                <span className="text-xs font-bold text-indigo-700">{legColor}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { name: 'Black', bg: '#0f172a', border: '#020617', desc: 'Matte Black' },
                  { name: 'White', bg: '#f8fafc', border: '#94a3b8', desc: 'Pure White' },
                  { name: 'Silver / Grey', bg: '#94a3b8', border: '#64748b', desc: 'Metallic Silver' },
                  { name: 'Anthracite', bg: '#334155', border: '#1e293b', desc: 'Dark Graphite' }
                ].map(lc => (
                  <button
                    key={lc.name}
                    type="button"
                    onClick={() => setLegColor(lc.name)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      legColor === lc.name
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/25'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shrink-0 shadow-xs border"
                      style={{ backgroundColor: lc.bg, borderColor: lc.border }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">{lc.name}</span>
                      <span className="text-[9px] text-slate-500 block truncate">{lc.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Configured Pricing Summary */}
        <div className="pt-2">
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Configured Workstation Price ({personQuantity}P)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-white">₹{totalCalculatedPrice.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 line-through">₹{Math.floor(totalCalculatedPrice * 1.25).toLocaleString()}</span>
                  <span className="text-xs font-bold text-emerald-400">20% Off</span>
                </div>
              </div>
            </div>

            {/* Quick Spec Highlights */}
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">STRUCTURE & SIZE</span>
                <span className="font-semibold text-white truncate block">
                  {workstationStructure === 'wall-facing' ? 'Wall-facing' : 'Face-to-face'} • {width}×{depth}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MATERIAL & THICKNESS</span>
                <span className="font-semibold text-white truncate block">{material} • {thickness}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LEGS & UNDERSTRUCTURE</span>
                <span className="font-semibold text-amber-300 truncate block">
                  {metalPipeThickness} • {legStyle} {includeCncSheet ? '+ CNC' : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SCREEN & WIRING</span>
                <span className="font-semibold text-blue-300 truncate block">
                  {frontScreen} ({screenHeight}) {wireRaceway ? `• ${racewaySwitches}` : ''}
                </span>
              </div>
            </div>

            {/* Approximate Cost Breakdown Panel */}
            <div className="mt-4 pt-3.5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊 Approximate Cost Breakdown</span>
                </span>
                <span className="text-[10px] text-slate-400">Itemized additions</span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Base Workstation ({personQuantity}P • {width}×{depth} {workstationStructure === 'wall-facing' ? 'Wall-Facing' : 'Face-to-Face'})</span>
                  <span className="font-bold text-white">₹{effectiveBasePrice.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Tabletop Substrate ({material})</span>
                  <span className="font-bold text-white">{materialCost > 0 ? `+₹${materialCost.toLocaleString()}` : 'Included (₹0)'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Tabletop Thickness ({thickness})</span>
                  <span className="font-bold text-white">{thicknessCost > 0 ? `+₹${thicknessCost.toLocaleString()}` : 'Standard (₹0)'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Laminate Finish</span>
                  <span className="font-bold text-white">
                    {isLaminateApplicable ? (totalLaminateCost > 0 ? `+₹${totalLaminateCost.toLocaleString()} (${laminateFront ? 'Front ' : ''}${laminateBack ? 'Back' : ''})` : 'Standard (₹0)') : 'N/A for PLPB'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Understructure Pipe & Legs ({metalPipeThickness} • {legStyle})</span>
                  <span className="font-bold text-white">{pipeCost + legStyleCost > 0 ? `+₹${(pipeCost + legStyleCost).toLocaleString()}` : 'Standard (₹0)'}</span>
                </div>

                {includeCncSheet && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>CNC Sheet (Understructure Modesty Panel)</span>
                    <span className="font-bold text-amber-400">+₹{cncCost.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-1">
                    <span>Front Screen ({frontScreen} • {screenHeight})</span>
                    {(frontScreen === 'Pin up board' || frontScreen === 'Pinna board') && (
                      <span className="text-[10px] text-emerald-400 font-bold">(Approx +₹600 vs Acrylic)</span>
                    )}
                  </div>
                  <span className="font-bold text-white">{screenCost + screenHeightCost > 0 ? `+₹${(screenCost + screenHeightCost).toLocaleString()} approx` : 'Standard (₹0)'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Wiring & Electrical ({wireManagement ? 'Wire Mgmt' : ''}{wireRaceway ? ` + Raceway ${racewaySwitches}` : ''})</span>
                  <span className="font-bold text-white">{totalElectricCost > 0 ? `+₹${totalElectricCost.toLocaleString()}` : 'None (₹0)'}</span>
                </div>

                {totalStorageCost > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Storage Units ({[pedestal3Drawer ? '3-Drawer Pedestal' : '', drawer ? 'Drawer' : '', condrawer ? 'Condrawer' : ''].filter(Boolean).join(', ')})</span>
                    <span className="font-bold text-white">+₹{totalStorageCost.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between font-extrabold text-white">
                  <span className="text-amber-300">Total Approximate Workstation Cost:</span>
                  <span className="text-base text-amber-300">₹{totalCalculatedPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
