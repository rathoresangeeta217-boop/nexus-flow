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
  sourceType?: 'Bank' | 'Cash' | 'ICICI BANK' | 'ICICI' | 'Cheque';
  bankName?: 'SBI' | 'Union' | 'PNB' | 'ICICI' | 'PR';
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
  
  deliveryDate?: string;
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
  }, (error) => { console.warn('Firestore snapshot error in src/lib/payments.ts:', error); callback([]); });
};


export const getPaymentForOrder = async (orderId: string, docId?: string): Promise<PaymentRecord | null> => {
  try {
    const idsToSearch = new Set<string>();
    if (orderId) idsToSearch.add(orderId);
    if (docId) idsToSearch.add(docId);

    const matches: PaymentRecord[] = [];
    for (const id of idsToSearch) {
      const q = query(getPaymentsCollection(), where("orderId", "==", id));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        matches.push({ docId: d.id, ...d.data() } as PaymentRecord);
      });
    }

    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aPhases = a.phases?.length || 0;
        const bPhases = b.phases?.length || 0;
        if (aPhases !== bPhases) return bPhases - aPhases;

        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      return matches[0];
    }
  } catch (err) {
    console.warn('getPaymentForOrder error:', err);
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
    let targetDocId = cleanData.docId;

    if (!targetDocId && cleanData.orderId) {
      const existing = await getPaymentForOrder(cleanData.orderId);
      if (existing?.docId) {
        targetDocId = existing.docId;
      }
    }

    if (targetDocId) {
      const { docId, ...updateData } = cleanData;
      await updateDoc(doc(db, 'payments', targetDocId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return targetDocId;
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

export interface PhaseGstAdjustment {
  isPRorCash: boolean;
  grossAmount: number;
  gstRate: number;
  gstAmount: number;
  netCreditedAmount: number;
}

export function calculatePhaseGstAdjustment(
  phaseAmountStr: string | number | undefined,
  sourceType?: string,
  bankName?: string,
  gstRate: number = 18,
  baseGrandTotal: number = 0
): PhaseGstAdjustment {
  const isPRorCash = sourceType === 'Cash' || sourceType === 'ICICI BANK' || sourceType === 'ICICI' || bankName === 'PR' || bankName === 'PNB' || bankName === 'ICICI' || (bankName && ['PR', 'PNB', 'ICICI', 'ICICI BANK'].includes(bankName.toUpperCase())) || (sourceType === 'Bank' && (bankName && ['PR', 'PNB', 'ICICI', 'ICICI BANK'].includes(bankName.toUpperCase())));

  let grossAmount = 0;
  if (phaseAmountStr !== undefined && phaseAmountStr !== null) {
    const strVal = phaseAmountStr.toString();
    const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
    if (pctMatch && baseGrandTotal > 0) {
      const pct = parseFloat(pctMatch[1].replace(/,/g, ''));
      grossAmount = (pct / 100) * baseGrandTotal;
    } else {
      const amtMatch = strVal.match(/\d[\d,]*(\.\d+)?/);
      grossAmount = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, '')) || 0 : 0;
    }
  }

  if (!isPRorCash || grossAmount <= 0) {
    return {
      isPRorCash: false,
      grossAmount,
      gstRate,
      gstAmount: 0,
      netCreditedAmount: grossAmount
    };
  }

  const gstAmount = grossAmount * (gstRate / 100);
  const netCreditedAmount = grossAmount;

  return {
    isPRorCash: true,
    grossAmount,
    gstRate,
    gstAmount,
    netCreditedAmount
  };
}
