import { collection, addDoc, updateDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  saveProductFile, 
  deleteProductFile, 
  saveVariantFile, 
  deleteVariantFile,
  saveProductImages,
  getProductImages,
  deleteProductImages,
  saveProduct360,
  getProduct360,
  deleteProduct360
} from './fileStorage';

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
  description?: string;
  productImageName?: string;
  productImageData?: string;
  images?: string[];
  spin360Images?: string[];
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
  description?: string;
  price: string;
  salesRate?: number;
  vendorId: string;
  vendorName: string;
  details?: ProductDetails;
  category?: string;
  variants?: ProductVariant[];
  hasVariants?: boolean;
  images?: string[];
  spin360Images?: string[];
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
  const resolvedDescription = finalData.description || finalData.details?.details || finalData.details?.description || '';

  // Save variant images to IndexedDB if present
  if (Array.isArray(finalData.variants)) {
    for (const v of finalData.variants) {
      if (v.id && v.imageData) {
        await saveVariantFile(v.id, v.imageData);
      }
    }
  }

  // Separate heavy images from Firestore doc payload if needed
  const multiImages = finalData.images || [];
  const spin360Frames = finalData.spin360Images || [];

  const docRef = await addDoc(getProductsCollection(), {
    ...finalData,
    name: resolvedName,
    productName: resolvedName,
    category: resolvedCategory,
    description: resolvedDescription,
    variants: finalData.variants || [],
    hasVariants: Array.isArray(finalData.variants) && finalData.variants.length > 0,
    details: {
      ...finalData.details,
      productName: resolvedName,
      category: resolvedCategory,
      details: resolvedDescription,
      description: resolvedDescription
    },
    // Keep lightweight indicator of multi-images count in Firestore
    imageCount: multiImages.length,
    hasSpin360: spin360Frames.length > 0,
    createdAt: serverTimestamp()
  });

  if (finalData.productImageData) {
    await saveProductFile(docRef.id, finalData.productImageData);
  }

  if (multiImages.length > 0) {
    await saveProductImages(docRef.id, multiImages);
  }

  if (spin360Frames.length > 0) {
    await saveProduct360(docRef.id, spin360Frames);
  }

  return docRef.id;
};

export const deleteProduct = async (docId: string, variants?: ProductVariant[]) => {
  await deleteDoc(doc(db, 'products', docId));
  await deleteProductFile(docId);
  await deleteProductImages(docId);
  await deleteProduct360(docId);
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
      unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
        const products = await Promise.all(snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          const resolvedName = data.name || data.productName || 'Untitled Product';
          const resolvedCategory = data.category || data.details?.category || '';
          const resolvedDescription = data.description || data.details?.details || data.details?.description || '';

          // Load multiple images and 360 frames from IndexedDB if not directly in doc
          let images = data.images || [];
          let spin360Images = data.spin360Images || [];

          if (images.length === 0) {
            try {
              const loaded = await getProductImages(docSnap.id);
              if (loaded && loaded.length > 0) images = loaded;
            } catch (err) {
              console.warn("Could not load product images from cache:", err);
            }
          }

          if (spin360Images.length === 0) {
            try {
              const loaded360 = await getProduct360(docSnap.id);
              if (loaded360 && loaded360.length > 0) spin360Images = loaded360;
            } catch (err) {
              console.warn("Could not load 360 spin frames from cache:", err);
            }
          }

          return {
            ...data,
            name: resolvedName,
            category: resolvedCategory,
            description: resolvedDescription,
            variants: data.variants || [],
            hasVariants: Boolean(data.variants && data.variants.length > 0),
            images,
            spin360Images,
            id: data.id || docSnap.id,
            docId: docSnap.id
          };
        })) as Product[];
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
  const resolvedDescription = finalData.description || finalData.details?.details || finalData.details?.description;
  
  // Save variant images to IndexedDB if present
  if (Array.isArray(finalData.variants)) {
    for (const v of finalData.variants) {
      if (v.id && v.imageData) {
        await saveVariantFile(v.id, v.imageData);
      }
    }
  }

  const multiImages = finalData.images || [];
  const spin360Frames = finalData.spin360Images || [];

  const updates: any = { ...finalData };
  if (resolvedName) {
    updates.name = resolvedName;
    updates.productName = resolvedName;
  }
  if (resolvedCategory) {
    updates.category = resolvedCategory;
  }
  if (resolvedDescription !== undefined) {
    updates.description = resolvedDescription;
  }
  if (finalData.variants !== undefined) {
    updates.variants = finalData.variants;
    updates.hasVariants = Array.isArray(finalData.variants) && finalData.variants.length > 0;
  }
  if (updates.details) {
    updates.details = {
      ...updates.details,
      ...(resolvedName ? { productName: resolvedName } : {}),
      ...(resolvedCategory ? { category: resolvedCategory } : {}),
      ...(resolvedDescription !== undefined ? { details: resolvedDescription, description: resolvedDescription } : {})
    };
  }
  
  await updateDoc(doc(db, 'products', docId), updates);
  
  if (finalData.productImageData) {
    await saveProductFile(docId, finalData.productImageData);
  }

  if (multiImages.length > 0) {
    await saveProductImages(docId, multiImages);
  }

  if (spin360Frames.length > 0) {
    await saveProduct360(docId, spin360Frames);
  }

  return docId;
};

