import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Save, Package, CheckSquare, Image as ImageIcon, Plus, Trash2, Edit2, FileText, Check, Truck, User, MapPin, Phone, Wrench, Send, ClipboardList, ShieldAlert, AlertTriangle, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Order, OrderProduct, saveOrder } from '../lib/orders';
import { Product, subscribeToProducts } from '../lib/products';
import { getProductFile } from '../lib/fileStorage';
import { Badge } from './Badge';
import { getOrderFiles, saveOrderFiles } from '../lib/fileStorage';
import { generateDispatchPDF, generatePaymentReminderPDF, generateSatisfactionFormPDF } from '../lib/pdfHelper';
import { getPaymentForOrder, PaymentRecord } from '../lib/payments';
import { getInstallers, subscribeToInstallers, Installer } from '../lib/installers';
import { useAuth } from '../contexts/AuthContext';

interface DispatchViewProps {
  order: Order;
  onBack: () => void;
  isInstallationView?: boolean;
}

export function DispatchView({ order, onBack, isInstallationView = false }: DispatchViewProps) {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [quotationFile, setQuotationFile] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQuotation, setShowQuotation] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [showFarePrompt, setShowFarePrompt] = useState(false);
  const [includeFareInChallan, setIncludeFareInChallan] = useState(true);
  const [isGeneratingChallan, setIsGeneratingChallan] = useState(false);
  const [lastDownloadedChallan, setLastDownloadedChallan] = useState<{ url: string; fileName: string } | null>(null);
  const [showPendingReasonPrompt, setShowPendingReasonPrompt] = useState(false);
  const [pendingReason, setPendingReason] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showEmployeePrompt, setShowEmployeePrompt] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [installers, setInstallers] = useState<Installer[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToInstallers(setInstallers);
    return () => unsubscribe();
  }, []);

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
  const [dispatchAddress, setDispatchAddress] = useState(order.details?.address || order.dispatchAddress || '');
  const [vehicleNumber, setVehicleNumber] = useState(order.details?.vehicleNumber || order.vehicleNumber || '');
  const [driverName, setDriverName] = useState(order.details?.driverName || order.driverName || '');
  const [driverMobile, setDriverMobile] = useState(order.details?.driverMobile || order.driverMobile || '');
  const [bankDetails, setBankDetails] = useState(order.details?.bankDetails || '');
  const [logisticCharges, setLogisticCharges] = useState(order.details?.logisticCharges || order.logisticCharges || '');
  const [firstDispatchAmount, setFirstDispatchAmount] = useState(order.details?.firstDispatchAmount || '');
  const [secondDispatchAmount, setSecondDispatchAmount] = useState(order.details?.secondDispatchAmount || '');
  const [installerName, setInstallerName] = useState(order.details?.installerName || "");
  const [installationHelpers, setInstallationHelpers] = useState(order.details?.installationHelpers || "");
  const [installationDate, setInstallationDate] = useState(order.details?.installationDate || "");
  const [placeOfSupply, setPlaceOfSupply] = useState(order.details?.placeOfSupply || '');
  const [reasonForTransport, setReasonForTransport] = useState(order.details?.reasonForTransport || order.reasonForTransport || 'Delivery');

  useEffect(() => {
    setDispatchAddress(order.details?.address || order.dispatchAddress || '');
    setVehicleNumber(order.details?.vehicleNumber || order.vehicleNumber || '');
    setDriverName(order.details?.driverName || order.driverName || '');
    setDriverMobile(order.details?.driverMobile || order.driverMobile || '');
    setLogisticCharges(order.details?.logisticCharges || order.logisticCharges || '');
    setReasonForTransport(order.details?.reasonForTransport || order.reasonForTransport || 'Delivery');
    setPlaceOfSupply(order.details?.placeOfSupply || '');
    setFirstDispatchAmount(order.details?.firstDispatchAmount || '');
    setSecondDispatchAmount(order.details?.secondDispatchAmount || '');
  }, [order.id, order.docId, order.details?.driverName, order.details?.vehicleNumber, order.details?.driverMobile]);

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
  const [showQcUpload, setShowQcUpload] = useState(false);
  const [qcDocument, setQcDocument] = useState<File | null>(null);

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
      const updated = products.map(p => p.id === product.id ? { ...p, isDispatched: false, dispatchedQuantity: 0 } : p);
      setProducts(updated);
      if (order.id || order.docId) {
        saveOrder({
          ...order,
          details: { ...order.details, products: updated }
        }).catch(err => console.error('Error auto-saving uncheck:', err));
      }
    } else {
      if (product.quantity <= 1) {
        const updated = products.map(p => p.id === product.id ? { ...p, isDispatched: true, dispatchedQuantity: product.quantity } : p);
        setProducts(updated);
        if (order.id || order.docId) {
          saveOrder({
            ...order,
            details: { ...order.details, products: updated }
          }).catch(err => console.error('Error auto-saving check:', err));
        }
      } else {
        setDispatchPromptProduct(product);
        setDispatchQty(product.quantity);
      }
    }
  };

  const toggleSelectAll = () => {
    const allSelected = products.length > 0 && products.every(p => p.isDispatched);
    const updated = products.map(p => ({
      ...p,
      isDispatched: !allSelected,
      dispatchedQuantity: !allSelected ? p.quantity : 0
    }));
    setProducts(updated);
    if (order.id || order.docId) {
      saveOrder({
        ...order,
        details: { ...order.details, products: updated }
      }).catch(err => console.error('Error auto-saving select all:', err));
    }
  };

  const toggleRequiresInstallation = async (product: OrderProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedProducts = products.map(p => 
      p.id === product.id ? { ...p, requiresInstallation: !p.requiresInstallation } : p
    );
    setProducts(updatedProducts);
    
    // Auto-save the product edit to persist this state
    if (order.id || order.docId) {
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
        console.error('Failed to auto-save installation flag:', e);
      }
    }
  };

  const confirmDispatchQty = (qty: number) => {
    if (!dispatchPromptProduct) return;
    const updated = products.map(p => 
      p.id === dispatchPromptProduct.id ? { ...p, isDispatched: true, dispatchedQuantity: qty } : p
    );
    setProducts(updated);
    if (order.id || order.docId) {
      saveOrder({
        ...order,
        details: { ...order.details, products: updated }
      }).catch(err => console.error('Error auto-saving qty:', err));
    }
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

  const isPartialDispatch = products.length > 0 && products.some(p => !p.isDispatched || (p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null && p.dispatchedQuantity < p.quantity));
  const dispatchedItemsList = products.filter(p => p.isDispatched);
  const heldBackItemsList = products.filter(p => !p.isDispatched || (p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null && p.dispatchedQuantity < p.quantity));

  const handleChallanClick = () => {
    const anyChecked = products.some(p => p.isDispatched);
    if (!anyChecked) {
      setAlertMessage('Please select at least one item to generate a Challan.');
      return;
    }

    const remaining = getRemainingPayment();
    const status = order.details?.challanApprovalStatus;
    
    // If already approved by Super Admin, proceed directly
    if (status === 'Approved') {
      setShowFarePrompt(true);
      return;
    }

    // If current user IS Super Admin, they have authority to generate directly
    if (isSuperAdmin) {
      setShowFarePrompt(true);
      return;
    }
    
    // If pending approval by Super Admin
    if (status === 'Pending') {
      setAlertMessage('Challan generation is waiting for Super Admin approval. Please wait for Super Admin review or check back shortly.');
      return;
    }
    
    // If rejected previously by Super Admin
    if (status === 'Rejected') {
      setShowPendingReasonPrompt(true);
      return;
    }

    // If partial items are selected (some unchecked) OR payment is remaining: REQUIRES SUPER ADMIN APPROVAL
    if (isPartialDispatch || remaining > 0.01) {
      setShowPendingReasonPrompt(true);
      return;
    }

    // Full dispatch with payment clear
    setShowFarePrompt(true);
  };

  const generateNoticePDF = async (showFare: boolean) => {
    setIsGeneratingChallan(true);
    try {
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
        details: {
          ...order.details,
          products,
          vehicleNumber: vehicleNumber || order.vehicleNumber || order.details?.vehicleNumber,
          driverName: driverName || order.driverName || order.details?.driverName,
          driverMobile: driverMobile || order.driverMobile || order.details?.driverMobile,
          dispatchAddress: dispatchAddress || order.dispatchAddress || order.details?.address,
          address: dispatchAddress || order.dispatchAddress || order.details?.address,
          logisticCharges: logisticCharges || order.details?.logisticCharges,
          firstDispatchAmount: firstDispatchAmount || order.details?.firstDispatchAmount,
          secondDispatchAmount: secondDispatchAmount || order.details?.secondDispatchAmount,
          placeOfSupply: placeOfSupply || order.details?.placeOfSupply,
          reasonForTransport: reasonForTransport || order.details?.reasonForTransport,
        }
      };

      // 1. Generate & download PDF
      const result: any = await generateDispatchPDF(enhancedOrder, showFare, 'Challan');
      if (result && result.blobUrl) {
        setLastDownloadedChallan({ url: result.blobUrl, fileName: result.fileName });
      }
      
      // 2. Auto-save current products selection AND driver details to Firestore
      if (order.id || order.docId) {
        try {
          await saveOrder({
            ...order,
            vehicleNumber: enhancedOrder.vehicleNumber,
            driverName: enhancedOrder.driverName,
            driverMobile: enhancedOrder.driverMobile,
            dispatchAddress: enhancedOrder.dispatchAddress,
            details: enhancedOrder.details
          });
        } catch (err) {
          console.error('Failed to auto-save products and driver details on challan generation:', err);
        }
      }

      setAlertMessage('✅ Delivery Challan PDF generated and downloaded successfully!');
      setShowFarePrompt(false);
      
      // 3. Check for customer phone to open WhatsApp
      const custPhone = order.details?.mobileNumber;
      if (custPhone) {
        setTimeout(() => {
          const text = `Hello ${order.customer || 'Customer'}, please find your Delivery Challan attached. Order ID: ${order.id || order.docId}`;
          window.open(`https://web.whatsapp.com/send?phone=${custPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Error generating Delivery Challan:', err);
      setAlertMessage(`⚠️ Could not download Challan: ${err?.message || 'Please check item details and retry'}`);
    } finally {
      setIsGeneratingChallan(false);
    }
  };

  const handleSaveDriverDetailsOnly = async (closeModal = true) => {
    setIsSaving(true);
    try {
      const updatedOrder = {
        ...order,
        driverName,
        driverMobile,
        vehicleNumber,
        dispatchAddress,
        details: {
          ...order.details,
          driverName,
          driverMobile,
          vehicleNumber,
          dispatchAddress,
          address: dispatchAddress,
          logisticCharges,
          firstDispatchAmount,
          secondDispatchAmount,
          placeOfSupply,
          reasonForTransport,
          bankDetails
        }
      };
      await saveOrder(updatedOrder);
      setAlertMessage('Driver & transport details updated successfully!');
      if (closeModal) {
        setShowDispatchForm(false);
      }
    } catch (error) {
      console.error('Failed to update driver details:', error);
      setAlertMessage('Failed to update driver details.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmFinalDispatch = async () => {
    if (!order || (!order.docId && !order.id)) return;
    setIsSaving(true);
    try {
      const updatedOrder = {
        ...order,
        items: products.length, // update item count
        driverName,
        driverMobile,
        vehicleNumber,
        dispatchAddress,
        details: {
          ...order.details,
          products: products,
          dispatchAddress,
          address: dispatchAddress,
          vehicleNumber,
          driverName,
          driverMobile,
          bankDetails,
          logisticCharges,
          firstDispatchAmount,
          secondDispatchAmount,
          placeOfSupply,
          reasonForTransport,
          installerName,
          installationHelpers,
          installationDate
        }
      };
      
      const isAlreadyScheduledOrDispatched = 
        order.status === 'Scheduled Dispatched' || 
        order.status === 'Dispatched' || 
        order.status === 'Out for Delivery' || 
        order.status === 'Delivered' || 
        order.status === 'Completed' || 
        order.status?.includes('Installation');

      if (!isAlreadyScheduledOrDispatched) {
        updatedOrder.status = 'Scheduled Dispatched';
      }
      
      await saveOrder(updatedOrder);
      setAlertMessage('Driver and dispatch details saved successfully!');
      setShowDispatchForm(false);
      if (!isAlreadyScheduledOrDispatched) {
        onBack();
      }
    } catch (error) {
      console.error('Failed to schedule dispatch:', error);
      setAlertMessage('Failed to save dispatch schedule.');
    } finally {
      setIsSaving(false);
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
        status: 'Dispatched',
        details: {
          ...order.details,
          products: products
        }
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

  const markReadyForInstallation = async () => {
    if (!order || !order.docId) return;
    setIsSaving(true);
    try {
      const updatedOrder = {
        ...order,
        status: 'Installation Pending'
      };
      await saveOrder(updatedOrder);
      
      if (qcDocument) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const existingFiles = await getOrderFiles(order.id || order.docId);
          await saveOrderFiles(order.id || order.docId, {
            ...existingFiles,
            qcFileData: base64data
          });
          setAlertMessage('Order moved to Installation successfully!');
          setIsSaving(false);
          setShowQcUpload(false);
          onBack();
        };
        reader.readAsDataURL(qcDocument);
        return; // wait for async reader
      }

      setAlertMessage('Order moved to Installation successfully!');
      onBack();
    } catch (error) {
      console.error('Failed to move to installation:', error);
      setAlertMessage('Failed to update status.');
    } finally {
      if (!qcDocument) {
        setIsSaving(false);
        setShowQcUpload(false);
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

        {/* Driver & Transport Details Card (Mentioned in Challan) */}
        {!isInstallationView && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    Driver & Transport Details
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                      Mentioned in Challan
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Driver, vehicle and dispatch information printed on delivery challans
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDispatchForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 self-start sm:self-auto"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Driver Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Driver Name</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {driverName || <span className="text-slate-400 italic font-normal">Not entered</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Driver Mobile</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {driverMobile || <span className="text-slate-400 italic font-normal">Not entered</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Vehicle Number</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block uppercase">
                  {vehicleNumber || <span className="text-slate-400 italic font-normal">Not entered</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Reason for Transport</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {reasonForTransport || 'Delivery'}
                </span>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-slate-400 font-medium">Delivery Address: </span>
                  <span className="text-xs text-slate-700 font-medium">
                    {dispatchAddress || order.details?.address || 'Not entered'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Order Items</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSelectAll}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {products.length > 0 && products.every(p => p.isDispatched) ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={addProduct}
                  className="flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>
            </div>

            {/* Super Admin Approval & Partial Dispatch Notice Banners */}
            {!isInstallationView && order.details?.challanApprovalStatus === 'Pending' && (
              <div className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mt-1 shrink-0"></span>
                  <div>
                    <p className="font-bold text-slate-800">Awaiting Super Admin Approval for Challan</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <strong>Reason:</strong> {order.details?.challanPendingReason || 'Pending review'}
                    </p>
                    {isPartialDispatch && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Partial Dispatch: {dispatchedItemsList.length} item(s) selected for Challan, {heldBackItemsList.length} unchecked.
                      </p>
                    )}
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={async () => {
                        const updated = {
                          ...order,
                          details: {
                            ...order.details,
                            challanApprovalStatus: 'Rejected',
                            challanApprovedAt: new Date().toISOString()
                          }
                        };
                        await saveOrder(updated);
                        setAlertMessage('Challan request rejected.');
                      }}
                      className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={async () => {
                        const updated = {
                          ...order,
                          details: {
                            ...order.details,
                            challanApprovalStatus: 'Approved',
                            challanApprovedAt: new Date().toISOString()
                          }
                        };
                        await saveOrder(updated);
                        setAlertMessage('Challan approved by Super Admin!');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Approve as Super Admin
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isInstallationView && order.details?.challanApprovalStatus === 'Approved' && (
              <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Super Admin Approved:</strong> Challan generation is approved for this order.
                  </span>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={async () => {
                      const updated = {
                        ...order,
                        details: {
                          ...order.details,
                          challanApprovalStatus: undefined
                        }
                      };
                      await saveOrder(updated);
                      setAlertMessage('Challan approval status reset.');
                    }}
                    className="text-xs text-emerald-700 underline hover:text-emerald-900 ml-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {!isInstallationView && !order.details?.challanApprovalStatus && isPartialDispatch && (
              <div className="m-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Partial Dispatch Active:</strong> {heldBackItemsList.length} item(s) unchecked. Generating this Challan requires <strong>Super Admin Approval</strong>.
                </span>
              </div>
            )}

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
              {(isInstallationView ? products.filter(p => p.requiresInstallation) : products).map((product, idx) => {
                return (
                <div key={`${product.id || "k"}-${idx}`} className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-6 hover:bg-slate-50 transition-colors gap-4 group">
                  {!isInstallationView && (
                    <div 
                      className="flex-shrink-0 pt-1 sm:pt-0 cursor-pointer"
                      onClick={() => { 
                        if (editingId !== product.id) toggleDispatch(product); 
                      }}
                      title={product.isDispatched ? "Click to uncheck (remove from Challan)" : "Click to select for Challan"}
                    >
                      <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${product.isDispatched ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-slate-300 bg-white hover:border-indigo-500'}`}>
                        {product.isDispatched && <CheckSquare className="w-4 h-4" />}
                      </div>
                    </div>
                  )}
                  
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
                      <div className={!isInstallationView ? "cursor-pointer" : ""} onClick={() => { if (!isInstallationView) startEdit(product); }}>
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
                              className={`bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium ml-2 ${!isInstallationView ? 'cursor-pointer hover:bg-indigo-200 transition-colors inline-flex items-center' : 'inline-flex items-center'}`}
                              onClick={(e) => {
                                if (isInstallationView) return;
                                e.stopPropagation();
                                setDispatchPromptProduct(product);
                                setDispatchQty(product.dispatchedQuantity || 1);
                              }}
                              title={!isInstallationView ? "Edit dispatched quantity" : undefined}
                            >
                              Dispatching: {product.dispatchedQuantity}
                              {!isInstallationView && <Edit2 className="w-3 h-3 ml-1" />}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isInstallationView && (
                      <>
                        {editingId === product.id ? (
                          <button onClick={() => saveEdit(product.id)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => startEdit(product)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button 
                          onClick={(e) => toggleRequiresInstallation(product, e)} 
                          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                            product.requiresInstallation 
                              ? 'text-amber-600 bg-amber-50 border border-amber-200 opacity-100' 
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100'
                          }`}
                          title={product.requiresInstallation ? "Requires Installation (Click to toggle)" : "Mark as Requires Installation"}
                        >
                          <Wrench className="w-4 h-4" />
                          {product.requiresInstallation && <span className="text-xs font-semibold">Install</span>}
                        </button>

                        <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <div className="ml-2">
                      <Badge variant={product.isDispatched ? (product.dispatchedQuantity === product.quantity ? 'success' : 'info') : 'warning'}>
                        {product.isDispatched ? (product.dispatchedQuantity === product.quantity ? 'Ready' : 'Partial') : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )})}
              
              {(isInstallationView ? products.filter(p => p.requiresInstallation) : products).length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{isInstallationView ? 'No products flagged for installation.' : 'No products found for this order.'}</p>
                  {!isInstallationView && (
                    <button onClick={addProduct} className="mt-4 text-indigo-600 font-medium hover:underline">
                      Add a product manually
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Installation Details Section */}
            {(order.status.includes('Installation') || products.some(p => p.requiresInstallation)) && (
              <div className="p-6 border-t border-slate-100 bg-amber-50/30">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Installation Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Installer</label>
                    <select 
                      value={installerName}
                      onChange={(e) => {
                        setInstallerName(e.target.value);
                        saveOrder({ ...order, details: { ...order.details, installerName: e.target.value, installationHelpers, installationDate } });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm font-medium"
                    >
                      <option value="">Select Installer...</option>
                      {installers.map((installer) => (
                        <option key={installer.id} value={installer.name}>
                          {installer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Helpers (Comma separated)</label>
                    <input 
                      type="text" 
                      value={installationHelpers}
                      onChange={(e) => setInstallationHelpers(e.target.value)}
                      onBlur={() => {
                        saveOrder({ ...order, details: { ...order.details, installerName, installationHelpers, installationDate } });
                      }}
                      placeholder="e.g. Ramesh, Suresh"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Installation Date</label>
                    <input 
                      type="date" 
                      value={installationDate}
                      onChange={(e) => {
                        setInstallationDate(e.target.value);
                        saveOrder({ ...order, details: { ...order.details, installerName, installationHelpers, installationDate: e.target.value } });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              {(order.status === 'Scheduled Dispatched' || order.status === 'Dispatched' || order.status === 'Out for Delivery' || order.status === 'Delivered' || order.status === 'Installation Pending' || order.status === 'Installation In Progress' || order.status === 'Installation Complete') ? (
                <>
                  <button 
                    onClick={onBack}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  
                  {!isInstallationView && order.status === 'Dispatched' && (
                    <button 
                      onClick={() => setShowQcUpload(true)}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isSaving ? 'Processing...' : 'Upload QC & Send to Installation'}
                    </button>
                  )}
                  {isInstallationView && !['Installation In Progress', 'Installation Complete', 'Completed'].includes(order.status) && (
                    <button 
                      onClick={async () => {
                        if (!installationDate) {
                          setAlertMessage('Please select an installation date first.');
                          return;
                        }
                        setIsSaving(true);
                        try {
                          await saveOrder({ ...order, status: 'Installation In Progress', details: { ...order.details, installerName, installationHelpers, installationDate } });
                          setAlertMessage('Installation Scheduled Successfully!');
                          onBack();
                        } catch (err) {
                          setAlertMessage('Failed to schedule installation.');
                        }
                        setIsSaving(false);
                      }}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isSaving ? 'Scheduling...' : 'Scheduled Dispatch'}
                    </button>
                  )}
                  {isInstallationView && order.status === 'Installation In Progress' && (
                    <button 
                      onClick={() => {
                        const text = `Installation Details for Order ${order.id || order.docId}\nCustomer: ${order.customer}\nInstaller: ${order.details?.installerName || 'Not assigned'}\nHelpers: ${order.details?.installationHelpers || 'None'}\nDate: ${order.details?.installationDate || 'Not scheduled'}`;
                        const custPhone = order.details?.mobileNumber || '';
                        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send to Installer
                    </button>
                  )}
                  {isInstallationView && order.status === 'Installation In Progress' && (
                    <button 
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          const installers = await getInstallers();
                          const installerDetails = installers.find(i => i.name === order.details?.installerName) || null;
                          await generateSatisfactionFormPDF(order, installerDetails);
                        } catch (error) {
                          console.error('Error generating satisfaction form:', error);
                          setAlertMessage('Failed to generate form.');
                        }
                        setIsSaving(false);
                      }}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Customer Satisfaction Form
                    </button>
                  )}
                  {(!isInstallationView || order.status === 'Installation In Progress') && (order.status === 'Installation Pending' || order.status === 'Installation In Progress') && (
                    <button 
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          await saveOrder({ ...order, status: 'Installation Complete' });
                          setAlertMessage('Order marked as Installation Complete!');
                          onBack();
                        } catch (err) {
                          setAlertMessage('Failed to update status.');
                        }
                        setIsSaving(false);
                      }}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Complete Installation'}
                    </button>
                  )}
                  
                  {!isInstallationView && order.status !== 'Dispatched' && !order.status.includes('Installation') && (
                    <button 
                      onClick={handleConfirmDispatchedClick}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isSaving ? 'Confirming...' : 'Confirm Dispatched'}
                    </button>
                  )}
                  {!isInstallationView && (
                    <button 
                      onClick={handleEmployeeReminder}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Payment Reminder (Employee)
                    </button>
                  )}
                  {!isInstallationView && (
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
                  )}
                  {!isInstallationView && (
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
                  )}
                  {!isInstallationView && (
                    <button 
                      onClick={() => setShowDispatchForm(true)}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Truck className="w-4 h-4 mr-2 text-slate-500" />
                      Edit Driver Details
                    </button>
                  )}
                  {!isInstallationView && (
                    <button 
                      onClick={handleDriverDetails}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Send to Driver
                    </button>
                  )}
                  {!isInstallationView && (
                    <button 
                      onClick={handleChallanClick}
                      className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        order.details?.challanApprovalStatus === 'Approved'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : order.details?.challanApprovalStatus === 'Pending'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {order.details?.challanApprovalStatus === 'Approved'
                        ? 'Generate Challan (Approved)'
                        : order.details?.challanApprovalStatus === 'Pending'
                        ? (isSuperAdmin ? 'Review Challan' : 'Challan (Pending Approval)')
                        : 'Challan'}
                    </button>
                  )}
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
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    Dispatch & Driver Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update driver, vehicle, and transport details (printed on Challan)
                  </p>
                </div>
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
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {order.status === 'Scheduled Dispatched' || order.status === 'Dispatched' || order.status === 'Out for Delivery' || order.status === 'Delivered' || order.status === 'Completed'
                        ? 'Save Driver Details'
                        : 'Schedule & Save Dispatch'}
                    </>
                  )}
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
                <p className="text-sm text-slate-600 mb-4">{alertMessage}</p>
                {lastDownloadedChallan && (
                  <div className="mb-5 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-left">
                    <p className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      Delivery Challan File
                    </p>
                    <p className="text-[11px] text-slate-600 mb-2.5">
                      If the download didn't trigger automatically in your browser:
                    </p>
                    <a
                      href={lastDownloadedChallan.url}
                      download={lastDownloadedChallan.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download {lastDownloadedChallan.fileName}
                    </a>
                  </div>
                )}
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"
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
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                      Super Admin Approval Required
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isPartialDispatch && getRemainingPayment() > 0.01 
                        ? 'Partial Item Dispatch & Pending Payment'
                        : isPartialDispatch 
                        ? 'Partial Item Dispatch (Unchecked Items)' 
                        : 'Pending Payment Balance'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPendingReasonPrompt(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <p className="text-sm text-slate-600">
                  {order.details?.challanApprovalStatus === 'Rejected' 
                    ? "Your previous Challan request was rejected by the Super Admin. Please provide a revised reason to resubmit for approval."
                    : isPartialDispatch 
                    ? "In this order, one or more items are unchecked (or partial quantities selected). Creating a Challan with partial items requires Super Admin approval."
                    : "The remaining payment for this order is not zero. You must provide a reason for creating a Challan, which will be sent to the Super Admin."}
                </p>

                {/* Partial Dispatch Item Breakdown */}
                {isPartialDispatch && (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Selected for Challan ({dispatchedItemsList.length})
                      </span>
                      <div className="space-y-1">
                        {dispatchedItemsList.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-white px-2.5 py-1.5 rounded border border-emerald-100 text-slate-700">
                            <span className="font-medium truncate max-w-[240px]">{p.name}</span>
                            <span className="font-bold text-emerald-700">{p.dispatchedQuantity || p.quantity} qty</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {heldBackItemsList.length > 0 && (
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Held Back / Unchecked ({heldBackItemsList.length})
                        </span>
                        <div className="space-y-1">
                          {heldBackItemsList.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs bg-white px-2.5 py-1.5 rounded border border-rose-100 text-slate-700">
                              <span className="font-medium truncate max-w-[240px] text-rose-950">{p.name}</span>
                              <span className="font-bold text-rose-700">
                                {!p.isDispatched ? p.quantity : (p.quantity - (p.dispatchedQuantity || 0))} qty
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {getRemainingPayment() > 0.01 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                    <span className="font-medium">Remaining Order Payment:</span>
                    <span className="font-bold text-sm">₹{getRemainingPayment().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Reason for Super Admin <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    rows={3}
                    placeholder="Provide detailed reason for unchecking item(s) / partial dispatch..."
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
                      setAlertMessage('Please enter a reason for the Super Admin.');
                      return;
                    }
                    setIsSaving(true);
                    try {
                      const dispatchedFormatted = dispatchedItemsList.map(p => ({
                        name: p.name,
                        quantity: (p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null && p.dispatchedQuantity > 0) ? p.dispatchedQuantity : p.quantity,
                        size: p.size || ''
                      }));
                      const heldBackFormatted = heldBackItemsList.map(p => ({
                        name: p.name,
                        quantity: !p.isDispatched ? p.quantity : (p.quantity - (p.dispatchedQuantity || 0)),
                        size: p.size || ''
                      }));
                      const remaining = getRemainingPayment();
                      const isPartial = heldBackFormatted.length > 0;

                      const updatedOrder = {
                        ...order,
                        details: {
                          ...order.details,
                          challanApprovalStatus: 'Pending',
                          challanPendingReason: pendingReason,
                          challanApprovalType: isPartial && remaining > 0.01 ? 'partial_and_payment' : (isPartial ? 'partial_dispatch' : 'pending_payment'),
                          challanPartialSummary: {
                            dispatchedItems: dispatchedFormatted,
                            heldBackItems: heldBackFormatted
                          },
                          products: products // persist item checkboxes
                        }
                      };
                      await saveOrder(updatedOrder);
                      
                      const approvalLink = window.location.origin + '?approveChallan=' + (order.id || order.docId);
                      let text = `*Challan Super Admin Approval Request*\n\n`;
                      text += `Order ID: ${order.id || order.docId}\n`;
                      text += `Customer: ${order.customer}\n`;
                      if (isPartial) {
                        text += `\n*PARTIAL DISPATCH (Items Unchecked):*\n`;
                        text += `• To Dispatch (${dispatchedFormatted.length}):\n` + dispatchedFormatted.map(i => `   - ${i.name} (${i.quantity} units)`).join('\n') + `\n`;
                        text += `• Held Back (${heldBackFormatted.length}):\n` + heldBackFormatted.map(i => `   - ${i.name} (${i.quantity} units)`).join('\n') + `\n`;
                      }
                      if (remaining > 0.01) {
                        text += `\n*Remaining Payment:* Rs. ${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                      }
                      text += `\n*Reason for Request:*\n${pendingReason}\n\n*Click here to Review & Approve/Reject:*\n${approvalLink}`;
                      
                      const adminPhone = "919314871718";
                      window.open(`https://web.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(text)}`, '_blank');
                      
                      setShowPendingReasonPrompt(false);
                      setPendingReason("");
                      setAlertMessage("Challan approval request sent to Super Admin via WhatsApp and system notifications. You will be able to generate the Challan once approved.");
                    } catch (e) {
                      setAlertMessage("Failed to send approval request.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Send for Super Admin Approval
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
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                      Generate Delivery Challan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review or edit driver details mentioned in this Challan
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFarePrompt(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-left">
                {/* Driver Details for Challan */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      Driver & Vehicle Details (Printed on Challan)
                    </span>
                    <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-medium">
                      Editable
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Driver Name
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Driver Mobile
                      </label>
                      <input
                        type="tel"
                        value={driverMobile}
                        onChange={(e) => setDriverMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. RJ 14 AB 1234"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Reason for Transport
                      </label>
                      <select
                        value={reasonForTransport}
                        onChange={(e) => setReasonForTransport(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      >
                        <option value="Delivery">Delivery</option>
                        <option value="Sale">Sale</option>
                        <option value="Sale on Approval">Sale on Approval</option>
                        <option value="Job Work">Job Work</option>
                        <option value="Return">Return</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Delivery / Consignee Address
                      </label>
                      <textarea
                        value={dispatchAddress}
                        onChange={(e) => setDispatchAddress(e.target.value)}
                        placeholder="Enter delivery address..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        Logistic Charges (optional)
                      </label>
                      <input
                        type="text"
                        value={logisticCharges}
                        onChange={(e) => setLogisticCharges(e.target.value)}
                        placeholder="e.g. Rs. 1,500"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Fare Inclusion Option */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">Challan Fare & Value Option</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Choose whether item rates and total fare should be visible or hidden on the printed Challan:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setIncludeFareInChallan(true)} 
                      className={`cursor-pointer flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${
                        includeFareInChallan 
                          ? 'bg-indigo-50/90 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          {includeFareInChallan ? (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          Include Pricing & Fare
                        </span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                          Standard
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                        Includes item pricing, transport charges & total order fare on Challan
                      </span>
                    </div>

                    <div 
                      onClick={() => setIncludeFareInChallan(false)} 
                      className={`cursor-pointer flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${
                        !includeFareInChallan 
                          ? 'bg-indigo-50/90 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          {!includeFareInChallan ? (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          Hide Pricing (Quantities Only)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                        Only products and quantities printed, prices & fare hidden
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSaving || isGeneratingChallan}
                  onClick={async () => {
                    await handleSaveDriverDetailsOnly(false);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600 underline flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Driver Details Only
                </button>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowFarePrompt(false)} 
                    disabled={isGeneratingChallan}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    disabled={isGeneratingChallan}
                    onClick={() => generateNoticePDF(includeFareInChallan)} 
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingChallan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Delivery Challan (PDF)
                      </>
                    )}
                  </button>
                </div>
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
      <AnimatePresence>
        {showQcUpload && (
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
                  <h2 className="text-xl font-bold text-slate-800">Ready for Installation</h2>
                </div>
                <button 
                  onClick={() => setShowQcUpload(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Please upload the QC (Quality Control) document (Optional) before sending to Installation.</p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">QC Document</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setQcDocument(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowQcUpload(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={markReadyForInstallation}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Confirm Installation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
