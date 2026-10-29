import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Download, 
  Trash2, 
  Clock, 
  Check, 
  Paperclip, 
  AlertCircle,
  FileCheck2,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { Order, saveOrder } from '../lib/orders';
import { getOrderFiles, saveOrderFiles } from '../lib/fileStorage';

interface UploadDrawingChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  initialTab?: 'all' | 'po' | 'drawing' | 'checklist' | 'oc';
  onSuccess?: (updatedOrder: Order) => void;
}

export function UploadDrawingChecklistModal({
  isOpen,
  onClose,
  order,
  initialTab = 'all',
  onSuccess
}: UploadDrawingChecklistModalProps) {
  const [poFile, setPoFile] = useState<File | null>(null);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [ocFile, setOcFile] = useState<File | null>(null);
  
  const [existingPoName, setExistingPoName] = useState<string | undefined>();
  const [existingPoData, setExistingPoData] = useState<string | undefined>();
  const [existingPoDate, setExistingPoDate] = useState<string | undefined>();

  const [existingDrawingName, setExistingDrawingName] = useState<string | undefined>();
  const [existingDrawingData, setExistingDrawingData] = useState<string | undefined>();
  const [existingDrawingDate, setExistingDrawingDate] = useState<string | undefined>();

  const [existingChecklistName, setExistingChecklistName] = useState<string | undefined>();
  const [existingChecklistData, setExistingChecklistData] = useState<string | undefined>();
  const [existingChecklistDate, setExistingChecklistDate] = useState<string | undefined>();

  const [existingOcName, setExistingOcName] = useState<string | undefined>();
  const [existingOcData, setExistingOcData] = useState<string | undefined>();
  const [existingOcDate, setExistingOcDate] = useState<string | undefined>();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const poInputRef = useRef<HTMLInputElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const checklistInputRef = useRef<HTMLInputElement>(null);
  const ocInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      setPoFile(null);
      setDrawingFile(null);
      setChecklistFile(null);
      setOcFile(null);
      setSaveSuccess(false);
      return;
    }

    setExistingPoName(order.details?.poFileName);
    setExistingPoDate(order.details?.poUploadedAt);

    setExistingDrawingName(order.details?.drawingFileName);
    setExistingDrawingDate(order.details?.drawingUploadedAt);

    setExistingChecklistName(order.details?.checklistFileName);
    setExistingChecklistDate(order.details?.checklistUploadedAt);

    setExistingOcName(order.details?.ocFileName);
    setExistingOcDate(order.details?.ocUploadedAt);

    setIsLoadingFiles(true);
    getOrderFiles(order.id || order.docId || '')
      .then((files: any) => {
        if (files) {
          if (files.poFileData) setExistingPoData(files.poFileData);
          if (files.drawingFileData) setExistingDrawingData(files.drawingFileData);
          if (files.checklistFileData) setExistingChecklistData(files.checklistFileData);
          if (files.ocFileData) setExistingOcData(files.ocFileData);
        }
      })
      .catch((err) => {
        console.error('Failed to load order file cache:', err);
      })
      .finally(() => {
        setIsLoadingFiles(false);
      });
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const readFileAsDataURL = (file: File | null): Promise<string | undefined> => {
    if (!file) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownloadFile = (fileName: string, fileData?: string) => {
    if (!fileData) {
      alert(`File data for "${fileName}" is not available locally.`);
      return;
    }
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);

    try {
      const newPoData = await readFileAsDataURL(poFile);
      const newDrawingData = await readFileAsDataURL(drawingFile);
      const newChecklistData = await readFileAsDataURL(checklistFile);
      const newOcData = await readFileAsDataURL(ocFile);

      const targetDocId = order.docId || order.id;
      const nowIso = new Date().toISOString();

      const finalPoName = poFile ? poFile.name : existingPoName;
      const finalPoDate = poFile ? nowIso : existingPoDate;

      const finalDrawingName = drawingFile ? drawingFile.name : existingDrawingName;
      const finalDrawingDate = drawingFile ? nowIso : existingDrawingDate;

      const finalChecklistName = checklistFile ? checklistFile.name : existingChecklistName;
      const finalChecklistDate = checklistFile ? nowIso : existingChecklistDate;

      const finalOcName = ocFile ? ocFile.name : existingOcName;
      const finalOcDate = ocFile ? nowIso : existingOcDate;

      // Update Order Details
      const updatedOrder: Order = {
        ...order,
        docId: targetDocId,
        details: {
          ...(order.details || {}),
          poFileName: finalPoName,
          poUploadedAt: finalPoDate,
          drawingFileName: finalDrawingName,
          drawingUploadedAt: finalDrawingDate,
          checklistFileName: finalChecklistName,
          checklistUploadedAt: finalChecklistDate,
          ocFileName: finalOcName,
          ocUploadedAt: finalOcDate,
        }
      };

      await saveOrder(updatedOrder);

      // Save files to persistent local IndexedDB
      const filesPayload: any = {};
      if (newPoData) filesPayload.poFileData = newPoData;
      if (newDrawingData) filesPayload.drawingFileData = newDrawingData;
      if (newChecklistData) filesPayload.checklistFileData = newChecklistData;
      if (newOcData) filesPayload.ocFileData = newOcData;

      if (Object.keys(filesPayload).length > 0) {
        await saveOrderFiles(order.id || targetDocId, filesPayload);
      }

      setSaveSuccess(true);
      if (onSuccess) {
        onSuccess(updatedOrder);
      }

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving order documents:', err);
      alert(`Failed to save uploaded documents: ${err.message || 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  const hasNewSelection = Boolean(poFile || drawingFile || checklistFile || ocFile);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 15 }} 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-50 via-indigo-50/20 to-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  Upload & Manage Order Documents
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Order <span className="text-indigo-600 font-bold">{order.id}</span> • {order.customer}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Documents successfully saved and attached to Order #{order.id}!</span>
              </motion.div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Customer & Production Documents</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Upload or update the <strong>Purchase Order (PO)</strong>, approved <strong>Drawing / Layout</strong>, <strong>Customer Checklist</strong>, and <strong>OC / QC Document</strong>. All documents are available for download throughout production, dispatch, and billing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Card 1: Purchase Order (PO) */}
              <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      1. Purchase Order (PO)
                    </span>
                    {(poFile || existingPoName || existingPoData) ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        Missing
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={poInputRef} 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPoFile(e.target.files[0]);
                    }} 
                  />

                  {poFile ? (
                    <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{poFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(poFile.size / 1024).toFixed(1)} KB (New Selection)</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPoFile(null)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded"
                          title="Remove selection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (existingPoName || existingPoData) ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{existingPoName || 'Purchase_Order.pdf'}</p>
                            {existingPoDate && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(existingPoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {existingPoData && (
                          <button 
                            type="button"
                            onClick={() => handleDownloadFile(existingPoName || 'Purchase_Order.pdf', existingPoData)}
                            className="text-emerald-700 hover:text-emerald-900 p-1.5 rounded hover:bg-emerald-50"
                            title="Download PO"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => poInputRef.current?.click()}
                      className="cursor-pointer bg-white/70 hover:bg-white border border-emerald-100 rounded-xl p-5 text-center transition-all group flex flex-col items-center justify-center min-h-[110px]"
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Click to Select PO Document</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PDF, Word, or Scanned Image</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100/60 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => poInputRef.current?.click()}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {poFile || existingPoName || existingPoData ? 'Replace PO' : 'Upload PO'}
                  </button>
                  {existingPoName && !poFile && (
                    <span className="text-[10px] text-slate-400 font-medium">Currently attached</span>
                  )}
                </div>
              </div>

              {/* Card 2: Customer Drawing / Layout */}
              <div className="border-2 border-dashed border-amber-200 bg-amber-50/20 hover:bg-amber-50/40 transition-colors rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      2. Customer Drawing / Layout
                    </span>
                    {(drawingFile || existingDrawingName || existingDrawingData) ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        Missing
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={drawingInputRef} 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,image/*" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) setDrawingFile(e.target.files[0]);
                    }} 
                  />

                  {drawingFile ? (
                    <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{drawingFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(drawingFile.size / 1024).toFixed(1)} KB (New Selection)</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setDrawingFile(null)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded"
                          title="Remove selection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (existingDrawingName || existingDrawingData) ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{existingDrawingName || 'Drawing.pdf'}</p>
                            {existingDrawingDate && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(existingDrawingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {existingDrawingData && (
                          <button 
                            type="button"
                            onClick={() => handleDownloadFile(existingDrawingName || 'Drawing.pdf', existingDrawingData)}
                            className="text-amber-800 hover:text-amber-950 p-1.5 rounded hover:bg-amber-50"
                            title="Download Drawing"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => drawingInputRef.current?.click()}
                      className="cursor-pointer bg-white/70 hover:bg-white border border-amber-100 rounded-xl p-5 text-center transition-all group flex flex-col items-center justify-center min-h-[110px]"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Click to Select Drawing</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PDF or High-Res Image (CAD export)</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-amber-100/60 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => drawingInputRef.current?.click()}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {drawingFile || existingDrawingName || existingDrawingData ? 'Replace Drawing' : 'Upload Drawing'}
                  </button>
                  {existingDrawingName && !drawingFile && (
                    <span className="text-[10px] text-slate-400 font-medium">Currently attached</span>
                  )}
                </div>
              </div>

              {/* Card 3: Customer Checklist */}
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      3. Customer Checklist
                    </span>
                    {(checklistFile || existingChecklistName || existingChecklistData) ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        Missing
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={checklistInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,image/*" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) setChecklistFile(e.target.files[0]);
                    }} 
                  />

                  {checklistFile ? (
                    <div className="bg-white p-3 rounded-xl border border-indigo-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{checklistFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(checklistFile.size / 1024).toFixed(1)} KB (New Selection)</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setChecklistFile(null)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded"
                          title="Remove selection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (existingChecklistName || existingChecklistData) ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{existingChecklistName || 'Customer_Checklist.pdf'}</p>
                            {existingChecklistDate && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(existingChecklistDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {existingChecklistData && (
                          <button 
                            type="button"
                            onClick={() => handleDownloadFile(existingChecklistName || 'Customer_Checklist.pdf', existingChecklistData)}
                            className="text-indigo-700 hover:text-indigo-900 p-1.5 rounded hover:bg-indigo-50"
                            title="Download Checklist"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => checklistInputRef.current?.click()}
                      className="cursor-pointer bg-white/70 hover:bg-white border border-indigo-100 rounded-xl p-5 text-center transition-all group flex flex-col items-center justify-center min-h-[110px]"
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Click to Select Checklist</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PDF, Excel, Word, or Scanned Image</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => checklistInputRef.current?.click()}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {checklistFile || existingChecklistName || existingChecklistData ? 'Replace Checklist' : 'Upload Checklist'}
                  </button>
                  {existingChecklistName && !checklistFile && (
                    <span className="text-[10px] text-slate-400 font-medium">Currently attached</span>
                  )}
                </div>
              </div>

              {/* Card 4: OC / QC Document */}
              <div className="border-2 border-dashed border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 transition-colors rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-rose-600" />
                      4. OC / QC Document
                    </span>
                    {(ocFile || existingOcName || existingOcData) ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        Missing
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={ocInputRef} 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) setOcFile(e.target.files[0]);
                    }} 
                  />

                  {ocFile ? (
                    <div className="bg-white p-3 rounded-xl border border-rose-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{ocFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(ocFile.size / 1024).toFixed(1)} KB (New Selection)</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setOcFile(null)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded"
                          title="Remove selection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (existingOcName || existingOcData) ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{existingOcName || 'OC_QC_Document.pdf'}</p>
                            {existingOcDate && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(existingOcDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {existingOcData && (
                          <button 
                            type="button"
                            onClick={() => handleDownloadFile(existingOcName || 'OC_QC_Document.pdf', existingOcData)}
                            className="text-rose-700 hover:text-rose-900 p-1.5 rounded hover:bg-rose-50"
                            title="Download OC/QC Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => ocInputRef.current?.click()}
                      className="cursor-pointer bg-white/70 hover:bg-white border border-rose-100 rounded-xl p-5 text-center transition-all group flex flex-col items-center justify-center min-h-[110px]"
                    >
                      <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Click to Select OC / QC Document</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Order Confirmation / Quality Check (PDF/Excel)</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100/60 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => ocInputRef.current?.click()}
                    className="text-xs font-bold text-rose-800 hover:text-rose-950 cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {ocFile || existingOcName || existingOcData ? 'Replace OC/QC' : 'Upload OC/QC'}
                  </button>
                  {existingOcName && !ocFile && (
                    <span className="text-[10px] text-slate-400 font-medium">Currently attached</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              disabled={isSaving || !hasNewSelection}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Documents...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Attach to Order</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
