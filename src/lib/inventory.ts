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
  challanOrPoNo?: string;
  receivedFrom?: string;
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

export function getLocalRawMaterials(): RawMaterialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RAW_MATERIALS);
    if (raw !== null) {
      const items: RawMaterialItem[] = JSON.parse(raw);
      return items.map(item => {
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
    localStorage.setItem(STORAGE_RAW_MATERIALS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save local raw materials', e);
  }
}

export function getLocalHistory(): InventoryHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_INVENTORY_HISTORY);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local history', e);
  }
  return [];
}

export function setLocalHistory(history: InventoryHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_INVENTORY_HISTORY, JSON.stringify(history));
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
            // Empty inventory in Firestore
            setLocalRawMaterials([]);
            callback([]);
            return;
          }

          const items = snapshot.docs.map(d => ({
            ...d.data(),
            id: d.data().id || d.id,
            docId: d.id
          })) as RawMaterialItem[];

          setLocalRawMaterials(items);
          callback(items);
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

  // Clear any pre-existing sample/demo entries on startup if requested
  if (typeof window !== 'undefined' && localStorage.getItem('srk_history_cleared_v2') !== 'true') {
    localStorage.setItem('srk_history_cleared_v2', 'true');
    setLocalHistory([]);
    clearAllInventoryHistory().catch(() => {});
  }

  // Immediately invoke with local cache
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

          const history = snapshot.docs.map(d => ({
            ...d.data(),
            id: d.data().id || d.id,
            docId: d.id
          })) as InventoryHistoryEntry[];

          setLocalHistory(history);
          callback(history);
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

  const inputName = (inputMaterial.name || '').trim();
  const normInputName = normalizeName(inputName);
  const inputSku = (inputMaterial.sku || '').trim().toLowerCase();

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
      x => x.name.trim().toLowerCase() === inputName.toLowerCase()
    );
    if (exactIdx >= 0) return exactIdx;
  }

  // 3. Normalized alphanumeric name match (ignores spaces, dashes, slashes, punctuation)
  if (normInputName.length >= 3) {
    const normIdx = currentList.findIndex(
      x => normalizeName(x.name) === normInputName
    );
    if (normIdx >= 0) return normIdx;
  }

  // 4. SKU match
  if (inputSku && inputSku !== 'rm' && !inputSku.startsWith('rm-scan')) {
    const skuIdx = currentList.findIndex(
      x => (x.sku || '').trim().toLowerCase() === inputSku
    );
    if (skuIdx >= 0) return skuIdx;
  }

  // 5. Board Attributes Match (Company + Type + Thickness + Size)
  if (inputMaterial.boardCompany && inputMaterial.boardThickness && inputMaterial.boardSize) {
    const boardIdx = currentList.findIndex(x => {
      const companyMatch = normalizeName(x.boardCompany || '') === normalizeName(inputMaterial.boardCompany || '');
      const typeMatch = !inputMaterial.boardType || !x.boardType || normalizeName(x.boardType) === normalizeName(inputMaterial.boardType);
      const thickMatch = normalizeName(x.boardThickness || '') === normalizeName(inputMaterial.boardThickness || '');
      const sizeMatch = normalizeName(x.boardSize || '') === normalizeName(inputMaterial.boardSize || '');
      return companyMatch && typeMatch && thickMatch && sizeMatch && Boolean(x.boardCompany) && Boolean(x.boardThickness);
    });
    if (boardIdx >= 0) return boardIdx;
  }

  // 6. Substring containment match for long names (>= 6 chars)
  if (normInputName.length >= 6) {
    const subIdx = currentList.findIndex(x => {
      const normX = normalizeName(x.name);
      return normX.length >= 6 && (normX.includes(normInputName) || normInputName.includes(normX));
    });
    if (subIdx >= 0) return subIdx;
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
  const vendorName = material.receivedFrom || extractVendor(material.notes) || 'Supplier';

  // 1. Find matching item in local list
  let existingIdx = findMatchingItemIndex(material, currentList);

  // 2. Fallback check in Firestore if no match in local list
  if (existingIdx < 0 && inputName && auth.currentUser) {
    try {
      const snap = await getDocs(getRawMaterialsCol());
      if (!snap.empty) {
        const firestoreItems = snap.docs.map(d => ({
          ...d.data(),
          id: d.data().id || d.id,
          docId: d.id
        })) as RawMaterialItem[];

        const fsMatchIdx = findMatchingItemIndex(material, firestoreItems);
        if (fsMatchIdx >= 0) {
          const matchedFsItem = firestoreItems[fsMatchIdx];
          const localIdx = currentList.findIndex(x => x.id === matchedFsItem.id || (x.docId && x.docId === matchedFsItem.docId));
          if (localIdx >= 0) {
            existingIdx = localIdx;
          } else {
            currentList.push(matchedFsItem);
            existingIdx = currentList.length - 1;
          }
        }
      }
    } catch (fsErr) {
      console.warn('Firestore fallback matching check warning:', fsErr);
    }
  }

  if (existingIdx >= 0 && !material.id && !material.docId) {
    // === PRODUCT NAME MATCHED IN EXISTING INVENTORY ===
    // Add incoming quantity to existing product stock and record history movement record!
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

    // Sync to Firestore
    try {
      if (existingItem.docId) {
        await updateDoc(doc(db, 'raw_materials', existingItem.docId), {
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
        });
      }

      const cleanHistory = removeUndefined({
        ...historyEntry,
        createdAt: serverTimestamp()
      });
      await addDoc(getInventoryHistoryCol(), cleanHistory);
    } catch (err) {
      console.warn('Firestore saveRawMaterialItem quantity update offline:', err);
    }

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
      updatedAt: new Date().toISOString()
    };

    currentList[existingIdx] = updatedItem;
    setLocalRawMaterials(currentList);

    try {
      const cleanData = removeUndefined({
        ...updatedItem,
        updatedAt: serverTimestamp()
      });
      if (updatedItem.docId) {
        await updateDoc(doc(db, 'raw_materials', updatedItem.docId), cleanData);
      }
    } catch (err) {
      console.warn('Firestore edit material offline:', err);
    }

    return updatedItem.docId || updatedItem.id;

  } else {
    // === BRAND NEW PRODUCT (NO MATCH FOUND) ===
    const id = material.id || `rm-${Date.now()}`;
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

    try {
      const cleanData = removeUndefined({
        ...newItem,
        createdAt: serverTimestamp()
      });

      const docRef = await addDoc(getRawMaterialsCol(), cleanData);
      newItem.docId = docRef.id;
      setLocalRawMaterials(currentList);

      const cleanHistory = removeUndefined({
        ...historyEntry,
        createdAt: serverTimestamp()
      });
      await addDoc(getInventoryHistoryCol(), cleanHistory);

      return docRef.id;
    } catch (err) {
      console.warn('Firestore saveRawMaterialItem offline fallback:', err);
      return id;
    }
  }
}

// Delete a Raw Material
export async function deleteRawMaterialItem(id: string, docId?: string): Promise<void> {
  const current = getLocalRawMaterials().filter(x => x.id !== id && (!docId || x.docId !== docId));
  setLocalRawMaterials(current);

  try {
    if (docId) {
      await deleteDoc(doc(db, 'raw_materials', docId));
    }
    if (id) {
      try {
        await deleteDoc(doc(db, 'raw_materials', id));
      } catch (_) {
        // Document with this exact ID might not exist directly
      }

      const q = query(getRawMaterialsCol(), where('id', '==', id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn('Firestore deleteRawMaterialItem error:', err);
  }
}

// Clear ALL raw materials from inventory (local & firestore)
export async function clearAllRawMaterials(): Promise<void> {
  // Clear local cache immediately
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
  const current = getLocalHistory().filter(x => x.id !== id && (!docId || x.docId !== docId));
  setLocalHistory(current);

  try {
    if (docId) {
      await deleteDoc(doc(db, 'inventory_history', docId));
    } else {
      const q = query(getInventoryHistoryCol(), where('id', '==', id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn('Firestore deleteInventoryHistoryEntry error:', err);
  }
}

// Clear ALL transaction history entries (local & firestore)
export async function clearAllInventoryHistory(): Promise<void> {
  // Clear local cache immediately
  setLocalHistory([]);
  try {
    const snap = await getDocs(getInventoryHistoryCol());
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
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
  notes?: string;
  performedBy?: string;
}

export async function receiveRawMaterialStock(params: {
  materialId: string;
  quantity: number;
  receivedFrom?: string;
  challanOrPoNo?: string;
  notes?: string;
  performedBy?: string;
}): Promise<{ updatedItem: RawMaterialItem; historyEntry: InventoryHistoryEntry }> {
  const { materialId, quantity, receivedFrom, challanOrPoNo, notes, performedBy } = params;

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
    receivedFrom: receivedFrom || 'General Supplier',
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
