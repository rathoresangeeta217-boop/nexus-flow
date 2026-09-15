import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { subscribeToProducts, deleteProduct, saveProduct, updateProductData, Product } from '../lib/products';
import { subscribeToVendors, Vendor } from '../lib/vendors';
import { NewProductModal } from '../components/NewProductModal';

export function ProductsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
      if (selectedProduct && selectedProduct.docId) {
        await updateProductData(selectedProduct.docId, productData);
      } else {
        await saveProduct(productData);
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDeleteProduct = async (docId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(docId);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center mr-3 overflow-hidden">
                         {product.details?.productImageData ? (
                           <img src={product.details.productImageData} alt={product.name} className="w-full h-full object-cover" />
                         ) : (
                           <Package className="w-5 h-5 text-slate-400" />
                         )}
                      </div>
                      <span className="font-semibold text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.category || product.details?.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.price || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.vendorName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => product.docId && handleDeleteProduct(product.docId)}
                      className="text-red-600 hover:text-red-900"
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
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
        vendors={vendors}
        onAddProduct={handleAddProduct}
        initialData={selectedProduct}
      />
    </div>
  );
}
