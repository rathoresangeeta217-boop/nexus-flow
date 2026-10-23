import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Boxes, 
  Building2, 
  Calendar, 
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  Package,
  AlertTriangle
} from 'lucide-react';
import { 
  RawMaterialItem, 
  saveRawMaterialItem, 
  receiveRawMaterialStock, 
  getLocalRawMaterials, 
  findMatchingItemIndex,
  findExistingInvoice,
  registerAddedInvoiceNumber
} from '../lib/inventory';
import { compressImageFile } from '../lib/fileStorage';
import { convertPdfToImage, isPdfFile } from '../lib/pdfUtils';

export interface ScannedInvoiceItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  specs: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  boardClassification?: string;
  boardType?: string;
  boardCompany?: string;
  boardThickness?: string;
  boardSize?: string;
  colorCode?: string;
  notes?: string;
  selected: boolean;
}

export interface ScannedInvoiceData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: string;
  items: ScannedInvoiceItem[];
}

interface ScanInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToSingleItem?: (item: ScannedInvoiceItem, vendorName?: string, invoiceNo?: string) => void;
  onBatchAdded?: (count: number) => void;
}

export const ScanInvoiceModal: React.FC<ScanInvoiceModalProps> = ({
  isOpen,
  onClose,
  onApplyToSingleItem,
  onBatchAdded
}) => {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedInvoiceData | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [forceSeparate, setForceSeparate] = useState(true);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  const openDirectNativeCamera = () => {
    stopCamera();
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    try {
      stopCamera();
      setCameraLoading(true);
      setCameraError(null);
      setIsCameraActive(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.warn('Camera failed:', err);
      setCameraLoading(false);
      setIsCameraActive(false);
      setCameraError('Opening native camera app...');
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 800;
      const height = video.videoHeight || 600;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      setFileData(dataUrl);
      setFileName(`invoice_snap_${Date.now()}.jpg`);
      setFileType('image');
      stopCamera();

      // Trigger automatic scan
      processInvoiceWithAI(dataUrl);
    } catch (err) {
      console.error('Capture photo error:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setFileName(file.name);
      stopCamera();

      let dataUrl = '';
      if (file.type.startsWith('image/')) {
        setFileType('image');
        dataUrl = await compressImageFile(file, 1200, 0.88);
      } else if (isPdfFile(file)) {
        setFileType('pdf');
        setIsScanning(true);
        setScanStep('Rendering PDF document pages...');
        dataUrl = await convertPdfToImage(file);
      } else {
        setError('Please select an Image (JPG, PNG) or PDF document.');
        return;
      }

      setFileData(dataUrl);
      processInvoiceWithAI(dataUrl);
    } catch (err) {
      console.error('File process error:', err);
      setError('Could not process the selected file.');
      setIsScanning(false);
    } finally {
      e.target.value = '';
    }
  };

  const processInvoiceWithAI = async (data: string) => {
    try {
      setIsScanning(true);
      setError(null);
      setScanStep('Uploading document & reading text...');

      const response = await fetch('/api/parse-raw-material-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: data })
      });

      setScanStep('Extracting raw material line items & specs with Gemini AI...');

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server returned an error scanning invoice.');
      }

      const result = await response.json();
      
      let rawItems: any[] = [];
      if (Array.isArray(result)) {
        rawItems = result;
      } else if (result && typeof result === 'object') {
        rawItems = result.items || result.lineItems || result.products || result.rawMaterials || result.inventoryItems || result.inventory || [];
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        if (result && (result.name || result.vendorName || result.totalAmount)) {
          rawItems = [{
            name: result.name || result.materialName || 'Scanned Raw Material Item',
            category: result.category || 'Plywood & Boards',
            quantity: result.quantity || 1,
            unitCost: result.unitCost || result.rate
          }];
        } else {
          throw new Error('No raw material line items could be detected in this invoice. Please ensure the document/photo is clear and readable.');
        }
      }

      const formattedItems: ScannedInvoiceItem[] = rawItems.map((it: any, idx: number) => {
        const name = it.name || it.description || it.itemName || `Scanned Material #${idx + 1}`;
        const category = it.category || 'General Consumables';
        const catLower = category.toLowerCase();
        const nameLower = name.toLowerCase();

        const isBoardCategory = catLower.includes('board') || catLower.includes('plywood') ||
                                nameLower.includes('plywood') || nameLower.includes('board') ||
                                nameLower.includes('mdf') || nameLower.includes('hdhmr') || nameLower.includes('plpb');

        return {
          id: `scanned-${Date.now()}-${idx}`,
          name,
          category: isBoardCategory ? (it.category || 'Plywood & Boards') : category,
          sku: it.sku || `RM-SCAN-${Math.floor(100 + Math.random() * 900)}`,
          specs: it.specs || it.specification || '',
          quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : (parseFloat(it.quantity) || 1),
          unit: it.unit || (isBoardCategory ? 'Sheet' : 'Nos'),
          unitCost: typeof it.unitCost === 'number' ? it.unitCost : (parseFloat(it.unitCost || it.rate) || undefined),
          boardClassification: isBoardCategory ? (it.boardClassification || 'Plain') : undefined,
          boardType: isBoardCategory ? (it.boardType || 'HDHMR') : undefined,
          boardCompany: isBoardCategory ? (it.boardCompany || '') : undefined,
          boardThickness: isBoardCategory ? (it.boardThickness || '') : undefined,
          boardSize: isBoardCategory ? (it.boardSize || '') : undefined,
          colorCode: isBoardCategory ? (it.colorCode || '') : undefined,
          notes: it.notes || '',
          selected: true
        };
      });

      setScannedData({
        vendorName: result.vendorName || result.companyName || '',
        invoiceNumber: result.invoiceNumber || result.billNo || result.referenceNo || '',
        invoiceDate: result.invoiceDate || result.date || '',
        totalAmount: result.totalAmount || '',
        items: formattedItems
      });

    } catch (err: any) {
      console.error('Invoice AI Scan Error:', err);
      setError(err?.message || 'Failed to scan invoice document. Please try again or fill manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelectItem = (id: string) => {
    if (!scannedData) return;
    setScannedData({
      ...scannedData,
      items: scannedData.items.map(it => it.id === id ? { ...it, selected: !it.selected } : it)
    });
  };

  const handleUpdateItem = (id: string, field: keyof ScannedInvoiceItem, value: any) => {
    if (!scannedData) return;
    setScannedData({
      ...scannedData,
      items: scannedData.items.map(it => it.id === id ? { ...it, [field]: value } : it)
    });
  };

  const handleRemoveItem = (id: string) => {
    if (!scannedData) return;
    setScannedData({
      ...scannedData,
      items: scannedData.items.filter(it => it.id !== id)
    });
  };

  const handleSaveAllToInventory = async () => {
    if (!scannedData) return;
    const selectedItems = scannedData.items.filter(it => it.selected);
    if (selectedItems.length === 0) {
      setError('Please select at least one item to save to inventory.');
      return;
    }

    // Duplicate Invoice Check
    const dupCheck = findExistingInvoice(scannedData.invoiceNumber);
    if (dupCheck.isDuplicate && !allowDuplicateOverride) {
      setError(
        `⚠️ DUPLICATE INVOICE DETECTED! Invoice Ref No. "${scannedData.invoiceNumber}" has ALREADY been scanned and added to inventory stock before (${dupCheck.source}). Check the override box below if you want to re-add duplicate stock.`
      );
      return;
    }

    try {
      setIsSavingBatch(true);
      setError(null);

      let savedCount = 0;
      for (const item of selectedItems) {
        const generatedSku = item.sku || `RM-SCAN-${Math.floor(100 + Math.random() * 900)}`;

        const catLower = (item.category || '').toLowerCase();
        const nameLower = (item.name || '').toLowerCase();
        const isBoardCategory = catLower.includes('board') || catLower.includes('plywood') ||
                                nameLower.includes('plywood') || nameLower.includes('board') ||
                                nameLower.includes('mdf') || nameLower.includes('hdhmr') || nameLower.includes('plpb');

        const itemPayload: Partial<RawMaterialItem> & { createNewItem?: boolean } = {
          name: item.name,
          sku: generatedSku,
          category: item.category,
          specs: item.specs,
          availableQuantity: item.quantity,
          unit: item.unit,
          minThreshold: 10,
          imageUrl: fileData || '',
          notes: (scannedData.vendorName || scannedData.invoiceNumber) 
            ? `Vendor: ${scannedData.vendorName || ''} | Ref: ${scannedData.invoiceNumber || ''}` 
            : '',
          unitCost: item.unitCost,
          totalReceived: item.quantity,
          totalDispatched: 0,
          boardClassification: isBoardCategory ? item.boardClassification : undefined,
          boardType: isBoardCategory ? item.boardType : undefined,
          boardCompany: isBoardCategory ? item.boardCompany : undefined,
          boardThickness: isBoardCategory ? item.boardThickness : undefined,
          boardSize: isBoardCategory ? item.boardSize : undefined,
          colorCode: isBoardCategory ? item.colorCode : undefined,
          challanOrPoNo: scannedData.invoiceNumber || '',
          receivedFrom: scannedData.vendorName || '',
          invoiceDate: scannedData.invoiceDate || '',
          createNewItem: forceSeparate
        };

        await saveRawMaterialItem(itemPayload);
        savedCount++;
      }

      if (scannedData.invoiceNumber) {
        registerAddedInvoiceNumber(scannedData.invoiceNumber);
      }

      if (onBatchAdded) {
        onBatchAdded(savedCount);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to batch save scanned items:', err);
      setError('Failed to save materials to inventory. Please try again.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const duplicateInvoiceInfo = scannedData?.invoiceNumber ? findExistingInvoice(scannedData.invoiceNumber) : { isDuplicate: false };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight flex items-center gap-2">
                AI Invoice &amp; Bill Material Scanner
              </h3>
              <p className="text-xs text-slate-300">
                Upload or snap a purchase bill/challan image to auto-extract &amp; fill inventory stock
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD OR TAKE PHOTO (When no scanned data yet or re-upload) */}
          {(!scannedData || isScanning) && (
            <div className="space-y-4">
              {/* Camera viewfinder if camera is open */}
              {isCameraActive ? (
                <div className="rounded-2xl border-2 border-amber-500 bg-slate-950 p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Scan Paper Invoice Live
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = cameraFacingMode === 'environment' ? 'user' : 'environment';
                          setCameraFacingMode(next);
                          startCamera(next);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Flip Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full max-w-xs sm:max-w-sm mx-auto aspect-[1/1.414] bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-amber-500/80 shadow-2xl">
                    {cameraLoading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium">Opening A4 scanner camera...</span>
                      </div>
                    )}

                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                    {/* A4 Paper Framing Guide & Corner Markers */}
                    <div className="absolute inset-4 sm:inset-5 border-2 border-amber-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3 bg-amber-500/5">
                      <div className="flex justify-between items-start">
                        <div className="w-6 h-6 border-t-3 border-l-3 border-amber-400 rounded-tl-md shadow-xs" />
                        <div className="w-6 h-6 border-t-3 border-r-3 border-amber-400 rounded-tr-md shadow-xs" />
                      </div>

                      <div className="text-center py-1">
                        <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-black/80 px-3 py-1 rounded-full border border-amber-400/50 shadow-md">
                          📄 Align A4 Paper Bill Inside Frame (210 × 297 mm)
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="w-6 h-6 border-b-3 border-l-3 border-amber-400 rounded-bl-md shadow-xs" />
                        <div className="w-6 h-6 border-b-3 border-r-3 border-amber-400 rounded-br-md shadow-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={cameraLoading}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo &amp; Auto-Extract</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Scanning Loader State */}
              {isScanning ? (
                <div className="py-12 px-6 rounded-2xl bg-indigo-50/60 border-2 border-indigo-200 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-indigo-950">
                      Scanning Invoice Document with Gemini AI...
                    </h4>
                    <p className="text-xs font-semibold text-indigo-700 mt-1">
                      {scanStep}
                    </p>
                  </div>
                </div>
              ) : !isCameraActive ? (
                /* Selection Box */
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 bg-slate-50/50 hover:bg-amber-50/20 transition-all text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                    <Receipt className="w-8 h-8 text-amber-700" />
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Upload or Scan Invoice / Bill / Delivery Challan
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Supports JPG, PNG, WEBP images or PDF files. Gemini AI will automatically parse item names, board specifications, thickness, quantities, units, and vendor information.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {/* Snap Photo with Tablet Camera */}
                    <button
                      type="button"
                      onClick={openDirectNativeCamera}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo (Tablet Camera)</span>
                    </button>

                    {/* Live Scanner Viewfinder */}
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span>Live Viewfinder</span>
                    </button>

                    {/* Upload File */}
                    <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Upload File (PDF / Image)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 2: REVIEW & CONFIRM EXTRACTED INVOICE ITEMS */}
          {scannedData && !isScanning && (
            <div className="space-y-4">
              {/* Duplicate Invoice Warning Banner */}
              {duplicateInvoiceInfo.isDuplicate && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex items-start gap-3 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs uppercase tracking-wider text-amber-950">
                        ⚠️ Duplicate Invoice Detected — Already Added Previously
                      </span>
                      <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md font-mono font-black text-[10px]">
                        Ref #{scannedData.invoiceNumber}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 font-bold mt-1">
                      Invoice Ref No. <strong>"{scannedData.invoiceNumber}"</strong> has ALREADY been scanned and added to inventory stock before ({duplicateInvoiceInfo.source}).
                    </p>
                    <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200 cursor-pointer text-xs font-bold text-amber-950">
                      <input
                        type="checkbox"
                        checked={allowDuplicateOverride}
                        onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>I understand this invoice was already added. Check here to allow re-saving duplicate items into stock.</span>
                    </label>
                  </div>
                </div>
              )}

                {/* Header Info Card */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendor / Supplier:</span>
                    <input
                      type="text"
                      value={scannedData.vendorName || ''}
                      onChange={(e) => setScannedData({ ...scannedData, vendorName: e.target.value })}
                      placeholder="e.g. Action TESA Authorized Dealer"
                      className="font-bold text-indigo-950 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg w-full mt-0.5"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice / Bill Ref No:</span>
                      {duplicateInvoiceInfo.isDuplicate && (
                        <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md uppercase">
                          Duplicate
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={scannedData.invoiceNumber || ''}
                      onChange={(e) => setScannedData({ ...scannedData, invoiceNumber: e.target.value })}
                      placeholder="e.g. INV-2026-889"
                      className={`font-bold text-indigo-950 bg-white border px-2.5 py-1 rounded-lg w-full mt-0.5 ${
                        duplicateInvoiceInfo.isDuplicate ? 'border-rose-400 ring-2 ring-rose-200' : 'border-indigo-200'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Date:</span>
                    <input
                      type="text"
                      value={scannedData.invoiceDate || ''}
                      onChange={(e) => setScannedData({ ...scannedData, invoiceDate: e.target.value })}
                      placeholder="e.g. 2026-10-14"
                      className="font-bold text-indigo-950 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg w-full mt-0.5"
                    />
                  </div>
                </div>

              {/* Items List Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Extracted Materials ({scannedData.items.filter(i => i.selected).length} selected / {scannedData.items.length} total)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedData(null);
                      setFileData(null);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Re-scan Another Invoice
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={scannedData.items.every(i => i.selected)}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setScannedData({
                                  ...scannedData,
                                  items: scannedData.items.map(i => ({ ...i, selected: val }))
                                });
                              }}
                              className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3">Material Name &amp; Specifications</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-center">Qty &amp; Unit</th>
                          <th className="p-3 text-center font-bold text-emerald-300">Rate / Price (₹)</th>
                          <th className="p-3 text-center font-bold text-amber-300">Board Attributes</th>
                          {onApplyToSingleItem && <th className="p-3 text-center">Single Fill</th>}
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(() => {
                          const existingInventory = getLocalRawMaterials();
                          return scannedData.items.map((item) => {
                            const matchIdx = findMatchingItemIndex(item, existingInventory);
                            const matchedItem = matchIdx >= 0 ? existingInventory[matchIdx] : null;

                            return (
                              <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.selected ? 'bg-indigo-50/30' : 'opacity-60'}`}>
                                {/* Checkbox */}
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleToggleSelectItem(item.id)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>

                                {/* Name & Specs */}
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                    className="font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-1 w-full text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={item.specs}
                                    onChange={(e) => handleUpdateItem(item.id, 'specs', e.target.value)}
                                    placeholder="Specifications..."
                                    className="text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-0.5 w-full mt-1 bg-slate-50"
                                  />
                                  {matchedItem ? (
                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>Matches: <strong className="underline">{matchedItem.name}</strong> (+Qty will be added)</span>
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-[10px] font-medium text-slate-400 italic">
                                      + Will create new product in inventory
                                    </div>
                                  )}
                                </td>

                            {/* Category */}
                            <td className="p-3">
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                                className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white"
                              >
                                <option value="Plywood & Boards">Plywood &amp; Boards</option>
                                <option value="Hardware & Fasteners">Hardware &amp; Fasteners</option>
                                <option value="Edge Banding">Edge Banding</option>
                                <option value="Laminates & Veneers">Laminates &amp; Veneers</option>
                                <option value="Channels & Hinges">Channels &amp; Hinges</option>
                                <option value="Metals & Tubes">Metals &amp; Tubes</option>
                                <option value="Adhesives & Chemicals">Adhesives &amp; Chemicals</option>
                                <option value="Glass & Acrylic">Glass &amp; Acrylic</option>
                                <option value="General Consumables">General Consumables</option>
                              </select>
                            </td>

                            {/* Quantity & Unit */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                                  className="w-16 font-bold text-center border border-slate-200 rounded-lg px-1.5 py-1 text-xs"
                                />
                                <span className="text-[11px] font-bold text-slate-600">{item.unit}</span>
                              </div>
                            </td>

                            {/* Rate / Price (₹) */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-xs font-bold text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.unitCost !== undefined && !isNaN(item.unitCost) && item.unitCost !== null ? item.unitCost : ''}
                                  onChange={(e) => handleUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                  placeholder="Rate..."
                                  className="w-20 font-extrabold text-center border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </td>

                            {/* Board Attributes */}
                            <td className="p-3 text-center">
                              {((item.boardCompany || item.boardThickness || item.boardSize) &&
                                ((item.category || '').toLowerCase().includes('board') || (item.category || '').toLowerCase().includes('plywood') || (item.name || '').toLowerCase().includes('board') || (item.name || '').toLowerCase().includes('plywood') || (item.name || '').toLowerCase().includes('mdf') || (item.name || '').toLowerCase().includes('hdhmr'))) ? (
                                <div className="flex flex-col gap-1 text-[10px] items-center">
                                  {item.boardCompany && (
                                    <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                                      {item.boardCompany}
                                    </span>
                                  )}
                                  {(item.boardThickness || item.boardSize) && (
                                    <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                      {item.boardThickness || ''} {item.boardThickness && item.boardSize ? '|' : ''} {item.boardSize || ''}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs font-mono font-bold">-</span>
                              )}
                            </td>

                            {/* Single Fill Option if modal requested it */}
                            {onApplyToSingleItem && (
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onApplyToSingleItem(item, scannedData.vendorName, scannedData.invoiceNumber);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
                                >
                                  Fill Form
                                </button>
                              </td>
                            )}

                            {/* Remove Item */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScannedData(null);
                    setFileData(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel / Re-scan
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={forceSeparate}
                      onChange={(e) => setForceSeparate(e.target.checked)}
                      className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    />
                    <span>Force create each scanned line as separate product entry</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveAllToInventory}
                    disabled={isSavingBatch || scannedData.items.filter(i => i.selected).length === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingBatch ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving to Inventory...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Add All {scannedData.items.filter(i => i.selected).length} Items to Inventory Stock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
