import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Loader2, CheckCircle2, Upload, Paperclip, AlertCircle, Edit2, Check, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  fileData?: string;
  onAddOrder?: (order: any) => void;
  employeeName?: string;
}

export function NewOrderModal({ isOpen, onClose, fileName, fileData, onAddOrder, employeeName }: NewOrderModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    employeeName: '',
    customerName: '',
    companyName: '',
    mobileNumber: '',
    email: '',
    address: '',
    gst: '',
    totalItems: 0,
    totalAmount: '₹0.00',
    advancePayment: '',
    transportationCharges: '',
    installationCharges: '',
        bankDetails: ''
  });

  const [poFile, setPoFile] = useState<File | null>(null);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productEditForm, setProductEditForm] = useState<any>({});
  
  const startEditProduct = (product: any) => {
    setEditingProductId(product.id || null);
    setProductEditForm({...product});
  };

  const saveEditProduct = () => {
    setParsedProducts(parsedProducts.map(p => p.id === editingProductId ? { ...p, ...productEditForm } : p));
    setEditingProductId(null);
    setProductEditForm({});
  };

  const removeProduct = (id: string) => {
    setParsedProducts(parsedProducts.filter(p => p.id !== id));
  };
  const poInputRef = useRef<HTMLInputElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);

  const generatePdfThumbnail = async (pdfDataUrl: string): Promise<string | null> => {
    try {
      const base64 = pdfDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error('Error generating PDF thumbnail:', e);
      return null;
    }
  };

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => (c && c > 0 ? c - 1 : 0)), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let isCancelled = false;

    const parseOrder = async () => {
      if (!isOpen || !fileName || !fileData) return;
      
      setIsProcessing(true);
      setExtractError(null);
      
      try {
        const res = await fetch('/api/parse-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileData })
        });
        
        const text = await res.text();
        if (!res.ok) {
          let errorMsg = 'Server error: ' + res.status;
          let retryAfter = 0;
          try {
            const errorData = JSON.parse(text);
            errorMsg = errorData.error || errorMsg;
            if (res.status === 429 && errorData.retryAfter) {
              retryAfter = Math.ceil(errorData.retryAfter / 1000);
            }
          } catch (e) {}
          
          if (retryAfter > 0) {
            if (isCancelled) return;
            setCountdown(retryAfter);
            setTimeout(() => {
               if (!isCancelled) {
                 setCountdown(null);
                 parseOrder(); // automatically retry
               }
            }, retryAfter * 1000);
            return; // Don't end processing, wait for the timeout
          }
          
          throw new Error(errorMsg);
        }
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON (Status ${res.status}): ${text.substring(0, 100)}`);
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (isCancelled) return;
        
        let sourceImage = null;
        if (fileData && fileData.startsWith('data:image')) {
          sourceImage = fileData;
        } else if (fileData && fileData.startsWith('data:application/pdf')) {
          sourceImage = await generatePdfThumbnail(fileData);
        }
        
        setFormData(prev => ({
          ...prev,
          employeeName: employeeName || '',
          customerName: data.customerName || '',
          companyName: data.companyName || '',
          mobileNumber: data.mobileNumber || '',
          email: data.email || '',
          address: data.address || '',
          gst: data.gst || '',
          totalItems: data.totalItems || 0,
          totalAmount: data.totalAmount || '₹0.00',
          advancePayment: data.advancePayment || '',
          transportationCharges: data.transportationCharges || '',
          installationCharges: data.installationCharges || ''
        }));
        
        if (data.products && Array.isArray(data.products)) {
          setParsedProducts(data.products.map((p: any) => ({ 
             id: Math.random().toString(36).substr(2, 9),
             name: p.name || p.productName || p.title || p.item || 'Unknown Product',
             description: p.description || '',
             size: p.size || p.specification || p.specifications || p.dimensions || '',
             quantity: p.quantity || p.qty || 1,
             rate: p.rate || p.price || p.unitPrice || '',
             amount: p.amount || p.total || p.lineTotal || '',
             isDispatched: false
          })));
        }
        
        setIsProcessing(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Error parsing order:", err);
        setExtractError(err.message);
        if (err.message && err.message.includes("Google AI rate limit") || err.message.includes("Daily limit")) {
           // Do not alert
        } else {
           alert(`Failed to process quotation: ${err.message}. Please fill the details manually.`);
        }
        setIsProcessing(false);
      }
    };

    if (isOpen && fileName && fileData) {
      parseOrder();
    } else if (!isOpen) {
      setFormData({
        employeeName: '',
        customerName: '',
        companyName: '',
        mobileNumber: '',
        email: '',
        address: '',
        gst: '',
        totalItems: 0,
        totalAmount: '₹0.00',
        advancePayment: '',
        transportationCharges: '',
        installationCharges: ''
      });
      setPoFile(null);
      setDrawingFile(null);
      setParsedProducts([]);
      setExtractError(null);
      setCountdown(null);
    }
    
    return () => {
       isCancelled = true;
    };
  }, [isOpen, fileName, fileData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const readFileAsDataURL = (file: File | null): Promise<string | undefined> => {
    if (!file) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const poFileData = await readFileAsDataURL(poFile);
      const drawingFileData = await readFileAsDataURL(drawingFile);
      
      if (onAddOrder) {
        await onAddOrder({
          ...formData,
          products: parsedProducts,
          quotationFileName: fileName,
          poFileName: poFile?.name,
          drawingFileName: drawingFile?.name,
          poFileData,
          drawingFileData
        });
      }
    } catch (error) {
      console.error("Error reading files", error);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">New Order Details</h2>
                  {fileName && <p className="text-sm text-slate-500 mt-0.5">From: {fileName}</p>}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {extractError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800 mb-1">Failed to analyze file</h4>
                    <p className="text-sm text-red-600">{extractError}</p>
                    {extractError.includes('limit') && (
                       <p className="text-sm font-medium text-red-700 mt-2">
                          Please configure your Gemini API Key in the AI Studio Settings.
                       </p>
                    )}
                  </div>
                </div>
              )}
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                  {countdown !== null && countdown > 0 ? (
                    <>
                      <p className="text-sm font-medium text-amber-600">Free Tier API Quota Reached.</p>
                      <p className="text-xs text-slate-500 mt-1">Automatically retrying in {countdown} seconds...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-600">Extracting details from quotation...</p>
                      <p className="text-xs text-slate-400 mt-1">This uses AI to parse the uploaded document.</p>
                    </>
                  )}
                </div>
              ) : (
                <form id="new-order-form" onSubmit={handleSubmit} className="space-y-4">
                  {!extractError && !isProcessing && fileName && (
                    <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-lg flex items-start mb-6">
                      <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Successfully extracted data</p>
                        <p className="text-emerald-600/80 mt-0.5 text-xs">Please review the details below and make any necessary corrections.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-2">Customer Info</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter company name" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                        <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter customer name" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                        <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter mobile number" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter email address" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-2">Order Specifics</h3>

                                          <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Details (from Quotation)</label>
                      <textarea 
                        name="bankDetails"
                        value={formData.bankDetails || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                        placeholder="e.g. Bank Name, Account No, IFSC..."
                        rows={3}
                      />
                    </div>

                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Items</label>
                        <input type="number" name="totalItems" value={formData.totalItems} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
                        <input type="text" name="totalAmount" value={formData.totalAmount} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" placeholder="Enter full address" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                        <input type="text" name="gst" value={formData.gst} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter GSTIN" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-6 border-t border-slate-100">
                     <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Payment & Terms</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Advance Payment</label>
                          <input type="text" name="advancePayment" value={formData.advancePayment} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="e.g. 50% or ₹1000" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Transportation Charges</label>
                          <input type="text" name="transportationCharges" value={formData.transportationCharges} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="e.g. Extra or ₹500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Installation Charges</label>
                          <input type="text" name="installationCharges" value={formData.installationCharges} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="e.g. Included" />
                        </div>
                     </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Additional Documents</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* PO File Upload */}
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => poInputRef.current?.click()}>
                        <input type="file" ref={poInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                          if (e.target.files?.[0]) setPoFile(e.target.files[0]);
                        }} />
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 text-center">
                          {poFile ? poFile.name : 'Upload PO Document'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF or Image</p>
                      </div>

                      {/* Drawing File Upload */}
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => drawingInputRef.current?.click()}>
                        <input type="file" ref={drawingInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                          if (e.target.files?.[0]) setDrawingFile(e.target.files[0]);
                        }} />
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <Paperclip className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 text-center">
                          {drawingFile ? drawingFile.name : 'Upload Drawing/Layout'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF or Image</p>
                      </div>

                    </div>
                  </div>
                  {parsedProducts.length > 0 && (
                    <div className="pt-4 mt-6 border-t border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Extracted Products ({parsedProducts.length})</h3>
                      <div className="w-full overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                              <th className="p-3 border-b border-slate-200">Product</th>
                              <th className="p-3 border-b border-slate-200">Description</th>
                              <th className="p-3 border-b border-slate-200">Specification</th>
                              <th className="p-3 border-b border-slate-200 text-center">Qty</th>
                              <th className="p-3 border-b border-slate-200 text-right">Rate</th>
                              <th className="p-3 border-b border-slate-200 text-right">Amount</th>
                              <th className="p-3 border-b border-slate-200 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {parsedProducts.map((p, idx) => {
                              const isEditing = editingProductId === p.id;
                              return (
                              <tr key={`${p.id || "k"}-${idx}`} className="hover:bg-slate-50 group">
                                <td className="p-3 text-sm font-medium text-slate-800 align-top max-w-[200px] break-words">
                                  {isEditing ? (
                                    <input type="text" value={productEditForm.name || ''} onChange={e => setProductEditForm({...productEditForm, name: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                                  ) : (p.name)}
                                </td>
                                <td className="p-3 text-xs text-slate-600 align-top max-w-[200px] break-words">
                                  {isEditing ? (
                                    <textarea value={productEditForm.description || ''} onChange={e => setProductEditForm({...productEditForm, description: e.target.value})} className="w-full px-2 py-1 text-xs border rounded min-h-[60px]" />
                                  ) : (p.description || '-')}
                                </td>
                                <td className="p-3 text-xs text-slate-600 align-top max-w-[150px] break-words">
                                  {isEditing ? (
                                    <input type="text" value={productEditForm.size || ''} onChange={e => setProductEditForm({...productEditForm, size: e.target.value})} className="w-full px-2 py-1 text-xs border rounded" />
                                  ) : (p.size || '-')}
                                </td>
                                <td className="p-3 text-sm font-semibold text-slate-700 text-center align-top">
                                  {isEditing ? (
                                    <input type="number" value={productEditForm.quantity || ''} onChange={e => setProductEditForm({...productEditForm, quantity: e.target.value})} className="w-16 px-2 py-1 text-sm border rounded text-center" />
                                  ) : (p.quantity)}
                                </td>
                                <td className="p-3 text-sm text-slate-600 text-right align-top whitespace-nowrap">
                                  {isEditing ? (
                                    <input type="text" value={productEditForm.rate || ''} onChange={e => setProductEditForm({...productEditForm, rate: e.target.value})} className="w-20 px-2 py-1 text-sm border rounded text-right" />
                                  ) : (p.rate || '-')}
                                </td>
                                <td className="p-3 text-sm font-medium text-slate-800 text-right align-top whitespace-nowrap">
                                  {isEditing ? (
                                    <input type="text" value={productEditForm.amount || ''} onChange={e => setProductEditForm({...productEditForm, amount: e.target.value})} className="w-24 px-2 py-1 text-sm border rounded text-right" />
                                  ) : (p.amount || '-')}
                                </td>
                                <td className="p-3 align-top text-center">
                                  {isEditing ? (
                                    <button type="button" onClick={saveEditProduct} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                                      <Check className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button type="button" onClick={(e) => { e.preventDefault(); startEditProduct(p); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button type="button" onClick={(e) => { e.preventDefault(); removeProduct(p.id); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}


                </form>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="new-order-form"
                disabled={isProcessing}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Create Order'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
