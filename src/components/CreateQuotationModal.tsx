import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Building,
  User,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Mail,
  Save,
  ChevronDown,
  ChevronUp,
  Layers,
  Armchair,
  Archive,
  Table2,
  Image as ImageIcon,
  Edit3
} from 'lucide-react';
import { Product, ProductVariant, parsePriceNumber, resolveVariantPriceMode } from '../lib/products';
import { generateQuotationPDF, QuotationData } from '../lib/pdfHelper';
import { getProductFile, getVariantFile } from '../lib/fileStorage';
import {
  QUOTATION_CATEGORIES,
  QuotationCategory,
  QuotationStatus,
  SavedQuotation,
  SavedQuotationItem,
  saveQuotation,
  updateQuotation
} from '../lib/quotations';

export interface QuotationCheckoutCartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant | null;
  configuredPrice?: number;
  selectedOptionsSummary?: string;
  workstationSetup?: any;
}

export interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  initialVariant?: ProductVariant | null;
  initialCartItems?: QuotationCheckoutCartItem[] | null;
  allProducts?: Product[];
  editingQuotation?: SavedQuotation | null;
  onSaved?: (quotationId: string) => void;
}

interface QuotationItemState {
  id: string;
  category: QuotationCategory;
  productName: string;
  product?: Product | null;
  productId?: string;
  selectedVariant?: ProductVariant | null;
  selectedOptionsSummary: string;
  optionalSpecs: Record<string, string>;
  remarks: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  imageSrc?: string;
}

interface CategoryFieldDef {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

const CATEGORY_META: Record<
  QuotationCategory,
  {
    label: string;
    subtitle: string;
    defaultName: string;
    defaultPrice: number;
    optionalFields: CategoryFieldDef[];
  }
> = {
  Workstation: {
    label: 'Workstation',
    subtitle: 'Modular linear / face-to-face desks',
    defaultName: 'Alfa Modular Workstation',
    defaultPrice: 14500,
    optionalFields: [
      { key: 'structure', label: 'Seating Structure', type: 'select', options: ['Wall-Facing (Linear Row)', 'Face-to-Face (Cluster Pod)'] },
      { key: 'capacity', label: 'Seating Capacity', type: 'select', options: ['1 Person', '2 Person', '4 Person', '6 Person', '8 Person'] },
      { key: 'seatSize', label: 'Size per Seat', type: 'select', options: ['1200 × 600 mm', '1200 × 750 mm', '1500 × 600 mm', '1500 × 750 mm', '1800 × 750 mm'] },
      { key: 'topMaterial', label: 'Tabletop Material', type: 'select', options: ['25mm PLPB', '18mm PLPB', '25mm HDHMR', '18mm HDHMR'] },
      { key: 'topColor', label: 'Tabletop Color', type: 'select', options: ['Frosty White', 'Classic Walnut', 'Natural Teak', 'Slate Grey', 'Charcoal Black'] },
      { key: 'legFrame', label: 'Leg Frame & Size', type: 'select', options: ['Straight Legs (40×40mm)', 'Straight Legs (50×50mm)', 'U-Shape Loop Frame', 'Angular A-Frame'] },
      { key: 'frontScreen', label: 'Privacy Screen', type: 'select', options: ['None', 'Pin up board', 'Acrylic sheet', 'Frosty Glass', 'Metal Perforated'] },
      { key: 'modesty', label: 'Modesty Panel', type: 'select', options: ['None', 'Included'] },
      { key: 'electrical', label: 'Electrical / Raceway', type: 'select', options: ['None', 'Flip Box', 'Wire Raceway', 'Flip Box + Wire Raceway'] },
      { key: 'storageAddon', label: 'Storage Add-on', type: 'select', options: ['None', '3-Drawer Pedestal', 'Hanging Drawer'] }
    ]
  },
  'Workstation chair': {
    label: 'Workstation chair',
    subtitle: 'Ergonomic task, mesh & executive seating',
    defaultName: 'Ergonomic Workstation Chair',
    defaultPrice: 5500,
    optionalFields: [
      { key: 'chairType', label: 'Chair Type', type: 'select', options: ['Mid Back Mesh Chair', 'High Back Ergonomic Chair', 'Executive Leatherette Chair', 'Visitor Cantilever Chair'] },
      { key: 'backrestMaterial', label: 'Backrest Material', type: 'select', options: ['Breathable Nylon Mesh', 'Cushioned Fabric', 'PU Leatherette'] },
      { key: 'armrest', label: 'Armrest Style', type: 'select', options: ['Adjustable T-Armrest', '3D Adjustable Armrest', 'Fixed PP Armrest', 'Armless'] },
      { key: 'baseMaterial', label: 'Base Type', type: 'select', options: ['Chrome Metal 5-Star Base', 'Heavy Duty Nylon Base', 'Die-Cast Alloy Base'] },
      { key: 'mechanism', label: 'Tilt Mechanism', type: 'select', options: ['Synchro Tilt Lock', 'Push-Back Tilt', 'Single Position Lock'] },
      { key: 'headrest', label: 'Headrest', type: 'select', options: ['Without Headrest', 'Adjustable Headrest'] },
      { key: 'color', label: 'Color Finish', type: 'select', options: ['Black', 'Grey', 'Blue', 'Tan Brown'] }
    ]
  },
  'Almera storage': {
    label: 'Almera storage',
    subtitle: 'Steel almirahs, lockers & filing cabinets',
    defaultName: 'Office Almera Storage Unit',
    defaultPrice: 12500,
    optionalFields: [
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['2-Door Office Almirah', 'Sliding Door Almirah', 'Glass Door Display Cabinet', '4-Drawer Filing Cabinet', 'Multi-Locker Cabinet'] },
      { key: 'material', label: 'Body Material', type: 'select', options: ['CRCA Steel (Powder Coated)', '18mm PLPB Prelam', '25mm HDHMR Board'] },
      { key: 'dimensions', label: 'Dimensions (H × W × D)', type: 'select', options: ['1980 × 900 × 450 mm', '1800 × 900 × 450 mm', '1200 × 900 × 450 mm', '1320 × 470 × 620 mm (4-Drawer)'] },
      { key: 'shelves', label: 'Shelves / Compartments', type: 'select', options: ['4 Adjustable Shelves', '3 Adjustable Shelves', '5 Shelves', 'With Internal Safe Locker'] },
      { key: 'lockType', label: 'Locking System', type: 'select', options: ['3-Way Key Lock', 'Cam Lock', 'Digital Keypad Lock'] },
      { key: 'color', label: 'Color / Finish', type: 'select', options: ['Light Grey', 'Matt Black', 'Ivory Beige', 'Walnut Dual-Tone'] }
    ]
  },
  Table: {
    label: 'Table',
    subtitle: 'Conference, cabin, MD & meeting tables',
    defaultName: 'Modular Office / Conference Table',
    defaultPrice: 18500,
    optionalFields: [
      { key: 'tableType', label: 'Table Type', type: 'select', options: ['Executive Office Table', 'MD Cabin Table', 'Conference Table', 'Meeting / Cafe Table', 'Reception Desk'] },
      { key: 'dimensions', label: 'Size (L × W × H)', type: 'select', options: ['1500 × 750 × 750 mm', '1800 × 900 × 750 mm', '2400 × 1200 × 750 mm', '3000 × 1200 × 750 mm', '3600 × 1200 × 750 mm'] },
      { key: 'topMaterial', label: 'Top Material & Thickness', type: 'select', options: ['25mm PLPB', '25mm HDHMR', '36mm Double-Thick Top', 'Tempered Glass Top'] },
      { key: 'baseType', label: 'Understructure / Base', type: 'select', options: ['CRCA Metal Powder-Coated Frame', 'Wooden Gable End Legs', 'Pedestal + Side Runner'] },
      { key: 'powerBox', label: 'Flip / Power Box', type: 'select', options: ['None', 'Single Flip Box', 'Dual Pop-Up Power Box'] },
      { key: 'credenza', label: 'Side Return / Credenza', type: 'select', options: ['None', 'Included (Side Storage Return)'] },
      { key: 'color', label: 'Finish / Color', type: 'select', options: ['Classic Walnut', 'Natural Teak', 'Frosty White', 'Charcoal Black'] }
    ]
  }
};

function mapProductCategoryToQuotationCategory(raw?: string): QuotationCategory {
  const s = (raw || '').toLowerCase();
  if (s.includes('chair') || s.includes('seating')) return 'Workstation chair';
  if (s.includes('almera') || s.includes('almirah') || s.includes('storage') || s.includes('locker') || s.includes('cabinet')) {
    return 'Almera storage';
  }
  if (s.includes('table') || s.includes('conference') || s.includes('cabin') || s.includes('desk') && !s.includes('workstation')) {
    return 'Table';
  }
  return 'Workstation';
}

function getCategoryIcon(category: QuotationCategory) {
  switch (category) {
    case 'Workstation':
      return <Layers className="w-4 h-4" />;
    case 'Workstation chair':
      return <Armchair className="w-4 h-4" />;
    case 'Almera storage':
      return <Archive className="w-4 h-4" />;
    case 'Table':
      return <Table2 className="w-4 h-4" />;
  }
}

function formatOptionalSpecsSummary(category: QuotationCategory, specs: Record<string, string>): string {
  const meta = CATEGORY_META[category];
  const parts: string[] = [];
  meta.optionalFields.forEach((f) => {
    const val = specs[f.key];
    if (val && val !== 'None') {
      parts.push(`${f.label}: ${val}`);
    }
  });
  return parts.join(' • ');
}

export function CreateQuotationModal({
  isOpen,
  onClose,
  initialProduct,
  initialVariant,
  initialCartItems,
  allProducts = [],
  editingQuotation = null,
  onSaved
}: CreateQuotationModalProps) {
  // Buyer Details (Required: buyerName, mobileNumber; Optional: companyName, email, gstNumber, address)
  const [buyerName, setBuyerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');

  // Quotation Meta
  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
  const [validTillDate, setValidTillDate] = useState('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [status, setStatus] = useState<QuotationStatus>('sent');
  const [notes, setNotes] = useState(
    '1. Prices are valid until expiry date.\n2. Standard GST applicable as quoted.\n3. Delivery timeframe: 10-15 business days from order confirmation & advance.\n4. Warranty: 1 Year Manufacturing Defect Warranty.'
  );
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% Before Dispatch');

  // Quotation Items
  const [items, setItems] = useState<QuotationItemState[]>([]);

  // Inline "Add Product" Builder State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<QuotationCategory>('Workstation');
  const [draftProductId, setDraftProductId] = useState<string>('');
  const [draftProductName, setDraftProductName] = useState<string>(CATEGORY_META.Workstation.defaultName);
  const [draftQuantity, setDraftQuantity] = useState<number>(1);
  const [draftUnitPrice, setDraftUnitPrice] = useState<number>(CATEGORY_META.Workstation.defaultPrice);
  const [draftDiscountPct, setDraftDiscountPct] = useState<number>(0);
  const [draftRemarks, setDraftRemarks] = useState<string>('');
  const [draftOptionalSpecs, setDraftOptionalSpecs] = useState<Record<string, string>>({});
  const [showOptionalCategoryFields, setShowOptionalCategoryFields] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resetDraftForCategory = (category: QuotationCategory, preserveOpen = true) => {
    const meta = CATEGORY_META[category];
    setDraftCategory(category);
    setDraftProductId('');
    setDraftProductName(meta.defaultName);
    setDraftQuantity(1);
    setDraftUnitPrice(meta.defaultPrice);
    setDraftDiscountPct(0);
    setDraftRemarks('');
    setDraftOptionalSpecs({});
    setEditingItemId(null);
    setShowOptionalCategoryFields(true);
    if (preserveOpen) setIsAddProductOpen(true);
  };

  // Initialize modal state whenever opened
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (editingQuotation) {
      setBuyerName(editingQuotation.buyerName || '');
      setMobileNumber(editingQuotation.mobileNumber || '');
      setCompanyName(editingQuotation.companyName || '');
      setEmail(editingQuotation.email || '');
      setGstNumber(editingQuotation.gstNumber || '');
      setAddress(editingQuotation.address || '');
      setQuotationNo(editingQuotation.quotationNo || '');
      setQuotationDate(editingQuotation.quotationDate || new Date().toISOString().split('T')[0]);
      setValidTillDate(editingQuotation.validTillDate || '');
      setGstRate(typeof editingQuotation.gstRate === 'number' ? editingQuotation.gstRate : 18);
      setStatus(editingQuotation.status || 'sent');
      setPaymentTerms(editingQuotation.paymentTerms || '50% Advance, 50% Before Dispatch');
      setNotes(
        editingQuotation.notes ||
          '1. Prices are valid until expiry date.\n2. Standard GST applicable as quoted.\n3. Delivery timeframe: 10-15 business days from order confirmation & advance.\n4. Warranty: 1 Year Manufacturing Defect Warranty.'
      );
      setItems(
        (editingQuotation.items || []).map((it) => ({
          id: it.id || `item_${Date.now()}_${Math.random()}`,
          category: it.category || 'Workstation',
          productName: it.productName,
          productId: it.productId,
          product: allProducts.find((p) => p.id === it.productId || p.docId === it.productId) || null,
          selectedOptionsSummary: it.defaultSpecs || '',
          optionalSpecs: it.optionalSpecs || {},
          remarks: it.remarks || '',
          unitPrice: it.unitPrice || 0,
          quantity: it.quantity || 1,
          discountPct: it.discountPct || 0
        }))
      );
      setIsAddProductOpen(false);
      return;
    }

    // Fresh quotation defaults
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 15);

    setBuyerName('');
    setMobileNumber('');
    setCompanyName('');
    setEmail('');
    setGstNumber('');
    setAddress('');
    setQuotationNo(`QT-SRK-${Math.floor(100000 + Math.random() * 900000)}`);
    setQuotationDate(today.toISOString().split('T')[0]);
    setValidTillDate(validUntil.toISOString().split('T')[0]);
    setGstRate(18);
    setStatus('sent');
    setPaymentTerms('50% Advance, 50% Before Dispatch');

    if (initialCartItems && initialCartItems.length > 0) {
      setupInitialCartItems(initialCartItems);
      setIsAddProductOpen(false);
    } else if (initialProduct) {
      setupInitialProductItem(initialProduct, initialVariant);
      setIsAddProductOpen(false);
    } else {
      setItems([]);
      resetDraftForCategory('Workstation', true);
    }
  }, [isOpen, initialProduct, initialVariant, initialCartItems, editingQuotation]);

  const setupInitialCartItems = async (cartItems: QuotationCheckoutCartItem[]) => {
    const builtItems = await Promise.all(
      cartItems.map(async (ci, idx) => {
        const prod = ci.product;
        const variant = ci.selectedVariant || null;
        const baseProdPrice =
          prod.salesRate ||
          parsePriceNumber(prod.price || prod.details?.perUnitPrice || prod.details?.totalUnitPrice) ||
          14500;

        let unitPrice = baseProdPrice;
        if (ci.configuredPrice !== undefined && ci.configuredPrice !== null) {
          unitPrice = ci.configuredPrice;
        } else if (ci.workstationSetup?.calculatedPrice) {
          unitPrice = ci.workstationSetup.calculatedPrice;
        } else if (variant) {
          const varNum = parsePriceNumber(variant.price);
          if (varNum > 0) {
            const mode = resolveVariantPriceMode(variant, baseProdPrice);
            unitPrice = mode === 'addon' && variant.priceMode === 'addon' ? baseProdPrice + varNum : varNum;
          }
        }

        const wsSummary = ci.workstationSetup
          ? [
              ci.workstationSetup.dimensions,
              ci.workstationSetup.material,
              ci.workstationSetup.tableTopColor ? `Top: ${ci.workstationSetup.tableTopColor}` : '',
              ci.workstationSetup.legColor ? `Legs: ${ci.workstationSetup.legColor}` : ''
            ]
              .filter(Boolean)
              .join(' | ')
          : '';

        const summary =
          ci.selectedOptionsSummary ||
          wsSummary ||
          (variant
            ? `${variant.size ? `Size: ${variant.size}` : ''} ${variant.color ? `Color: ${variant.color}` : ''}`.trim() ||
              variant.name
            : prod.specification || 'Standard Spec');

        let imgData: string | undefined = variant?.imageData || prod.details?.productImageData;
        if (!imgData && variant?.id) {
          imgData = (await getVariantFile(variant.id)) || undefined;
        }
        if (!imgData && (prod.docId || prod.id)) {
          imgData = (await getProductFile(prod.docId || prod.id)) || undefined;
        }

        return {
          id: `item_${Date.now()}_${idx + 1}`,
          category: mapProductCategoryToQuotationCategory(prod.category),
          productName: prod.name || prod.productName || 'Modular Product',
          product: prod,
          productId: prod.docId || prod.id,
          selectedVariant: variant,
          selectedOptionsSummary: summary,
          optionalSpecs: {},
          remarks: '',
          unitPrice,
          quantity: Math.max(1, ci.quantity || 1),
          discountPct: 0,
          imageSrc: imgData
        } as QuotationItemState;
      })
    );

    setItems(builtItems);
  };

  const setupInitialProductItem = async (prod: Product, variant?: ProductVariant | null) => {
    const baseProdPrice =
      prod.salesRate ||
      parsePriceNumber(prod.price || prod.details?.perUnitPrice || prod.details?.totalUnitPrice) ||
      14500;
    let unitPrice = baseProdPrice;
    if (variant) {
      const varNum = parsePriceNumber(variant.price);
      if (varNum > 0) {
        const mode = resolveVariantPriceMode(variant, baseProdPrice);
        unitPrice = mode === 'addon' && variant.priceMode === 'addon' ? baseProdPrice + varNum : varNum;
      }
    }

    const summary = variant
      ? `${variant.size ? `Size: ${variant.size}` : ''} ${variant.color ? `Color: ${variant.color}` : ''}`.trim() ||
        variant.name
      : prod.specification || 'Standard Spec';

    let imgData: string | undefined;
    if (variant?.id) {
      imgData = (await getVariantFile(variant.id)) || undefined;
    }
    if (!imgData && (prod.docId || prod.id)) {
      imgData = (await getProductFile(prod.docId || prod.id)) || undefined;
    }

    setItems([
      {
        id: `item_${Date.now()}_1`,
        category: mapProductCategoryToQuotationCategory(prod.category),
        productName: prod.name || prod.productName || 'Modular Product',
        product: prod,
        productId: prod.docId || prod.id,
        selectedVariant: variant || null,
        selectedOptionsSummary: summary,
        optionalSpecs: {},
        remarks: '',
        unitPrice,
        quantity: 1,
        discountPct: 0,
        imageSrc: imgData
      }
    ]);
  };

  const handleCatalogPrefillChange = async (prodId: string) => {
    setDraftProductId(prodId);
    if (!prodId) return;
    const prod = allProducts.find((p) => p.id === prodId || p.docId === prodId);
    if (!prod) return;
    setDraftProductName(prod.name || prod.productName || CATEGORY_META[draftCategory].defaultName);
    const rawPrice =
      prod.salesRate ||
      (typeof prod.price === 'string' ? parseFloat(prod.price.replace(/[^0-9.]/g, '')) : prod.price) ||
      CATEGORY_META[draftCategory].defaultPrice;
    const parsedPrice =
      typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
    if (parsedPrice > 0) setDraftUnitPrice(parsedPrice);
    if (prod.specification) setDraftRemarks(prod.specification);
  };

  const handleConfirmDraftProduct = async () => {
    if (!draftProductName.trim()) {
      setErrorMessage('Please enter a Product Name before adding the item.');
      return;
    }
    if (draftQuantity < 1) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }
    if (draftUnitPrice < 0) {
      setErrorMessage('Unit price cannot be negative.');
      return;
    }

    const matchedProd = draftProductId
      ? allProducts.find((p) => p.id === draftProductId || p.docId === draftProductId) || null
      : null;

    let imgData: string | undefined;
    if (matchedProd && (matchedProd.docId || matchedProd.id)) {
      imgData = (await getProductFile(matchedProd.docId || matchedProd.id)) || undefined;
    }

    const optionalSummary = formatOptionalSpecsSummary(draftCategory, draftOptionalSpecs);
    const combinedSummary = [optionalSummary, draftRemarks.trim()].filter(Boolean).join(' | ') || 'Standard Specification';

    const cleanSpecs: Record<string, string> = {};
    Object.entries(draftOptionalSpecs).forEach(([k, v]) => {
      if (v && v !== 'None') cleanSpecs[k] = v;
    });

    if (editingItemId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                category: draftCategory,
                productName: draftProductName.trim(),
                product: matchedProd || it.product,
                productId: matchedProd ? matchedProd.docId || matchedProd.id : it.productId,
                selectedOptionsSummary: combinedSummary,
                optionalSpecs: cleanSpecs,
                remarks: draftRemarks.trim(),
                unitPrice: draftUnitPrice,
                quantity: draftQuantity,
                discountPct: draftDiscountPct,
                imageSrc: imgData || it.imageSrc
              }
            : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item_${Date.now()}_${prev.length + 1}`,
          category: draftCategory,
          productName: draftProductName.trim(),
          product: matchedProd,
          productId: matchedProd ? matchedProd.docId || matchedProd.id : undefined,
          selectedVariant: matchedProd?.variants?.[0] || null,
          selectedOptionsSummary: combinedSummary,
          optionalSpecs: cleanSpecs,
          remarks: draftRemarks.trim(),
          unitPrice: draftUnitPrice,
          quantity: draftQuantity,
          discountPct: draftDiscountPct,
          imageSrc: imgData
        }
      ]);
    }

    setErrorMessage('');
    setIsAddProductOpen(false);
    setEditingItemId(null);
  };

  const handleEditItem = (item: QuotationItemState) => {
    setEditingItemId(item.id);
    setDraftCategory(item.category);
    setDraftProductId(item.productId || '');
    setDraftProductName(item.productName);
    setDraftQuantity(item.quantity);
    setDraftUnitPrice(item.unitPrice);
    setDraftDiscountPct(item.discountPct);
    setDraftRemarks(item.remarks || '');
    setDraftOptionalSpecs({ ...(item.optionalSpecs || {}) });
    setShowOptionalCategoryFields(true);
    setIsAddProductOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof QuotationItemState, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;

    items.forEach((item) => {
      const lineBase = item.unitPrice * item.quantity;
      const lineDisc = lineBase * (item.discountPct / 100);
      subtotal += lineBase - lineDisc;
      discountTotal += lineDisc;
    });

    const gstAmount = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmount;
    return { subtotal, discountTotal, gstRate, gstAmount, grandTotal };
  };

  const totals = calculateTotals();

  const validateQuotationForm = (): boolean => {
    if (!buyerName.trim()) {
      setErrorMessage("Buyer's Name is mandatory. Please enter the buyer's name.");
      return false;
    }
    if (!mobileNumber.trim()) {
      setErrorMessage('Mobile Number is mandatory. Please enter a valid mobile number.');
      return false;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid Email address or leave the optional Email field blank.');
      return false;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product using the "+ Add Product" button.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const buildFirestorePayload = (): Omit<SavedQuotation, 'id' | 'docId' | 'createdAt' | 'updatedAt'> => {
    const savedItems: SavedQuotationItem[] = items.map((i) => ({
      id: i.id,
      category: i.category,
      productName: i.productName,
      ...(i.productId ? { productId: i.productId } : {}),
      ...(i.selectedVariant?.id ? { variantId: i.selectedVariant.id } : {}),
      defaultSpecs: i.selectedOptionsSummary || 'Standard Specification',
      optionalSpecs: i.optionalSpecs || {},
      ...(i.remarks ? { remarks: i.remarks } : {}),
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      discountPct: i.discountPct,
      amount: i.unitPrice * i.quantity * (1 - i.discountPct / 100)
    }));

    return {
      quotationNo: quotationNo.trim() || `QT-SRK-${Math.floor(100000 + Math.random() * 900000)}`,
      quotationDate,
      validTillDate,
      buyerName: buyerName.trim(),
      mobileNumber: mobileNumber.trim(),
      companyName: companyName.trim(),
      email: email.trim(),
      gstNumber: gstNumber.trim(),
      address: address.trim(),
      items: savedItems,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      gstRate: totals.gstRate,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim(),
      status
    };
  };

  const persistQuotationToFirestore = async (): Promise<string | null> => {
    const payload = buildFirestorePayload();
    if (editingQuotation?.docId || editingQuotation?.id) {
      const targetId = editingQuotation.docId || editingQuotation.id;
      await updateQuotation(targetId, payload);
      return targetId;
    }
    const newId = await saveQuotation(payload);
    return newId;
  };

  const handleSaveOnly = async () => {
    if (!validateQuotationForm()) return;
    setIsSaving(true);
    try {
      const savedId = await persistQuotationToFirestore();
      setSuccessMessage('Quotation saved and added to the Quotations tab!');
      if (savedId && onSaved) onSaved(savedId);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error saving quotation:', err);
      setErrorMessage('Failed to save quotation to database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndDownloadPDF = async () => {
    if (!validateQuotationForm()) return;
    setIsGeneratingPdf(true);
    try {
      const savedId = await persistQuotationToFirestore();

      const quotationPdfData: QuotationData = {
        quotationNo: quotationNo.trim(),
        quotationDate: quotationDate
          ? new Date(quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-GB'),
        validTillDate: validTillDate
          ? new Date(validTillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        customerName: buyerName.trim(),
        companyName: companyName.trim(),
        gstNumber: gstNumber.trim(),
        customerAddress: address.trim(),
        customerMobile: mobileNumber.trim(),
        customerEmail: email.trim(),
        items: items.map((i) => ({
          product: i.product || { name: i.productName, category: i.category },
          selectedVariant: i.selectedVariant,
          selectedOptionsSummary: `[${i.category}] ${i.selectedOptionsSummary}`.trim(),
          imageSrc: i.imageSrc,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discountPct: i.discountPct,
          amount: i.unitPrice * i.quantity * (1 - i.discountPct / 100)
        })),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        gstRate: totals.gstRate,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        notes,
        paymentTerms
      };

      await generateQuotationPDF(quotationPdfData);
      setSuccessMessage('Quotation saved and A4 Commercial PDF downloaded!');
      if (savedId && onSaved) onSaved(savedId);
    } catch (err) {
      console.error('Error saving or generating PDF:', err);
      setErrorMessage('Failed to save or generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const categoryProducts = allProducts.filter((p) => {
    const mapped = mapProductCategoryToQuotationCategory(p.category);
    return mapped === draftCategory;
  });

  const activeCategoryMeta = CATEGORY_META[draftCategory];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[93vh] flex flex-col overflow-hidden border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {editingQuotation ? `Edit Quotation (${editingQuotation.quotationNo})` : 'Create Commercial Quotation'}
              </h2>
              <p className="text-xs text-slate-400">
                Enter buyer details, add category products, save to Quotations & export A4 PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar bg-slate-50/60">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-500 hover:text-red-800 font-bold ml-3 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* 1. Buyer Details Form Section */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" /> Buyer Details
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Mandatory fields marked <span className="text-rose-600 font-bold">Required</span> • Others are optional
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buyer's Name (Required) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Buyer's Name *</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                    Required
                  </span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number (Required) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Mobile Number *</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                    Required
                  </span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Company Name (Optional) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Company Name</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Email Address</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. procurement@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* GST Number (Optional) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>GST Number (GSTIN)</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 08ABCDE1234F1Z5"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Address (Optional) */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Billing / Delivery Address</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Plot 42, Knowledge Park III, Jaipur"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Quotation Metadata Section */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-amber-600" /> Quotation Meta, Tax & Validity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation No</label>
                <input
                  type="text"
                  value={quotationNo}
                  onChange={(e) => setQuotationNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Till Date</label>
                <input
                  type="date"
                  value={validTillDate}
                  onChange={(e) => setValidTillDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value={18}>18% (Standard)</option>
                  <option value={12}>12% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={28}>28% GST</option>
                  <option value={0}>0% (Tax Exempt)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="sent">Sent</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Products & Category-Based Add Product Flow */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" /> Products ({items.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click Add Product and pick a category to configure default & optional specifications
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isAddProductOpen && !editingItemId) {
                    setIsAddProductOpen(false);
                  } else {
                    resetDraftForCategory(draftCategory, true);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Category-Driven Add/Edit Product Panel */}
            {isAddProductOpen && (
              <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                    {editingItemId ? 'Edit Quotation Product' : 'Step 1: Select Product Category'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddProductOpen(false);
                      setEditingItemId(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* 4 Product Category Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {QUOTATION_CATEGORIES.map((cat) => {
                    const active = draftCategory === cat;
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (editingItemId) {
                            setDraftCategory(cat);
                            setDraftOptionalSpecs({});
                          } else {
                            resetDraftForCategory(cat, true);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          {getCategoryIcon(cat)}
                          <span>{meta.label}</span>
                        </div>
                        <p className={`text-[10px] mt-1 leading-tight ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {meta.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Default Fields (Always Open for Selected Category) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Default Fields — {draftCategory}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Core Item Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {categoryProducts.length > 0 && (
                      <div className="sm:col-span-12">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Quick Prefill from Catalog ({categoryProducts.length} in {draftCategory}) — Optional
                        </label>
                        <select
                          value={draftProductId}
                          onChange={(e) => handleCatalogPrefillChange(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800"
                        >
                          <option value="">-- Custom / Manual Entry --</option>
                          {categoryProducts.map((p) => (
                            <option key={p.id || p.docId} value={p.id || p.docId}>
                              {p.name || p.productName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="sm:col-span-5">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Product Name *</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase">Required</span>
                      </label>
                      <input
                        type="text"
                        value={draftProductName}
                        onChange={(e) => setDraftProductName(e.target.value)}
                        placeholder={activeCategoryMeta.defaultName}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Qty *</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase">Req</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draftQuantity}
                        onChange={(e) => setDraftQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Unit Price (₹) *</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase">Req</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draftUnitPrice}
                        onChange={(e) => setDraftUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Disc (%)</span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Opt</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftDiscountPct}
                        onChange={(e) => setDraftDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-12">
                      <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Additional Remarks / Custom Description</span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Optional</span>
                      </label>
                      <input
                        type="text"
                        value={draftRemarks}
                        onChange={(e) => setDraftRemarks(e.target.value)}
                        placeholder="Any custom dimension, finish, or hardware note..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Category-Linked Optional Fields */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowOptionalCategoryFields((v) => !v)}
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Optional Specifications — {draftCategory}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Category Linked • Optional
                      </span>
                    </div>
                    {showOptionalCategoryFields ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {showOptionalCategoryFields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                      {activeCategoryMeta.optionalFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            {field.label}
                          </label>
                          {field.type === 'select' && field.options ? (
                            <select
                              value={draftOptionalSpecs[field.key] || ''}
                              onChange={(e) =>
                                setDraftOptionalSpecs((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))
                              }
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                            >
                              <option value="">-- Select (Optional) --</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={draftOptionalSpecs[field.key] || ''}
                              onChange={(e) =>
                                setDraftOptionalSpecs((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))
                              }
                              placeholder={field.placeholder || 'Optional'}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add / Update Item Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-semibold text-slate-600">
                    Line Amount:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      ₹
                      {(draftUnitPrice * draftQuantity * (1 - draftDiscountPct / 100)).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmDraftProduct}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingItemId ? 'Update Item' : 'Add to Quotation'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Added Items List */}
            {items.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                No products added yet. Select a category above and click <strong>Add to Quotation</strong>.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                          {item.imageSrc ? (
                            <img
                              src={item.imageSrc}
                              alt={item.productName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                              Item #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              {getCategoryIcon(item.category)}
                              {item.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{item.productName}</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">{item.selectedOptionsSummary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditItem(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Item Specifications"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/70">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPct}
                          onChange={(e) =>
                            updateItem(item.id, 'discountPct', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                          }
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Line Total (₹)</label>
                        <div className="px-2.5 py-1.5 bg-slate-200/70 rounded-lg text-xs font-mono font-bold text-slate-900">
                          ₹
                          {(item.unitPrice * item.quantity * (1 - item.discountPct / 100)).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Terms & Totals Summary */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions / Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment & Delivery Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
              />

              <div className="mt-3 p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    ₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">
                      -₹
                      {totals.discountTotal.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-mono">
                    ₹
                    {totals.gstAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-amber-400 text-sm pt-1.5 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono">
                    ₹
                    {totals.grandTotal.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isSaving || isGeneratingPdf}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Creating...' : editingQuotation ? 'Update Quotation' : 'Create Quotation'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndDownloadPDF}
              disabled={isSaving || isGeneratingPdf}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Creating & Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Create & Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
