import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, User, Building, Phone, Mail, MapPin, Hash, Paperclip, Loader2, Trash2, Truck, MessageCircle } from 'lucide-react';
import { Badge } from './Badge';
import { getOrderFiles } from '../lib/fileStorage';
import { getPaymentForOrder, PaymentRecord } from '../lib/payments';
import { Clock, TrendingUp } from 'lucide-react';

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
    if (isOpen && order) {
      setIsLoadingFiles(true);
      Promise.all([
        getOrderFiles(order.id || order.docId),
        getPaymentForOrder(order.id)
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full"
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
                      order.status === 'Completed' ? 'success' : 
                      order.status === 'Processing' ? 'info' : 
                      order.status === 'New' ? 'purple' : 
                      order.status === 'Cancelled' ? 'error' : 'warning'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
              {paymentRecord && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Financial Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.grandTotal || order.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Advance</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.advancePayment || paymentRecord.advanceRequirement || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Transport</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.transportationCharges || paymentRecord.loadingCharges || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Installation</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.installationCharges || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {paymentRecord.rateEditHistory && paymentRecord.rateEditHistory.length > 0 && (
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
              )}

              
              {/* Products Extracted */}
              {order.details?.products && order.details.products.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>Products</span>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {order.details.products.length} Items
                    </span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="divide-y divide-slate-100">
                      {order.details.products.map((p: any, i: number) => (
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

              {/* Attachments */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quotation */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-indigo-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <FileText className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Quotation</p>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.quotationFileName || 'No quotation attached'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(order.details?.quotationFileName || 'Quotation.pdf', files.quotationFileData)}
                      disabled={!order.details?.quotationFileName || isLoadingFiles || !files.quotationFileData}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>

                  {/* PO */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-emerald-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <Paperclip className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Purchase Order</p>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.poFileName || 'No PO attached'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(order.details?.poFileName || 'PO.pdf', files.poFileData)}
                      disabled={!order.details?.poFileName || isLoadingFiles || !files.poFileData}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>

                  {/* Drawing */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-amber-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <FileText className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Drawing</p>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {order.details?.drawingFileName || 'No drawing attached'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(order.details?.drawingFileName || 'Drawing.pdf', files.drawingFileData)}
                      disabled={!order.details?.drawingFileName || isLoadingFiles || !files.drawingFileData}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>

                  {/* OC Document */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-white hover:border-pink-300 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
                        {isLoadingFiles ? <Loader2 className="w-4 h-4 text-pink-600 animate-spin" /> : <FileText className="w-4 h-4 text-pink-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">OC Document</p>
                        <p className="text-sm font-medium text-slate-600 truncate">
                          {files.ocFileData ? 'Attached' : 'No OC attached'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload('OC_Document.pdf', files.ocFileData)}
                      disabled={isLoadingFiles || !files.ocFileData}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-pink-50 text-pink-700 rounded-lg text-sm font-semibold hover:bg-pink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
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
    </AnimatePresence>
  );
}
