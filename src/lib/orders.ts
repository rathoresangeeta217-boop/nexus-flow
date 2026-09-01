import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  isDispatched: boolean;
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
}

export interface Order {
  id: string;
  docId?: string;
  customer: string;
  amount: string;
  date: string;
  status: string;
  items: number;
  dispatchAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
  createdAt: any;
  details?: OrderDetails;
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
    console.error("Error fetching order:", error);
    return null;
  }
};
export const deleteOrder = async (docId: string) => {
  await deleteDoc(doc(db, 'orders', docId));
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      const q = query(getOrdersCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          ...doc.data(),
          // Use firestore id as the backup if id is missing
          id: doc.data().id || doc.id,
          docId: doc.id
        })) as Order[];
        callback(orders);
      }, (error) => {
        console.error("Error fetching orders:", error);
      });
    } else {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      callback([]);
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};
