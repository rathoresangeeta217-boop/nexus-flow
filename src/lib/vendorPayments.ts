import { collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface VendorPaymentPhase {
  id: string;
  title: string;
  amount: string;
  status: 'Pending' | 'Paid' | 'Request Payment';
  utrNumber?: string;
  screenshotUrl?: string;
  date?: string;
  sourceType?: 'Bank' | 'Cash' | 'Cheque';
  bankName?: 'SBI' | 'Union' | 'PR';
}

export interface VendorPaymentRecord {
  id?: string;
  docId?: string;
  poNumber?: string;
  projectId?: string;
  projectName?: string;
  projectVendorId?: string;
  vendorName: string;
  totalAmount: string;
  phases: VendorPaymentPhase[];
  updatedAt?: any;
}

const getVendorPaymentsCollection = () => collection(db, 'vendor_payments');

export const getAllVendorPayments = async (): Promise<VendorPaymentRecord[]> => {
  const snapshot = await getDocs(getVendorPaymentsCollection());
  return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as VendorPaymentRecord));
};

export const subscribeToVendorPayments = (callback: (payments: VendorPaymentRecord[]) => void) => {
  const q = query(getVendorPaymentsCollection());
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as VendorPaymentRecord));
    callback(payments);
  });
};


export const getPaymentForPO = async (poNumber: string): Promise<VendorPaymentRecord | null> => {
  const q = query(getVendorPaymentsCollection(), where("poNumber", "==", poNumber));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docData = snapshot.docs[0];
    return { docId: docData.id, ...docData.data() } as VendorPaymentRecord;
  }
  return null;
};

export const getPaymentForProjectVendor = async (projectVendorId: string): Promise<VendorPaymentRecord | null> => {
  const q = query(getVendorPaymentsCollection(), where("projectVendorId", "==", projectVendorId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docData = snapshot.docs[0];
    return { docId: docData.id, ...docData.data() } as VendorPaymentRecord;
  }
  return null;
};

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
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

export const saveVendorPaymentRecord = async (record: Partial<VendorPaymentRecord>) => {
  try {
    const cleanData = removeUndefined(record);
    if (cleanData.docId) {
      const { docId, ...updateData } = cleanData;
      await updateDoc(doc(db, 'vendor_payments', docId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return docId;
    } else {
      const docRef = await addDoc(getVendorPaymentsCollection(), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (err) {
    console.error("Firebase saveVendorPaymentRecord Error: ", err);
    throw err;
  }
};

export const deleteVendorPaymentRecord = async (docId: string) => {
  try {
    await deleteDoc(doc(db, 'vendor_payments', docId));
  } catch (err) {
    console.error("Firebase deleteVendorPaymentRecord Error: ", err);
    throw err;
  }
};
