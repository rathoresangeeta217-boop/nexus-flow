import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Copy, Mail } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Product } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { saveQuoteRequest } from '../lib/quotes';
import { getPublicUrl } from '../lib/utils';

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  vendors: Vendor[];
}

export function RequestQuoteModal({ isOpen, onClose, products, vendors }: RequestQuoteModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  
  const [items, setItems] = useState<any[]>([{
    id: Math.random().toString(),
    productId: '',
    productName: '',
    specification: '',
    quantity: '',
    specialRemarks: '',
    expectedDeliveryDate: '',
    quoteDeadline: '',
    imageFile: null,
    imagePreview: ''
  }]);
  
  // Available categories from vendors
  const categories = Array.from(new Set(vendors.map(v => v.category).filter(Boolean))) as string[];
  
  // Filtered vendors for step 2
  const filteredVendors = vendors.filter(v => v.category === category);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [createdQuotes, setCreatedQuotes] = useState<any[]>([]);

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-fill from selected product
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
          return { ...item, imageFile: file, imagePreview: previewUrl };
        }
        return item;
      }));
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(),
      productId: '',
      productName: '',
      specification: '',
      quantity: '',
      specialRemarks: '',
      expectedDeliveryDate: '',
      quoteDeadline: '',
      imageFile: null,
      imagePreview: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(item => !item.productName || !item.quantity)) {
      alert("Please fill in the product name and quantity for all items.");
      return;
    }
    setStep(2);
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCreateQuotes = async () => {
    if (selectedVendorIds.length === 0) return;
    setIsProcessing(true);
    
    try {
      // Process images first
      const processedItems = [];
      for (const item of items) {
        let imageUrl = '';
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
          ...(imageUrl ? { imageUrl } : {})
        });
      }

      const quotes = [];
      for (const vendorId of selectedVendorIds) {
        const quoteId = await saveQuoteRequest({
          category,
          vendorId,
          items: processedItems
        });
        
        const baseUrl = getPublicUrl();
        const link = `${baseUrl}?quoteId=${quoteId}`;

        quotes.push({ quoteId, vendorId, shortLink: link });
      }
      setCreatedQuotes(quotes);
      setStep(3);
    } catch (e) {
      console.error(e);
      alert('Failed to create quote requests');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setCategory('');
    setItems([{
      id: Math.random().toString(),
      productId: '',
      productName: '',
      specification: '',
      quantity: '',
      specialRemarks: '',
      expectedDeliveryDate: '',
      quoteDeadline: '',
      imageFile: null,
      imagePreview: ''
    }]);
    setSelectedVendorIds([]);
    setCreatedQuotes([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getEmailLink = (vendorId: string, quoteId: string, shortLink?: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    const baseUrl = getPublicUrl();
    const link = shortLink || `${baseUrl}?quoteId=${quoteId}`;
    const productNames = items.map(i => i.productName).join(', ');
    const subject = `Quote Request from SRK Modular: ${productNames}`;
    const text = `Hi ${vendor?.contactPerson || vendor?.name},\n\nPlease review our requirement for ${productNames} and provide a quote using this link:\n\n${link}\n\nThank you,\nSRK Modular Purchasing`;
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(vendor?.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Request Quote</h3>
              <button 
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {step === 1 && (
                <form id="quote-form" onSubmit={handleSubmitDetails} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Vendor Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">Select a category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-6 mt-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="font-bold text-slate-800 text-sm uppercase">Products</h4>
                      <button 
                        type="button" 
                        onClick={addItem}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
                      >
                        + Add Another
                      </button>
                    </div>

                    {items.map((item, index) => (
                      <div key={`${item.id || 'k'}-${index}`} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative space-y-4">
                        {items.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeItem(item.id)}
                            className="absolute -top-2 -right-2 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full p-1 border border-slate-200 shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        
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
                        
                        <div className="grid grid-cols-2 gap-4">
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
                        
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase">Special Remarks</label>
                          <textarea 
                            value={item.specialRemarks}
                            onChange={e => handleItemChange(item.id, 'specialRemarks', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm custom-scrollbar resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase">Reference Image (Optional)</label>
                          {item.imagePreview ? (
                            <div className="relative w-full h-32 bg-white rounded-lg overflow-hidden border border-slate-300">
                              <img src={item.imagePreview} alt="Preview" className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleItemChange(item.id, 'imageFile', null);
                                  handleItemChange(item.id, 'imagePreview', '');
                                }}
                                className="absolute top-1 right-1 p-1 bg-white text-slate-600 rounded-full shadow hover:bg-rose-50 hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center w-full h-12 border border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                              <span className="text-xs text-slate-500 font-medium">Click to upload image</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(item.id, e)} />
                            </label>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </form>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800">Select Vendors in "{category}"</h4>
                  {filteredVendors.length === 0 ? (
                    <p className="text-sm text-slate-500">No vendors found in this category.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredVendors.map((v, i) => (
                        <label key={`${v.docId || v.id || 'k'}-${i}`} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                          <input 
                            type="checkbox"
                            checked={selectedVendorIds.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedVendorIds([...selectedVendorIds, v.id]);
                              else setSelectedVendorIds(selectedVendorIds.filter(id => id !== v.id));
                            }}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{v.name}</p>
                            <p className="text-xs text-slate-500">{v.contactPerson} • {v.phone || 'No phone'}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Quotes Generated!</h3>
                  <p className="text-sm text-slate-500">You can now send the fillable quote link to the vendors via Email or WhatsApp.</p>
                  
                  <div className="space-y-3 mt-6 text-left">
                    {createdQuotes.map(({ quoteId, vendorId, shortLink }, idx) => {
                      const v = vendors.find(vend => vend.id === vendorId);
                      return (
                        <div key={`${quoteId}-${idx}`} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div>
                            <p className="font-semibold text-slate-800">{v?.name}</p>
                            <p className="text-xs text-slate-500">Quote ID: {quoteId}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const baseUrl = getPublicUrl();
                                const link = shortLink || `${baseUrl}?quoteId=${quoteId}`;
                                navigator.clipboard.writeText(link);
                                alert('Link copied to clipboard!');
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                              Copy
                            </button>
                            <a 
                              href={getEmailLink(vendorId, quoteId, shortLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              Email
                            </a>
                            <button 
                              onClick={() => {
                                const vendor = vendors.find(v => v.id === vendorId);
                                let phoneNum = vendor?.phone?.replace(/[^0-9]/g, '') || '';
                                if (phoneNum.length >= 10) {
                                  phoneNum = '91' + phoneNum.slice(-10);
                                }
                                
                                if (!phoneNum) {
                                  alert('Vendor does not have a valid phone number.');
                                  return;
                                }

                                const baseUrl = getPublicUrl();
                                const link = shortLink || `${baseUrl}?quoteId=${quoteId}`;
                                const productNames = items.map(i => i.productName).join(', ');
                                const text = `Hi ${vendor?.contactPerson || vendor?.name},\n\nPlease review our requirement for ${productNames} and provide a quote using this link:\n${link}`;
                                
                                const whatsappUrl = `https://web.whatsapp.com/send/?phone=${phoneNum}&text=${encodeURIComponent(text)}`;
                                window.open(whatsappUrl, 'whatsapp_web_tab');
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:bg-[#128C7E] transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              WhatsApp
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              {step === 1 && (
                <>
                  <button type="button" onClick={handleClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700">Cancel</button>
                  <button type="submit" form="quote-form" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Next step</button>
                </>
              )}
              {step === 2 && (
                <>
                  <button type="button" onClick={() => setStep(1)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700">Back</button>
                  <button 
                    type="button" 
                    onClick={handleCreateQuotes}
                    disabled={selectedVendorIds.length === 0 || isProcessing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Creating...' : 'Generate Quote Links'}
                  </button>
                </>
              )}
              {step === 3 && (
                <button type="button" onClick={handleClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold">Done</button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
