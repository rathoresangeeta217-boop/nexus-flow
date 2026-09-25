import { set, get, del } from 'idb-keyval';

export async function saveOrderFiles(orderId: string, files: { quotationFileData?: string, poFileData?: string, drawingFileData?: string, ocFileData?: string }) {
  await set(`order_files_${orderId}`, files);
}

export async function getOrderFiles(orderId: string) {
  return await get(`order_files_${orderId}`) || {};
}

export async function deleteOrderFiles(orderId: string) {
  await del(`order_files_${orderId}`);
}

export async function savePurchaseFile(purchaseId: string, fileData: string) {
  await set(`purchase_file_${purchaseId}`, fileData);
}

export async function getPurchaseFile(purchaseId: string) {
  return await get(`purchase_file_${purchaseId}`);
}

export async function deletePurchaseFile(purchaseId: string) {
  await del(`purchase_file_${purchaseId}`);
}

export async function saveProductFile(productId: string, fileData: string) {
  await set(`product_file_${productId}`, fileData);
}

export async function getProductFile(productId: string) {
  return await get(`product_file_${productId}`);
}

export async function deleteProductFile(productId: string) {
  await del(`product_file_${productId}`);
}

export async function saveVariantFile(variantId: string, fileData: string) {
  await set(`variant_file_${variantId}`, fileData);
}

export async function getVariantFile(variantId: string) {
  return await get(`variant_file_${variantId}`);
}

export async function deleteVariantFile(variantId: string) {
  await del(`variant_file_${variantId}`);
}

export async function compressImageFile(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


