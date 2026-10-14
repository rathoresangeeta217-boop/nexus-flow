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
    if (raw !== null) return JSON.parse(raw);
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

// Save or Update a Raw Material
export async function saveRawMaterialItem(material: Partial<RawMaterialItem>): Promise<string> {
  const currentList = getLocalRawMaterials();
  const id = material.id || `rm-${Date.now()}`;
  
  const newItem: RawMaterialItem = {
    id,
    name: material.name || 'Unnamed Raw Material',
    sku: material.sku || `RM-${Math.floor(1000 + Math.random() * 9000)}`,
    category: material.category || 'General Consumables',
    specs: material.specs || '',
    availableQuantity: Number(material.availableQuantity || 0),
    unit: material.unit || 'Nos',
    minThreshold: Number(material.minThreshold ?? 10),
    imageUrl: material.imageUrl || '',
    imageName: material.imageName || '',
    notes: material.notes || '',
    unitCost: material.unitCost ? Number(material.unitCost) : undefined,
    totalReceived: Number(material.totalReceived || material.availableQuantity || 0),
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

  // Update local storage
  const existingIdx = currentList.findIndex(x => x.id === id || (material.docId && x.docId === material.docId));
  if (existingIdx >= 0) {
    currentList[existingIdx] = { ...currentList[existingIdx], ...newItem };
  } else {
    currentList.unshift(newItem);
  }
  setLocalRawMaterials(currentList);

  // Sync to Firestore
  try {
    const cleanData = removeUndefined({
      ...newItem,
      updatedAt: serverTimestamp()
    });

    if (material.docId) {
      await updateDoc(doc(db, 'raw_materials', material.docId), cleanData);
      return material.docId;
    } else {
      const docRef = await addDoc(getRawMaterialsCol(), {
        ...cleanData,
        createdAt: serverTimestamp()
      });
      // also record docId locally
      newItem.docId = docRef.id;
      setLocalRawMaterials(currentList);
      return docRef.id;
    }
  } catch (err) {
    console.warn('Firestore saveRawMaterialItem offline fallback:', err);
    return id;
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
