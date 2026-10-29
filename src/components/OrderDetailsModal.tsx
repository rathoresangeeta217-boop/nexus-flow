import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, User, Building, Phone, Mail, MapPin, Hash, Paperclip, Loader2, Trash2, Truck, MessageCircle, Calendar, Upload, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Badge } from './Badge';
import { getOrderFiles, saveOrderFiles } from '../lib/fileStorage';
import { getPaymentForOrder, PaymentRecord, calculatePhaseGstAdjustment } from '../lib/payments';
import { saveOrder } from '../lib/orders';
import { generatePaymentReminderPDF } from '../lib/pdfHelper';
import { Clock, TrendingUp, Edit2, Check, AlertTriangle } from 'lucide-react';
import { UploadDrawingChecklistModal } from './UploadDrawingChecklistModal';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  onDelete?: () => void;
}

export function OrderDetailsModal({ isOpen, onClose, order, onDelete }: OrderDetailsModalProps) {
  const [files, setFiles] = useState<any>({});
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [isUploadDocsOpen, setIsUploadDocsOpen] = useState(false);

  const poInputRef = useRef<HTMLInputElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);
  const ocInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);

  const handleDirectUpload = async (docType: 'po' | 'drawing' | 'checklist' | 'oc' | 'quotation', file: File) => {
    if (!order || !file) return;
    setIsLoadingFiles(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        const nowIso = new Date().toISOString();
        const targetDocId = order.docId || order.id;

        const mapping = {
          po: { name: 'poFileName', date: 'poUploadedAt', data: 'poFileData' },
          drawing: { name: 'drawingFileName', date: 'drawingUploadedAt', data: 'drawingFileData' },
          checklist: { name: 'checklistFileName', date: 'checklistUploadedAt', data: 'checklistFileData' },
          oc: { name: 'ocFileName', date: 'ocUploadedAt', data: 'ocFileData' },
          quotation: { name: 'quotationFileName', date: 'quotationUploadedAt', data: 'quotationFileData' }
        }[docType];

        const updatedDetails = {
          ...(order.details || {}),
          [mapping.name]: file.name,
          [mapping.date]: nowIso
        };

        order.details = updatedDetails;

        await saveOrder({
          docId: targetDocId,
          id: order.id,
          details: updatedDetails
        });

        await saveOrderFiles(order.id || targetDocId, {
          [mapping.data]: fileData
        });

        setFiles((prev: any) => ({
          ...prev,
          [mapping.data]: fileData
        }));

        setIsLoadingFiles(false);
      };
      reader.onerror = () => {
        setIsLoadingFiles(false);
        alert('Failed to read file.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsLoadingFiles(false);
      console.error(err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    }
  };

  const [currentScheduledReason, setCurrentScheduledReason] = useState(order?.details?.scheduledReason || '');
  const [isSavingReason, setIsSavingReason] = useState(false);

  useEffect(() => {
    if (order) {
      setCurrentScheduledReason(order.details?.scheduledReason || '');
    }
  }, [order]);

  useEffect(() => {
    if (order?.date) {
      // Try to parse the date back into YYYY-MM-DD
      try {
        const parsed = new Date(order.date);
        if (!isNaN(parsed.getTime())) {
          setEditedDate(parsed.toISOString().split('T')[0]);
        }
      } catch (e) {}
    }
  }, [order]);

  const handleSaveDate = async () => {
    if (!order?.docId) return;
    try {
      const formattedDate = new Date(editedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await saveOrder({
        docId: order.docId,
        date: formattedDate
      });
      setIsEditingDate(false);
      // Optimistically update order date
      order.date = formattedDate;
    } catch(err) {
      console.error(err);
    }
  };


  const sendWhatsAppToDriver = () => {
    if (!order.details?.driverMobile) return;
    
    // Format mobile number (strip non-digits)
    let mobile = order.details.driverMobile.replace(/\D/g, '');
    // Ensure country code if missing (defaulting to +91 for India if exactly 10 digits)
    if (mobile.length === 10) {
      mobile = '91' + mobile;
    }
    
    const address = order.details.dispatchAddress ? `Delivery Address: ${order.details.dispatchAddress}` : '';
    const vehicle = order.details.vehicleNumber ? `Vehicle: ${order.details.vehicleNumber}` : '';
    const items = order.items ? `Total Items: ${order.items}` : '';
    
    const message = encodeURIComponent(
      `Hello ${order.details.driverName || 'Driver'},

You have a new dispatch scheduled.\n\nOrder ID: ${order.id}\n${items}\n${vehicle}\n${address}\n\nPlease confirm when you are ready.`
    );
    
    window.open(`https://wa.me/${mobile}?text=${message}`, '_blank');
  };


  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
    }
    if (!isOpen) {
      setPaymentRecord(null);
      setFiles({});
      return;
    }
    if (isOpen && order) {
      setIsLoadingFiles(true);
      setPaymentRecord(null);
      setFiles({});
      Promise.all([
        getOrderFiles(order.id || order.docId),
        getPaymentForOrder(order.id, order.docId, order.customer)
      ])
        .then(([fileData, paymentData]) => {
          setFiles(fileData || {});
          setPaymentRecord(paymentData);
        })
        .catch(console.error)
        .finally(() => setIsLoadingFiles(false));
    }
  }, [isOpen, order]);

  if (!order) return null;

  const handleDownload = (fileName: string, fileData?: string) => {
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Downloading ${fileName}... (File content not available)`);
    }
  };


  const totalReceived = paymentRecord?.phases?.filter(p => p.status === 'Received').reduce((sum, p) => {
    return sum + (parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0);
  }, 0) || 0;
  
  const grandTotalParsed = parseFloat(String(paymentRecord?.grandTotal || order.amount || '0').replace(/[^0-9.]/g, '')) || 0;
  const pendingAmount = Math.max(0, grandTotalParsed - totalReceived);
  
  const formatVal = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  let dispatchedCount = 0;
  let pendingDispatchCount = 0;
  if (order.details?.products) {
    order.details.products.forEach(p => {
      const q = Number(p.quantity) || 1;
      const d = Number(p.dispatchedQuantity) || (p.isDispatched ? q : 0);
      dispatchedCount += d;
      pendingDispatchCount += Math.max(0, q - d);
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative bg-white rounded-none md:rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Order Details</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-medium text-slate-500">{order.id}</p>
                    <Badge variant={
                      order.status === 'Installation Complete' ? 'success' : 
                      order.status === 'Installation Scheduled' ? 'info' :
                      order.status === 'Dispatched' ? 'success' : 
                      order.status === 'Scheduled Dispatched' ? 'indigo' :
                      order.status === 'Production' ? 'warning' :
                      order.status === 'Purchase' ? 'purple' :
                      (order.status === 'New Order' || order.status === 'New') ? 'default' : 'default'
                    }>
                      {order.status === 'New' ? 'New Order' : order.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    try {
                      await generatePaymentReminderPDF(order, paymentRecord);
                    } catch (err) {
                      console.error('Error generating payment reminder notice:', err);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Download Payment Reminder Notice"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Payment Reminder</span>
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Order & Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Order Receiving Date</p>
                      <div className="flex items-center gap-2">
                        {isEditingDate ? (
                          <>
                            <input 
                              type="date" 
                              value={editedDate}
                              onChange={(e) => setEditedDate(e.target.value)}
                              className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={handleSaveDate} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingDate(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">{order.date || 'N/A'}</p>
                            <button onClick={() => setIsEditingDate(true)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quotation Date</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.quotationDate || order.date || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-amber-50/80 p-3 rounded-xl border border-amber-200/70 md:col-span-2 shadow-2xs">
                    <Truck className="w-4.5 h-4.5 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Order Delivery Date</p>
                      <p className="text-sm font-black text-amber-950 mt-0.5">
                        {paymentRecord?.deliveryDate || order.details?.deliveryDate || (order as any).deliveryDate ? (
                          new Date(paymentRecord?.deliveryDate || order.details?.deliveryDate || (order as any).deliveryDate).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          })
                        ) : (
                          <span className="text-amber-800/70 font-medium italic text-xs">Not specified yet (Mandatory on 1st payment phase)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Salesperson</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.employeeName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Name</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.customerName || order.customer || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Company Name</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.companyName || order.customer || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile Number</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.mobileNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">GST Number</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.gst || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Address</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              
              
              {/* Dispatch Information */}
              {(order.details?.dispatchAddress || order.details?.vehicleNumber || order.details?.driverName || order.details?.driverMobile) && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-500" />
                    Dispatch Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Address</p>
                        <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">{order.details?.dispatchAddress || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle Number</p>
                        <p className="text-sm font-semibold text-slate-800 uppercase">{order.details?.vehicleNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Driver Name</p>
                        <p className="text-sm font-semibold text-slate-800">{order.details?.driverName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Driver Mobile</p>
                          <p className="text-sm font-semibold text-slate-800">{order.details?.driverMobile || 'N/A'}</p>
                        </div>
                      </div>
                      {order.details?.driverMobile && (
                        <button 
                          onClick={sendWhatsAppToDriver}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#128C7E] transition-colors shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Send WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Overview */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Financial Overview & Payment Details
                  </h4>
                  <button 
                    onClick={async () => {
                      try {
                        await generatePaymentReminderPDF(order, paymentRecord);
                      } catch (err) {
                        console.error('Error generating payment reminder notice:', err);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer w-fit"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Payment Reminder Notice
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</p>
                    <p className="text-lg font-bold text-slate-800">{paymentRecord?.grandTotal || order.amount || order.details?.totalAmount || '0'}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-sm">
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Total Received</p>
                    <p className="text-lg font-bold text-emerald-700">{formatVal(totalReceived)}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total Pending</p>
                    <p className="text-lg font-bold text-amber-700">{formatVal(pendingAmount)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Advance Req.</p>
                    <p className="text-lg font-bold text-slate-800">{paymentRecord?.advancePayment || paymentRecord?.advanceRequirement || order.details?.advancePayment || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Transport Charges</p>
                    <p className="text-sm font-semibold text-slate-800">{paymentRecord?.transportationCharges || paymentRecord?.loadingCharges || order.details?.transportationCharges || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Installation</p>
                    <p className="text-sm font-semibold text-slate-800">{paymentRecord?.installationCharges || order.details?.installationCharges || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                     <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bank Details</p>
                     <p className="text-sm font-semibold text-slate-800">{order.details?.bankDetails || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-4 bg-amber-50/90 p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">Reason Order is Scheduled</p>
                        <p className="text-[11px] text-amber-800">Select reason if order is scheduled and unconfirmed:</p>
                      </div>
                    </div>
                    <div className="w-full sm:w-64">
                      <select
                        value={currentScheduledReason}
                        disabled={isSavingReason}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setCurrentScheduledReason(val);
                          setIsSavingReason(true);
                          try {
                            const updated = {
                              ...order,
                              docId: order.docId || order.id,
                              details: {
                                ...(order.details || {}),
                                scheduledReason: val
                              }
                            };
                            if (val && (!order.status || order.status === 'New Order' || order.status === 'New')) {
                              updated.status = 'Scheduled Dispatched';
                            }
                            await saveOrder(updated);
                            if (order.details) {
                              order.details.scheduledReason = val;
                            }
                          } catch (err) {
                            console.error('Failed to update scheduled reason:', err);
                          } finally {
                            setIsSavingReason(false);
                          }
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Select Scheduled Reason --</option>
                        <option value="CUSTOMER ISSUE">1. CUSTOMER ISSUE</option>
                        <option value="LOGISTIC ISSUE">2. LOGISTIC ISSUE</option>
                        <option value="PAYMENT DELAY">3. PAYMENT DELAY</option>
                        <option value="UNSATISFACTION">4. UNSATISFACTION</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {paymentRecord?.phases && paymentRecord.phases.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Phases</h5>
                    <div className="space-y-3">
                      {paymentRecord.phases.map((phase, idx) => {
                        const parseVal = (str: any) => {
                          if (!str) return 0;
                          const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
                          return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
                        };
                        const grandVal = parseVal(paymentRecord.grandTotal || order.amount);
                        const adj = calculatePhaseGstAdjustment(phase.amount, phase.sourceType, phase.bankName, 18, grandVal);

                        return (
                          <div key={phase.id || idx} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{phase.title}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  {phase.date && <span>{phase.date}</span>}
                                  {phase.sourceType && <span>Via {phase.sourceType}</span>}
                                  {phase.bankName && <span>({phase.bankName})</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-700">{phase.amount}</span>
                                <Badge variant={phase.status === 'Received' ? 'success' : 'warning'}>
                                  {phase.status}
                                </Badge>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {paymentRecord?.rateEditHistory && paymentRecord.rateEditHistory.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-bold text-slate-800">Rate Modification History</h4>
                    </div>
                    <div className="space-y-3">
                      {[...paymentRecord.rateEditHistory].reverse().map((entry, idx) => (
                        <div key={`${entry.timestamp}-${idx}`} className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 font-medium mb-2">
                            Reason: <span className="font-normal italic text-slate-600">{entry.reason}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entry.changes.map((change, cIdx) => (
                              <span key={`change-${cIdx}`} className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
                                {change}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {order.details?.products && order.details.products.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>Products</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {dispatchedCount} Dispatched
                      </span>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        {pendingDispatchCount} Pending
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {order.details.products.length} Items
                      </span>
                    </div>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="divide-y divide-slate-100">
                      {order.details.products.map((p, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-800 truncate">{p.name || 'Unknown Product'}</h4>
                            {p.size && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.size}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {p.rate && (
                                <span className="text-xs text-slate-500">Rate: {p.rate}</span>
                              )}
                              {p.amount && (
                                <span className="text-xs text-slate-500 font-medium text-slate-700">Total: {p.amount}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                            <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                              Qty: {p.quantity || 1}
                            </span>
                            {p.isDispatched && (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Dispatched: {p.dispatchedQuantity || p.quantity || 1}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Attachments & Customer Documents */}
              <div>
                {/* Hidden File Inputs for Direct One-Click Upload */}
                <input 
                  type="file" 
                  ref={quotationInputRef} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,image/*" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleDirectUpload('quotation', e.target.files[0]);
                  }} 
                />
                <input 
                  type="file" 
                  ref={poInputRef} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleDirectUpload('po', e.target.files[0]);
                  }} 
                />
                <input 
                  type="file" 
                  ref={drawingInputRef} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,image/*" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleDirectUpload('drawing', e.target.files[0]);
                  }} 
                />
                <input 
                  type="file" 
                  ref={checklistInputRef} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleDirectUpload('checklist', e.target.files[0]);
                  }} 
                />
                <input 
                  type="file" 
                  ref={ocInputRef} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleDirectUpload('oc', e.target.files[0]);
                  }} 
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-bold text-slate-800">Order Attachments & Documents</h4>
                  <button
                    type="button"
                    onClick={() => setIsUploadDocsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer w-fit"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Manage All Documents</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Quotation */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-indigo-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <FileText className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quotation</p>
                          {(order.details?.quotationFileName || files.quotationFileData) ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Attached</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">Missing</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.quotationFileName || (files.quotationFileData ? 'Quotation.pdf' : 'No quotation attached')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(order.details?.quotationFileName || 'Quotation.pdf', files.quotationFileData)}
                        disabled={!order.details?.quotationFileName && !files.quotationFileData}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button 
                        type="button"
                        onClick={() => quotationInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Upload or Replace Quotation"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {order.details?.quotationFileName ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>

                  {/* Purchase Order (PO) */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-emerald-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <Paperclip className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase Order (PO)</p>
                          {(order.details?.poFileName || files.poFileData) ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Attached</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">Missing</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.poFileName || (files.poFileData ? 'Purchase_Order.pdf' : 'No PO attached')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(order.details?.poFileName || 'Purchase_Order.pdf', files.poFileData)}
                        disabled={!order.details?.poFileName && !files.poFileData}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button 
                        type="button"
                        onClick={() => poInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Upload or Replace Purchase Order"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {order.details?.poFileName || files.poFileData ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>

                  {/* Customer Drawing / Layout */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-amber-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <FileText className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Drawing / Layout</p>
                          {(order.details?.drawingFileName || files.drawingFileData) ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Attached</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">Missing</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.drawingFileName || (files.drawingFileData ? 'Drawing.pdf' : 'No drawing attached')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(order.details?.drawingFileName || 'Drawing.pdf', files.drawingFileData)}
                        disabled={!order.details?.drawingFileName && !files.drawingFileData}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button 
                        type="button"
                        onClick={() => drawingInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Upload or Replace Drawing"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {order.details?.drawingFileName || files.drawingFileData ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>

                  {/* Customer Checklist */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-indigo-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Checklist</p>
                          {(order.details?.checklistFileName || files.checklistFileData) ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Attached</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">Missing</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.checklistFileName || (files.checklistFileData ? 'Customer_Checklist.pdf' : 'No checklist attached')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(order.details?.checklistFileName || 'Customer_Checklist.pdf', files.checklistFileData)}
                        disabled={!order.details?.checklistFileName && !files.checklistFileData}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button 
                        type="button"
                        onClick={() => checklistInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Upload or Replace Checklist"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {order.details?.checklistFileName || files.checklistFileData ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>

                  {/* OC / QC Document */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-pink-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-pink-600 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-pink-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">OC / QC Document</p>
                          {(order.details?.ocFileName || files.ocFileData) ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Attached</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">Missing</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.ocFileName || (files.ocFileData ? 'OC_QC_Document.pdf' : 'No OC/QC attached')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(order.details?.ocFileName || 'OC_QC_Document.pdf', files.ocFileData)}
                        disabled={!order.details?.ocFileName && !files.ocFileData}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-pink-50 text-pink-800 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button 
                        type="button"
                        onClick={() => ocInputRef.current?.click()}
                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Upload or Replace OC/QC Document"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {order.details?.ocFileName || files.ocFileData ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {onDelete && (
                <div className="border-t border-slate-100 pt-6 flex justify-end items-center gap-3">
                  {isConfirmingDelete ? (
                    <>
                      <span className="text-sm text-slate-600 font-medium mr-2">Are you sure?</span>
                      <button
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setIsConfirmingDelete(false);
                          onDelete();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Yes, Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Order
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {order && (
        <UploadDrawingChecklistModal
          isOpen={isUploadDocsOpen}
          onClose={() => setIsUploadDocsOpen(false)}
          order={order}
          onSuccess={(updatedOrder) => {
            if (updatedOrder?.details) {
              order.details = { ...(order.details || {}), ...updatedOrder.details };
            }
            getOrderFiles(order.id || order.docId).then((f) => setFiles(f || {}));
          }}
        />
      )}
    </AnimatePresence>
  );
}
