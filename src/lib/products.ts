import { collection, addDoc, updateDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { saveProductFile, deleteProductFile, saveVariantFile, deleteVariantFile } from './fileStorage';

export interface ProductVariant {
  id: string;
  name: string;
  size?: string;
  color?: string;
  colorCode?: string;
  price: string | number;
  originalPrice?: string | number;
  imageName?: string;
  imageData?: string;
  sku?: string;
}

export interface ProductDetails {
  productName?: string;
  specification?: string;
  price?: string; // keeping for backwards compatibility, but we might use totalUnitPrice/perUnitPrice
  vendorName?: string;
  vendorId?: string;
  details?: string;
  productImageName?: string;
  productImageData?: string;
  measuringMetric?: string;
  totalUnitPrice?: string;
  perUnitPrice?: string;
  category?: string;
}

export interface Product {
  id: string;
  docId?: string;
  name: string;
  specification?: string;
  price: string;
  salesRate?: number;
  vendorId: string;
  vendorName: string;
  details?: ProductDetails;
  category?: string;
  variants?: ProductVariant[];
  hasVariants?: boolean;
  createdAt: any;
}

const getProductsCollection = () => collection(db, 'products');

export const normalizeCategory = (cat?: string): string => {
  if (!cat) return '';
  return cat.trim().toLowerCase().replace(/['’]/g, '');
};

export const isCategoryMatch = (productCategory?: string, targetCategory?: string): boolean => {
  if (!targetCategory || targetCategory === 'All') return true;
  if (!productCategory) return false;
  if (productCategory === targetCategory) return true;
  
  const normProduct = normalizeCategory(productCategory);
  const normTarget = normalizeCategory(targetCategory);
  
  if (normProduct === normTarget) return true;

  // Workstation flexible matching: workstation, workstations, workstation's
  const isTargetWorkstation = normTarget.includes('workstation');
  const isProductWorkstation = normProduct.includes('workstation');
  if (isTargetWorkstation && isProductWorkstation) return true;

  return false;
};

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

export const saveProduct = async (productData: Partial<Product> & { productName?: string, productImageData?: string }) => {
  const finalData = removeUndefined(productData);
  const resolvedName = finalData.name || finalData.productName || 'Untitled Product';
  const resolvedCategory = finalData.category || finalData.details?.category || '';

  // Save variant images to IndexedDB if present
  if (Array.isArray(finalData.variants)) {
    for (const v of finalData.variants) {
      if (v.id && v.imageData) {
        await saveVariantFile(v.id, v.imageData);
      }
    }
  }

  const docRef = await addDoc(getProductsCollection(), {
    ...finalData,
    name: resolvedName,
    productName: resolvedName,
    category: resolvedCategory,
    variants: finalData.variants || [],
    hasVariants: Array.isArray(finalData.variants) && finalData.variants.length > 0,
    details: {
      ...finalData.details,
      productName: resolvedName,
      category: resolvedCategory
    },
    createdAt: serverTimestamp()
  });

  if (finalData.productImageData) {
    await saveProductFile(docRef.id, finalData.productImageData);
  }

  return docRef.id;
};

export const deleteProduct = async (docId: string, variants?: ProductVariant[]) => {
  await deleteDoc(doc(db, 'products', docId));
  await deleteProductFile(docId);
  if (variants && Array.isArray(variants)) {
    for (const v of variants) {
      if (v.id) {
        await deleteVariantFile(v.id);
      }
    }
  }
};

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      const q = query(getProductsCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const resolvedName = data.name || data.productName || 'Untitled Product';
          const resolvedCategory = data.category || data.details?.category || '';
          return {
            ...data,
            name: resolvedName,
            category: resolvedCategory,
            variants: data.variants || [],
            hasVariants: Boolean(data.variants && data.variants.length > 0),
            id: data.id || docSnap.id,
            docId: docSnap.id
          };
        }) as Product[];
        callback(products);
      }, (error) => {
        console.warn("Error fetching products:", error);
        callback([]);
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

export const updateProductData = async (docId: string, productData: Partial<Product> & { productName?: string, productImageData?: string }) => {
  const finalData = removeUndefined(productData);
  const resolvedName = finalData.name || finalData.productName;
  const resolvedCategory = finalData.category || finalData.details?.category;
  
  // Save variant images to IndexedDB if present
  if (Array.isArray(finalData.variants)) {
    for (const v of finalData.variants) {
      if (v.id && v.imageData) {
        await saveVariantFile(v.id, v.imageData);
      }
    }
  }

  const updates: any = { ...finalData };
  if (resolvedName) {
    updates.name = resolvedName;
    updates.productName = resolvedName;
  }
  if (resolvedCategory) {
    updates.category = resolvedCategory;
  }
  if (finalData.variants !== undefined) {
    updates.variants = finalData.variants;
    updates.hasVariants = Array.isArray(finalData.variants) && finalData.variants.length > 0;
  }
  if (updates.details) {
    updates.details = {
      ...updates.details,
      ...(resolvedName ? { productName: resolvedName } : {}),
      ...(resolvedCategory ? { category: resolvedCategory } : {})
    };
  }
  
  await updateDoc(doc(db, 'products', docId), updates);
  
  if (finalData.productImageData) {
    await saveProductFile(docId, finalData.productImageData);
  }

  return docId;
};

