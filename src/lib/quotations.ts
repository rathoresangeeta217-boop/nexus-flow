import {
  collection,
  addDoc,
  orderBy,
  query,
  serverTimestamp,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

export const QUOTATION_CATEGORIES = [
  'Workstation',
  'Workstation chair',
  'Almera storage',
  'Table'
] as const;

export type QuotationCategory = (typeof QUOTATION_CATEGORIES)[number];

export interface SavedQuotationItem {
  id: string;
  category: QuotationCategory;
  productName: string;
  productId?: string;
  variantId?: string;
  variantLabel?: string;
  defaultSpecs: string;
  optionalSpecs?: Record<string, string>;
  remarks?: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  amount: number;
}

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'converted';

export interface SavedQuotation {
  id: string;
  docId?: string;
  quotationNo: string;
  quotationDate: string;
  validTillDate: string;
  buyerName: string;
  mobileNumber: string;
  companyName?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  items: SavedQuotationItem[];
  subtotal: number;
  discountTotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  paymentTerms?: string;
  notes?: string;
  status: QuotationStatus;
  createdBy?: string;
  createdAt: any;
  updatedAt?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const QUOTATIONS_PATH = 'quotations';
const getQuotationsCollection = () => collection(db, QUOTATIONS_PATH);

const sanitizeForFirestore = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      result[key] = val.map((v) =>
        v && typeof v === 'object' ? sanitizeForFirestore(v) : v
      );
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = sanitizeForFirestore(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

export const saveQuotation = async (
  quotationData: Omit<SavedQuotation, 'id' | 'docId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const cleanPayload = sanitizeForFirestore({
      ...quotationData,
      createdBy: quotationData.createdBy || auth.currentUser?.email || 'staff'
    });
    const docRef = await addDoc(getQuotationsCollection(), {
      ...cleanPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, QUOTATIONS_PATH);
  }
};

export const updateQuotation = async (
  docId: string,
  updates: Partial<Omit<SavedQuotation, 'id' | 'docId' | 'createdAt'>>
): Promise<void> => {
  const docPath = `${QUOTATIONS_PATH}/${docId}`;
  try {
    const cleanUpdates = sanitizeForFirestore(updates);
    await updateDoc(doc(db, QUOTATIONS_PATH, docId), {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
};

export const deleteQuotation = async (docId: string): Promise<void> => {
  const docPath = `${QUOTATIONS_PATH}/${docId}`;
  try {
    await deleteDoc(doc(db, QUOTATIONS_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
};

export const subscribeToQuotations = (
  callback: (quotations: SavedQuotation[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(getQuotationsCollection(), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        docId: d.id,
        ...d.data()
      })) as SavedQuotation[];
      callback(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, QUOTATIONS_PATH);
      } catch (wrappedErr) {
        if (onError && wrappedErr instanceof Error) {
          onError(wrappedErr);
        }
        callback([]);
      }
    }
  );
};
