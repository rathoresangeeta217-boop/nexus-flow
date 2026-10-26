import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

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
    return null;
  } catch (error) {
    console.warn("Error fetching order:", error);
    return null;
  }
};
export const deleteOrder = async (docId: string) => {
  await deleteDoc(doc(db, 'orders', docId));
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  const q = query(getOrdersCollection());
  let lastDocs: any[] | null = null;
  let currentProfile: any = null;

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

    const userEmail = (auth.currentUser?.email || '').toLowerCase();
    const userName = (auth.currentUser?.displayName || '').toLowerCase();

    const isBhawna = userEmail.includes('bhawna') || userName.includes('bhawna');
    const isAnshuman = userEmail.includes('anshuman') || userName.includes('anshuman');
    const isNidhi = userEmail.includes('nidhi') || userName.includes('nidhi');

    const isSuperOrAdmin = !auth.currentUser ||
                           userEmail === 'marketing.srkmodular@gmail.com' ||
                           userEmail === 'rathoresangeeta217@gmail.com' ||
                           isBhawna ||
                           isAnshuman ||
                           isNidhi ||
                           !currentProfile ||
                           currentProfile.role === 'super_admin' ||
                           currentProfile.role === 'admin' ||
                           currentProfile.role === 'employee' ||
                           currentProfile.role !== 'sales_executive';

    // Filter orders ONLY for restricted sales executives
    if (!isSuperOrAdmin && currentProfile && currentProfile.role === 'sales_executive') {
      const profileName = (currentProfile.displayName || '').toLowerCase().trim();
      
      orders = orders.filter(order => {
        const empName = (order.details?.employeeName || '').toLowerCase().trim();
        if (!empName) return true; // Show unassigned orders to sales executives
        
        const empFirstName = empName.split(' ')[0];
        const profileFirstName = profileName.split(' ')[0];
        
        return empName === profileName || 
               profileName.includes(empName) || 
               empName.includes(profileName) ||
               (empFirstName && profileFirstName && empFirstName === profileFirstName);
      });
    }
    
    callback(orders);
  };

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
  }, (error) => {
    console.warn("Error fetching orders snapshot:", error);
    callback([]);
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
