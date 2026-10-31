import { collection, addDoc, getDocs, setDoc, query, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
  sourceType?: 'Bank' | 'Cheque' | 'Cash' | string;
  bankName?: 'SBI' | 'ICICI' | 'PNB' | 'Union' | 'PR' | string;
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
  customer?: string;
  aliases?: string[];
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
  const pCust = (payment.customer || '').trim().toLowerCase();
  const pBase = extractOrderBaseId(payment.orderId) || extractOrderBaseId(payment.docId);

  // Exact full string match
  if (oIdFull && (pOrderId === oIdFull || pDocId === oIdFull)) return true;
  if (oDocFull && (pOrderId === oDocFull || pDocId === oDocFull)) return true;

  // Exact base order code match (e.g. ord-2026-3285735 === ord-2026-3285735)
  if (oBase && pBase && oBase === pBase) return true;

  // Check aliases array on payment
  if (payment.aliases && Array.isArray(payment.aliases)) {
    for (const alias of payment.aliases) {
      if (!alias) continue;
      const aLow = alias.trim().toLowerCase();
      const aBase = extractOrderBaseId(alias);
      if (oIdFull && aLow === oIdFull) return true;
      if (oDocFull && aLow === oDocFull) return true;
      if (oBase && (aLow === oBase || aBase === oBase || aLow.includes(oBase))) return true;
    }
  }

  // Known mapping for Subhas Sir order ID alias (ORD-2026-4809459 <-> ORD-2026-3285735)
  const isSubhasOrder = oIdFull.includes('4809459') || oIdFull.includes('3285735') || oCustFull.includes('subhas');
  const isSubhasPayment = pOrderId.includes('4809459') || pOrderId.includes('3285735') || pCust.includes('subhas') || pDocId.includes('subhas');
  if (isSubhasOrder && isSubhasPayment) {
    return true;
  }

  // Known mapping for Gosimplify / Rekha Sharma order ID alias (ORD-2026-6200679 <-> ORD-2026-3585537)
  const isGosimplifyOrder = oIdFull.includes('6200679') || oIdFull.includes('3585537') || oCustFull.includes('gosimplify') || oCustFull.includes('rekha');
  const isGosimplifyPayment = pOrderId.includes('6200679') || pOrderId.includes('3585537') || pCust.includes('gosimplify') || pCust.includes('rekha') || pDocId.toLowerCase() === 'lc5okuwkms8x8evbvawn' || pDocId.includes('6200679');
  if (isGosimplifyOrder && isGosimplifyPayment) {
    return true;
  }

  // Substring and prefix match between base order codes (e.g. ord-2026-724 <-> ord-2026-7247180)
  if (oBase && pBase) {
    if (oBase === pBase) return true;
    if (oBase.length >= 8 && pBase.length >= 8) {
      if (oBase.startsWith(pBase) || pBase.startsWith(oBase)) return true;
      if (oBase.includes(pBase) || pBase.includes(oBase)) return true;
    }
  }

  // Substring match by base order code
  if (oBase && oBase.length > 5 && (pOrderId.includes(oBase) || pDocId.includes(oBase))) {
    return true;
  }
  if (pBase && pBase.length > 5 && (oIdFull.includes(pBase) || oDocFull.includes(pBase))) {
    return true;
  }

  // Match by customer name if present and sufficiently distinct (ignoring corporate suffixes like pvt, ltd and country/city names)
  const COMMON_CUSTOMER_STOP_WORDS = new Set([
    'pvt', 'ltd', 'limited', 'private', 'corp', 'corporation', 'inc', 'incorporated',
    'co', 'company', 'enterprises', 'enterprise', 'industries', 'industry', 'services',
    'and', 'the', 'for', 'by', 'sir', 'ji', 'mr', 'mrs', 'ms',
    'india', 'bharat', 'jaipur', 'delhi', 'mumbai', 'rajasthan'
  ]);

  if (oCustFull && oCustFull.length >= 3) {
    if (pOrderId.includes(oCustFull) || pDocId.includes(oCustFull)) {
      return true;
    }
    if (pCust) {
      if (pCust === oCustFull) return true;
      if (pCust.includes(oCustFull) || oCustFull.includes(pCust)) return true;
      // Word tokens overlap on meaningful distinctive words (excluding 'pvt', 'ltd', etc.)
      const pTokens = pCust.replace(/[^a-z0-9\s]/gi, '').toLowerCase().split(/\s+/).filter(t => t.length >= 3 && !COMMON_CUSTOMER_STOP_WORDS.has(t));
      const oTokens = oCustFull.replace(/[^a-z0-9\s]/gi, '').toLowerCase().split(/\s+/).filter(t => t.length >= 3 && !COMMON_CUSTOMER_STOP_WORDS.has(t));
      if (pTokens.length > 0 && oTokens.length > 0 && pTokens.some(pt => oTokens.includes(pt))) {
        return true;
      }
    }
  }

  return false;
}

export const KNOWN_ORDER_CUSTOMERS: Record<string, string> = {
  "ORD-2026-724": "NAHIM KHAN",
  "ORD-2026-572": "Southern grand hotels pvt. ltd.",
  "ORD-2026-550": "TBR Industries Pvt. Ltd",
  "ORD-2026-319": "RATHORE JWELLERS",
  "ORD-2026-037": "SIMRAT DESIGNS BY AMC PVT LTD INDIA",
  "ORD-2026-298": "RATHORE JWELLERS",
  "ORD-2026-6568403": "TERRANOVA FOODS PVT LTD",
  "ORD-2026-7288846": "KRISHA business process",
  "ORD-2026-6200679": "Gosimplify pvt ltd",
  "ORD-2026-4809459": "subhas sir",
  "ORD-2026-3285735": "subhas sir",
  "ORD-2026-7247180": "NAHIM KHAN",
  "ORD-2026-6578305": "TBR Industries Pvt. Ltd",
  "ORD-2026-3625520": "SIMRAT DESIGNS BY AMC PVT LTD INDIA",
  "ORD-2026-8938106": "KRISHA business process",
  "ORD-2026-661": "Southern grand hotels pvt. ltd.",
  "ORD-2026-4883924": "MANISH KUMAWAT",
  "ORD-2026-3767392": "CHANDRA PAL MEENA",
  "ORD-2026-6682485": "SHIKHA HEALTHCARE",
  "ORD-2026-878": "Ganpati Infa",
  "ORD-2026-6248962": "monilek Hospital and research center",
  "ORD-2026-101": "Srk Modular furniture co.",
  "ORD-2026-012": "Aryam Pvt Ltd",
  "ORD-2026-638": "harsh ji",
  "ORD-2026-093": "DIGITAL WEBSITE",
  "ORD-2026-118": "Afcons Infrastructure Limited",
  "ORD-2026-788": "KIHAA FOODS AND HOSPITALITY PRIVATE LIMITED",
  "ORD-2026-008": "Remotus Services LLP",
  "ORD-2026-650": "Ganpati Infa",
  "ORD-2026-618": "Subh Aangan",
  "ORD-2026-127": "Srk Modular furniture co.",
  "ORD-2026-9502384": "Ganpati Infra",
  "ORD-2026-636": "RAGHUDEEP EYE HOSPITAL",
  "ORD-2026-1457577": "Shanti & Sons",
  "ORD-2026-293": "EMERALD ENTERPRISES",
  "ORD-2026-344": "SIMRAT DESIGNS BY AMC PVT LTD INDIA",
  "ORD-2026-7774001": "Aryam Pvt Ltd",
  "ORD-2026-110": "Netgleam Consulting Pvt Ltd",
  "ORD-2026-7912816": "Ganpati Infra",
  "ORD-2026-054": "V biolife science",
  "ORD-2026-7995224": "Uday waldorf school",
  "ORD-2026-0412906": "CLOTHIQ SOLUTIONS PVT LTD",
  "ORD-2026-842": "Uday waldorf school",
  "ORD-2026-930": "KIHAA FOODS AND HOSPITALITY PRIVATE LIMITED",
  "ORD-2026-905": "Abhishek ji tambi",
  "ORD-2026-6744061": "PAANDER INFRA SOLUTION PVT LTD",
  "ORD-2026-074": "Kadellabs pvt limited",
  "ORD-2026-0796745": "ANKIT JAYSWAL",
  "ORD-2026-639": "SIMRAT DESIGNS BY AMC PVT LTD INDIA",
  "ORD-2026-934": "Shri Bhagwandas todi college",
  "ORD-2026-4470109": "FEB TELE INDIA",
  "ORD-2026-148": "CHANDRATAAL ENTERPRISES",
  "ORD-2026-675": "MANISH KUMAWAT",
  "ORD-2026-4844550": "Dr. Sunil Beniwal",
  "ORD-2026-0106457": "Kohinoor Lifts Pvt. Ltd",
  "ORD-2026-5376329": "Bhartiya Skill Development University",
  "ORD-2026-9711196": "MANISH SHARMA",
  "ORD-2026-2833872": "MADAN LAL SHARMA",
  "ORD-2026-605": "Abhishek Ji Mumbai",
  "ORD-2026-042": "Akhil Agarwal"
};

export function getKnownCustomerForOrderId(orderId?: string, amount?: string): string {
  if (!orderId) return '';
  const trimmed = orderId.trim();
  if (KNOWN_ORDER_CUSTOMERS[trimmed]) {
    return KNOWN_ORDER_CUSTOMERS[trimmed];
  }
  const cleanId = extractOrderBaseId(trimmed).toUpperCase();
  if (KNOWN_ORDER_CUSTOMERS[cleanId]) {
    return KNOWN_ORDER_CUSTOMERS[cleanId];
  }
  for (const [k, v] of Object.entries(KNOWN_ORDER_CUSTOMERS)) {
    if (k.toLowerCase() === trimmed.toLowerCase()) return v;
    const kDigits = k.replace(/[^0-9]/g, '');
    const tDigits = trimmed.replace(/[^0-9]/g, '');
    if (kDigits.length >= 4 && tDigits.length >= 4 && (kDigits.includes(tDigits) || tDigits.includes(kDigits))) {
      return v;
    }
  }
  return '';
}

/**
 * Merges two arrays of payment phases defensively so that no previously received or recorded phase is lost.
 */
export function mergePhases(existingPhases: PaymentPhase[] = [], incomingPhases: PaymentPhase[] = []): PaymentPhase[] {
  if (!existingPhases || existingPhases.length === 0) {
    return (incomingPhases || []).map(p => ({
      ...p,
      id: p.id || Math.random().toString(36).substring(2, 9)
    }));
  }
  if (!incomingPhases || incomingPhases.length === 0) {
    return existingPhases.map(p => ({
      ...p,
      id: p.id || Math.random().toString(36).substring(2, 9)
    }));
  }

  const result: PaymentPhase[] = [];
  const incomingUsed = new Set<number>();

  existingPhases.forEach(exPhase => {
    // Find matching incoming phase by ID or by same title + amount
    const incIndex = incomingPhases.findIndex((inc, idx) => {
      if (incomingUsed.has(idx)) return false;
      if (exPhase.id && inc.id && exPhase.id === inc.id) return true;
      const exTitle = (exPhase.title || '').trim().toLowerCase();
      const incTitle = (inc.title || '').trim().toLowerCase();
      const exAmt = (exPhase.amount || '').toString().trim();
      const incAmt = (inc.amount || '').toString().trim();
      return exTitle && incTitle && exTitle === incTitle && exAmt === incAmt;
    });

    if (incIndex >= 0) {
      incomingUsed.add(incIndex);
      const incPhase = incomingPhases[incIndex];
      const isReceived = isPhaseReceived(incPhase) || isPhaseReceived(exPhase);
      result.push({
        ...exPhase,
        ...incPhase,
        id: exPhase.id || incPhase.id || Math.random().toString(36).substring(2, 9),
        status: isReceived ? 'Received' : (incPhase.status || exPhase.status || 'Pending'),
        utrNumber: incPhase.utrNumber || exPhase.utrNumber,
        screenshotUrl: incPhase.screenshotUrl || exPhase.screenshotUrl,
        date: incPhase.date || exPhase.date,
        sourceType: incPhase.sourceType || exPhase.sourceType,
        bankName: incPhase.bankName || exPhase.bankName
      });
    } else {
      // Existing phase was not in incoming: preserve it so history is never lost!
      result.push({
        ...exPhase,
        id: exPhase.id || Math.random().toString(36).substring(2, 9)
      });
    }
  });

  // Append new phases from incoming
  incomingPhases.forEach((incPhase, idx) => {
    if (!incomingUsed.has(idx)) {
      result.push({
        ...incPhase,
        id: incPhase.id || Math.random().toString(36).substring(2, 9)
      });
    }
  });

  return result;
}

/**
 * Merges multiple PaymentRecord documents for the same order into a single unified record.
 */
export function mergePaymentRecords(records: PaymentRecord[]): PaymentRecord {
  if (records.length === 0) {
    return { orderId: '', originalAmount: '', phases: [] };
  }
  if (records.length === 1) {
    return records[0];
  }

  // Sort: prioritize actual firestore docId (not starting with pay_) and records with more received phases
  const sorted = [...records].sort((a, b) => {
    const aReal = a.docId && !a.docId.startsWith('pay_') ? 1 : 0;
    const bReal = b.docId && !b.docId.startsWith('pay_') ? 1 : 0;
    if (aReal !== bReal) return bReal - aReal;

    const aRec = (a.phases || []).filter(p => isPhaseReceived(p)).length;
    const bRec = (b.phases || []).filter(p => isPhaseReceived(p)).length;
    if (aRec !== bRec) return bRec - aRec;

    const aLen = (a.phases || []).length;
    const bLen = (b.phases || []).length;
    return bLen - aLen;
  });

  const base = { ...sorted[0] };
  let allPhases: PaymentPhase[] = [...(base.phases || [])];

  for (let i = 1; i < sorted.length; i++) {
    const other = sorted[i];
    allPhases = mergePhases(allPhases, other.phases || []);
    if (!base.grandTotal || base.grandTotal === '₹0') base.grandTotal = other.grandTotal;
    if (!base.originalAmount || base.originalAmount === '₹0') base.originalAmount = other.originalAmount;
    if (!base.originalGst || base.originalGst === '₹0') base.originalGst = other.originalGst;
    if (!base.deliveryDate) base.deliveryDate = other.deliveryDate;
    if (!base.advancePayment) base.advancePayment = other.advancePayment;
    if (!base.transportationCharges) base.transportationCharges = other.transportationCharges;
    if (!base.installationCharges) base.installationCharges = other.installationCharges;
    if (!base.customer || base.customer.toLowerCase() === 'customer') {
      base.customer = other.customer;
    }
  }

  if (!base.customer || base.customer.toLowerCase() === 'customer') {
    base.customer = getKnownCustomerForOrderId(base.orderId);
  }

  base.phases = allPhases;
  return base;
}

/**
 * Consolidates an array of PaymentRecords, merging duplicates by base order ID.
 */
export function consolidatePayments(payments: PaymentRecord[]): PaymentRecord[] {
  const groups = new Map<string, PaymentRecord[]>();
  payments.forEach(p => {
    const baseId = extractOrderBaseId(p.orderId) || extractOrderBaseId(p.docId) || p.orderId || p.docId || 'unknown';
    const list = groups.get(baseId) || [];
    list.push(p);
    groups.set(baseId, list);
  });

  const result: PaymentRecord[] = [];
  groups.forEach((group) => {
    result.push(mergePaymentRecords(group));
  });
  return result;
}

export const getAllPayments = async (): Promise<PaymentRecord[]> => {
  try {
    const snapshot = await getDocs(getPaymentsCollection());
    const rawPayments = snapshot.docs.map(d => ({ docId: d.id, ...d.data() } as PaymentRecord));
    if (rawPayments.length > 0) {
      const consolidated = consolidatePayments(rawPayments);
      await setCachedPayments(consolidated);
      return consolidated;
    }
  } catch (err: any) {
    console.warn("getAllPayments firestore notice, using cached payments:", err);
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: err.message } }));
      }
    }
  }
  const cached = await getCachedPayments();
  return consolidatePayments(cached);
};

export const subscribeToPayments = (callback: (payments: PaymentRecord[]) => void) => {
  // Immediately provide cached payments
  getCachedPayments().then(cached => {
    if (cached && cached.length > 0) {
      callback(consolidatePayments(cached));
    }
  }).catch(e => console.warn("Initial payments cache fetch notice:", e));

  const q = query(getPaymentsCollection());
  return onSnapshot(q, (snapshot) => {
    const rawPayments = snapshot.docs.map(d => ({ docId: d.id, ...d.data() } as PaymentRecord));
    if (rawPayments.length > 0) {
      const consolidated = consolidatePayments(rawPayments);
      setCachedPayments(consolidated);
      callback(consolidated);
    } else {
      getCachedPayments().then(cached => callback(consolidatePayments(cached)));
    }
  }, async (error) => {
    console.warn('Firestore snapshot error in src/lib/payments.ts:', error);
    if (error?.message?.includes('Quota') || (error as any)?.code === 'resource-exhausted') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: error.message } }));
      }
    }
    const cached = await getCachedPayments();
    callback(consolidatePayments(cached));
  });
};

export const getPaymentForOrder = async (orderId: string, docId?: string, customerName?: string): Promise<PaymentRecord | null> => {
  const matchingRecords: PaymentRecord[] = [];

  // 1. Try Firestore
  try {
    const allSnapshot = await getDocs(getPaymentsCollection());
    allSnapshot.docs.forEach(d => {
      const data = { docId: d.id, ...d.data() } as PaymentRecord;
      if (isPaymentMatchingOrder(orderId, docId, data, customerName)) {
        matchingRecords.push(data);
      }
    });
  } catch (err) {
    console.warn('getPaymentForOrder firestore notice, checking local cache:', err);
  }

  // 2. Also check local cache to ensure no offline or unsynced records are missed
  try {
    const cached = await getCachedPayments();
    cached.forEach(c => {
      if (isPaymentMatchingOrder(orderId, docId, c, customerName)) {
        const alreadyExists = matchingRecords.some(m => m.docId === c.docId);
        if (!alreadyExists) {
          matchingRecords.push(c);
        }
      }
    });
  } catch (cErr) {
    console.warn('getPaymentForOrder cache lookup warning:', cErr);
  }

  if (matchingRecords.length > 0) {
    // Merge all matching records into one comprehensive record
    return mergePaymentRecords(matchingRecords);
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

  // Check if there is an existing payment record for this order
  let existingRecord: PaymentRecord | null = null;
  try {
    existingRecord = await getPaymentForOrder(cleanData.orderId || '', cleanData.docId, cleanData.customer);
  } catch (e) {
    console.warn("Could not check existing record prior to save:", e);
  }

  // Choose the best document ID: prefer real Firestore ID if one already exists
  let targetDocId = cleanData.docId;
  if (existingRecord?.docId && !existingRecord.docId.startsWith('pay_')) {
    targetDocId = existingRecord.docId;
  } else if (!targetDocId) {
    targetDocId = `pay_${Date.now()}`;
  }
  cleanData.docId = targetDocId;

  if (!cleanData.customer || cleanData.customer.toLowerCase() === 'customer') {
    cleanData.customer = existingRecord?.customer || getKnownCustomerForOrderId(cleanData.orderId);
  }

  const combinedAliases = Array.from(new Set([
    ...(cleanData.aliases || []),
    ...(existingRecord?.aliases || []),
    cleanData.orderId,
    existingRecord?.orderId,
    targetDocId
  ].filter(Boolean)));
  cleanData.aliases = combinedAliases;

  // Defensive Phase Merge: Ensure no previously received phases are ever accidentally removed
  if (existingRecord?.phases && existingRecord.phases.length > 0) {
    cleanData.phases = mergePhases(existingRecord.phases, cleanData.phases || []);
  }

  // Persist locally first for instant, resilient offline update
  try {
    const cached = await getCachedPayments();
    const existingIndex = cached.findIndex(p => 
      (targetDocId && p.docId === targetDocId) || 
      (cleanData.orderId && isPaymentMatchingOrder(cleanData.orderId, undefined, p))
    );
    let updated: PaymentRecord[];
    if (existingIndex >= 0) {
      updated = [...cached];
      updated[existingIndex] = { ...updated[existingIndex], ...cleanData } as PaymentRecord;
    } else {
      updated = [{ ...cleanData, docId: targetDocId } as PaymentRecord, ...cached];
    }
    await setCachedPayments(consolidatePayments(updated));
  } catch (cErr) {
    console.warn("Payment local cache write warning:", cErr);
  }

  // Persist to Firestore using setDoc with merge: true to avoid creating duplicate docs
  try {
    const { docId, ...dataToSave } = cleanData;
    await setDoc(doc(db, 'payments', targetDocId), {
      ...dataToSave,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return targetDocId;
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

export function isNonGstBankOrCash(sourceType?: string, bankName?: string): boolean {
  const bnk = (bankName || '').trim().toUpperCase();
  const src = (sourceType || '').trim().toUpperCase();

  // PNB and ICICI: GST is NOT applicable (e.g. 10 Rs paid -> 11.8 Rs deducted from total amount)
  if (bnk === 'ICICI' || bnk.includes('ICICI')) return true;
  if (bnk === 'PNB' || bnk.includes('PNB')) return true;
  if (bnk === 'PR' || bnk.includes('PR')) return true;
  if (src === 'ICICI' || src === 'ICICI BANK') return true;
  if (src === 'CASH') return true;

  // SBI and UNION: GST is applicable (exact amount deducted)
  return false;
}

export interface PhaseGstAdjustment {
  isPRorCash: boolean;
  isGstExempt: boolean;
  isGstApplicable: boolean;
  grossAmount: number;
  gstRate: number;
  gstAmount: number;
  netCreditedAmount: number;
  totalDeduction: number;
}

export function calculatePhaseGstAdjustment(
  phaseAmountStr: string | number | undefined,
  sourceType?: string,
  bankName?: string,
  gstRate: number = 18,
  baseGrandTotal: number = 0
): PhaseGstAdjustment {
  const isNoGst = isNonGstBankOrCash(sourceType, bankName);

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

  // SBI or UNION (or default when GST is applicable)
  if (!isNoGst || grossAmount <= 0) {
    return {
      isPRorCash: false,
      isGstExempt: false,
      isGstApplicable: true,
      grossAmount,
      gstRate,
      gstAmount: 0,
      netCreditedAmount: grossAmount,
      totalDeduction: grossAmount
    };
  }

  // PNB or ICICI: GST is NOT applicable on this amount, so on gross of 10, 1.80 GST is waived/deducted from total (total 11.80 deducted)
  const gstAmount = grossAmount * (gstRate / 100);
  const netCreditedAmount = grossAmount + gstAmount;

  return {
    isPRorCash: true,
    isGstExempt: true,
    isGstApplicable: false,
    grossAmount,
    gstRate,
    gstAmount,
    netCreditedAmount,
    totalDeduction: netCreditedAmount
  };
}
