import React, { useState, useEffect } from 'react';
import { updateQuoteStatus } from '../lib/quotes';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Package, Send, Building2, CheckCircle2, Upload, X, Maximize2, Download } from 'lucide-react';

export function VendorQuoteForm({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [itemResponses, setItemResponses] = useState<Record<number, { vendorPrice: string, vendorRemarks: string, imageFile: File | null, imagePreview: string | null }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, 'quotes', quoteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setQuote(data);
          
          const items = data.items && data.items.length > 0 ? data.items : [data];
          const initialResponses: any = {};
          items.forEach((item: any, i: number) => {
            initialResponses[i] = { 
              vendorPrice: item.vendorPrice || '', 
              vendorRemarks: item.vendorRemarks || '', 
              imageFile: null, 
              imagePreview: item.vendorImageUrl || null 
            };
          });
          setItemResponses(initialResponses);

          if (data.status === 'submitted') {
            setSubmitted(true);
          }
        }
      } catch (e) {
        console.error("Error fetching quote:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [quoteId]);

  const handleResponseChange = (index: number, field: string, value: any) => {
    setItemResponses(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleResponseChange(index, 'imageFile', file);
      handleResponseChange(index, 'imagePreview', URL.createObjectURL(file));
    }
  };

  const removeImage = (index: number) => {
    handleResponseChange(index, 'imageFile', null);
    handleResponseChange(index, 'imagePreview', null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const items = quote.items && quote.items.length > 0 ? quote.items : [quote];
      const updatedItems = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const response = itemResponses[i];
        
        let vendorImageUrl = '';
        if (response.imageFile) {
          vendorImageUrl = await resizeImage(response.imageFile);
        }

        updatedItems.push({
          ...item,
          vendorPrice: response.vendorPrice,
          vendorRemarks: response.vendorRemarks,
          ...(vendorImageUrl ? { vendorImageUrl } : {})
        });
      }

      const updates: any = { status: 'submitted' };
      if (quote.items && quote.items.length > 0) {
        updates.items = updatedItems;
      } else {
        updates.vendorPrice = updatedItems[0].vendorPrice;
        updates.vendorRemarks = updatedItems[0].vendorRemarks;
        if (updatedItems[0].vendorImageUrl) updates.vendorImageUrl = updatedItems[0].vendorImageUrl;
      }

      await updateQuoteStatus(quoteId, updates);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('Failed to submit quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quote Request Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 text-center">The link might be invalid or expired.</p>
      </div>
    );
  }

  if (submitted) {
    const items = quote?.items && quote.items.length > 0 ? quote.items : [quote];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Quote Submitted!</h2>
          <p className="text-sm text-slate-500 mb-6">Thank you for submitting your quote to <strong>SRK Modular</strong>. The purchasing team will review it shortly.</p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-700 space-y-4 max-h-48 overflow-y-auto custom-scrollbar">
            {items.map((item: any, i: number) => (
              <div key={i} className="space-y-1 pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-800">{item.productName}</p>
                <p className="text-slate-600">Your Price: ₹{item.vendorPrice || itemResponses[i]?.vendorPrice || '-'}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Edit Quote
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-8 text-center text-white border-b-4 border-amber-500">
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="h-16 bg-white rounded-xl flex items-center justify-center shadow-lg mb-3 p-2 min-w-[64px]">
                {!logoError ? (
                  <img 
                    src="/logo.png" 
                    alt="SRK Modular Logo" 
                    className="h-full object-contain" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="font-bold text-xl text-slate-800">SRK</span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">SRK MODULAR</h1>
              <p className="text-slate-300 text-xs tracking-widest uppercase mt-1">FURNITURE.CO</p>
            </div>
            <div className="w-16 h-0.5 bg-slate-700 mx-auto my-4"></div>
            <h2 className="text-lg font-semibold text-white">Vendor Quote Request</h2>
            <p className="text-slate-400 mt-1 text-sm">Please provide your best price for the following requirement.</p>
          </div>
          
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {(quote.items && quote.items.length > 0 ? quote.items : [quote]).map((item: any, index: number) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: Requirement Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Requirement Details {quote.items && quote.items.length > 1 ? `#${index + 1}` : ''}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-4">
                        <span className="text-slate-500 w-24 shrink-0 font-medium">Product</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-semibold">{item.productName}</span>
                        </div>
                      </div>
                      {item.imageUrl && (
                        <div className="flex gap-4">
                          <span className="text-slate-500 w-24 shrink-0 font-medium pt-2">Ref. Image</span>
                          <div 
                            className="relative w-full h-64 bg-white rounded-lg border border-slate-200 overflow-hidden cursor-pointer group"
                            onClick={() => setViewingImage(item.imageUrl)}
                          >
                            <img src={item.imageUrl} alt="Reference" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <div className="bg-white/95 text-slate-800 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm transform scale-95 group-hover:scale-100 duration-200">
                                <Maximize2 className="w-4 h-4" /> Click to enlarge
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {item.specification && (
                        <div className="flex gap-4">
                          <span className="text-slate-500 w-24 shrink-0 font-medium">Specification</span>
                          <span className="text-slate-800">{item.specification}</span>
                        </div>
                      )}
                      <div className="flex gap-4">
                        <span className="text-slate-500 w-24 shrink-0 font-medium">Quantity</span>
                        <span className="text-slate-800 font-semibold">{item.quantity}</span>
                      </div>
                      {item.specialRemarks && (
                        <div className="flex gap-4">
                          <span className="text-slate-500 w-24 shrink-0 font-medium">Remarks</span>
                          <span className="text-slate-800 bg-amber-50 px-2 py-1 rounded text-amber-800">{item.specialRemarks}</span>
                        </div>
                      )}
                      {item.expectedDeliveryDate && (
                        <div className="flex gap-4">
                          <span className="text-slate-500 w-24 shrink-0 font-medium">Req. Delivery</span>
                          <span className="text-slate-800">{new Date(item.expectedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.quoteDeadline && (
                        <div className="flex gap-4">
                          <span className="text-slate-500 w-24 shrink-0 font-medium">Deadline</span>
                          <span className="text-rose-600 font-semibold">{new Date(item.quoteDeadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Vendor Input Form */}
                  <div className="space-y-6 lg:p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Your Quote Price (₹) *</label>
                      <input 
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={itemResponses[index]?.vendorPrice || ''}
                        onChange={e => handleResponseChange(index, 'vendorPrice', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold"
                        placeholder="e.g. 1500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Additional Remarks (Optional)</label>
                      <textarea 
                        value={itemResponses[index]?.vendorRemarks || ''}
                        onChange={e => handleResponseChange(index, 'vendorRemarks', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none custom-scrollbar"
                        placeholder="Any conditions, ETA, or alternative suggestions..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Product Reference Image (Optional)</label>
                      {itemResponses[index]?.imagePreview ? (
                        <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300">
                          <img src={itemResponses[index].imagePreview as string} alt="Preview" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-white text-slate-600 rounded-full shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 mb-2 text-slate-500" />
                              <p className="text-sm text-slate-500 font-medium">Click to upload image</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(index, e)} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {quote.items && index < quote.items.length - 1 && (
                    <div className="col-span-1 lg:col-span-2 h-px bg-slate-200 w-full my-4"></div>
                  )}
                </div>
              ))}

              <div className="pt-4 flex justify-center">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full max-w-md py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-b-4 border-amber-500"
                >
                  {isSubmitting ? 'Submitting...' : (
                    <>
                      <Send className="w-5 h-5" />
                      {quote.status === 'submitted' ? 'Resubmit Quote to SRK Modular' : 'Submit Quote to SRK Modular'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4" onClick={() => setViewingImage(null)}>
          <div className="relative w-full max-w-5xl max-h-screen flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
              <a
                href={viewingImage}
                download="product-reference.jpg"
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg font-bold hover:bg-slate-100 transition-colors shadow-lg"
                onClick={e => e.stopPropagation()}
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                onClick={() => setViewingImage(null)}
                className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <img src={viewingImage} alt="Full screen reference" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
