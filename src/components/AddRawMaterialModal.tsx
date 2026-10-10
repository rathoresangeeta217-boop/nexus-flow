import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, AlertCircle, Sparkles, Image as ImageIcon, Camera, CameraOff, RefreshCw, Check } from 'lucide-react';
import { RawMaterialItem, saveRawMaterialItem } from '../lib/inventory';
import { compressImageFile } from '../lib/fileStorage';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: RawMaterialItem) => void;
  initialItem?: RawMaterialItem | null;
}

const CATEGORIES = [
  'Hardware & Fasteners',
  'Plywood & Boards',
  'Edge Banding',
  'Laminates & Veneers',
  'Channels & Hinges',
  'Metals & Tubes',
  'Adhesives & Chemicals',
  'Glass & Acrylic',
  'General Consumables'
];

const UNITS = [
  'Nos',
  'Kg',
  'Box',
  'Roll',
  'Sheet',
  'Meter',
  'Pack',
  'Set',
  'Liter',
  'Pair'
];

// Sample image presets for quick selection
const QUICK_PRESETS = [
  { label: 'Nails & Screws', url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=300&q=80' },
  { label: 'Fasteners', url: 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=300&q=80' },
  { label: 'Boards', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=300&q=80' },
  { label: 'Tape & Roll', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&q=80' },
  { label: 'Hinges', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80' },
];

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [sku, setSku] = useState(initialItem?.sku || '');
  const [category, setCategory] = useState(initialItem?.category || 'Hardware & Fasteners');
  const [specs, setSpecs] = useState(initialItem?.specs || '');
  const [availableQuantity, setAvailableQuantity] = useState(
    initialItem ? String(initialItem.availableQuantity) : '100'
  );
  const [unit, setUnit] = useState(initialItem?.unit || 'Nos');
  const [minThreshold, setMinThreshold] = useState(
    initialItem?.minThreshold !== undefined ? String(initialItem.minThreshold) : '20'
  );
  const [imageUrl, setImageUrl] = useState(initialItem?.imageUrl || '');
  const [imageName, setImageName] = useState(initialItem?.imageName || '');
  const [notes, setNotes] = useState(initialItem?.notes || '');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera state & refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera stream when modal unmounts or closes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    try {
      stopCamera();
      setCameraLoading(true);
      setCameraError(null);
      setIsCameraActive(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.warn('Direct camera getUserMedia failed, falling back to camera file picker:', err);
      setCameraLoading(false);
      setCameraError(err?.message || 'Unable to open camera stream directly. You can use the device camera shutter below.');
      
      // Auto-trigger mobile native camera capture if direct stream fails
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    await startCamera(nextFacing);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      setImageUrl(dataUrl);
      setImageName(`camera_snap_${Date.now()}.jpg`);
      stopCamera();
    } catch (err: any) {
      console.error('Failed to capture photo:', err);
      setCameraError('Failed to capture photo. Please try again.');
    }
  };

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setImageName(file.name);
      
      const compressed = await compressImageFile(file, 800, 0.85);
      setImageUrl(compressed);
      stopCamera();
    } catch (err) {
      console.error('Image compression failed', err);
      setError('Could not process image. Please try another file.');
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const qty = parseFloat(availableQuantity);
    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid available quantity (0 or greater).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const generatedSku = sku.trim() || `RM-${name.trim().substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      const materialData: Partial<RawMaterialItem> = {
        ...(initialItem?.id ? { id: initialItem.id, docId: initialItem.docId } : {}),
        name: name.trim(),
        sku: generatedSku,
        category,
        specs: specs.trim(),
        availableQuantity: qty,
        unit,
        minThreshold: parseFloat(minThreshold) || 10,
        imageUrl,
        imageName,
        notes: notes.trim(),
        totalReceived: initialItem?.totalReceived ?? qty,
        totalDispatched: initialItem?.totalDispatched ?? 0
      };

      await saveRawMaterialItem(materialData);
      
      if (onSuccess) {
        onSuccess(materialData as RawMaterialItem);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save raw material:', err);
      setError(err?.message || 'Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {initialItem ? 'Edit Raw Material' : 'Add New Raw Material Product'}
              </h3>
              <p className="text-xs text-slate-400">
                Register stock item with specifications, image, and initial count
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nails, 25mm Drywall Screws, PVC Tape"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item Code / SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. RM-NAIL-01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900 bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Measuring Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900 bg-white"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specifications */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Specifications & Technical Details
            </label>
            <textarea
              rows={2}
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. 50mm wire nail, galvanized steel finish, 10 Gauge, 100 pcs per box"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Include size, thickness, material grade, coating, packing size, etc.
            </span>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5">
                Available Quantity in Inventory <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={availableQuantity}
                  onChange={(e) => setAvailableQuantity(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-base font-bold text-slate-900 bg-white"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500 uppercase">
                  {unit}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Current stock on hand ready for factory production
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Low Stock Alert Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900 bg-white"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 uppercase">
                  {unit}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Alerts when inventory dips below this level
              </span>
            </div>
          </div>

          {/* Image Upload, Camera Capture & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Image / Photo
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setImageName('');
                  }}
                  className="text-rose-600 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                >
                  Remove Image
                </button>
              )}
            </div>

            {/* LIVE CAMERA VIEWFINDER (When Camera is Active) */}
            {isCameraActive ? (
              <div className="rounded-2xl border-2 border-indigo-500 bg-slate-950 p-4 shadow-xl mb-3 space-y-3">
                <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Camera Live Feed
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Switch Front/Back Camera"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Flip Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Feed or Error */}
                <div className="relative w-full aspect-video sm:aspect-4/3 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                  {cameraLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Starting camera...</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 z-10 p-4 flex flex-col items-center justify-center bg-slate-900/90 text-center gap-3">
                      <CameraOff className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-rose-300 max-w-sm">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Use Device Camera App</span>
                      </button>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Targeting frame overlay */}
                  <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400 absolute top-0 left-0" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400 absolute top-0 right-0" />
                    <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400 absolute bottom-0 left-0" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400 absolute bottom-0 right-0" />
                  </div>
                </div>

                {/* Camera Control Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={cameraLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-bold shadow-lg shadow-emerald-900/50 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white ring-2 ring-emerald-300 animate-pulse" />
                    <span>Click Photo & Use</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Standard Image Selection Grid (Preview + Action Buttons) */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-medium">No Image</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Action Buttons: Open Camera & Upload File */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* BUTTON 1: Open Camera & Click */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border-2 border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-xs cursor-pointer group"
                  >
                    <Camera className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span>Open Camera &amp; Click</span>
                  </button>

                  {/* BUTTON 2: Upload Image File */}
                  <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>{imageUrl ? 'Upload from Device' : 'Upload File (JPG, PNG)'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Hidden input directly opening system mobile camera for instant snap */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Direct Mobile Shutter Shortcut */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="text-slate-400">
                    {imageName ? `Selected: ${imageName}` : 'Take a photo of the raw material or choose a preset:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Native camera shutter</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
                  </span>
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setImageUrl(preset.url);
                        setImageName(preset.label);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Storage Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Storage Location & Internal Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Warehouse Rack B-04, Bin 12"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialItem ? 'Update Product' : 'Add to Inventory'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
