import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { subscribeToProducts, deleteProduct, saveProduct, updateProductData, Product, parsePriceNumber, resolveVariantPriceMode } from '../lib/products';
import { subscribeToVendors, Vendor } from '../lib/vendors';
import { NewProductModal } from '../components/NewProductModal';
import { ProductDetailModal } from '../components/ProductDetailModal';

export function ProductsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  useEffect(() => {
    const unsubProducts = subscribeToProducts(setProducts);
    const unsubVendors = subscribeToVendors(setVendors);
    return () => {
      unsubProducts();
      unsubVendors();
    };
  }, []);

  const handleAddProduct = async (productData: any) => {
    try {
      const normalizedData = {
        ...productData,
        name: productData.name || productData.productName || 'Untitled Product',
        productName: productData.name || productData.productName || 'Untitled Product'
      };
      if (selectedProduct && selectedProduct.docId) {
        await updateProductData(selectedProduct.docId, normalizedData);
      } else {
        await saveProduct(normalizedData);
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !productToDelete.docId) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.docId, productToDelete.variants);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setIsDeleting(false);
    }
  };


  const filteredProducts = products.filter(p => {
    const pName = (p.name || (p as any).productName || '').toLowerCase();
    const pCat = (p.category || p.details?.category || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return pName.includes(q) || pCat.includes(q);
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Products Catalog</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage all products and catalog items</p>
        </div>
        <button 
          onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map(product => (
                <tr key={product.docId || product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => setSelectedProductForDetail(product)}
                      className="flex items-center cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mr-3 overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all">
                         {product.details?.productImageData ? (
                           <img src={product.details.productImageData} alt={product.name} className="w-full h-full object-cover" />
                         ) : (
                           <Package className="w-5 h-5 text-slate-400" />
                         )}
                      </div>
                      <div className="flex flex-col max-w-md">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{product.name || (product as any).productName || 'Untitled'}</span>
                          {product.variants && product.variants.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {product.variants.length} variants
                            </span>
                          )}
                          {product.images && product.images.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              📷 {product.images.length} photos
                            </span>
                          )}
                          {product.images && product.images.length >= 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              📐 {product.images.length} Angles
                            </span>
                          )}
                        </div>

                        {/* Structured Specs or Typed Product Description */}
                        {(() => {
                          const specs = product.specifications || product.details?.specifications || [];
                          if (specs.length > 0) {
                            const specLine = specs
                              .filter(s => s.label && s.value)
                              .map(s => `${s.label}: ${s.value}`)
                              .join(' · ');
                            if (specLine) {
                              return (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={specLine}>
                                  {specLine}
                                </p>
                              );
                            }
                          }
                          const typedDesc = product.description || product.details?.details || product.details?.description;
                          if (typedDesc) {
                            return (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={typedDesc}>
                                {typedDesc}
                              </p>
                            );
                          }
                          return null;
                        })()}

                        {/* Color & Variant Options with Individual Prices */}
                        {product.variants && product.variants.length > 0 && (() => {
                          const baseNum = product.salesRate || parsePriceNumber(product.price || product.details?.perUnitPrice || product.details?.totalUnitPrice) || 0;
                          return (
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                              {product.variants.slice(0, 4).map((v, vi) => {
                                const vPrice = parsePriceNumber(v.price);
                                const vMode = resolveVariantPriceMode(v, baseNum);
                                return (
                                  <span key={vi} className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium text-slate-700">
                                    {v.colorCode && <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: v.colorCode }} />}
                                    <span>{v.color || v.size || v.name}</span>
                                    {vPrice > 0 && (
                                      <span className="text-indigo-600 font-bold">
                                        {vMode === 'addon' ? '+₹' : '₹'}{vPrice.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                              {product.variants.length > 4 && <span className="text-[10px] font-semibold text-slate-400">+{product.variants.length - 4} more</span>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {product.category || product.details?.category || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                    {(() => {
                      const baseNum = product.salesRate || parsePriceNumber(product.price || product.details?.perUnitPrice || product.details?.totalUnitPrice) || 0;
                      const totalPrices = (product.variants || [])
                        .filter(v => resolveVariantPriceMode(v, baseNum) === 'total')
                        .map(v => parsePriceNumber(v.price))
                        .filter(p => p > 0);
                      if (totalPrices.length > 0) {
                        return (
                          <div>
                            <span className="text-xs text-slate-400 font-normal">From </span>
                            ₹{Math.min(...totalPrices).toLocaleString()}
                          </div>
                        );
                      }
                      return baseNum > 0 ? `₹${baseNum.toLocaleString()}` : (product.price || '-');
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.vendorName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedProductForDetail(product)}
                      title="View Product Page & Description"
                      className="text-slate-500 hover:text-indigo-600 mr-3.5 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }}
                      title="Edit Product"
                      className="text-indigo-600 hover:text-indigo-900 mr-3.5 p-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product)}
                      title="Delete Product"
                      className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewProductModal 
        mode="catalog"
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
        vendors={vendors}
        onAddProduct={handleAddProduct}
        initialData={selectedProduct}
      />

      <ProductDetailModal 
        isOpen={!!selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        product={selectedProductForDetail}
        vendor={selectedProductForDetail?.vendorId ? vendors.find(v => v.id === selectedProductForDetail.vendorId) || null : null}
      />

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Delete Product?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to delete <strong className="text-slate-900 font-bold">"{productToDelete.name || (productToDelete as any).productName}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
