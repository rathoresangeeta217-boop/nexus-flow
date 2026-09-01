import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { updateQuoteStatus, QuoteRequest } from '../lib/quotes';

interface EditQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRequest | null;
  products: Product[];
  vendors: Vendor[];
}

export function EditQuoteModal({ isOpen, onClose, quote, products, vendors }: EditQuoteModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (quote && isOpen) {
      setCategory(quote.category || '');
      const quoteItems = quote.items && quote.items.length > 0 ? quote.items : [quote];
      setItems(quoteItems.map((item: any) => ({
        id: Math.random().toString(),
        productId: item.productId || '',
        productName: item.productName || '',
        specification: item.specification || '',
        quantity: item.quantity || '',
        specialRemarks: item.specialRemarks || '',
        expectedDeliveryDate: item.expectedDeliveryDate || '',
        quoteDeadline: item.quoteDeadline || '',
        imageUrl: item.imageUrl || '',
        // Vendor info isn't editable here, but we preserve it in the payload later if needed
        vendorPrice: item.vendorPrice || '',
        vendorRemarks: item.vendorRemarks || '',
        vendorImageUrl: item.vendorImageUrl || ''
      })));
    }
  }, [quote, isOpen]);

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId' && value) {
          const p = products.find(p => p.id === value || p.docId === value);
          if (p) {
            updated.productName = p.name;
            updated.specification = p.specification || '';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleImageChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, imageFile: file, imageUrl: previewUrl }; // simplified for now
        }
        return item;
      }));
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(),
      productId: '', productName: '', specification: '', quantity: '',
      specialRemarks: '', expectedDeliveryDate: '', quoteDeadline: '', imageUrl: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote?.id) return;
    setIsProcessing(true);
    
    try {
      const processedItems = [];
      for (const item of items) {
        let imageUrl = item.imageUrl;
        if (item.imageFile) {
          imageUrl = await resizeImage(item.imageFile);
        }
        processedItems.push({
          productId: item.productId,
          productName: item.productName,
          specification: item.specification,
          quantity: item.quantity,
          specialRemarks: item.specialRemarks,
          expectedDeliveryDate: item.expectedDeliveryDate,
          quoteDeadline: item.quoteDeadline,
          ...(imageUrl ? { imageUrl } : {}),
          vendorPrice: item.vendorPrice,
          vendorRemarks: item.vendorRemarks,
          vendorImageUrl: item.vendorImageUrl
        });
      }

      await updateQuoteStatus(quote.id, {
        category,
        items: processedItems,
        // optionally reset status if you want the vendor to re-submit
        status: 'pending'
      });
      
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update quote request.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !quote) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800">Edit Quote Request</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="editQuoteForm" onSubmit={handleUpdateQuote} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Category *</label>
                <select 
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Category</option>
                  <option value="Board">Board</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Consumables">Consumables</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Requirement Details</h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={`${item.id || 'k'}-${index}`} className="p-5 bg-slate-50 rounded-xl border border-slate-200 relative group">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(item.id)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Select Product (Optional)</label>
                        <select 
                          value={item.productId}
                          onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="">-- Manual Entry --</option>
                          {products.map((p, i) => <option key={`${p.docId || p.id || 'k'}-${i}`} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Product Name *</label>
                        <input 
                          type="text" 
                          required
                          value={item.productName}
                          onChange={e => handleItemChange(item.id, 'productName', e.target.value)}
                          disabled={!!item.productId}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Quantity Required *</label>
                        <input 
                          type="text" 
                          required
                          value={item.quantity}
                          onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Specification</label>
                        <input 
                          type="text"
                          value={item.specification}
                          onChange={e => handleItemChange(item.id, 'specification', e.target.value)}
                          disabled={!!item.productId}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Expected Delivery (Optional)</label>
                        <input 
                          type="date"
                          value={item.expectedDeliveryDate}
                          onChange={e => handleItemChange(item.id, 'expectedDeliveryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase">Quote Deadline (Optional)</label>
                        <input 
                          type="date"
                          value={item.quoteDeadline}
                          onChange={e => handleItemChange(item.id, 'quoteDeadline', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Special Remarks</label>
                        <textarea 
                          value={item.specialRemarks}
                          onChange={e => handleItemChange(item.id, 'specialRemarks', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm custom-scrollbar resize-none"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Reference Image (Optional)</label>
                        {item.imageUrl ? (
                          <div className="relative w-full h-32 bg-white rounded-lg overflow-hidden border border-slate-300">
                            <img src={item.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, 'imageFile', null);
                                handleItemChange(item.id, 'imageUrl', '');
                              }}
                              className="absolute top-1 right-1 p-1 bg-white text-slate-600 rounded-full shadow hover:bg-rose-50 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center w-full h-12 border border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                            <span className="text-xs text-slate-500 font-medium">Click to change/upload image</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(item.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="editQuoteForm"
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Updating...' : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
