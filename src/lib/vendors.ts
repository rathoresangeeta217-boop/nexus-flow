import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface Vendor {
  id: string;
  docId?: string;
  name: string;
  contactPerson?: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  qrCodeData?: string;
  qrCodeName?: string;
  createdAt: any;
}

const getVendorsCollection = () => collection(db, 'vendors');

export const saveVendor = async (vendorData: Partial<Vendor>) => {
  const finalData = Object.fromEntries(
    Object.entries(vendorData).filter(([_, v]) => v !== undefined)
  );
  const docRef = await addDoc(getVendorsCollection(), {
    ...finalData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const deleteVendor = async (docId: string) => {
  await deleteDoc(doc(db, 'vendors', docId));
};

export const subscribeToVendors = (callback: (vendors: Vendor[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      const q = query(getVendorsCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const vendors = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id,
          docId: docSnap.id
        })) as Vendor[];
        callback(vendors);
      }, (error) => {
        console.error("Error fetching vendors:", error);
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

export const getAllVendors = async (): Promise<Vendor[]> => {
  const snapshot = await getDocs(getVendorsCollection());
  return snapshot.docs.map(docSnap => ({
    ...docSnap.data(),
    id: docSnap.id,
    docId: docSnap.id
  })) as Vendor[];
};
