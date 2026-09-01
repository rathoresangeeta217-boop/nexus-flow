import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Upload, CheckCircle2, ChevronRight, DollarSign } from 'lucide-react';
import { VendorPaymentRecord, VendorPaymentPhase, getPaymentForPO, saveVendorPaymentRecord } from '../lib/vendorPayments';
import { getAllVendors, Vendor } from '../lib/vendors';
import { Landmark, CreditCard, User, Hash, QrCode } from 'lucide-react';

export interface AggregatedPO {
  poNumber: string;
  vendorName: string;
  totalAmount: number;
}

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: AggregatedPO | null;
}

export function VendorPaymentModal({ isOpen, onClose, po }: VendorPaymentModalProps) {
  const [record, setRecord] = useState<Partial<VendorPaymentRecord>>({ phases: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  
  useEffect(() => {
    if (isOpen && po) {
      loadPaymentRecord();
    } else {
      setRecord({ phases: [] });
    }
  }, [isOpen, po]);

  const loadPaymentRecord = async () => {
    if (!po) return;
    setIsLoading(true);
    try {
      // Fetch vendor details
      const allVendors = await getAllVendors();
      const match = allVendors.find(v => v.name === po.vendorName);
      if (match) setVendorDetails(match);

      const existing = await getPaymentForPO(po.poNumber);
      if (existing) {
        setRecord(existing);
      } else {
        // Initialize with default phases
        setRecord({
          poNumber: po.poNumber,
          vendorName: po.vendorName,
          totalAmount: po.totalAmount.toString(),
          phases: [
            {
              id: `phase-${Date.now()}-1`,
              title: 'Advance Payment',
              amount: '',
              status: 'Pending'
            },
            {
              id: `phase-${Date.now()}-2`,
              title: 'At Time of Receiving',
              amount: '',
              status: 'Pending'
            }
          ]
        });
      }
    } catch (err) {
      console.error("Error loading payment", err);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
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
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to JPEG with 60% quality
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, phaseIndex: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const base64 = await readFileAsDataURL(e.target.files[0]);
      updatePhase(phaseIndex, 'screenshotUrl', base64);
    } catch (err) {
      console.error(err);
      alert("Failed to read image");
    }
  };

  const updatePhase = (index: number, field: keyof VendorPaymentPhase, value: any) => {
    const updated = [...(record.phases || [])];
    updated[index] = { ...updated[index], [field]: value };
    setRecord({ ...record, phases: updated });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await saveVendorPaymentRecord(record);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save payment record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && po && (
      <div key="vendor-payment-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        />
        
        {viewImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90" onClick={() => setViewImage(null)}>
            <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full" onClick={() => setViewImage(null)}>
              <X className="w-8 h-8" />
            </button>
            <img src={viewImage} alt="Payment Screenshot" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Vendor Payment - {po.vendorName}</h2>
              <p className="text-sm text-slate-500">PO Ref: {po.poNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total PO Amount</p>
                  <p className="text-3xl font-bold text-blue-900">₹{po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="w-12 h-12 text-blue-200" />
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Remaining Payment</p>
                  <p className="text-3xl font-bold text-indigo-900">
                    ₹{Math.max(0, po.totalAmount - (record.phases || []).filter(p => p.status === 'Paid').reduce((sum, p) => {
                      let phaseAmt = 0;
                      const strVal = String(p.amount || '0');
                      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
                      if (pctMatch && po.totalAmount > 0) {
                        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
                        phaseAmt = (pct / 100) * po.totalAmount;
                      } else {
                        const amtMatch = strVal.match(/\d[\d,]*(\.\d+)?/);
                        phaseAmt = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, "")) || 0 : 0;
                      }
                      return sum + phaseAmt;
                    }, 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-indigo-200" />
              </div>
            </div>

            {vendorDetails && (vendorDetails.bankName || vendorDetails.accountNumber || vendorDetails.qrCodeData) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                  <Landmark className="w-4 h-4 text-slate-500" />
                  Vendor Payment Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {vendorDetails.bankName && (
                    <div className="flex items-start gap-2">
                      <Landmark className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank Name</p>
                        <p className="text-sm font-semibold text-slate-800">{vendorDetails.bankName}</p>
                      </div>
                    </div>
                  )}
                  {vendorDetails.accountName && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Name</p>
                        <p className="text-sm font-semibold text-slate-800">{vendorDetails.accountName}</p>
                      </div>
                    </div>
                  )}
                  {vendorDetails.accountNumber && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Number</p>
                        <p className="text-sm font-semibold text-slate-800">{vendorDetails.accountNumber}</p>
                      </div>
                    </div>
                  )}
                  {vendorDetails.ifscCode && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IFSC Code</p>
                        <p className="text-sm font-semibold text-slate-800">{vendorDetails.ifscCode}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {vendorDetails.qrCodeData && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setViewImage(vendorDetails.qrCodeData!)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                    >
                      <QrCode className="w-4 h-4" /> View Payment QR Code
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                Payment Phases
              </h3>
              
              <div className="space-y-4">
                {record.phases?.map((phase, index) => (
                  <div key={`${phase.id || "phase"}-${index}`} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={phase.title}
                        onChange={(e) => updatePhase(index, 'title', e.target.value)}
                        className="font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 text-lg p-0"
                        placeholder="Phase Title"
                      />
                      <select
                        value={phase.status}
                        onChange={(e) => updatePhase(index, 'status', e.target.value as any)}
                        className={`text-xs font-bold rounded px-2 py-1 outline-none border ${phase.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : phase.status === 'Request Payment' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Request Payment">Request Payment</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount (₹)</label>
                        <input
                          type="text"
                          value={phase.amount}
                          onChange={(e) => updatePhase(index, 'amount', e.target.value)}
                          placeholder="e.g. 50000"
                          className="w-full px-3 py-2 border rounded-lg outline-none bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Date</label>
                        <input
                          type="date"
                          value={phase.date || ''}
                          onChange={(e) => updatePhase(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg outline-none bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</label>
                        <select
                          value={phase.sourceType || ''}
                          onChange={(e) => updatePhase(index, 'sourceType', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg outline-none bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select...</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                      
                      {phase.sourceType === 'Bank' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name</label>
                          <select
                            value={phase.bankName || ''}
                            onChange={(e) => updatePhase(index, 'bankName', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg outline-none bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select...</option>
                            <option value="SBI">SBI</option>
                            <option value="Union">Union Bank</option>
                            <option value="PR">PR Bank</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">UTR / Ref No.</label>
                        <input
                          type="text"
                          value={phase.utrNumber || ''}
                          onChange={(e) => updatePhase(index, 'utrNumber', e.target.value)}
                          placeholder="Reference No."
                          className="w-full px-3 py-2 border rounded-lg outline-none bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Payment Screenshot / Receipt</label>
                      <div className="flex items-center gap-4">
                        {phase.screenshotUrl ? (
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setViewImage(phase.screenshotUrl || null)} className="block w-12 h-12 rounded border border-slate-300 overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity" title="Click to view full image">
                              <img src={phase.screenshotUrl} alt="Receipt" className="w-full h-full object-cover" />
                            </button>
                            <button type="button" onClick={() => updatePhase(index, 'screenshotUrl', undefined)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, index)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-3 py-2 border border-slate-300 border-dashed rounded-lg bg-white flex items-center justify-center text-xs text-slate-500 hover:bg-slate-50">
                              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Screenshot
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4" /> Save Payments
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
