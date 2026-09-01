import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface PurchaseDetails {
  projectId?: string;
  projectName?: string;
  productName?: string;
  specification?: string;
  price?: string;
  vendorName?: string;
  details?: string;
  productImageName?: string;
  productImageData?: string;
  poNumber?: string;
  productId?: string;
  quantity?: string;
  eta?: string;
  deliveryQC?: any;
}

export interface Purchase {
  id: string;
  docId?: string;
  productName: string;
  vendorName: string;
  price: string;
  status: string;
  createdAt: any;
  details?: PurchaseDetails;
}

const getPurchasesCollection = () => collection(db, 'purchases');


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

export const savePurchase = async (purchaseData: Partial<Purchase>) => {
  let finalData = removeUndefined(purchaseData);
  delete finalData.docId;


  if (purchaseData.docId) {
    const docRef = doc(db, 'purchases', purchaseData.docId);
    await updateDoc(docRef, finalData);
    return purchaseData.docId;
  }

  const docRef = await addDoc(getPurchasesCollection(), {
    ...finalData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const deletePurchase = async (docId: string) => {
  await deleteDoc(doc(db, 'purchases', docId));
};

export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      const q = query(getPurchasesCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const purchases = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.data().id || doc.id,
          docId: doc.id
        })) as Purchase[];
        callback(purchases);
      }, (error) => {
        console.error("Error fetching purchases:", error);
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
