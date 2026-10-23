import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Plus, Trash2, CheckCircle2, Building, User, Phone, MapPin, Hash, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react';
import { Product, ProductVariant } from '../lib/products';
import { generateQuotationPDF, QuotationData } from '../lib/pdfHelper';
import { getProductFile, getVariantFile } from '../lib/fileStorage';

export interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  initialVariant?: ProductVariant | null;
  allProducts?: Product[];
}

interface QuotationItemState {
  id: string;
  product: Product;
  selectedVariant?: ProductVariant | null;
  selectedOptionsSummary: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  imageSrc?: string;
}

export function CreateQuotationModal({
  isOpen,
  onClose,
  initialProduct,
  initialVariant,
  allProducts = []
}: CreateQuotationModalProps) {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
  const [validTillDate, setValidTillDate] = useState('');
  const [notes, setNotes] = useState('1. Prices are valid until expiry date.\n2. Standard 18% GST applicable.\n3. Delivery timeframe: 10-15 business days from order confirmation & advance.\n4. Warranty: 1 Year Manufacturing Defect Warranty.');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% Before Dispatch');

  const [items, setItems] = useState<QuotationItemState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Setup defaults when modal opens or initialProduct changes
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const validUntil = new Date();
      validUntil.setDate(today.getDate() + 15);

      setQuotationNo(`QT-SRK-${Math.floor(100000 + Math.random() * 900000)}`);
      setQuotationDate(today.toISOString().split('T')[0]);
      setValidTillDate(validUntil.toISOString().split('T')[0]);
      setDownloadSuccess(false);
      setErrorMessage('');

      if (initialProduct) {
        setupInitialItem(initialProduct, initialVariant);
      } else if (allProducts.length > 0) {
        setupInitialItem(allProducts[0], null);
      }
    }
  }, [isOpen, initialProduct, initialVariant]);

  const setupInitialItem = async (prod: Product, variant?: ProductVariant | null) => {
    const rawPrice = variant?.price ?? (prod.salesRate || (typeof prod.price === 'string' ? parseFloat(prod.price.replace(/[^0-9.]/g, '')) : prod.price) || 14500);
    const unitPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 14500;
    
    const summary = variant 
      ? `${variant.size ? `Size: ${variant.size}` : ''} ${variant.color ? `Color: ${variant.color}` : ''}`.trim() || variant.name
      : (prod.specification || 'Standard Spec');

    let imgData: string | undefined = undefined;
    if (variant?.id) {
      imgData = (await getVariantFile(variant.id)) || undefined;
    }
    if (!imgData && (prod.docId || prod.id)) {
      imgData = (await getProductFile(prod.docId || prod.id)) || undefined;
    }

    setItems([{
      id: `item_${Date.now()}_1`,
      product: prod,
      selectedVariant: variant || null,
      selectedOptionsSummary: summary,
      unitPrice,
      quantity: 1,
      discountPct: 0,
      imageSrc: imgData
    }]);
  };

  const handleAddItem = async (prodId: string) => {
    const prod = allProducts.find(p => p.id === prodId || p.docId === prodId);
    if (!prod) return;

    const rawPrice = prod.salesRate || (typeof prod.price === 'string' ? parseFloat(prod.price.replace(/[^0-9.]/g, '')) : prod.price) || 10000;
    const unitPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 10000;
    
    let imgData: string | undefined = undefined;
    if (prod.docId || prod.id) {
      imgData = (await getProductFile(prod.docId || prod.id)) || undefined;
    }

    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length + 1}`,
        product: prod,
        selectedVariant: prod.variants?.[0] || null,
        selectedOptionsSummary: prod.specification || 'Standard Spec',
        unitPrice,
        quantity: 1,
        discountPct: 0,
        imageSrc: imgData
      }
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) {
      setErrorMessage('A quotation must have at least one product.');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof QuotationItemState, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'selectedVariant' && value) {
          const v = value as ProductVariant;
          const vPrice = v.price ? (typeof v.price === 'number' ? v.price : parseFloat(String(v.price).replace(/[^0-9.]/g, '')) || updated.unitPrice) : updated.unitPrice;
          updated.unitPrice = vPrice;
          updated.selectedOptionsSummary = `${v.size ? `Size: ${v.size}` : ''} ${v.color ? `Color: ${v.color}` : ''}`.trim() || v.name;
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const lineBase = item.unitPrice * item.quantity;
      const lineDisc = lineBase * (item.discountPct / 100);
      subtotal += lineBase - lineDisc;
      discountTotal += lineDisc;
    });

    const gstRate = 18;
    const gstAmount = subtotal * (gstRate / 100);
    const grandTotal = subtotal + gstAmount;

    return { subtotal, discountTotal, gstRate, gstAmount, grandTotal };
  };

  const totals = calculateTotals();

  const handleDownloadPDF = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Please enter Customer Name.');
      return;
    }
    if (!customerMobile.trim()) {
      setErrorMessage('Please enter Customer Mobile Number.');
      return;
    }
    if (!customerAddress.trim()) {
      setErrorMessage('Please enter Customer Address.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product.');
      return;
    }

    setErrorMessage('');
    setIsGenerating(true);

    try {
      const quotationData: QuotationData = {
        quotationNo,
        quotationDate: new Date(quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        validTillDate: new Date(validTillDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        customerName: customerName.trim(),
        companyName: companyName.trim(),
        gstNumber: gstNumber.trim(),
        customerAddress: customerAddress.trim(),
        customerMobile: customerMobile.trim(),
        items: items.map(i => ({
          product: i.product,
          selectedVariant: i.selectedVariant,
          selectedOptionsSummary: i.selectedOptionsSummary,
          imageSrc: i.imageSrc,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discountPct: i.discountPct,
          amount: i.unitPrice * i.quantity * (1 - i.discountPct / 100)
        })),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        gstRate: totals.gstRate,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        notes,
        paymentTerms
      };

      await generateQuotationPDF(quotationData);
      setDownloadSuccess(true);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setErrorMessage('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Create Commercial Quotation</h2>
              <p className="text-xs text-slate-400">Generate A4 Landscape PDF with product images & complete specifications</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-800 font-bold">×</button>
            </div>
          )}

          {downloadSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>PDF Quotation downloaded successfully in A4 Landscape format!</span>
              </div>
              <button 
                onClick={handleDownloadPDF} 
                className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Download Again
              </button>
            </div>
          )}

          {/* Customer Details Form Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-amber-600" /> Customer & Billing Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Details / Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Details (GSTIN)</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 08ABCDE1234F1Z5"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Address *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea 
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="e.g. Plot 42, Knowledge Park III, MI Road, Jaipur, Rajasthan"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Metadata Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-amber-600" /> Quotation Meta & Validity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation No</label>
                <input 
                  type="text"
                  value={quotationNo}
                  onChange={(e) => setQuotationNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Date</label>
                <input 
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Till Date</label>
                <input 
                  type="date"
                  value={validTillDate}
                  onChange={(e) => setValidTillDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Products & Quotation Items */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" /> Product Details & Pricing
              </h3>

              {allProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <option value="" disabled>+ Add Another Product</option>
                    {allProducts.map(p => (
                      <option key={p.id || p.docId} value={p.id || p.docId}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                        {item.imageSrc ? (
                          <img src={item.imageSrc} alt={item.product.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                          Item #{idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">{item.product.name}</h4>
                        <p className="text-xs text-slate-500">{item.product.category || 'Modular Product'}</p>
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Options & Variant selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
                    {item.product.variants && item.product.variants.length > 0 && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variant / Size Option</label>
                        <select
                          value={item.selectedVariant?.id || ''}
                          onChange={(e) => {
                            const v = item.product.variants?.find(varItem => varItem.id === e.target.value);
                            updateItem(item.id, 'selectedVariant', v || null);
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
                        >
                          <option value="">Default Product Spec</option>
                          {item.product.variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name || v.size} {v.color ? `(${v.color})` : ''} - ₹{v.price || item.unitPrice}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={item.product.variants && item.product.variants.length > 0 ? 'sm:col-span-2' : 'sm:col-span-4'}>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Specifications / Configuration Notes</label>
                      <input 
                        type="text"
                        value={item.selectedOptionsSummary}
                        onChange={(e) => updateItem(item.id, 'selectedOptionsSummary', e.target.value)}
                        placeholder="e.g. 1200 x 600 mm, Walnut finish with CRCA frame"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Price (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPct}
                        onChange={(e) => updateItem(item.id, 'discountPct', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Total (₹)</label>
                      <div className="px-2.5 py-1.5 bg-slate-200/60 rounded-lg text-xs font-mono font-bold text-slate-900">
                        ₹{(item.unitPrice * item.quantity * (1 - item.discountPct / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes & Payment Terms */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions / Notes</label>
              <textarea 
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment & Delivery Terms</label>
              <input 
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
              />

              {/* Price Calculation Summary */}
              <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{totals.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>GST (18%):</span>
                  <span className="font-mono">₹{totals.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-400 text-sm pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating A4 Landscape PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Get & Download PDF Quotation</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
