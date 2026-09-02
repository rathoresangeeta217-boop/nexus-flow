import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Save, Package, CheckSquare, Image as ImageIcon, Plus, Trash2, Edit2, FileText, Check, Truck, User, MapPin, Phone } from 'lucide-react';
import { Order, OrderProduct, saveOrder } from '../lib/orders';
import { Product, subscribeToProducts } from '../lib/products';
import { getProductFile } from '../lib/fileStorage';
import { Badge } from './Badge';
import { getOrderFiles, saveOrderFiles } from '../lib/fileStorage';
import { generateDispatchPDF, generatePaymentReminderPDF } from '../lib/pdfHelper';
import { getPaymentForOrder, PaymentRecord } from '../lib/payments';

interface DispatchViewProps {
  order: Order;
  onBack: () => void;
}

export function DispatchView({ order, onBack }: DispatchViewProps) {
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [quotationFile, setQuotationFile] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQuotation, setShowQuotation] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [showFarePrompt, setShowFarePrompt] = useState(false);
  const [showPendingReasonPrompt, setShowPendingReasonPrompt] = useState(false);
  const [pendingReason, setPendingReason] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showEmployeePrompt, setShowEmployeePrompt] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      if (order.id || order.docId) {
        try {
          const p = await getPaymentForOrder(order.id || order.docId || '');
          setPaymentRecord(p);
        } catch (error) {
          console.error('Error fetching payment record', error);
        }
      }
    };
    fetchPayment();
  }, [order.id, order.docId]);
  
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [dispatchAddress, setDispatchAddress] = useState(order.details?.address || '');
  const [vehicleNumber, setVehicleNumber] = useState(order.details?.vehicleNumber || '');
  const [driverName, setDriverName] = useState(order.details?.driverName || '');
  const [driverMobile, setDriverMobile] = useState(order.details?.driverMobile || '');
  const [bankDetails, setBankDetails] = useState(order.details?.bankDetails || '');
  const [logisticCharges, setLogisticCharges] = useState(order.details?.logisticCharges || '');
  const [firstDispatchAmount, setFirstDispatchAmount] = useState(order.details?.firstDispatchAmount || '');
  const [secondDispatchAmount, setSecondDispatchAmount] = useState(order.details?.secondDispatchAmount || '');
  const [placeOfSupply, setPlaceOfSupply] = useState(order.details?.placeOfSupply || '');
  const [reasonForTransport, setReasonForTransport] = useState(order.details?.reasonForTransport || 'Delivery');

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }
  
  // Temporary edit state
  const [editName, setEditName] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editRate, setEditRate] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [dispatchPromptProduct, setDispatchPromptProduct] = useState<OrderProduct | null>(null);
  const [dispatchQty, setDispatchQty] = useState(1);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [matchedImages, setMatchedImages] = useState<Record<string, string>>({});
  const [showOCUpload, setShowOCUpload] = useState(false);
  const [ocDocument, setOcDocument] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProducts((prods) => {
      setInventory(prods);
    });
    return () => unsubscribe();
  }, []);



  useEffect(() => {
    const loadImages = async () => {
      if (inventory.length === 0 || products.length === 0) return;
      const newImages = { ...matchedImages };
      let changed = false;
      
      for (const p of products) {
        if (!p.image && !newImages[p.id]) {
          // Try to match
          const match = inventory.find(inv => inv.name.toLowerCase() === p.name.toLowerCase() || (inv.name.toLowerCase().includes(p.name.toLowerCase()) && p.name.length > 3));
          if (match) {
            if (match.details?.productImageData) {
              newImages[p.id] = match.details.productImageData;
              changed = true;
            } else if (match.docId) {
              const fileData = await getProductFile(match.docId);
              if (fileData) {
                newImages[p.id] = fileData;
                changed = true;
              }
            }
          }
        }
      }
      
      if (changed) {
        setMatchedImages(newImages);
      }
    };
    
    loadImages();
  }, [inventory, products]);

  useEffect(() => {
    if (quotationFile && quotationFile.startsWith('data:application/pdf')) {
      fetch(quotationFile)
        .then(res => res.blob())
        .then(blob => setPdfBlobUrl(URL.createObjectURL(blob)))
        .catch(e => console.error(e));
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [quotationFile]);

  useEffect(() => {
    if (order) {
      if (order.details?.products && order.details.products.length > 0) {
        setProducts(order.details.products);
      } else {
        const itemCount = order.items || 1;
        const mockProducts: OrderProduct[] = Array.from({ length: itemCount }).map((_, i) => ({
          id: `prod-${i}-${Date.now()}`,
          name: '',
          quantity: 1,
          size: '',
          isDispatched: false
        }));
        setProducts(mockProducts);
      }

      getOrderFiles(order.id).then(files => {
        if (files?.quotationFileData) {
          setQuotationFile(files.quotationFileData);
        }
      });
    }
  }, [order]);

  const toggleDispatch = (product: OrderProduct) => {
    if (product.isDispatched) {
      setProducts(prev => 
        prev.map(p => p.id === product.id ? { ...p, isDispatched: false, dispatchedQuantity: 0 } : p)
      );
    } else {
      if (product.quantity <= 1) {
        setProducts(prev => 
          prev.map(p => p.id === product.id ? { ...p, isDispatched: true, dispatchedQuantity: product.quantity } : p)
        );
      } else {
        setDispatchPromptProduct(product);
        setDispatchQty(product.quantity);
      }
    }
  };

  const confirmDispatchQty = (qty: number) => {
    if (!dispatchPromptProduct) return;
    setProducts(prev => 
      prev.map(p => p.id === dispatchPromptProduct.id ? { ...p, isDispatched: true, dispatchedQuantity: qty } : p)
    );
    setDispatchPromptProduct(null);
  };

  const startEdit = (product: OrderProduct) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditSize(product.size || '');
    setEditQty(product.quantity);
    setEditRate(product.rate || '');
    setEditImage(product.image || null);
  };

  const saveEdit = async (id: string) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, name: editName, size: editSize, quantity: editQty, image: editImage || undefined, rate: editRate } : p
    );
    setProducts(updatedProducts);
    setEditingId(null);
    
    try {
      const updatedOrder = {
        ...order,
        details: {
          ...order.details,
          products: updatedProducts
        }
      };
      await saveOrder(updatedOrder);
    } catch (e) {
      console.error('Failed to auto-save product edit:', e);
    }
  };

  const addProduct = () => {
    const newProduct: OrderProduct = {
      id: `prod-new-${Date.now()}`,
      name: 'New Product',
      quantity: 1,
      size: '',
      isDispatched: false
    };
    setProducts([...products, newProduct]);
    startEdit(newProduct);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    // Check if any product is dispatched
    const anyDispatched = products.some(p => p.isDispatched);
    if (!anyDispatched) {
      setAlertMessage('Please select at least one product to dispatch.');
      return;
    }
    // Set default address from quotation if empty
    if (!dispatchAddress && order.details?.address) {
      setDispatchAddress(order.details.address);
    }
    setShowDispatchForm(true);
  };

  
    const handleEmployeeReminder = () => {
    setShowEmployeePrompt(true);
  };

  const sendEmployeeReminder = (phone: string) => {
    // Generate and download the PDF first so they can attach it
    generatePaymentReminderPDF({ ...order, details: { ...order.details, products, bankDetails,
          logisticCharges,
          firstDispatchAmount,
          secondDispatchAmount,
          placeOfSupply,
          reasonForTransport
        } }, paymentRecord);

    const dispatchedCount = products.filter(p => p.isDispatched).reduce((sum, p) => sum + p.quantity, 0) || products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = order.amount || 'N/A';
const parseVal = (str) => {
      if (!str) return 0;
      const strVal = str.toString();
      const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
      const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;
      const baseTotal = paymentRecord && paymentRecord.grandTotal ? (strVal.match(/\d[\d,]*(\.\d+)?/) ? parseFloat(strVal.match(/\d[\d,]*(\.\d+)?/)[0].replace(/,/g, "")) : orderAmt) : orderAmt;
      
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
    const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;
    const grandTotal = paymentRecord ? (parseVal(paymentRecord.grandTotal) || orderAmt) : orderAmt;

    const parsePhaseVal = (str) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && grandTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * grandTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const alreadyReceived = paymentRecord?.phases
      ?.filter(p => p.status === 'Received')
      .reduce((sum, p) => sum + parsePhaseVal(p.amount), 0) || 0;
    const receivedText = alreadyReceived > 0 ? `\nPayment Already Received: ₹${alreadyReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

    const text = `*Dispatch Summary - Order ${order.id || order.docId}*

Customer: ${order.customer}
Products Dispatched Today: ${dispatchedCount} units
Total Order Value: ${totalValue}${receivedText}

Please follow up on pending payments. The Payment Reminder PDF has been downloaded to attach.`;
    
    setShowEmployeePrompt(false);
    
    if (phone) {
      setTimeout(() => {
        window.open(`https://web.whatsapp.com/send?phone=${phone.replace('+', '')}&text=${encodeURIComponent(text)}`, '_blank');
      }, 1000);
    } else {
      navigator.clipboard.writeText(text);
      setAlertMessage('Payment reminder text copied to clipboard! PDF downloaded.');
    }
  };

  const handleDriverDetails = () => {
    // Generate Dispatch PDF (no amounts/fares)
    const enhancedOrder = {
      ...order,
      vehicleNumber: vehicleNumber || order.vehicleNumber || order.details?.vehicleNumber,
      driverName: driverName || order.driverName || order.details?.driverName,
      driverMobile: driverMobile || order.driverMobile || order.details?.driverMobile,
      dispatchAddress: dispatchAddress || order.dispatchAddress || order.details?.address,
      logisticCharges: logisticCharges || order.details?.logisticCharges,
      firstDispatchAmount: firstDispatchAmount || order.details?.firstDispatchAmount,
      secondDispatchAmount: secondDispatchAmount || order.details?.secondDispatchAmount,
      placeOfSupply: placeOfSupply || order.details?.placeOfSupply,
      reasonForTransport: reasonForTransport || order.details?.reasonForTransport,
      details: { ...order.details, products }
    };
    generateDispatchPDF(enhancedOrder, false, 'Dispatch Notice');

    const address = order.vehicleNumber ? (order.dispatchAddress || order.details?.address || 'N/A') : (dispatchAddress || order.details?.address || 'N/A');
    const vNum = order.vehicleNumber || vehicleNumber || 'N/A';
    // Removed Fare / Value from driver message as requested
    const text = `*Dispatch Details - Order ${order.id || order.docId}*

Date: ${new Date().toLocaleDateString('en-GB')}
Time: ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}

Delivery Address: ${address}
Vehicle: ${vNum}
${logisticCharges ? `Logistic Charges: ${logisticCharges}
` : ''}

Please drive safely. The Dispatch Notice PDF has been downloaded to attach.`;
    
    const driverPhone = order.driverMobile || driverMobile;
    if (driverPhone) {
      setTimeout(() => {
        window.open(`https://web.whatsapp.com/send?phone=${driverPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
      }, 1000);
    } else {
      navigator.clipboard.writeText(text);
      setAlertMessage('Driver details text copied to clipboard! PDF downloaded.');
    }
  };

  const getRemainingPayment = () => {
    const parseVal = (str: string | undefined, baseTotal: number = 0) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
    const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;

    if (!paymentRecord) return orderAmt;

    const grandTotal = parseVal(paymentRecord.grandTotal) || orderAmt;
    const transport = parseVal(paymentRecord.transportationCharges || paymentRecord.loadingCharges, grandTotal);
    const install = parseVal(paymentRecord.installationCharges, grandTotal);
    
    const displayTotalAmt = grandTotal + transport + install;

    let receivedPhasesTotal = 0;
    if (paymentRecord.phases) {
      paymentRecord.phases.forEach(phase => {
        if (phase.status === 'Received') {
          receivedPhasesTotal += parseVal(phase.amount, grandTotal);
        }
      });
    }
    
    return displayTotalAmt - receivedPhasesTotal;
  };

  const handleChallanClick = () => {
    const remaining = getRemainingPayment();
    const status = order.details?.challanApprovalStatus;
    
    if (status === 'Approved') {
      setShowFarePrompt(true);
      return;
    }
    
    if (status === 'Pending') {
      setAlertMessage('Challan generation is waiting for admin approval. Please check back later.');
      return;
    }
    
    if (status === 'Rejected') {
      setShowPendingReasonPrompt(true);
      return;
    }

    if (remaining > 0.01) {
      setShowPendingReasonPrompt(true);
    } else {
      setShowFarePrompt(true);
    }
  };

  const generateNoticePDF = (showFare: boolean) => {
    setShowFarePrompt(false);
    const enhancedOrder = {
      ...order,
      vehicleNumber: vehicleNumber || order.vehicleNumber || order.details?.vehicleNumber,
      driverName: driverName || order.driverName || order.details?.driverName,
      driverMobile: driverMobile || order.driverMobile || order.details?.driverMobile,
      dispatchAddress: dispatchAddress || order.dispatchAddress || order.details?.address,
      logisticCharges: logisticCharges || order.details?.logisticCharges,
      firstDispatchAmount: firstDispatchAmount || order.details?.firstDispatchAmount,
      secondDispatchAmount: secondDispatchAmount || order.details?.secondDispatchAmount,
      placeOfSupply: placeOfSupply || order.details?.placeOfSupply,
      reasonForTransport: reasonForTransport || order.details?.reasonForTransport,
      details: { ...order.details, products }
    };
    generateDispatchPDF(enhancedOrder, showFare, 'Challan');
    
    // Check for customer phone to open WhatsApp
    const custPhone = order.details?.mobileNumber;
    if (custPhone) {
      setTimeout(() => {
        const text = `Hello ${order.customer}, please find your Challan attached. Order ID: ${order.id || order.docId}`;
        window.open(`https://web.whatsapp.com/send?phone=${custPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
      }, 1000);
    }
  };

  const confirmFinalDispatch = async () => {
    if (!order || !order.docId) return;
    setIsSaving(true);
    try {
      const updatedOrder = {
        ...order,
        items: products.length, // update item count
        details: {
          ...order.details,
          products: products,
          dispatchAddress,
          vehicleNumber,
          driverName,
          driverMobile,
          bankDetails,
          logisticCharges,
          firstDispatchAmount,
          secondDispatchAmount,
          placeOfSupply,
          reasonForTransport
        }
      };
      
      // If dispatch is scheduled, update the status
      if (order.status !== 'Delivered' && order.status !== 'Completed') {
         updatedOrder.status = 'Scheduled Dispatched';
      }
      
      await saveOrder(updatedOrder);
      onBack();
    } catch (error) {
      console.error('Failed to schedule dispatch:', error);
      setAlertMessage('Failed to save dispatch schedule.');
    } finally {
      setIsSaving(false);
      setShowDispatchForm(false);
    }
  };



  const handleConfirmDispatchedClick = () => {
    if (order.customer.toLowerCase().includes('autoexim')) {
      markAsDispatched();
    } else {
      setShowOCUpload(true);
    }
  };

  const markAsDispatched = async () => {
    if (!order || !order.docId) return;
    setIsSaving(true);
    try {
      const updatedOrder = {
        ...order,
        status: 'Dispatched'
      };
      await saveOrder(updatedOrder);
      
      if (ocDocument) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const existingFiles = await getOrderFiles(order.id || order.docId);
          await saveOrderFiles(order.id || order.docId, {
            ...existingFiles,
            ocFileData: base64data
          });
          setAlertMessage('Order marked as Dispatched successfully!');
          setIsSaving(false);
          setShowOCUpload(false);
        };
        reader.readAsDataURL(ocDocument);
        return; // wait for async reader
      }

      setAlertMessage('Order marked as Dispatched successfully!');
    } catch (error) {
      console.error('Failed to mark as dispatched:', error);
      setAlertMessage('Failed to update status.');
    } finally {
      if (!ocDocument) {
        setIsSaving(false);
        setShowOCUpload(false);
      }
    }
  };

  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-8"
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            Dispatch Order
            <Badge variant="info">{order.id}</Badge>
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500 font-medium">Customer: {order.customer}</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'Payments', search: order.customer } }))}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
            >
              View Payments
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-end">
          {quotationFile && (
            <button 
              onClick={() => setShowQuotation(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
            >
              <FileText className="w-4 h-4" />
              View Quotation
            </button>
          )}
        </div>
        <div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Order Items</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setProducts(prev => prev.map(p => ({ ...p, isDispatched: true, dispatchedQuantity: p.quantity })))}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Select All
                </button>
                <button 
                  onClick={addProduct}
                  className="flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
              {products.map((product, idx) => (
                <div key={`${product.id || "k"}-${idx}`} className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-6 hover:bg-slate-50 transition-colors gap-4 group">
                  <div 
                    className="flex-shrink-0 pt-1 sm:pt-0 cursor-pointer"
                    onClick={() => { if (editingId !== product.id) toggleDispatch(product); }}
                  >
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${product.isDispatched ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {product.isDispatched && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 relative group">
                    {editingId === product.id ? (
                      <label className="cursor-pointer w-full h-full relative block">
                        {editImage || matchedImages[product.id] ? (
                          <>
                            <img src={editImage || matchedImages[product.id]} alt="Product" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Plus className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center hover:bg-slate-200 transition-colors">
                            <Plus className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-500 font-medium">Add Img</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setEditImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                    ) : (
                      (product.image || matchedImages[product.id] || (quotationFile && quotationFile.startsWith('data:image'))) ? (
                        <img src={product.image || matchedImages[product.id] || quotationFile || ''} alt={product.name || 'Product'} className="w-full h-full object-cover" />
                      ) : (quotationFile && quotationFile.startsWith('data:application/pdf')) ? (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-indigo-50 text-indigo-400">
                           <FileText className="w-6 h-6" />
                           <span className="text-[10px] mt-1 font-medium">PDF</span>
                        </div>
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {editingId === product.id ? (
                      <div className="space-y-2 w-full max-w-sm">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search product from inventory..."
                            autoFocus
                            list="inventory-products"
                          />
                          <datalist id="inventory-products">
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={editSize}
                            onChange={e => setEditSize(e.target.value)}
                            className="w-2/3 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Description"
                          />
                          <input 
                            type="number" 
                            min="1"
                            value={editQty}
                            onChange={e => setEditQty(parseInt(e.target.value) || 1)}
                            className="w-1/3 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Qty"
                          />
                          <input 
                            type="text" 
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-1/3 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Unit Price"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="cursor-pointer" onClick={() => startEdit(product)}>
                        <h4 className="text-base font-bold text-slate-800">
                          {product.name || <span className="text-slate-400 italic">Click to select product...</span>}
                        </h4>
                        <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                          {product.size && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium border border-slate-200">
                              Desc: {product.size}
                            </span>
                          )}
                          <span className="font-semibold">Qty: {product.quantity}</span>
                          {product.rate && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium border border-emerald-100">Rate: {product.rate}</span>}
                          {product.isDispatched && product.dispatchedQuantity !== undefined && (
                            <span 
                              className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium ml-2 cursor-pointer hover:bg-indigo-200 transition-colors inline-flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDispatchPromptProduct(product);
                                setDispatchQty(product.dispatchedQuantity || 1);
                              }}
                              title="Edit dispatched quantity"
                            >
                              Dispatching: {product.dispatchedQuantity}
                              <Edit2 className="w-3 h-3 ml-1" />
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingId === product.id ? (
                      <button onClick={() => saveEdit(product.id)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => startEdit(product)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="ml-2">
                      <Badge variant={product.isDispatched ? (product.dispatchedQuantity === product.quantity ? 'success' : 'info') : 'warning'}>
                        {product.isDispatched ? (product.dispatchedQuantity === product.quantity ? 'Ready' : 'Partial') : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No products found for this order.</p>
                  <button onClick={addProduct} className="mt-4 text-indigo-600 font-medium hover:underline">
                    Add a product manually
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              {order.status === 'Scheduled Dispatched' || order.status === 'Dispatched' ? (
                <>
                  <button 
                    onClick={onBack}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  
                  {order.status !== 'Dispatched' && (
                    <button 
                      onClick={handleConfirmDispatchedClick}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isSaving ? 'Confirming...' : 'Confirm Dispatched'}
                    </button>
                  )}
                  <button 
                    onClick={handleEmployeeReminder}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Payment Reminder (Employee)
                  </button>
                  <button 
                    onClick={() => {
                      generatePaymentReminderPDF({ ...order, details: { ...order.details, products, bankDetails, logisticCharges, firstDispatchAmount, secondDispatchAmount, placeOfSupply, reasonForTransport } }, paymentRecord);
                      const custPhone = order.details?.mobileNumber;
                      if (custPhone) {
                        setTimeout(() => {
                          
                      const parseVal = (str) => {
      if (!str) return 0;
      const strVal = str.toString();
      const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
      const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;
      const baseTotal = paymentRecord && paymentRecord.grandTotal ? (strVal.match(/\d[\d,]*(\.\d+)?/) ? parseFloat(strVal.match(/\d[\d,]*(\.\d+)?/)[0].replace(/,/g, "")) : orderAmt) : orderAmt;
      
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
    const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;
    const grandTotal = paymentRecord ? (parseVal(paymentRecord.grandTotal) || orderAmt) : orderAmt;

    const parsePhaseVal = (str) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && grandTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * grandTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const alreadyReceived = paymentRecord?.phases
      ?.filter(p => p.status === 'Received')
      .reduce((sum, p) => sum + parsePhaseVal(p.amount), 0) || 0;
                      const receivedText = alreadyReceived > 0 ? ` (Payment Already Received: ₹${alreadyReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '';
                      const text = `Hello ${order.customer}, please find your Payment Reminder attached. Order ID: ${order.id || order.docId}${receivedText}`;

                          window.open(`https://web.whatsapp.com/send?phone=${custPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                        }, 1000);
                      }
                    }}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Payment Reminder (PDF)
                  </button>
                  <button 
                    onClick={() => {
                      const enhancedOrder = { ...order, details: { ...order.details, products, bankDetails, logisticCharges, firstDispatchAmount, secondDispatchAmount, placeOfSupply, reasonForTransport } };
                      generateDispatchPDF(enhancedOrder, false, 'Packing List');
                    }}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded-lg hover:bg-fuchsia-100 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Packing List
                  </button>
                  <button 
                    onClick={handleDriverDetails}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Send to Driver
                  </button>
                  <button 
                    onClick={handleChallanClick}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Challan
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={onBack}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Scheduled Dispatched'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQuotation && quotationFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowQuotation(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Quotation Document</h3>
                </div>
                <button 
                  onClick={() => setShowQuotation(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-50 relative"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-100 p-4">
                {quotationFile.startsWith('data:image') ? (
                  <img src={quotationFile} alt="Quotation" className="max-w-full h-auto mx-auto rounded-lg shadow-sm border border-slate-200" />
                ) : quotationFile.startsWith('data:application/pdf') ? (
                  
                  
                  <div className="flex flex-col h-full w-full">
                    
                    {pdfBlobUrl && (
                      <div className="flex justify-end mb-3 shrink-0">
                        <a 
                          href={pdfBlobUrl} 
                          download={`Quotation-${order?.id || 'Document'}.pdf`}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          Download PDF
                        </a>
                      </div>
                    )}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-y-auto relative flex justify-center p-4">
                      {pdfBlobUrl ? (
                        <Document file={pdfBlobUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="text-slate-500 py-10">Rendering PDF...</div>}>
                          {Array.from(new Array(numPages), (el, index) => (
                            <div key={`page_${index + 1}`} className="mb-4 shadow-md border border-slate-200 bg-white">
                              <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} width={800} />
                            </div>
                          ))}
                        </Document>
                      ) : (
                        <div className="flex justify-center items-center h-full text-slate-500">Loading PDF...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <FileText className="w-12 h-12 mb-2 text-slate-300" />
                    <p>Document format not supported for preview</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dispatchPromptProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Dispatch Quantity</h3>
                <p className="text-sm text-slate-500 mb-4">How many units of <span className="font-semibold text-slate-700">{dispatchPromptProduct.name || 'this product'}</span> are you dispatching?</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => confirmDispatchQty(dispatchPromptProduct.quantity)}
                    className="w-full flex items-center justify-between px-4 py-3 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-700">Full Quantity</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-bold">{dispatchPromptProduct.quantity} units</span>
                  </button>
                  
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Custom Quantity</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={dispatchPromptProduct.quantity}
                        value={dispatchQty}
                        onChange={(e) => setDispatchQty(Math.min(dispatchPromptProduct.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={() => confirmDispatchQty(dispatchQty)}
                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setDispatchPromptProduct(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showDispatchForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  Dispatch Details
                </h3>
                <button 
                  onClick={() => setShowDispatchForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 space-y-4 text-left">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Delivery Address
                  </label>
                  <textarea
                    value={dispatchAddress}
                    onChange={(e) => setDispatchAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 text-sm"
                    placeholder="Enter delivery address..."
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase text-sm"
                    placeholder="e.g. MH 04 AB 1234"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter driver's name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter mobile number..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Logistic Charges
                  </label>
                  <input
                    type="text"
                    value={logisticCharges}
                    onChange={(e) => setLogisticCharges(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Rs. 1,500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">First Dispatch Amount (if any)</label>
                  <input type="text" value={firstDispatchAmount} onChange={(e) => setFirstDispatchAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. 5000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">Second Dispatch Amount (if any)</label>
                  <input type="text" value={secondDispatchAmount} onChange={(e) => setSecondDispatchAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. 3000" />
                </div>                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Reason for Transport
                  </label>
                  <select
                    value={reasonForTransport}
                    onChange={(e) => setReasonForTransport(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Sale">Sale</option>
                    <option value="Sale on Approval">Sale on Approval</option>
                    <option value="Job Work">Job Work</option>
                    <option value="Return">Return</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
              
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowDispatchForm(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFinalDispatch}
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Confirm Dispatch'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Notice</h3>
                <p className="text-sm text-slate-600 mb-6">{alertMessage}</p>
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Okay
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showPendingReasonPrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Pending Payment Alert</h3>
                </div>
                <button 
                  onClick={() => setShowPendingReasonPrompt(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <p className="text-sm text-slate-600 mb-4">
                  {order.details?.challanApprovalStatus === 'Rejected' 
                    ? "Your previous challan request was rejected by the admin. Please provide a new reason to resubmit for approval."
                    : "The remaining payment for this order is not zero. You must provide a reason for creating a Challan, which will be sent to the admin."}
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                  <textarea
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="Enter reason..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowPendingReasonPrompt(false)}
                  className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!pendingReason.trim()) {
                      setAlertMessage('Please enter a reason.');
                      return;
                    }
                    setIsSaving(true);
                    try {
                      const updatedOrder = {
                        ...order,
                        details: {
                          ...order.details,
                          challanApprovalStatus: 'Pending',
                          challanPendingReason: pendingReason
                        }
                      };
                      await saveOrder(updatedOrder);
                      
                      const remaining = getRemainingPayment();
                      const approvalLink = window.location.origin + '?approveChallan=' + (order.id || order.docId);
                      const text = `*Challan Approval Request*\n\nOrder ID: ${order.id || order.docId}\nCustomer: ${order.customer}\nRemaining Payment: Rs. ${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n*Reason for dispatch without full payment:*\n${pendingReason}\n\n*Click here to Approve or Reject:*\n${approvalLink}`;
                      const adminPhone = "919314871718";
                      window.open(`https://web.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(text)}`, '_blank');
                      
                      setShowPendingReasonPrompt(false);
                      setPendingReason("");
                      setAlertMessage("Approval request sent to Admin. You will be able to generate the Challan once approved.");
                    } catch (e) {
                      setAlertMessage("Failed to send approval request.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Send for Approval
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFarePrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Challan Options</h3>
                <p className="text-sm text-slate-500 mb-4">Would you like to include the total fare / charges in the Challan?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => generateNoticePDF(true)} className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Yes, include Fare</button>
                  <button onClick={() => generateNoticePDF(false)} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">No, hide Fare</button>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setShowFarePrompt(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    
      <AnimatePresence>
        {showEmployeePrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Send Payment Reminder To:</h3>
                <p className="text-sm text-slate-500 mb-4">Select the employee to send the WhatsApp reminder.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => sendEmployeeReminder('919509256462')} className="w-full py-2.5 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#128C7E] transition-colors">Abhilasha</button>
                  <button onClick={() => sendEmployeeReminder('916376165128')} className="w-full py-2.5 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#128C7E] transition-colors">Kushboo</button>
                  <button onClick={() => sendEmployeeReminder('919509282388')} className="w-full py-2.5 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#128C7E] transition-colors">Anshuman</button>
                  <button onClick={() => sendEmployeeReminder('')} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">Just Copy to Clipboard</button>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setShowEmployeePrompt(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOCUpload && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Confirm Dispatch</h2>
                </div>
                <button 
                  onClick={() => setShowOCUpload(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Please upload the OC (Order Confirmation / Challan) document (Optional) before marking as Dispatched.</p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">OC Document</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setOcDocument(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowOCUpload(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={markAsDispatched}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Confirm Dispatched'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
