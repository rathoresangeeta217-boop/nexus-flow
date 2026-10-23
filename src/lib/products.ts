import { collection, addDoc, updateDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  saveProductFile, 
  getProductFile,
  deleteProductFile, 
  saveVariantFile, 
  getVariantFile,
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
  variantType?: 'color' | 'size' | 'side_storage' | 'electric' | 'custom' | string;
  groupName?: string;
  name: string;
  size?: string;
  color?: string;
  colorCode?: string;
  sideStorage?: string;
  electricOption?: string;
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
  productName?: string;
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
  productImageData?: string;
  images?: string[];
  spin360Images?: string[];
  createdAt: any;
}

const getProductsCollection = () => collection(db, 'products');

export const normalizeCategory = (cat?: string): string => {
  if (!cat) return '';
  return cat.trim().toLowerCase().replace(/['’]/g, '');
};

export const deduplicateCategories = (catList: (string | undefined | null)[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of catList) {
    if (!cat) continue;
    const trimmed = cat.trim();
    const norm = normalizeCategory(trimmed);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(trimmed);
    }
  }
  return result;
};

export const isCategoryMatch = (productCategory?: string, targetCategory?: string): boolean => {
  if (!targetCategory || targetCategory === 'All') return true;
  if (!productCategory) return false;
  if (productCategory === targetCategory) return true;
  
  const normProduct = normalizeCategory(productCategory);
  const normTarget = normalizeCategory(targetCategory);
  
  if (normProduct === normTarget) return true;

  // Workstation flexible matching: workstation, workstations, workstation's
  if (normTarget.includes('workstation') && normProduct.includes('workstation')) return true;

  // Reception flexible matching: reception, receptions, reception table, reception's
  if (normTarget.includes('reception') && normProduct.includes('reception')) return true;

  // Seating flexible matching: seating, sitting, seating series, sitting series
  if ((normTarget.includes('seating') || normTarget.includes('sitting')) && 
      (normProduct.includes('seating') || normProduct.includes('sitting'))) return true;

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

  // 1. Save variant images to IndexedDB and create lightweight variants for Firestore
  const cleanVariants = await Promise.all((finalData.variants || []).map(async (v: any) => {
    if (v.id && v.imageData) {
      try {
        await saveVariantFile(v.id, v.imageData);
      } catch (err) {
        console.warn("Error saving variant file to IndexedDB:", err);
      }
    }
    const { imageData, ...lightweightVariant } = v;
    return lightweightVariant;
  }));

  // 2. Extract heavy image data
  const multiImages = finalData.images || [];
  const spin360Frames = finalData.spin360Images || [];
  const primaryImage = finalData.productImageData;

  // 3. Omit heavy Base64 images from Firestore doc payload to stay strictly under 1MB limit
  const {
    productImageData,
    images,
    spin360Images,
    variants,
    ...docPayload
  } = finalData;

  const cleanDetails = { ...finalData.details };
  delete cleanDetails.productImageData;
  delete cleanDetails.images;

  const docRef = await addDoc(getProductsCollection(), {
    ...docPayload,
    name: resolvedName,
    productName: resolvedName,
    category: resolvedCategory,
    description: resolvedDescription,
    variants: cleanVariants,
    hasVariants: cleanVariants.length > 0,
    details: {
      ...cleanDetails,
      productName: resolvedName,
      category: resolvedCategory,
      details: resolvedDescription,
      description: resolvedDescription
    },
    imageCount: multiImages.length,
    hasSpin360: spin360Frames.length > 0,
    createdAt: serverTimestamp()
  });

  // 4. Save heavy images to IndexedDB
  if (primaryImage) {
    try {
      await saveProductFile(docRef.id, primaryImage);
    } catch (err) {
      console.warn("Error saving product file to IndexedDB:", err);
    }
  }

  if (multiImages.length > 0) {
    try {
      await saveProductImages(docRef.id, multiImages);
    } catch (err) {
      console.warn("Error saving product images to IndexedDB:", err);
    }
  }

  if (spin360Frames.length > 0) {
    try {
      await saveProduct360(docRef.id, spin360Frames);
    } catch (err) {
      console.warn("Error saving 360 frames to IndexedDB:", err);
    }
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

          // Load primary product image from IndexedDB if not directly in doc
          let primaryImg = data.productImageData;
          if (!primaryImg) {
            try {
              const loadedPrimary = await getProductFile(docSnap.id);
              if (loadedPrimary) primaryImg = loadedPrimary;
            } catch (err) {}
          }

          // Load variant images from IndexedDB if present
          const variantsWithImages = await Promise.all((data.variants || []).map(async (v: any) => {
            if (v && v.id && !v.imageData) {
              try {
                const vImg = await getVariantFile(v.id);
                if (vImg) return { ...v, imageData: vImg };
              } catch (err) {
                console.warn("Could not load variant image:", err);
              }
            }
            return v;
          }));

          const productItem: Product = {
            id: data.id || docSnap.id,
            docId: docSnap.id,
            name: resolvedName,
            category: resolvedCategory,
            description: resolvedDescription,
            price: data.price || data.details?.price || data.totalUnitPrice || '0',
            vendorId: data.vendorId || '',
            vendorName: data.vendorName || '',
            createdAt: data.createdAt || null,
            ...data,
            productImageData: primaryImg,
            variants: variantsWithImages,
            hasVariants: Boolean(variantsWithImages && variantsWithImages.length > 0),
            images,
            spin360Images
          };
          return productItem;
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
  
  // 1. Save variant images to IndexedDB and create clean variants for Firestore
  let cleanVariants: any[] | undefined = undefined;
  if (Array.isArray(finalData.variants)) {
    cleanVariants = await Promise.all(finalData.variants.map(async (v: any) => {
      if (v.id && v.imageData) {
        try {
          await saveVariantFile(v.id, v.imageData);
        } catch (err) {
          console.warn("Error saving variant file to IndexedDB:", err);
        }
      }
      const { imageData, ...lightweightVariant } = v;
      return lightweightVariant;
    }));
  }

  const multiImages = finalData.images || [];
  const spin360Frames = finalData.spin360Images || [];
  const primaryImage = finalData.productImageData;

  const {
    productImageData,
    images,
    spin360Images,
    variants,
    ...updates
  } = finalData;

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
  if (cleanVariants !== undefined) {
    updates.variants = cleanVariants;
    updates.hasVariants = cleanVariants.length > 0;
  }
  if (updates.details) {
    const cleanDetails = { ...updates.details };
    delete cleanDetails.productImageData;
    delete cleanDetails.images;
    updates.details = {
      ...cleanDetails,
      ...(resolvedName ? { productName: resolvedName } : {}),
      ...(resolvedCategory ? { category: resolvedCategory } : {}),
      ...(resolvedDescription !== undefined ? { details: resolvedDescription, description: resolvedDescription } : {})
    };
  }
  
  await updateDoc(doc(db, 'products', docId), updates);
  
  if (primaryImage) {
    try {
      await saveProductFile(docId, primaryImage);
    } catch (err) {}
  }

  if (multiImages.length > 0) {
    try {
      await saveProductImages(docId, multiImages);
    } catch (err) {}
  }

  if (spin360Frames.length > 0) {
    try {
      await saveProduct360(docId, spin360Frames);
    } catch (err) {}
  }

  return docId;
};

