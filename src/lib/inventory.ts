import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDocs, 
  orderBy, 
  query, 
  where,
  serverTimestamp, 
  doc, 
  onSnapshot, 
  deleteDoc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface RawMaterialItem {
  id: string;
  docId?: string;
  name: string;
  sku?: string;
  category: string;
  specs: string;
  availableQuantity: number;
  unit: string;
  minThreshold?: number;
  imageUrl?: string;
  imageName?: string;
  notes?: string;
  unitCost?: number;
  totalReceived: number;
  totalDispatched: number;
  // Custom fields for Plywood & Board category
  boardClassification?: string; // 'Plain' | 'Pre-Laminated' | 'Plywood' | 'PLPB'
  boardType?: string; // 'PLPB' | 'MDF' | 'HDHMR' | 'Plywood'
  boardCompany?: string; // e.g. Action TESA, CenturyPly
  boardThickness?: string; // e.g. '18 mm'
  boardSize?: string; // e.g. '8 x 4'
  colorCode?: string; // e.g. 'SF 101'
  // Custom fields for Chair / Chairs & Seating category
  chairType?: string; // 'Executive Chair' | 'Ergonomic Mesh Chair' | 'Visitor Chair' | 'Task Chair' | 'Conference Chair'
  chairArmrest?: string; // '3D / 4D Adjustable' | '2D Adjustable' | 'Fixed T-Armrest' | 'No Armrest'
  chairMechanism?: string; // 'Synchro-Tilt Heavy Duty' | 'Push-Back Mechanism' | 'Single Lock'
  chairBase?: string; // 'Heavy Duty Chrome Base' | 'High-Grade Nylon Base' | 'Aluminum Die-Cast Base'
  chairUpholstery?: string; // 'Breathable Mesh' | 'Premium Leatherette' | 'Fabric'
  chairColor?: string; // 'Black' | 'Grey' | 'Tan' | 'Blue'
  chairBrand?: string; // 'Featherlite' | 'Steelcase' | 'Custom / OEM'
  challanOrPoNo?: string;
  receivedFrom?: string;
  invoiceDate?: string; // Actual date of bill / invoice
  createdAt: any;
  updatedAt?: any;
}

export type InventoryTransactionType = 'RECEIVED' | 'DISPATCHED' | 'ADJUSTMENT';

export interface InventoryHistoryEntry {
  id: string;
  docId?: string;
  materialId: string;
  materialName: string;
  materialUnit?: string;
  materialImage?: string;
  type: InventoryTransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number; // Rate / Price per unit in ₹
  billDate?: string; // Actual Date of Bill / Invoice (e.g. 2026-10-15)
  projectName?: string; // MANDATORY when type === 'DISPATCHED'
  receivedFrom?: string; // Vendor/Supplier
  challanOrPoNo?: string; // Invoice / Reference
  dispatchedTo?: string; // Recipient / Worker / Assembly Lead
  notes?: string;
  timestamp: string; // Formatted date and time
  rawDate: string; // ISO string
  performedBy?: string;
  createdAt: any;
}

// Initial seed data: Started completely empty as requested by user ("REMOVE ALL product in the inventory section. I will add MANUAL")
const INITIAL_RAW_MATERIALS: RawMaterialItem[] = [];

const INITIAL_HISTORY: InventoryHistoryEntry[] = [];

// Helper to format date and time nicely
export function formatInventoryDateTime(dateObj: Date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return dateObj.toLocaleString('en-IN', options);
}

// LocalStorage cache helpers
const STORAGE_RAW_MATERIALS = 'srk_raw_materials_cache';
const STORAGE_INVENTORY_HISTORY = 'srk_inventory_history_cache';
const STORAGE_DELETED_MATERIALS = 'srk_deleted_materials_cache';
const STORAGE_DELETED_HISTORY = 'srk_deleted_history_cache';

export function getDeletedMaterialIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_MATERIALS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function addDeletedMaterialId(id: string, docId?: string) {
  try {
    const current = getDeletedMaterialIds();
    if (id && !current.includes(id)) current.push(id);
    if (docId && !current.includes(docId)) current.push(docId);
    localStorage.setItem(STORAGE_DELETED_MATERIALS, JSON.stringify(current));
  } catch (e) {}
}

export function getDeletedHistoryIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function addDeletedHistoryId(id: string, docId?: string) {
  try {
    const current = getDeletedHistoryIds();
    if (id && !current.includes(id)) current.push(id);
    if (docId && !current.includes(docId)) current.push(docId);
    localStorage.setItem(STORAGE_DELETED_HISTORY, JSON.stringify(current));
  } catch (e) {}
}

const STORAGE_ADDED_INVOICES = 'srk_added_invoices_cache';

export function getAddedInvoiceNumbers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_ADDED_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function registerAddedInvoiceNumber(invNo?: string) {
  if (!invNo || !invNo.trim()) return;
  try {
    const clean = invNo.trim().toUpperCase();
    const current = getAddedInvoiceNumbers();
    if (!current.includes(clean)) {
      current.push(clean);
      localStorage.setItem(STORAGE_ADDED_INVOICES, JSON.stringify(current));
    }
  } catch (e) {}
}

export function findExistingInvoice(invoiceNo?: string): { isDuplicate: boolean; matchedRef?: string; source?: string } {
  if (!invoiceNo || !invoiceNo.trim()) return { isDuplicate: false };

  const target = invoiceNo.trim().toLowerCase();
  const targetNorm = normalizeName(target);
  if (targetNorm.length < 2) return { isDuplicate: false };

  // 1. Check registered invoices cache
  const addedList = getAddedInvoiceNumbers();
  const addedMatch = addedList.find(inv => {
    const invNorm = normalizeName(inv);
    return inv.toLowerCase() === target || (invNorm.length >= 2 && invNorm === targetNorm);
  });
  if (addedMatch) {
    return { isDuplicate: true, matchedRef: addedMatch, source: 'Previously Scanned Invoices' };
  }

  // 2. Check Inventory History ledger
  const history = getLocalHistory();
  const historyMatch = history.find(h => {
    if (!h.challanOrPoNo) return false;
    const ref = h.challanOrPoNo.trim().toLowerCase();
    const refNorm = normalizeName(ref);
    return ref === target || (refNorm.length >= 2 && refNorm === targetNorm);
  });
  if (historyMatch) {
    return { 
      isDuplicate: true, 
      matchedRef: historyMatch.challanOrPoNo, 
      source: `Movement History (${historyMatch.timestamp || historyMatch.billDate || 'Inward Record'})` 
    };
  }

  // 3. Check Raw Materials items
  const materials = getLocalRawMaterials();
  const materialMatch = materials.find(m => {
    if (!m.challanOrPoNo) return false;
    const ref = m.challanOrPoNo.trim().toLowerCase();
    const refNorm = normalizeName(ref);
    return ref === target || (refNorm.length >= 2 && refNorm === targetNorm);
  });
  if (materialMatch) {
    return { 
      isDuplicate: true, 
      matchedRef: materialMatch.challanOrPoNo, 
      source: `Raw Materials Inventory ("${materialMatch.name}")` 
    };
  }

  return { isDuplicate: false };
}

export function getLocalRawMaterials(): RawMaterialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RAW_MATERIALS);
    const deleted = getDeletedMaterialIds();
    if (raw !== null) {
      const items: RawMaterialItem[] = JSON.parse(raw);
      return items
        .filter(item => !deleted.includes(item.id) && (!item.docId || !deleted.includes(item.docId)))
        .map(item => {
          const cat = (item.category || '').toLowerCase();
          const name = (item.name || '').toLowerCase();
          const isBoardCat = cat.includes('board') || cat.includes('plywood') || name.includes('board') || name.includes('plywood') || name.includes('mdf') || name.includes('hdhmr') || name.includes('plpb');
          if (!isBoardCat) {
            return {
              ...item,
              boardClassification: undefined,
              boardType: undefined,
              boardCompany: undefined,
              boardThickness: undefined,
              boardSize: undefined,
              colorCode: undefined
            };
          }
          return item;
        });
    }
  } catch (e) {
    console.error('Failed to read local raw materials', e);
  }
  return [];
}

export function setLocalRawMaterials(items: RawMaterialItem[]) {
  try {
    const deleted = getDeletedMaterialIds();
    const cleanItems = items.filter(i => !deleted.includes(i.id) && (!i.docId || !deleted.includes(i.docId)));
    localStorage.setItem(STORAGE_RAW_MATERIALS, JSON.stringify(cleanItems));
  } catch (e) {
    console.error('Failed to save local raw materials', e);
  }
}

export function getLocalHistory(): InventoryHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_INVENTORY_HISTORY);
    const deleted = getDeletedHistoryIds();
    if (raw !== null) {
      const history: InventoryHistoryEntry[] = JSON.parse(raw);
      return history.filter(h => !deleted.includes(h.id) && (!h.docId || !deleted.includes(h.docId)));
    }
  } catch (e) {
    console.error('Failed to read local history', e);
  }
  return [];
}

export function setLocalHistory(history: InventoryHistoryEntry[]) {
  try {
    const deleted = getDeletedHistoryIds();
    const cleanHistory = history.filter(h => !deleted.includes(h.id) && (!h.docId || !deleted.includes(h.docId)));
    localStorage.setItem(STORAGE_INVENTORY_HISTORY, JSON.stringify(cleanHistory));
  } catch (e) {
    console.error('Failed to save local history', e);
  }
}


const getRawMaterialsCol = () => collection(db, 'raw_materials');
const getInventoryHistoryCol = () => collection(db, 'inventory_history');

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

// Realtime Raw Materials Subscription
export function subscribeToRawMaterials(callback: (items: RawMaterialItem[]) => void) {
  let unsubscribeSnapshot: (() => void) | null = null;

  // Immediately invoke with local cache so UI is non-blocking
  const cached = getLocalRawMaterials();
  callback(cached);

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      try {
        const q = query(getRawMaterialsCol(), orderBy('name', 'asc'));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) {
            setLocalRawMaterials([]);
            callback([]);
            return;
          }

          const deleted = getDeletedMaterialIds();
          const items = snapshot.docs
            .map(d => ({
              ...d.data(),
              id: d.data().id || d.id,
              docId: d.id
            })) as RawMaterialItem[];

          const activeItems = items.filter(item => !deleted.includes(item.id) && (!item.docId || !deleted.includes(item.docId)));

          setLocalRawMaterials(activeItems);
          callback(activeItems);
        }, (error) => {
          console.warn('Firestore raw_materials onSnapshot warning:', error);
          callback(getLocalRawMaterials());
        });
      } catch (err) {
        console.warn('Failed to listen to raw_materials:', err);
        callback(getLocalRawMaterials());
      }
    } else {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      callback(getLocalRawMaterials());
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
}

// Realtime Inventory History Subscription
export function subscribeToInventoryHistory(callback: (history: InventoryHistoryEntry[]) => void) {
  let unsubscribeSnapshot: (() => void) | null = null;

  const cached = getLocalHistory();
  callback(cached);

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      try {
        const q = query(getInventoryHistoryCol(), orderBy('rawDate', 'desc'));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) {
            setLocalHistory([]);
            callback([]);
            return;
          }

          const deleted = getDeletedHistoryIds();
          const history = snapshot.docs
            .map(d => ({
              ...d.data(),
              id: d.data().id || d.id,
              docId: d.id
            })) as InventoryHistoryEntry[];

          const activeHistory = history.filter(h => !deleted.includes(h.id) && (!h.docId || !deleted.includes(h.docId)));

          setLocalHistory(activeHistory);
          callback(activeHistory);
        }, (error) => {
          console.warn('Firestore inventory_history onSnapshot warning:', error);
          callback(getLocalHistory());
        });
      } catch (err) {
        console.warn('Failed to listen to inventory_history:', err);
        callback(getLocalHistory());
      }
    } else {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      callback(getLocalHistory());
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
}

export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function findMatchingItemIndex(
  inputMaterial: Partial<RawMaterialItem>,
  currentList: RawMaterialItem[]
): number {
  if (!currentList || currentList.length === 0) return -1;

  if ((inputMaterial as any).createNewItem || (inputMaterial as any).forceNew) {
    return -1;
  }

  const inputName = (inputMaterial.name || '').trim();
  const normInputName = normalizeName(inputName);
  const inputSku = (inputMaterial.sku || '').trim().toLowerCase();
  const inputCost = inputMaterial.unitCost !== undefined && !isNaN(Number(inputMaterial.unitCost)) ? Number(inputMaterial.unitCost) : undefined;
  const inputSpecs = (inputMaterial.specs || '').trim();

  // Helper: do not match if unitCost (Rate) or board specs conflict
  const isCompatibleMatch = (x: RawMaterialItem) => {
    // 1. Rate Check: If both items have unit rates specified and they differ by > ₹0.01, do NOT match!
    if (inputCost !== undefined && inputCost > 0 && x.unitCost !== undefined && x.unitCost > 0) {
      if (Math.abs(x.unitCost - inputCost) > 0.01) {
        return false;
      }
    }
    // 2. Board Attributes Check: If boardType, boardThickness, boardCompany, or boardSize differ, do NOT match!
    if (inputMaterial.boardThickness && x.boardThickness) {
      if (normalizeName(inputMaterial.boardThickness) !== normalizeName(x.boardThickness)) return false;
    }
    if (inputMaterial.boardType && x.boardType) {
      if (normalizeName(inputMaterial.boardType) !== normalizeName(x.boardType)) return false;
    }
    if (inputMaterial.boardCompany && x.boardCompany) {
      if (normalizeName(inputMaterial.boardCompany) !== normalizeName(x.boardCompany)) return false;
    }
    if (inputMaterial.boardSize && x.boardSize) {
      if (normalizeName(inputMaterial.boardSize) !== normalizeName(x.boardSize)) return false;
    }
    return true;
  };

  // 1. Explicit ID or docId match
  if (inputMaterial.id || inputMaterial.docId) {
    const idx = currentList.findIndex(
      x => (inputMaterial.id && x.id === inputMaterial.id) || (inputMaterial.docId && x.docId === inputMaterial.docId)
    );
    if (idx >= 0) return idx;
  }

  // 2. Exact case-insensitive name match
  if (inputName) {
    const exactIdx = currentList.findIndex(
      x => x.name.trim().toLowerCase() === inputName.toLowerCase() && isCompatibleMatch(x)
    );
    if (exactIdx >= 0) return exactIdx;
  }

  // 3. Exact SKU match
  if (inputSku && inputSku !== 'rm' && !inputSku.startsWith('rm-scan')) {
    const skuIdx = currentList.findIndex(
      x => (x.sku || '').trim().toLowerCase() === inputSku && isCompatibleMatch(x)
    );
    if (skuIdx >= 0) return skuIdx;
  }

  // 4. Exact Board Attributes Match (Company + Type + Thickness + Size + Rate)
  if (inputMaterial.boardCompany && inputMaterial.boardThickness && inputMaterial.boardSize && inputMaterial.boardType) {
    const boardIdx = currentList.findIndex(x => {
      const companyMatch = normalizeName(x.boardCompany || '') === normalizeName(inputMaterial.boardCompany || '');
      const typeMatch = normalizeName(x.boardType || '') === normalizeName(inputMaterial.boardType || '');
      const thickMatch = normalizeName(x.boardThickness || '') === normalizeName(inputMaterial.boardThickness || '');
      const sizeMatch = normalizeName(x.boardSize || '') === normalizeName(inputMaterial.boardSize || '');
      return companyMatch && typeMatch && thickMatch && sizeMatch && isCompatibleMatch(x);
    });
    if (boardIdx >= 0) return boardIdx;
  }

  return -1;
}

// Save or Update a Raw Material
export async function saveRawMaterialItem(material: Partial<RawMaterialItem>): Promise<string> {
  const currentList = getLocalRawMaterials();
  const inputName = (material.name || '').trim();

  const extractRef = (notes?: string) => {
    if (!notes) return '';
    const match = notes.match(/(?:Ref|Invoice|Bill|Challan|PO|No)[\s:]*([A-Za-z0-9_\-\/]+)/i);
    return match ? match[1] : '';
  };
  const extractVendor = (notes?: string) => {
    if (!notes) return '';
    const match = notes.match(/Vendor[\s:]*([^|]+)/i);
    return match ? match[1].trim() : '';
  };

  const invoiceNo = material.challanOrPoNo || extractRef(material.notes);
  const vendorName = material.receivedFrom || extractVendor(material.notes) || '';

  if (invoiceNo) {
    registerAddedInvoiceNumber(invoiceNo);
  }

  // 1. Find matching item in local list
  let existingIdx = findMatchingItemIndex(material, currentList);

  if (existingIdx >= 0 && !material.id && !material.docId) {
    // === PRODUCT MATCHED IN EXISTING INVENTORY ===
    const existingItem = currentList[existingIdx];
    const qtyToAdd = Number(material.availableQuantity || 0);
    const prevQty = Number(existingItem.availableQuantity || 0);
    const newQty = prevQty + qtyToAdd;
    const newTotalReceived = Number(existingItem.totalReceived || 0) + qtyToAdd;

    const updatedItem: RawMaterialItem = {
      ...existingItem,
      availableQuantity: newQty,
      totalReceived: newTotalReceived,
      ...(material.specs ? { specs: material.specs } : {}),
      ...(material.boardClassification ? { boardClassification: material.boardClassification } : {}),
      ...(material.boardType ? { boardType: material.boardType } : {}),
      ...(material.boardCompany ? { boardCompany: material.boardCompany } : {}),
      ...(material.boardThickness ? { boardThickness: material.boardThickness } : {}),
      ...(material.boardSize ? { boardSize: material.boardSize } : {}),
      ...(material.colorCode ? { colorCode: material.colorCode } : {}),
      ...(material.unitCost ? { unitCost: Number(material.unitCost) } : {}),
      ...(material.imageUrl ? { imageUrl: material.imageUrl } : {}),
      ...(material.invoiceDate ? { invoiceDate: material.invoiceDate } : {}),
      notes: material.notes || existingItem.notes,
      updatedAt: new Date().toISOString()
    };

    currentList[existingIdx] = updatedItem;
    setLocalRawMaterials(currentList);

    // Record Stock Movement History Entry
    const now = new Date();
    const historyEntry: InventoryHistoryEntry = {
      id: `hist-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: existingItem.id,
      materialName: existingItem.name,
      materialUnit: existingItem.unit,
      materialImage: existingItem.imageUrl || material.imageUrl,
      type: 'RECEIVED',
      quantity: qtyToAdd,
      previousQuantity: prevQty,
      newQuantity: newQty,
      unitCost: material.unitCost !== undefined && Number(material.unitCost) > 0 ? Number(material.unitCost) : existingItem.unitCost,
      billDate: material.invoiceDate || (material as any).billDate || existingItem.invoiceDate || '',
      receivedFrom: vendorName,
      challanOrPoNo: invoiceNo,
      notes: material.notes || `Stock Added (+${qtyToAdd} ${existingItem.unit}) ${invoiceNo ? `| Invoice: ${invoiceNo}` : ''}`,
      timestamp: formatInventoryDateTime(now),
      rawDate: now.toISOString(),
      performedBy: 'Store Incharge',
      createdAt: now.toISOString()
    };

    const history = getLocalHistory();
    history.unshift(historyEntry);
    setLocalHistory(history);

    // Background Firestore Sync
    if (existingItem.docId) {
      updateDoc(doc(db, 'raw_materials', existingItem.docId), {
        availableQuantity: newQty,
        totalReceived: newTotalReceived,
        ...(material.specs ? { specs: material.specs } : {}),
        ...(material.boardClassification ? { boardClassification: material.boardClassification } : {}),
        ...(material.boardType ? { boardType: material.boardType } : {}),
        ...(material.boardCompany ? { boardCompany: material.boardCompany } : {}),
        ...(material.boardThickness ? { boardThickness: material.boardThickness } : {}),
        ...(material.boardSize ? { boardSize: material.boardSize } : {}),
        ...(material.colorCode ? { colorCode: material.colorCode } : {}),
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }

    const cleanHistory = removeUndefined({
      ...historyEntry,
      createdAt: serverTimestamp()
    });
    addDoc(getInventoryHistoryCol(), cleanHistory).catch(() => {});

    return existingItem.docId || existingItem.id;

  } else if (existingIdx >= 0) {
    // === EXPLICIT EDIT OF EXISTING PRODUCT BY ID ===
    const existingItem = currentList[existingIdx];
    const updatedItem: RawMaterialItem = {
      ...existingItem,
      name: material.name || existingItem.name,
      sku: material.sku || existingItem.sku,
      category: material.category || existingItem.category,
      specs: material.specs !== undefined ? material.specs : existingItem.specs,
      availableQuantity: material.availableQuantity !== undefined ? Number(material.availableQuantity) : existingItem.availableQuantity,
      unit: material.unit || existingItem.unit,
      minThreshold: material.minThreshold !== undefined ? Number(material.minThreshold) : existingItem.minThreshold,
      imageUrl: material.imageUrl !== undefined ? material.imageUrl : existingItem.imageUrl,
      imageName: material.imageName !== undefined ? material.imageName : existingItem.imageName,
      notes: material.notes !== undefined ? material.notes : existingItem.notes,
      unitCost: material.unitCost !== undefined ? Number(material.unitCost) : existingItem.unitCost,
      totalReceived: material.totalReceived !== undefined ? Number(material.totalReceived) : existingItem.totalReceived,
      totalDispatched: material.totalDispatched !== undefined ? Number(material.totalDispatched) : existingItem.totalDispatched,
      boardClassification: material.boardClassification !== undefined ? material.boardClassification : existingItem.boardClassification,
      boardType: material.boardType !== undefined ? material.boardType : existingItem.boardType,
      boardCompany: material.boardCompany !== undefined ? material.boardCompany : existingItem.boardCompany,
      boardThickness: material.boardThickness !== undefined ? material.boardThickness : existingItem.boardThickness,
      boardSize: material.boardSize !== undefined ? material.boardSize : existingItem.boardSize,
      colorCode: material.colorCode !== undefined ? material.colorCode : existingItem.colorCode,
      chairType: material.chairType !== undefined ? material.chairType : existingItem.chairType,
      chairArmrest: material.chairArmrest !== undefined ? material.chairArmrest : existingItem.chairArmrest,
      chairMechanism: material.chairMechanism !== undefined ? material.chairMechanism : existingItem.chairMechanism,
      chairBase: material.chairBase !== undefined ? material.chairBase : existingItem.chairBase,
      chairUpholstery: material.chairUpholstery !== undefined ? material.chairUpholstery : existingItem.chairUpholstery,
      chairColor: material.chairColor !== undefined ? material.chairColor : existingItem.chairColor,
      chairBrand: material.chairBrand !== undefined ? material.chairBrand : existingItem.chairBrand,
      updatedAt: new Date().toISOString()
    };

    currentList[existingIdx] = updatedItem;
    setLocalRawMaterials(currentList);

    if (updatedItem.docId) {
      const cleanData = removeUndefined({
        ...updatedItem,
        updatedAt: serverTimestamp()
      });
      updateDoc(doc(db, 'raw_materials', updatedItem.docId), cleanData).catch(() => {});
    }

    return updatedItem.docId || updatedItem.id;

  } else {
    // === BRAND NEW PRODUCT (NO MATCH FOUND) ===
    const id = material.id || `rm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const initialQty = Number(material.availableQuantity || 0);

    const newItem: RawMaterialItem = {
      id,
      name: inputName || 'Unnamed Raw Material',
      sku: material.sku || `RM-${Math.floor(1000 + Math.random() * 9000)}`,
      category: material.category || 'General Consumables',
      specs: material.specs || '',
      availableQuantity: initialQty,
      unit: material.unit || 'Nos',
      minThreshold: Number(material.minThreshold ?? 10),
      imageUrl: material.imageUrl || '',
      imageName: material.imageName || '',
      notes: material.notes || '',
      unitCost: material.unitCost ? Number(material.unitCost) : undefined,
      totalReceived: Number(material.totalReceived || initialQty),
      totalDispatched: Number(material.totalDispatched || 0),
      boardClassification: material.boardClassification || '',
      boardType: material.boardType || '',
      boardCompany: material.boardCompany || '',
      boardThickness: material.boardThickness || '',
      boardSize: material.boardSize || '',
      colorCode: material.colorCode || '',
      chairType: material.chairType || '',
      chairArmrest: material.chairArmrest || '',
      chairMechanism: material.chairMechanism || '',
      chairBase: material.chairBase || '',
      chairUpholstery: material.chairUpholstery || '',
      chairColor: material.chairColor || '',
      chairBrand: material.chairBrand || '',
      invoiceDate: material.invoiceDate || (material as any).billDate || '',
      createdAt: material.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentList.unshift(newItem);
    setLocalRawMaterials(currentList);

    // Create Initial Movement Record for New Product
    const now = new Date();
    const historyEntry: InventoryHistoryEntry = {
      id: `hist-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: newItem.id,
      materialName: newItem.name,
      materialUnit: newItem.unit,
      materialImage: newItem.imageUrl,
      type: 'RECEIVED',
      quantity: initialQty,
      previousQuantity: 0,
      newQuantity: initialQty,
      unitCost: newItem.unitCost,
      billDate: newItem.invoiceDate || '',
      receivedFrom: vendorName,
      challanOrPoNo: invoiceNo,
      notes: material.notes || `Initial Stock (+${initialQty} ${newItem.unit}) ${invoiceNo ? `| Invoice: ${invoiceNo}` : ''}`,
      timestamp: formatInventoryDateTime(now),
      rawDate: now.toISOString(),
      performedBy: 'Store Incharge',
      createdAt: now.toISOString()
    };

    const history = getLocalHistory();
    history.unshift(historyEntry);
    setLocalHistory(history);

    // Sync to Firestore in background
    const cleanData = removeUndefined({
      ...newItem,
      createdAt: serverTimestamp()
    });

    addDoc(getRawMaterialsCol(), cleanData).then(docRef => {
      newItem.docId = docRef.id;
      const updatedList = getLocalRawMaterials();
      const idx = updatedList.findIndex(x => x.id === newItem.id);
      if (idx >= 0) {
        updatedList[idx].docId = docRef.id;
        setLocalRawMaterials(updatedList);
      }
    }).catch(() => {});

    const cleanHistory = removeUndefined({
      ...historyEntry,
      createdAt: serverTimestamp()
    });
    addDoc(getInventoryHistoryCol(), cleanHistory).catch(() => {});

    return id;
  }
}

// Delete a Raw Material
export async function deleteRawMaterialItem(id: string, docId?: string): Promise<void> {
  addDeletedMaterialId(id, docId);

  const current = getLocalRawMaterials().filter(x => x.id !== id && (!docId || x.docId !== docId));
  setLocalRawMaterials(current);

  // Background fire-and-forget Firestore deletion
  if (docId) {
    deleteDoc(doc(db, 'raw_materials', docId)).catch(() => {});
  }
  if (id && id !== docId) {
    deleteDoc(doc(db, 'raw_materials', id)).catch(() => {});
    try {
      const q = query(getRawMaterialsCol(), where('id', '==', id));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          snap.docs.forEach(d => deleteDoc(d.ref).catch(() => {}));
        }
      }).catch(() => {});
    } catch (_) {}
  }
}

// Clear ALL raw materials from inventory (local & firestore)
export async function clearAllRawMaterials(): Promise<void> {
  setLocalRawMaterials([]);
  try {
    const snap = await getDocs(getRawMaterialsCol());
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Firestore clearAllRawMaterials error:', err);
  }
}

// Delete an individual history entry (local & firestore)
export async function deleteInventoryHistoryEntry(id: string, docId?: string): Promise<void> {
  addDeletedHistoryId(id, docId);

  const current = getLocalHistory().filter(x => x.id !== id && (!docId || x.docId !== docId));
  setLocalHistory(current);

  // Background fire-and-forget Firestore deletion
  if (docId) {
    deleteDoc(doc(db, 'inventory_history', docId)).catch(() => {});
  }
  if (id && id !== docId) {
    deleteDoc(doc(db, 'inventory_history', id)).catch(() => {});
    try {
      const q = query(getInventoryHistoryCol(), where('id', '==', id));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          snap.docs.forEach(d => deleteDoc(d.ref).catch(() => {}));
        }
      }).catch(() => {});
    } catch (_) {}
  }
}

// Clear ALL transaction history entries (local & firestore)
export async function clearAllInventoryHistory(): Promise<void> {
  // Clear local cache immediately
  setLocalHistory([]);
  try {
    const snap = await getDocs(getInventoryHistoryCol()).catch(() => null);
    if (snap && !snap.empty) {
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref).catch(() => {}));
      await Promise.all(deletePromises).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore clearAllInventoryHistory error:', err);
  }
}

// 2. RECEIVE RAW MATERIAL OPERATION
export interface ReceiveMaterialParams {
  materialId: string;
  quantity: number;
  receivedFrom?: string;
  challanOrPoNo?: string;
  unitCost?: number;
  billDate?: string;
  notes?: string;
  performedBy?: string;
}

export async function receiveRawMaterialStock(params: ReceiveMaterialParams): Promise<{ updatedItem: RawMaterialItem; historyEntry: InventoryHistoryEntry }> {
  const { materialId, quantity, receivedFrom, challanOrPoNo, unitCost, billDate, notes, performedBy } = params;

  if (quantity <= 0) {
    throw new Error('Received quantity must be greater than 0.');
  }

  const materials = getLocalRawMaterials();
  const itemIndex = materials.findIndex(m => m.id === materialId || m.docId === materialId);
  if (itemIndex < 0) {
    throw new Error('Raw material product not found in inventory.');
  }

  const item = materials[itemIndex];
  const prevQty = Number(item.availableQuantity || 0);
  const newQty = prevQty + Number(quantity);
  const totalReceived = Number(item.totalReceived || 0) + Number(quantity);

  const updatedItem: RawMaterialItem = {
    ...item,
    availableQuantity: newQty,
    totalReceived,
    ...(unitCost !== undefined && Number(unitCost) > 0 ? { unitCost: Number(unitCost) } : {}),
    ...(billDate ? { invoiceDate: billDate } : {}),
    updatedAt: new Date().toISOString()
  };

  materials[itemIndex] = updatedItem;
  setLocalRawMaterials(materials);

  // Create History Record
  const historyId = `hist-rec-${Date.now()}`;
  const now = new Date();
  const historyEntry: InventoryHistoryEntry = {
    id: historyId,
    materialId: item.id,
    materialName: item.name,
    materialUnit: item.unit,
    materialImage: item.imageUrl,
    type: 'RECEIVED',
    quantity: Number(quantity),
    previousQuantity: prevQty,
    newQuantity: newQty,
    unitCost: unitCost !== undefined && Number(unitCost) > 0 ? Number(unitCost) : item.unitCost,
    billDate: billDate || item.invoiceDate || '',
    receivedFrom: receivedFrom || '',
    challanOrPoNo: challanOrPoNo || '',
    notes: notes || `Received +${quantity} ${item.unit}`,
    timestamp: formatInventoryDateTime(now),
    rawDate: now.toISOString(),
    performedBy: performedBy || 'Store Incharge',
    createdAt: now.toISOString()
  };

  const history = getLocalHistory();
  history.unshift(historyEntry);
  setLocalHistory(history);

  // Sync with Firestore
  try {
    if (item.docId) {
      await updateDoc(doc(db, 'raw_materials', item.docId), {
        availableQuantity: newQty,
        totalReceived,
        updatedAt: serverTimestamp()
      });
    }

    const cleanHistory = removeUndefined({
      ...historyEntry,
      createdAt: serverTimestamp()
    });
    await addDoc(getInventoryHistoryCol(), cleanHistory);
  } catch (err) {
    console.warn('Firestore receive raw material offline sync:', err);
  }

  return { updatedItem, historyEntry };
}

// 3. DISPATCH RAW MATERIAL OPERATION
export interface DispatchMaterialParams {
  materialId: string;
  quantity: number;
  projectName: string; // MANDATORY!
  dispatchedTo?: string;
  notes?: string;
  performedBy?: string;
}

export async function dispatchRawMaterialStock(params: {
  materialId: string;
  quantity: number;
  projectName: string;
  dispatchedTo?: string;
  notes?: string;
  performedBy?: string;
}): Promise<{ updatedItem: RawMaterialItem; historyEntry: InventoryHistoryEntry }> {
  const { materialId, quantity, projectName, dispatchedTo, notes, performedBy } = params;

  if (!projectName || !projectName.trim()) {
    throw new Error('Project Name is strictly mandatory for dispatching raw materials.');
  }

  if (quantity <= 0) {
    throw new Error('Dispatched quantity must be greater than 0.');
  }

  const materials = getLocalRawMaterials();
  const itemIndex = materials.findIndex(m => m.id === materialId || m.docId === materialId);
  if (itemIndex < 0) {
    throw new Error('Raw material product not found in inventory.');
  }

  const item = materials[itemIndex];
  const prevQty = Number(item.availableQuantity || 0);

  if (prevQty < quantity) {
    throw new Error(`Insufficient stock! Available: ${prevQty} ${item.unit}, requested: ${quantity} ${item.unit}.`);
  }

  const newQty = prevQty - Number(quantity);
  const totalDispatched = Number(item.totalDispatched || 0) + Number(quantity);

  const updatedItem: RawMaterialItem = {
    ...item,
    availableQuantity: newQty,
    totalDispatched,
    updatedAt: new Date().toISOString()
  };

  materials[itemIndex] = updatedItem;
  setLocalRawMaterials(materials);

  // Create History Record with Project Name
  const historyId = `hist-disp-${Date.now()}`;
  const now = new Date();
  const historyEntry: InventoryHistoryEntry = {
    id: historyId,
    materialId: item.id,
    materialName: item.name,
    materialUnit: item.unit,
    materialImage: item.imageUrl,
    type: 'DISPATCHED',
    quantity: Number(quantity),
    previousQuantity: prevQty,
    newQuantity: newQty,
    projectName: projectName.trim(),
    dispatchedTo: dispatchedTo || 'Site Production Team',
    notes: notes || `Dispatched ${quantity} ${item.unit} for Project: ${projectName.trim()}`,
    timestamp: formatInventoryDateTime(now),
    rawDate: now.toISOString(),
    performedBy: performedBy || 'Store Incharge',
    createdAt: now.toISOString()
  };

  const history = getLocalHistory();
  history.unshift(historyEntry);
  setLocalHistory(history);

  // Sync with Firestore
  try {
    if (item.docId) {
      await updateDoc(doc(db, 'raw_materials', item.docId), {
        availableQuantity: newQty,
        totalDispatched,
        updatedAt: serverTimestamp()
      });
    }

    const cleanHistory = removeUndefined({
      ...historyEntry,
      createdAt: serverTimestamp()
    });
    await addDoc(getInventoryHistoryCol(), cleanHistory);
  } catch (err) {
    console.warn('Firestore dispatch raw material offline sync:', err);
  }

  return { updatedItem, historyEntry };
}

// 4. UNMERGE SCANNED ITEMS helper function
export async function separateMergedScannedItems(): Promise<boolean> {
  const materials = getLocalRawMaterials();
  const history = getLocalHistory();

  let modified = false;
  const newMaterialsList: RawMaterialItem[] = [];

  for (const mat of materials) {
    // Find all RECEIVED history entries for this material with rates specified
    const matLogs = history.filter(h => h.type === 'RECEIVED' && h.materialId === mat.id && h.unitCost && h.unitCost > 0);
    
    // Group logs by unitCost (Rate)
    const ratesMap = new Map<number, InventoryHistoryEntry[]>();
    matLogs.forEach(log => {
      const rate = Number(log.unitCost);
      if (!ratesMap.has(rate)) ratesMap.set(rate, []);
      ratesMap.get(rate)!.push(log);
    });

    if (ratesMap.size > 1) {
      // Multiple rates were merged into this single item! Split them into distinct product items!
      modified = true;
      let isFirst = true;

      ratesMap.forEach((logs, rate) => {
        const totalQtyForRate = logs.reduce((sum, l) => sum + l.quantity, 0);
        const refInvoice = logs[0].challanOrPoNo || mat.challanOrPoNo;
        const refVendor = logs[0].receivedFrom || mat.receivedFrom;
        const refBillDate = logs[0].billDate || mat.invoiceDate;

        if (isFirst) {
          // Keep the existing item for the first rate group
          newMaterialsList.push({
            ...mat,
            unitCost: rate,
            availableQuantity: totalQtyForRate,
            totalReceived: totalQtyForRate,
            challanOrPoNo: refInvoice,
            receivedFrom: refVendor,
            invoiceDate: refBillDate
          });
          isFirst = false;
        } else {
          // Create a new distinct item for this rate group
          const newId = `rm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newItem: RawMaterialItem = {
            ...mat,
            id: newId,
            docId: undefined,
            sku: mat.sku ? `${mat.sku}-${rate}` : `RM-${Math.floor(1000 + Math.random() * 9000)}`,
            unitCost: rate,
            availableQuantity: totalQtyForRate,
            totalReceived: totalQtyForRate,
            totalDispatched: 0,
            challanOrPoNo: refInvoice,
            receivedFrom: refVendor,
            invoiceDate: refBillDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          newMaterialsList.push(newItem);

          // Update the history entries for this group to point to newId
          logs.forEach(l => {
            l.materialId = newId;
          });
        }
      });
    } else {
      newMaterialsList.push(mat);
    }
  }

  if (modified) {
    setLocalRawMaterials(newMaterialsList);
    setLocalHistory(history);

    // Sync changes to Firestore
    try {
      for (const item of newMaterialsList) {
        if (item.docId) {
          await updateDoc(doc(db, 'raw_materials', item.docId), removeUndefined(item));
        } else {
          const docRef = await addDoc(getRawMaterialsCol(), removeUndefined(item));
          item.docId = docRef.id;
        }
      }
      setLocalRawMaterials(newMaterialsList);
    } catch (err) {
      console.warn('Firestore unmerge sync warning:', err);
    }
  }

  return modified;
}
