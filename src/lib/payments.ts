import { collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCachedPayments, setCachedPayments, BASELINE_PAYMENTS } from './paymentsCache';

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

export function calculateOrderTotalAmount(order: any): number {
  if (!order) return 0;

  if (order.amount) {
    const str = order.amount.toString();
    const m = str.match(/\d[\d,]*(\.\d+)?/);
    if (m) {
      const val = parseFloat(m[0].replace(/,/g, ''));
      if (val > 0) return val;
    }
  }

  if (order.details?.totalAmount) {
    const str = order.details.totalAmount.toString();
    const m = str.match(/\d[\d,]*(\.\d+)?/);
    if (m) {
      const val = parseFloat(m[0].replace(/,/g, ''));
      if (val > 0) return val;
    }
  }

  if (order.details?.products && Array.isArray(order.details.products) && order.details.products.length > 0) {
    let sum = 0;
    order.details.products.forEach((p: any) => {
      const pAmtStr = p.amount || p.rate;
      if (pAmtStr) {
        const m = pAmtStr.toString().match(/\d[\d,]*(\.\d+)?/);
        if (m) {
          const itemVal = parseFloat(m[0].replace(/,/g, ''));
          const qty = Number(p.quantity) || 1;
          sum += (p.amount ? itemVal : itemVal * qty);
        }
      }
    });
    if (sum > 0) return sum;
  }

  return 0;
}

export function isPhaseReceived(phase: PaymentPhase): boolean {
  if (!phase) return false;
  const statusStr = (phase.status || '').toString().toLowerCase().trim();
  if (statusStr === 'received' || statusStr === 'paid' || statusStr === 'completed' || statusStr === 'done') {
    return true;
  }
  if (phase.utrNumber && phase.utrNumber.trim().length > 0) return true;
  if (phase.bankName && phase.bankName.trim().length > 0) return true;
  if (phase.sourceType && phase.sourceType.trim().length > 0) return true;
  if (phase.screenshotUrl && phase.screenshotUrl.trim().length > 0) return true;
  return false;
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
  try {
    const snapshot = await getDocs(getPaymentsCollection());
    const payments = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as PaymentRecord));
    if (payments.length > 0) {
      await setCachedPayments(payments);
    }
    return payments;
  } catch (err: any) {
    console.warn("getAllPayments firestore notice, using cached payments:", err);
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: err.message } }));
      }
    }
    return await getCachedPayments();
  }
};

export const subscribeToPayments = (callback: (payments: PaymentRecord[]) => void) => {
  // Immediately provide cached payments
  getCachedPayments().then(cached => {
    if (cached && cached.length > 0) {
      callback(cached);
    }
  }).catch(e => console.warn("Initial payments cache fetch notice:", e));

  const q = query(getPaymentsCollection());
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as PaymentRecord));
    if (payments.length > 0) {
      setCachedPayments(payments);
    }
    callback(payments);
  }, async (error) => {
    console.warn('Firestore snapshot error in src/lib/payments.ts:', error);
    if (error?.message?.includes('Quota') || (error as any)?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: error.message } }));
      }
    }
    const cached = await getCachedPayments();
    callback(cached);
  });
};


export function extractOrderBaseId(rawId?: string): string {
  if (!rawId) return '';
  const trimmed = rawId.trim().toLowerCase();
  const match = trimmed.match(/ord-[a-z0-9-]+/i);
  if (match) {
    return match[0].toLowerCase();
  }
  if (trimmed.includes(' - ')) {
    return trimmed.split(' - ')[0].trim().toLowerCase();
  }
  return trimmed;
}

export function isPaymentMatchingOrder(
  orderId: string | undefined, 
  docId: string | undefined, 
  payment: PaymentRecord,
  customerName?: string
): boolean {
  if (!payment) return false;

  const oIdFull = orderId ? orderId.trim().toLowerCase() : '';
  const oDocFull = docId ? docId.trim().toLowerCase() : '';
  const oCustFull = customerName ? customerName.trim().toLowerCase() : '';
  const oBase = extractOrderBaseId(orderId) || extractOrderBaseId(docId);

  const pOrderId = payment.orderId ? payment.orderId.trim().toLowerCase() : '';
  const pDocId = payment.docId ? payment.docId.trim().toLowerCase() : '';
  const pBase = extractOrderBaseId(payment.orderId) || extractOrderBaseId(payment.docId);

  // Exact full string match
  if (oIdFull && (pOrderId === oIdFull || pDocId === oIdFull)) return true;
  if (oDocFull && (pOrderId === oDocFull || pDocId === oDocFull)) return true;

  // Exact base order code match (e.g. ord-2026-3285735 === ord-2026-3285735)
  if (oBase && pBase && oBase === pBase) return true;

  // Substring match by base order code
  if (oBase && oBase.length > 3 && (pOrderId.includes(oBase) || pDocId.includes(oBase))) {
    return true;
  }

  // Match by customer name if present
  if (oCustFull && oCustFull.length > 2 && (pOrderId.includes(oCustFull) || pDocId.includes(oCustFull))) {
    return true;
  }

  return false;
}

export const getPaymentForOrder = async (orderId: string, docId?: string, customerName?: string): Promise<PaymentRecord | null> => {
  try {
    const allSnapshot = await getDocs(getPaymentsCollection());
    const matches: PaymentRecord[] = [];

    allSnapshot.docs.forEach(d => {
      const data = { docId: d.id, ...d.data() } as PaymentRecord;
      if (isPaymentMatchingOrder(orderId, docId, data, customerName)) {
        matches.push(data);
      }
    });

    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aRec = (a.phases || []).filter(p => p.status === 'Received').length;
        const bRec = (b.phases || []).filter(p => p.status === 'Received').length;
        if (aRec !== bRec) return bRec - aRec;

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
  const cleanData = removeUndefined(record);
  let targetDocId = cleanData.docId || `pay_${Date.now()}`;
  cleanData.docId = targetDocId;

  // Persist locally first
  try {
    const cached = await getCachedPayments();
    const existingIndex = cached.findIndex(p => (targetDocId && p.docId === targetDocId) || (cleanData.orderId && isPaymentMatchingOrder(cleanData.orderId, undefined, p)));
    let updated: PaymentRecord[];
    if (existingIndex >= 0) {
      updated = [...cached];
      updated[existingIndex] = { ...updated[existingIndex], ...cleanData } as PaymentRecord;
    } else {
      updated = [{ ...cleanData, docId: targetDocId } as PaymentRecord, ...cached];
    }
    await setCachedPayments(updated);
  } catch (cErr) {
    console.warn("Payment local cache write warning:", cErr);
  }

  try {
    if (cleanData.docId && cleanData.docId.startsWith('pay_') === false) {
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
  } catch (err: any) {
    console.warn("Firestore savePaymentRecord notice (persisted in local cache):", err);
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: err.message } }));
      }
    }
    return targetDocId;
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
