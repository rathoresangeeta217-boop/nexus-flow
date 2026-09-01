import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface QuoteItem {
  id?: string;
  productId?: string;
  productName: string;
  specification: string;
  quantity: string;
  specialRemarks: string;
  imageUrl?: string;
  expectedDeliveryDate?: string;
  quoteDeadline?: string;
  vendorPrice?: string;
  vendorRemarks?: string;
  vendorImageUrl?: string;
}

export interface QuoteRequest {
  id: string;
  docId?: string;
  category: string;
  vendorId: string;
  status: 'pending' | 'submitted';
  createdAt: any;
  updatedAt?: any;
  
  // New array-based items
  items?: QuoteItem[];
  
  // Legacy fields for backward compatibility
  productId?: string;
  productName?: string;
  specification?: string;
  quantity?: string;
  specialRemarks?: string;
  vendorPrice?: string;
  vendorRemarks?: string;
  vendorImageUrl?: string;
  expectedDeliveryDate?: string;
  quoteDeadline?: string;
}

const getQuotesCollection = () => collection(db, 'quotes');

export const saveQuoteRequest = async (quoteData: Partial<QuoteRequest>) => {
  const finalData = Object.fromEntries(
    Object.entries(quoteData).filter(([_, v]) => v !== undefined)
  );
  const docRef = await addDoc(getQuotesCollection(), {
    ...finalData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const subscribeToQuotes = (callback: (quotes: QuoteRequest[]) => void) => {
  const q = query(getQuotesCollection(), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const quotes = snapshot.docs.map(doc => ({
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    })) as QuoteRequest[];
    callback(quotes);
  });
};

export const updateQuoteStatus = async (docId: string, updates: Partial<QuoteRequest>) => {
  await updateDoc(doc(db, 'quotes', docId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteQuoteRequest = async (docId: string) => {
  await deleteDoc(doc(db, 'quotes', docId));
};
