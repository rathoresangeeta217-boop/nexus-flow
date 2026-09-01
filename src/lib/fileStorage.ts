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

