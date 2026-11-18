import { collection, addDoc, updateDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
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
  deleteProduct360,
  compressDataUrl
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
  priceMode?: 'total' | 'addon';
  originalPrice?: string | number;
  imageName?: string;
  imageData?: string;
  sku?: string;
}

export const parsePriceNumber = (val: string | number | undefined | null): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const resolveVariantPriceMode = (
  variant: ProductVariant,
  baseProductPrice: number
): 'total' | 'addon' => {
  if (variant.priceMode === 'total' || variant.priceMode === 'addon') {
    return variant.priceMode;
  }
  const vType = variant.variantType;
  if (vType === 'side_storage' || vType === 'electric' || variant.sideStorage || variant.electricOption) {
    return 'addon';
  }
  if (vType === 'size' || (variant.size && vType !== 'custom')) {
    return 'total';
  }
  if (vType === 'color' || ((variant.colorCode || variant.color) && vType !== 'custom')) {
    return 'total';
  }
  const vPrice = parsePriceNumber(variant.price);
  if (vPrice > 0 && (baseProductPrice <= 0 || vPrice >= baseProductPrice * 0.6)) {
    return 'total';
  }
  return 'addon';
};

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductDetails {
  productName?: string;
  specification?: string;
  specifications?: ProductSpecification[];
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
  specifications?: ProductSpecification[];
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
  thumbnailData?: string;
  mediaSyncedAt?: string;
  images?: string[];
  spin360Images?: string[];
  createdAt: any;
}

const getProductsCollection = () => collection(db, 'products');

export interface LoadedProductMedia {
  primaryImage?: string;
  images: string[];
  spin360Images: string[];
  variantImages: Record<string, string>;
}

const productMediaCache = new Map<string, LoadedProductMedia>();
const productMediaInflight = new Map<string, Promise<LoadedProductMedia>>();
const syncedProductMediaIds = new Set<string>();

async function ensureFirestoreSafeDataUrl(
  dataUrl: string,
  maxWidth = 800,
  quality = 0.74
): Promise<string | undefined> {
  if (!dataUrl || typeof dataUrl !== 'string') return undefined;
  let current = dataUrl;
  if (current.length > 520_000 && current.startsWith('data:image')) {
    current = await compressDataUrl(current, maxWidth, quality);
  }
  if (current.length > 720_000 && current.startsWith('data:image')) {
    current = await compressDataUrl(current, Math.min(540, maxWidth), 0.62);
  }
  if (current.length > 850_000 && current.startsWith('data:image')) {
    current = await compressDataUrl(current, 420, 0.52);
  }
  return current.length <= 900_000 ? current : undefined;
}

async function buildCompactThumbnail(source?: string): Promise<string | undefined> {
  if (!source || typeof source !== 'string') return undefined;
  if (!source.startsWith('data:image')) {
    return source.length <= 2000 ? source : undefined;
  }
  let thumb = await compressDataUrl(source, 480, 0.68);
  if (thumb.length > 260_000) {
    thumb = await compressDataUrl(thumb, 340, 0.56);
  }
  return thumb.length <= 320_000 ? thumb : undefined;
}

async function syncProductMediaToFirestore(
  productId: string,
  payload: {
    primaryImage?: string;
    images?: string[];
    spin360Images?: string[];
    variants?: ProductVariant[];
  }
): Promise<void> {
  if (!productId) return;
  const mediaCol = collection(db, 'products', productId, 'media');
  const nowIso = new Date().toISOString();
  const writes: Promise<void>[] = [];

  const firstVariantImg = (payload.variants || []).find(v => v?.imageData)?.imageData;
  const primaryCandidate = payload.primaryImage || payload.images?.[0] || firstVariantImg;

  if (primaryCandidate) {
    const safePrimary = await ensureFirestoreSafeDataUrl(primaryCandidate, 880, 0.76);
    if (safePrimary) {
      writes.push(
        setDoc(doc(mediaCol, 'primary'), {
          kind: 'primary',
          dataUrl: safePrimary,
          updatedAt: nowIso
        })
      );
    }
  }

  const gallery = (payload.images || []).filter(Boolean).slice(0, 12);
  for (let idx = 0; idx < gallery.length; idx++) {
    const safeImg = await ensureFirestoreSafeDataUrl(gallery[idx], 880, 0.75);
    if (safeImg) {
      writes.push(
        setDoc(doc(mediaCol, `gallery_${idx}`), {
          kind: 'gallery',
          index: idx,
          dataUrl: safeImg,
          updatedAt: nowIso
        })
      );
    }
  }

  for (const v of payload.variants || []) {
    if (v?.id && v.imageData) {
      const safeVarImg = await ensureFirestoreSafeDataUrl(v.imageData, 800, 0.75);
      if (safeVarImg) {
        writes.push(
          setDoc(doc(mediaCol, `variant_${v.id}`), {
            kind: 'variant',
            variantId: v.id,
            dataUrl: safeVarImg,
            updatedAt: nowIso
          })
        );
      }
    }
  }

  const spin = (payload.spin360Images || []).filter(Boolean).slice(0, 24);
  for (let idx = 0; idx < spin.length; idx++) {
    const safeSpin = await ensureFirestoreSafeDataUrl(spin[idx], 640, 0.65);
    if (safeSpin) {
      writes.push(
        setDoc(doc(mediaCol, `spin_${idx}`), {
          kind: 'spin360',
          index: idx,
          dataUrl: safeSpin,
          updatedAt: nowIso
        })
      );
    }
  }

  const results = await Promise.allSettled(writes);
  const failedWrites = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failedWrites.length > 0) {
    console.warn(`Some product media docs failed to write (${failedWrites.length}):`, failedWrites[0].reason);
  }

  // Update cached memory map immediately, preserving unpassed sections on partial updates
  const existingCached = productMediaCache.get(productId);
  const variantMap: Record<string, string> = { ...(existingCached?.variantImages || {}) };
  for (const v of payload.variants || []) {
    if (v?.id && v.imageData) variantMap[v.id] = v.imageData;
  }
  productMediaCache.set(productId, {
    primaryImage: primaryCandidate || existingCached?.primaryImage,
    images: gallery.length > 0 ? gallery : (existingCached?.images || []),
    spin360Images: spin.length > 0 ? spin : (existingCached?.spin360Images || []),
    variantImages: variantMap
  });
}

export async function loadProductMediaFromFirestore(
  productId?: string,
  forceRefresh = false
): Promise<LoadedProductMedia> {
  const empty: LoadedProductMedia = { images: [], spin360Images: [], variantImages: {} };
  if (!productId) return empty;
  if (!forceRefresh && productMediaCache.has(productId)) {
    return productMediaCache.get(productId)!;
  }
  if (!forceRefresh && productMediaInflight.has(productId)) {
    return productMediaInflight.get(productId)!;
  }

  const task = (async (): Promise<LoadedProductMedia> => {
    try {
      const snap = await getDocs(collection(db, 'products', productId, 'media'));
      let primaryImage: string | undefined;
      const galleryEntries: { index: number; dataUrl: string }[] = [];
      const spinEntries: { index: number; dataUrl: string }[] = [];
      const variantImages: Record<string, string> = {};

      snap.forEach((d) => {
        const data = d.data() as any;
        if (!data?.dataUrl) return;
        if (data.kind === 'primary' || d.id === 'primary') {
          primaryImage = data.dataUrl;
        } else if (data.kind === 'gallery' || d.id.startsWith('gallery_')) {
          const idx = typeof data.index === 'number' ? data.index : parseInt(d.id.replace('gallery_', ''), 10) || 0;
          galleryEntries.push({ index: idx, dataUrl: data.dataUrl });
        } else if (data.kind === 'variant' || d.id.startsWith('variant_')) {
          const vid = data.variantId || d.id.replace('variant_', '');
          if (vid) {
            variantImages[vid] = data.dataUrl;
          }
        } else if (data.kind === 'spin360' || d.id.startsWith('spin_')) {
          const idx = typeof data.index === 'number' ? data.index : parseInt(d.id.replace('spin_', ''), 10) || 0;
          spinEntries.push({ index: idx, dataUrl: data.dataUrl });
        }
      });

      galleryEntries.sort((a, b) => a.index - b.index);
      spinEntries.sort((a, b) => a.index - b.index);
      const images = galleryEntries.map(g => g.dataUrl);
      const spin360Images = spinEntries.map(s => s.dataUrl);

      if (!primaryImage && images.length > 0) {
        primaryImage = images[0];
      }

      // Warm local IndexedDB cache asynchronously
      if (primaryImage) {
        saveProductFile(productId, primaryImage).catch(() => {});
      }
      if (images.length > 0) {
        saveProductImages(productId, images).catch(() => {});
      }
      if (spin360Images.length > 0) {
        saveProduct360(productId, spin360Images).catch(() => {});
      }
      for (const [vid, dataUrl] of Object.entries(variantImages)) {
        saveVariantFile(vid, dataUrl).catch(() => {});
      }

      const result: LoadedProductMedia = { primaryImage, images, spin360Images, variantImages };
      productMediaCache.set(productId, result);
      return result;
    } catch (err) {
      console.warn('Could not load product media from Firestore:', err);
      return empty;
    } finally {
      productMediaInflight.delete(productId);
    }
  })();

  productMediaInflight.set(productId, task);
  return task;
}

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
  const cleanSpecs: ProductSpecification[] = Array.isArray(finalData.specifications)
    ? finalData.specifications
        .filter((s: any) => s && (String(s.label || '').trim() || String(s.value || '').trim()))
        .map((s: any) => ({
          label: String(s.label || '').trim(),
          value: String(s.value || '').trim(),
        }))
    : [];

  const firstVariantImage = (finalData.variants || []).find((v: any) => v?.imageData)?.imageData;
  const thumbnailData = await buildCompactThumbnail(primaryImage || multiImages[0] || firstVariantImage);
  const hasAnyMedia = Boolean(primaryImage || multiImages.length > 0 || spin360Frames.length > 0 || (finalData.variants || []).some((v: any) => v?.imageData));

  const docRef = doc(getProductsCollection());

  // 4. Save heavy images to IndexedDB + Firestore media subcollection FIRST so onSnapshot consumers see them immediately
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

  if (hasAnyMedia) {
    syncedProductMediaIds.add(docRef.id);
    await syncProductMediaToFirestore(docRef.id, {
      primaryImage,
      images: multiImages,
      spin360Images: spin360Frames,
      variants: finalData.variants || []
    });
  }

  await setDoc(docRef, {
    ...docPayload,
    name: resolvedName,
    productName: resolvedName,
    category: resolvedCategory,
    description: resolvedDescription,
    specifications: cleanSpecs,
    variants: cleanVariants,
    hasVariants: cleanVariants.length > 0,
    ...(thumbnailData ? { thumbnailData } : {}),
    ...(hasAnyMedia ? { mediaSyncedAt: new Date().toISOString() } : {}),
    details: {
      ...cleanDetails,
      productName: resolvedName,
      category: resolvedCategory,
      details: resolvedDescription,
      description: resolvedDescription,
      specifications: cleanSpecs,
    },
    imageCount: multiImages.length,
    hasSpin360: spin360Frames.length > 0,
    createdAt: serverTimestamp()
  });

  return docRef.id;
};

export const deleteProduct = async (docId: string, variants?: ProductVariant[]) => {
  try {
    const mediaSnap = await getDocs(collection(db, 'products', docId, 'media'));
    await Promise.allSettled(mediaSnap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    console.warn("Could not clean up product media subcollection:", err);
  }
  productMediaCache.delete(docId);
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

          // Load primary product image from IndexedDB or Firestore thumbnailData
          let primaryImg = data.productImageData;
          if (!primaryImg) {
            try {
              const loadedPrimary = await getProductFile(docSnap.id);
              if (loadedPrimary) primaryImg = loadedPrimary;
            } catch (err) {}
          }
          if (!primaryImg && data.thumbnailData) {
            primaryImg = data.thumbnailData;
          }
          if (!primaryImg && images.length > 0) {
            primaryImg = images[0];
          }
          if (images.length === 0 && primaryImg) {
            images = [primaryImg];
          }

          // Load variant images from IndexedDB or in-memory media cache if present
          const cachedMedia = productMediaCache.get(docSnap.id);
          const variantsWithImages = await Promise.all((data.variants || []).map(async (v: any) => {
            if (v && v.id && !v.imageData) {
              if (cachedMedia?.variantImages?.[v.id]) {
                return { ...v, imageData: cachedMedia.variantImages[v.id] };
              }
              try {
                const vImg = await getVariantFile(v.id);
                if (vImg) return { ...v, imageData: vImg };
              } catch (err) {
                console.warn("Could not load variant image:", err);
              }
            }
            return v;
          }));

          // Background one-time migration: if local browser has images that aren't in Firestore yet, sync them up
          const hasLocalMedia = Boolean(primaryImg || images.length > 0 || variantsWithImages.some((v: any) => Boolean(v?.imageData)));
          if (hasLocalMedia && !data.thumbnailData && !data.mediaSyncedAt && !syncedProductMediaIds.has(docSnap.id)) {
            syncedProductMediaIds.add(docSnap.id);
            (async () => {
              try {
                const firstVarImg = variantsWithImages.find((v: any) => v?.imageData)?.imageData;
                const thumb = await buildCompactThumbnail(primaryImg || images[0] || firstVarImg);
                await syncProductMediaToFirestore(docSnap.id, {
                  primaryImage: primaryImg,
                  images: images,
                  spin360Images: spin360Images,
                  variants: variantsWithImages
                });
                await updateDoc(doc(db, 'products', docSnap.id), {
                  ...(thumb ? { thumbnailData: thumb } : {}),
                  mediaSyncedAt: new Date().toISOString()
                });
              } catch (syncErr) {
                console.warn('Background media sync skipped:', syncErr);
              }
            })();
          }

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
  if (Array.isArray(finalData.specifications)) {
    updates.specifications = finalData.specifications
      .filter((s: any) => s && (String(s.label || '').trim() || String(s.value || '').trim()))
      .map((s: any) => ({
        label: String(s.label || '').trim(),
        value: String(s.value || '').trim(),
      }));
  }
  if (updates.details) {
    const cleanDetails = { ...updates.details };
    delete cleanDetails.productImageData;
    delete cleanDetails.images;
    updates.details = {
      ...cleanDetails,
      ...(resolvedName ? { productName: resolvedName } : {}),
      ...(resolvedCategory ? { category: resolvedCategory } : {}),
      ...(resolvedDescription !== undefined ? { details: resolvedDescription, description: resolvedDescription } : {}),
      ...(Array.isArray(updates.specifications) ? { specifications: updates.specifications } : {}),
    };
  }
  
  const firstVariantImage = (finalData.variants || []).find((v: any) => v?.imageData)?.imageData;
  const thumbnailData = await buildCompactThumbnail(primaryImage || multiImages[0] || firstVariantImage);
  const hasAnyMedia = Boolean(primaryImage || multiImages.length > 0 || spin360Frames.length > 0 || (finalData.variants || []).some((v: any) => v?.imageData));

  if (thumbnailData) {
    updates.thumbnailData = thumbnailData;
  }
  if (hasAnyMedia) {
    updates.mediaSyncedAt = new Date().toISOString();
  }
  if (finalData.images !== undefined) {
    updates.imageCount = multiImages.length;
  }

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

  if (hasAnyMedia) {
    syncedProductMediaIds.add(docId);
    await syncProductMediaToFirestore(docId, {
      primaryImage,
      images: multiImages,
      spin360Images: spin360Frames,
      variants: finalData.variants || []
    });
  }

  await updateDoc(doc(db, 'products', docId), updates);

  return docId;
};

