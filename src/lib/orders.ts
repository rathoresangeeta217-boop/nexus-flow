import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { getCachedOrders, setCachedOrders } from './ordersCache';

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  isDispatched: boolean;
  requiresInstallation?: boolean;
  dispatchedQuantity?: number;
  size?: string;
  image?: string;
  rate?: string;
  amount?: string;
}

export interface OrderDetails {
  products?: OrderProduct[];
  customerName?: string;
  companyName?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  gst?: string;
  totalAmount?: string;
  employeeName?: string;
  quotationFileName?: string;
  quotationFileData?: string;
  poFileName?: string;
  poFileData?: string;
  drawingFileName?: string;
  drawingFileData?: string;
  advancePayment?: string;
  transportationCharges?: string;
  installationCharges?: string;
  bankDetails?: string;
  dispatchAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
  logisticCharges?: string;
  firstDispatchAmount?: string;
  secondDispatchAmount?: string;
  placeOfSupply?: string;
  reasonForTransport?: string;
  challanApprovalStatus?: string;
  challanPendingReason?: string;
  challanApprovalType?: 'partial_dispatch' | 'pending_payment' | 'partial_and_payment' | string;
  challanPartialSummary?: {
    dispatchedItems: { name: string; quantity: number; size?: string }[];
    heldBackItems: { name: string; quantity: number; size?: string }[];
  };
  challanApprovedBy?: string;
  challanApprovedAt?: string;
  installerName?: string;
  installationHelpers?: string;
  installationDate?: string;
  deliveryDate?: string;
  scheduledReason?: 'CUSTOMER ISSUE' | 'LOGISTIC ISSUE' | 'PAYMENT DELAY' | 'UNSATISFACTION' | string;
}

export interface Order {
  id: string;
  docId?: string;
  customer: string;
  amount: string;
  date: string;
  status: string;
  items: number;
  project?: string;
  employee?: string;
  dispatchAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
  logisticCharges?: string;
  reasonForTransport?: string;
  createdAt: any;
  updatedAt?: any;
  details?: OrderDetails & { employeeName?: string };
}

const getOrdersCollection = () => collection(db, 'orders');


const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
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

export const saveOrder = async (orderData: Partial<Order>) => {
  const finalData = removeUndefined(orderData);
  const targetId = finalData.id || `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  finalData.id = targetId;

  // Persist to local cache immediately so zero data is lost
  try {
    const cached = await getCachedOrders();
    const existingIndex = cached.findIndex(o => o.id === targetId || (finalData.docId && o.docId === finalData.docId));
    let updated: Order[];
    if (existingIndex >= 0) {
      updated = [...cached];
      updated[existingIndex] = { ...updated[existingIndex], ...finalData } as Order;
    } else {
      updated = [{ ...finalData, id: targetId, docId: finalData.docId || targetId } as Order, ...cached];
    }
    await setCachedOrders(updated);
  } catch (cacheErr) {
    console.warn("Local orders cache write warning:", cacheErr);
  }

  try {
    if (finalData.docId) {
      const docId = finalData.docId as string;
      delete finalData.docId;
      await updateDoc(doc(db, 'orders', docId), {
        ...finalData,
        updatedAt: serverTimestamp()
      });
      return docId;
    } else {
      const docRef = await addDoc(getOrdersCollection(), {
        ...finalData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (firestoreErr: any) {
    console.warn("Firestore save notice (saved to persistent local cache):", firestoreErr);
    if (firestoreErr?.message?.includes('Quota') || firestoreErr?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: firestoreErr.message } }));
      }
    }
    return finalData.docId || targetId;
  }
};

export const getOrder = async (docId: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), docId: docSnap.id } as Order;
    }
    const q = query(getOrdersCollection(), where('id', '==', docId));
    const qs = await getDocs(q);
    if (!qs.empty) {
      return { ...qs.docs[0].data(), docId: qs.docs[0].id } as Order;
    }
  } catch (error) {
    console.warn("Error fetching order from firestore, checking local cache:", error);
  }
  const cached = await getCachedOrders();
  return cached.find(o => o.id === docId || o.docId === docId) || null;
};

export const deleteOrder = async (docId: string) => {
  try {
    const cached = await getCachedOrders();
    const filtered = cached.filter(o => o.docId !== docId && o.id !== docId);
    await setCachedOrders(filtered);
  } catch (err) {
    console.warn("Error deleting from local cache:", err);
  }

  try {
    await deleteDoc(doc(db, 'orders', docId));
  } catch (err) {
    console.warn("Firestore delete notice:", err);
  }
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  const q = query(getOrdersCollection());
  let lastDocs: any[] | null = null;
  let currentProfile: any = null;

  // Immediately load cached orders so user never sees 0 orders on mount or reload!
  getCachedOrders().then(cached => {
    if (cached && cached.length > 0 && !lastDocs) {
      callback(cached);
    }
  }).catch(e => console.warn("Initial cache fetch notice:", e));

  const processAndDeliver = () => {
    if (!lastDocs) return;

    let orders = lastDocs.map(doc => ({
      ...doc.data(),
      id: doc.data().id || doc.id,
      docId: doc.id
    })) as Order[];

    // Sort in memory by createdAt/date descending
    orders.sort((a, b) => {
      const getTime = (o: Order) => {
        if (o.createdAt?.seconds) return o.createdAt.seconds * 1000;
        if (o.date) {
          const t = new Date(o.date).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };
      return getTime(b) - getTime(a);
    });

    if (orders.length > 0) {
      setCachedOrders(orders);
    }

    const userEmail = (auth.currentUser?.email || '').toLowerCase().trim();
    const userName = (auth.currentUser?.displayName || '').toLowerCase().trim();

    const isBhawna = userEmail.includes('bhawna') || userName.includes('bhawna');
    const isAnshuman = userEmail.includes('anshuman') || userName.includes('anshuman');
    const isNidhi = userEmail.includes('nidhi') || userName.includes('nidhi');

    const isSuperOrAdmin = !auth.currentUser ||
                           userEmail.includes('marketing') ||
                           userEmail.includes('srk') ||
                           userEmail.includes('rathore') ||
                           userEmail.includes('admin') ||
                           isBhawna ||
                           isAnshuman ||
                           isNidhi ||
                           !currentProfile ||
                           !currentProfile.role ||
                           currentProfile.role === 'super_admin' ||
                           currentProfile.role === 'admin' ||
                           currentProfile.role === 'employee' ||
                           currentProfile.role === 'management' ||
                           currentProfile.role !== 'sales_executive';

    // Filter orders ONLY for strictly configured sales executive accounts
    if (!isSuperOrAdmin && currentProfile && currentProfile.role === 'sales_executive') {
      const profileName = (currentProfile.displayName || '').toLowerCase().trim();
      if (profileName) {
        orders = orders.filter(order => {
          const empName = (order.details?.employeeName || '').toLowerCase().trim();
          if (!empName) return true; // Show unassigned orders
          
          const empFirstName = empName.split(' ')[0];
          const profileFirstName = profileName.split(' ')[0];
          
          return empName === profileName || 
                 profileName.includes(empName) || 
                 empName.includes(profileName) ||
                 (empFirstName && profileFirstName && empFirstName === profileFirstName);
        });
      }
    }
    
    callback(orders);
  };

  // Execute an immediate getDocs query
  getDocs(q).then((snapshot) => {
    if (!lastDocs || lastDocs.length === 0) {
      if (!snapshot.empty) {
        lastDocs = snapshot.docs;
        processAndDeliver();
      }
    }
  }).catch((err) => {
    console.warn("Immediate getDocs fallback notice:", err);
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: err.message } }));
      }
    }
  });

  const unsubAuth = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const { getUserProfile } = await import('./users');
        currentProfile = await getUserProfile(user.uid);
      } catch (err) {
        console.warn('Profile fetch error in subscribeToOrders:', err);
      }
    } else {
      currentProfile = null;
    }
    processAndDeliver();
  });

  const unsubSnapshot = onSnapshot(q, (snapshot) => {
    lastDocs = snapshot.docs;
    processAndDeliver();
  }, async (error) => {
    console.warn("Error fetching orders snapshot:", error);
    if (error?.message?.includes('Quota') || (error as any)?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: error.message } }));
      }
    }
    // Deliver cached orders on error instead of empty array!
    const cached = await getCachedOrders();
    callback(cached);
  });

  return () => {
    unsubAuth();
    unsubSnapshot();
  };
};

export function getOverdueUnconfirmedDispatches(orders: Order[]): Order[] {
  const now = Date.now();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours

  return orders.filter(order => {
    const status = order.status || '';

    // Completed or fully dispatched orders are not pending confirmation
    const isFullyDispatchedOrCompleted = 
      status === 'Dispatched' || 
      status === 'Delivered' || 
      status === 'Completed' || 
      status === 'Installation Pending' || 
      status === 'Installed' ||
      status === 'Cancelled';

    if (isFullyDispatchedOrCompleted) return false;

    // Must be in a scheduled dispatch state, or challan approved, or partially dispatched
    const isPendingDispatchConfirmation = 
      status === 'Scheduled Dispatched' || 
      order.details?.challanApprovalStatus === 'Approved' ||
      (order.details?.products && order.details.products.some(p => p.dispatchedQuantity && p.dispatchedQuantity > 0 && !p.isDispatched));

    if (!isPendingDispatchConfirmation) return false;

    // Find the reference creation/scheduling timestamp
    let refTime: number | null = null;
    if (order.details?.challanApprovedAt) {
      refTime = new Date(order.details.challanApprovedAt).getTime();
    } else if (order.details?.installationDate) {
      refTime = new Date(order.details.installationDate).getTime();
    } else if (order.updatedAt) {
      refTime = typeof order.updatedAt === 'string' ? new Date(order.updatedAt).getTime() : (order.updatedAt?.seconds ? order.updatedAt.seconds * 1000 : null);
    }
    
    if (!refTime || isNaN(refTime)) {
      if (order.createdAt) {
        refTime = typeof order.createdAt === 'string' ? new Date(order.createdAt).getTime() : (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null);
      } else if (order.date) {
        refTime = new Date(order.date).getTime();
      }
    }

    if (!refTime || isNaN(refTime)) return false;

    // If older than 2 days (48 hours), it's overdue!
    return (now - refTime) > TWO_DAYS_MS;
  });
}
