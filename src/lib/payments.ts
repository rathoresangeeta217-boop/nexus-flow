import { collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface PaymentPhase {
  id: string;
  title: string;          // e.g., "50% Advance", "25 days after 20%"
  amount: string;         // Amount for this phase
  status: 'Pending' | 'Received';
  utrNumber?: string;     // Transaction reference
  screenshotUrl?: string; // or base64 data
  date?: string;          // Expected or Received date
  sourceType?: 'Bank' | 'Cash' | 'Cheque';
  bankName?: 'SBI' | 'Union' | 'PR';
}

export interface RateEditHistoryEntry {
  timestamp: string;
  reason: string;
  changes: string[];
}

export interface PaymentRecord {
  id?: string;
  docId?: string;
  orderId: string;
  // Auto-fetched from Order/Quote
  originalAmount: string;
  originalGst?: string;
  grandTotal?: string;
  advanceRequirement?: string;
  advancePayment?: string;
  loadingCharges?: string;
  transportationCharges?: string;
  installationCharges?: string;
  remainingBalance?: string;
  
  // Edited values
  editedAmount?: string;
  editReason?: string;
  
  phases: PaymentPhase[];
  history?: any[];
  rateEditHistory?: RateEditHistoryEntry[];
  updatedAt?: any;
}

const getPaymentsCollection = () => collection(db, 'payments');

export const getAllPayments = async (): Promise<PaymentRecord[]> => {
  const snapshot = await getDocs(getPaymentsCollection());
  return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as PaymentRecord));
};

export const subscribeToPayments = (callback: (payments: PaymentRecord[]) => void) => {
  const q = query(getPaymentsCollection());
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as PaymentRecord));
    callback(payments);
  });
};


export const getPaymentForOrder = async (orderId: string): Promise<PaymentRecord | null> => {
  const q = query(getPaymentsCollection(), where("orderId", "==", orderId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docData = snapshot.docs[0];
    return { docId: docData.id, ...docData.data() } as PaymentRecord;
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

export const savePaymentRecord = async (record: Partial<PaymentRecord>) => {
  try {
    const cleanData = removeUndefined(record);
    if (cleanData.docId) {
      const { docId, ...updateData } = cleanData;
      await updateDoc(doc(db, 'payments', docId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return docId;
    } else {
      const docRef = await addDoc(getPaymentsCollection(), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (err) {
    console.error("Firebase savePaymentRecord Error: ", err);
    throw err;
  }
};
