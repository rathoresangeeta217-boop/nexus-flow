import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkstationSetupData } from './WorkstationLiveRenderer';
import { 
  Download, 
  FileText, 
  X, 
  Printer, 
  CheckCircle2,
  Compass
} from 'lucide-react';

interface WorkstationTechnicalInfographicModalProps {
  isOpen: boolean;
  onClose: () => void;
  setup?: WorkstationSetupData | null;
  previewImageSrc?: string | null;
  angleImages?: { label: string; dataUrl: string; }[] | null;
}

export const WorkstationTechnicalInfographicModal: React.FC<WorkstationTechnicalInfographicModalProps> = ({
  isOpen,
  onClose,
  setup,
  previewImageSrc,
  angleImages
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [theme, setTheme] = useState<'whitepaper' | 'blueprint' | 'darkcad'>('whitepaper');
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(previewImageSrc || null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Keep selectedImageSrc in sync with incoming props
  React.useEffect(() => {
    if (previewImageSrc) {
      setSelectedImageSrc(previewImageSrc);
    } else if (angleImages && angleImages.length > 0) {
      setSelectedImageSrc(angleImages[0].dataUrl);
    }
  }, [previewImageSrc, angleImages]);

  // Parse dimensions
  let widthMm = 1200;
  let depthMm = 600;
  const heightMm = 750;
  if (setup?.dimensions) {
    const match = setup.dimensions.match(/(\d{3,4})\s*(?:mm|L|W)?\s*[xX*×-]\s*(\d{3,4})/);
    if (match) {
      widthMm = parseInt(match[1], 10) || 1200;
      depthMm = parseInt(match[2], 10) || 600;
    }
  }

  const personQty = setup?.personQuantity || 1;
  const isCluster = personQty > 1 && setup?.layoutType !== 'linear';
  const screenHVal = setup?.screenHeight ? parseInt(setup.screenHeight, 10) : 300;
  const thicknessVal = setup?.thickness ? parseInt(setup.thickness, 10) : 25;
  const legStyleStr = setup?.legStyle || 'Straight legs';
  const modestyStr = setup?.modesty || 'None';
  const electricStr = setup?.electricFunction || 'None';
  const materialStr = setup?.material ? `${setup.material} Board` : 'PLPB Board';
  const topColorStr = setup?.tableTopColor || 'Frosty white';
  const legColorStr = setup?.legColor || 'Black';
  const screenColorStr = setup?.screenColor || 'Blue';
  const frontScreenStr = setup?.frontScreen || 'None';

  // Specific Business Rules:
  // Leg Style Detection
  const isUShapeLegs = Boolean(
    legStyleStr && (
      legStyleStr.toLowerCase().includes('u shape') || 
      legStyleStr.toLowerCase().includes('u-shape') ||
      legStyleStr.toLowerCase().includes('loop')
    )
  );

  const isAngularLegs = Boolean(
    legStyleStr && (
      legStyleStr.toLowerCase().includes('angular') || 
      legStyleStr.toLowerCase().includes('a-frame') ||
      legStyleStr.toLowerCase().includes('slanted') ||
      legStyleStr.toLowerCase().includes('trapezoid') ||
      legStyleStr.toLowerCase().includes('triangle')
    )
  );

  // 1. Understructure: 40 x 40 mm CRCA Metal
  const understructureStr = `40 × 40 mm CRCA Metal (${legStyleStr})`;
  
  // 2. Table Top Edge Band: 0.8mm in 18mm table top, 1.0mm in 25mm
  const edgeBandMm = thicknessVal === 18 ? '0.8mm' : '1.0mm';
  const edgeBandStr = `${edgeBandMm} Matching PVC Edge Tape`;

  // Strict Component Presence Flags (Actual Chosen Components Only)
  const hasScreen = Boolean(
    frontScreenStr && 
    frontScreenStr !== 'None' && 
    frontScreenStr !== 'No Screen' && 
    !frontScreenStr.toLowerCase().includes('no screen')
  );

  const hasFlipBox = Boolean(
    electricStr && 
    electricStr !== 'None' && 
    electricStr.toLowerCase().includes('flip box')
  );

  const hasWireRaceway = Boolean(
    electricStr && 
    electricStr !== 'None' && 
    (electricStr.toLowerCase().includes('raceway') || electricStr.toLowerCase().includes('switch'))
  );

  const hasModesty = Boolean(
    modestyStr && 
    modestyStr !== 'None' && 
    (modestyStr.toLowerCase().includes('modesty') || modestyStr === 'Included')
  );

  const hasCpuStand = Boolean(setup?.addons?.some(a => a.toLowerCase().includes('cpu')));
  const addOnsStr = setup?.addons && setup.addons.length > 0 ? setup.addons.join(', ') : 'None (Standard Bare Frame)';
  const modestyQty = hasModesty ? `${personQty === 1 ? '1 Pc' : `${personQty} Pcs`} (320mm Drop)` : 'None';

  // Theme palettes
  const tColors = theme === 'blueprint' ? {
    bg: '#0a192f',
    paper: '#0f2744',
    grid: 'rgba(56, 189, 248, 0.12)',
    border: '#1e4976',
    accent: '#38bdf8',
    secondary: '#818cf8',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    line: '#60a5fa',
    dimLine: '#38bdf8',
    dimText: '#7dd3fc',
    cardBg: '#132f52',
    cardBorder: '#2563eb',
    bubbleBg: '#0284c7'
  } : theme === 'darkcad' ? {
    bg: '#090d16',
    paper: '#111827',
    grid: 'rgba(148, 163, 184, 0.08)',
    border: '#334155',
    accent: '#f59e0b',
    secondary: '#10b981',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    line: '#e2e8f0',
    dimLine: '#f59e0b',
    dimText: '#fbbf24',
    cardBg: '#1f2937',
    cardBorder: '#475569',
    bubbleBg: '#d97706'
  } : {
    // Crisp Architectural White Paper
    bg: '#f8fafc',
    paper: '#ffffff',
    grid: 'rgba(148, 163, 184, 0.12)',
    border: '#cbd5e1',
    accent: '#2563eb',
    secondary: '#0891b2',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    line: '#1e293b',
    dimLine: '#dc2626',
    dimText: '#b91c1c',
    cardBg: '#f8fafc',
    cardBorder: '#cbd5e1',
    bubbleBg: '#1e293b'
  };

  // Convert SVG to High-Res Canvas
  const getRenderedCanvas = async (scale = 3): Promise<HTMLCanvasElement | null> => {
    if (!svgRef.current) return null;
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.clientWidth * scale || 2400;
        canvas.height = svgElement.clientHeight * scale || 2600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = tColors.paper;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        URL.revokeObjectURL(blobURL);
        resolve(canvas);
      };
      image.src = blobURL;
    });
  };

  // 1-Click High-Res PNG Download
  const handleDownloadPNG = async () => {
    try {
      setIsDownloading(true);
      const canvas = await getRenderedCanvas(3);
      if (!canvas) return;
      const a = document.createElement('a');
      a.download = `SRK_Modular_2D_CAD_and_Specs_${widthMm}x${depthMm}_${personQty}P.png`;
      a.href = canvas.toDataURL('image/png', 1.0);
      a.click();
      setDownloadSuccess('4K 2D CAD & Specs Infographic Downloaded!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1-Click Standard A4 PDF Download (2D CAD Line Drawings + Quotation Specifications Table)
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4' // 210mm x 297mm
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2; // 186mm

      // Top Header Bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.roundedRect(margin, margin, contentWidth, 18, 1.5, 1.5, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text('SRK MODULAR FURNITURE', margin + 4, margin + 7.5);

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(203, 213, 225);
      pdf.text('2D TECHNICAL CAD ELEVATIONS & QUOTATION SPECIFICATIONS', margin + 4, margin + 13);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(56, 189, 248);
      pdf.text(`${widthMm}W × ${depthMm}D × ${heightMm}H MM (${personQty}P POD)`, pageWidth - margin - 4, margin + 7.5, { align: 'right' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Doc ID: CAD-SRK-${widthMm}${depthMm}-${personQty}P | Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 4, margin + 13, { align: 'right' });

      let currentY = margin + 22;

      // 1. Render 2D CAD Technical Orthographic Line Drawings
      const cadH = 125;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, contentWidth, cadH, 1.5, 1.5, 'FD');

      const cadCanvas = await getRenderedCanvas(2.2);
      if (cadCanvas) {
        const cadImg = cadCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(cadImg, 'JPEG', margin + 1, currentY + 1, contentWidth - 2, cadH - 2);
      }

      currentY += cadH + 6;

      // 2. CHOSEN WORKSTATION QUOTATION SPECIFICATIONS Table (as requested, with 40x40mm CRCA Metal and 0.8/1.0mm Edge Band, no glides)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('CHOSEN WORKSTATION QUOTATION SPECIFICATIONS', margin, currentY);
      currentY += 2.5;

      autoTable(pdf, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['PARAMETER / ITEM', 'CHOSEN QUOTATION SPECIFICATION', 'PARAMETER / ITEM', 'CHOSEN QUOTATION SPECIFICATION']],
        body: [
          ['Overall Dimensions', `${widthMm}W × ${depthMm}D × ${heightMm}H mm`, 'Seating Capacity', `${personQty}-Person (${isCluster ? 'Face-to-Face Pod' : 'Linear Desk'})`],
          ['Tabletop Core Substrate', `${materialStr} (${thicknessVal}mm Thickness)`, 'Tabletop Finish & Edge', `${topColorStr} (${edgeBandStr})`],
          ['Understructure & Legs', understructureStr, 'Frame Powder Coat', `${legColorStr} Finish (50-60µ Pure Epoxy)`],
          ['Leg Frame Depth', `${depthMm - 50} mm Depth (25mm Front/Rear Overhang)`, 'Intermediate Center Leg', (widthMm >= 1800 || personQty > 1) ? '40×40mm Center Support Included' : 'N/A (Standard Single Span)'],
          ['Privacy Partition Screen', hasScreen ? `${frontScreenStr} (${screenHVal}mm Height)` : 'None', 'Screen Color & Corner', hasScreen ? `${screenColorStr} (R40 Safety Corners)` : 'N/A'],
          ['Power & Cable Management', `${electricStr}`, 'Modesty Privacy Panel', `${modestyStr} (${modestyQty})`],
          ['Understructure Spec', '40 × 40 mm CRCA Metal Tube', 'Configured Add-ons', `${addOnsStr}`]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 1.8
        },
        styles: {
          fontSize: 6.8,
          cellPadding: 1.6,
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: 'bold', textColor: [51, 65, 85] },
          1: { cellWidth: 55, fontStyle: 'bold', textColor: [15, 23, 42] },
          2: { cellWidth: 38, fontStyle: 'bold', textColor: [51, 65, 85] },
          3: { cellWidth: 55, fontStyle: 'bold', textColor: [15, 23, 42] }
        }
      });

      currentY = (pdf as any).lastAutoTable.finalY + 4;

      // 3. ENGINEERING STANDARDS & QUALITY COMPLIANCE Block
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, currentY, contentWidth, 18, 1.5, 1.5, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('ENGINEERING STANDARDS & QUALITY COMPLIANCE', margin + 4, currentY + 4.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.4);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`• Woodwork & Frame: IS-12823 E1 Grade Prelam with ${edgeBandMm} PVC edge hot-melt adhesion & 40 × 40 mm CRCA metal.`, margin + 4, currentY + 8.5);
      pdf.text('• Compliance Standards: BIFMA X5.5-2021 (Desk Products), ISO 9001:2015 Quality Certified, 5-Year Structural Warranty.', margin + 4, currentY + 12);
      pdf.text('• Tolerance: ±1.5mm on linear woodwork dimensions • All CRCA metal joints are MIG pulse welded & powder coated.', margin + 4, currentY + 15.5);

      // Footer
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
      pdf.setFontSize(6);
      pdf.setTextColor(148, 163, 184);
      pdf.text('SRK MODULAR FURNITURE • 2D TECHNICAL CAD LINE DRAWINGS & QUOTATION SPECIFICATIONS • ALL DIMENSIONS IN MM', margin, pageHeight - 4.5);
      pdf.text('Page 1 of 1 (Print-Ready A4)', pageWidth - margin, pageHeight - 4.5, { align: 'right' });

      pdf.save(`SRK_Modular_2D_CAD_and_Quotation_Specs_${widthMm}x${depthMm}_${personQty}P.pdf`);
      setDownloadSuccess('A4 2D CAD & Quotation Specs PDF Saved!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1-Click Vector SVG Download
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SRK_Modular_2D_CAD_${widthMm}x${depthMm}_${personQty}P.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Vector SVG CAD Drawing Downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">2D CAD Technical Elevations & Quotation Specifications</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Print-Ready A4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Front, Side & Top Elevations with sizes + Chosen Quotation Specifications (40×40mm CRCA Metal Understructure & {edgeBandMm} Edge Band).
              </p>
            </div>
          </div>

          {/* Theme Selector & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTheme('whitepaper')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  theme === 'whitepaper' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                White Paper
              </button>
              <button
                type="button"
                onClick={() => setTheme('blueprint')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  theme === 'blueprint' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Blueprint
              </button>
              <button
                type="button"
                onClick={() => setTheme('darkcad')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  theme === 'darkcad' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dark CAD
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas Container */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-950/60 flex justify-center items-start">
          <div className="w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden border border-slate-700 transition-all space-y-4">
            
            {/* 3D Camera Angle Selector Strip (When 3D snapshots are available) */}
            {angleImages && angleImages.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>3D Isometric Perspective Angle for CAD Sheet:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {angleImages.map((img, idx) => {
                    const isSelected = selectedImageSrc === img.dataUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageSrc(img.dataUrl)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        <span>{img.label.split('(')[0].trim()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SVG 2D TECHNICAL LINE DRAWINGS (FRONT, SIDE, TOP ELEVATIONS WITH SIZES & 3D ISOMETRIC VIEW) */}
            <svg
              ref={svgRef}
              viewBox="0 0 1200 960"
              className="w-full h-auto block select-none bg-white"
              style={{ backgroundColor: tColors.paper }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Background Grid Pattern */}
                <pattern id="cadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke={tColors.grid} strokeWidth="0.8" />
                </pattern>
                <pattern id="cadGridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke={tColors.grid} strokeWidth="1.5" />
                </pattern>

                {/* Arrow markers for dimension lines */}
                <marker id="arrowStart" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 8 1 L 1 5 L 8 9 z" fill={tColors.dimLine} />
                </marker>
                <marker id="arrowEnd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 2 1 L 9 5 L 2 9 z" fill={tColors.dimLine} />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect width="1200" height="960" fill={tColors.paper} />
              <rect width="1200" height="960" fill="url(#cadGrid)" />
              <rect width="1200" height="960" fill="url(#cadGridMajor)" />

              {/* Blueprint Outer Border */}
              <rect x="25" y="25" width="1150" height="910" fill="none" stroke={tColors.border} strokeWidth="2.5" />
              <rect x="30" y="30" width="1140" height="900" fill="none" stroke={tColors.border} strokeWidth="1" strokeDasharray="6,4" />

              {/* ============================================================== */}
              {/* 1. HEADER & BLUEPRINT TITLE BLOCK                              */}
              {/* ============================================================== */}
              <g id="headerTitleBlock" transform="translate(35, 35)">
                <rect x="0" y="0" width="1130" height="95" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1.5" rx="4" />
                
                {/* Brand Logo & Name */}
                <text x="25" y="42" fill={tColors.accent} fontSize="22" fontWeight="900" letterSpacing="1.5">
                  SRK MODULAR FURNITURE
                </text>
                <text x="25" y="68" fill={tColors.textMuted} fontSize="11" fontWeight="700" letterSpacing="1">
                  2D TECHNICAL LINE DRAWINGS (FRONT, SIDE & TOP ELEVATIONS)
                </text>

                {/* Vertical Divider */}
                <line x1="560" y1="12" x2="560" y2="83" stroke={tColors.border} strokeWidth="1.5" />

                {/* Model & Configured Meta */}
                <text x="585" y="38" fill={tColors.textPrimary} fontSize="13" fontWeight="800">
                  MODEL: <tspan fill={tColors.accent}>{widthMm}W × {depthMm}D × {heightMm}H MM</tspan> ({personQty}P {isCluster ? 'CLUSTER POD' : 'WORKSTATION'})
                </text>
                <text x="585" y="58" fill={tColors.textMuted} fontSize="10.5" fontWeight="500">
                  TOP: {topColorStr} ({materialStr} {thicknessVal}MM • {edgeBandMm} PVC EDGE) • UNDERSTRUCTURE: 40×40 MM CRCA METAL
                </text>
                <text x="585" y="78" fill={tColors.textMuted} fontSize="10" fontWeight="500">
                  FRAME COATING: {legColorStr} EPOXY • SCALE: 1:20 • DRAWING NO: CAD-SRK-{widthMm}x{depthMm}-{personQty}P
                </text>
                
                <rect x="1010" y="15" width="105" height="65" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.5" rx="4" />
                <text x="1062" y="42" fill={tColors.accent} fontSize="11" fontWeight="bold" textAnchor="middle">2D CAD</text>
                <text x="1062" y="62" fill={tColors.dimLine} fontSize="9.5" fontWeight="bold" textAnchor="middle">APPROVED</text>
              </g>

              {/* ============================================================== */}
              {/* 2. ELEVATION 1: FRONT ELEVATION (WITH SIZES)                    */}
              {/* ============================================================== */}
              <g id="frontElevation" transform="translate(60, 165)">
                <rect x="0" y="0" width="220" height="26" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1" rx="4" />
                <text x="12" y="18" fill={tColors.accent} fontSize="12" fontWeight="800">
                  1. FRONT ELEVATION
                </text>
                <text x="500" y="18" fill={tColors.textMuted} fontSize="10" fontStyle="italic">
                  Front view • All dimensions in millimeters (mm)
                </text>

                {/* Ground Reference Datum Line */}
                <line x1="-15" y1="260" x2="520" y2="260" stroke={tColors.border} strokeWidth="1.5" strokeDasharray="8,4" />
                <text x="525" y="264" fill={tColors.textMuted} fontSize="10" fontWeight="600">FFL ±0.00</text>

                {/* Table Top Surface */}
                <rect x="40" y="105" width="420" height="15" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="2" rx="1" />
                <line x1="40" y1="110" x2="460" y2="110" stroke={tColors.accent} strokeWidth="1" strokeDasharray="3,3" />

                {/* Tabletop & Edge Banding Callout */}
                <text x="250" y="100" fill={tColors.textMuted} fontSize="8" textAnchor="middle">
                  {thicknessVal}mm Top with {edgeBandMm} PVC Edge Banding
                </text>

                {/* Privacy Screen with Curved Corners & Clamps (ONLY IF hasScreen) */}
                {hasScreen && (
                  <g>
                    <path 
                      d="M 60,105 L 60,35 Q 60,20 75,20 L 425,20 Q 440,20 440,35 L 440,105 Z" 
                      fill="none" 
                      stroke={tColors.line} 
                      strokeWidth="2.5" 
                    />
                    <text x="250" y="58" fill={tColors.accent} fontSize="11" fontWeight="700" textAnchor="middle">
                      {frontScreenStr} ({screenHVal}mm Height • R40 Curved Top)
                    </text>
                    
                    {/* Mounting White Clamps */}
                    <rect x="130" y="95" width="14" height="20" fill="#ffffff" stroke={tColors.line} strokeWidth="1.5" rx="1" />
                    <rect x="356" y="95" width="14" height="20" fill="#ffffff" stroke={tColors.line} strokeWidth="1.5" rx="1" />
                    <text x="137" y="90" fill={tColors.textMuted} fontSize="8" textAnchor="middle">Clamp</text>
                    <text x="363" y="90" fill={tColors.textMuted} fontSize="8" textAnchor="middle">Clamp</text>

                    {/* Screen Height Dimension Line */}
                    <line x1="20" y1="20" x2="20" y2="105" stroke={tColors.dimLine} strokeWidth="1.2" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="20" y1="20" x2="60" y2="20" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="20" y1="105" x2="40" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="12" y="65" fill={tColors.dimText} fontSize="9" fontWeight="bold" transform="rotate(-90, 12, 65)" textAnchor="middle">
                      {screenHVal} MM (SCREEN HT)
                    </text>
                  </g>
                )}

                {/* Modesty Panel (ONLY IF hasModesty) */}
                {hasModesty && (
                  <g>
                    <rect x="68" y="120" width="364" height="70" fill="none" stroke={tColors.line} strokeWidth="1.5" strokeDasharray="6,3" />
                    <text x="250" y="160" fill={tColors.textMuted} fontSize="8" textAnchor="middle">320mm Drop Modesty Panel</text>
                  </g>
                )}

                {/* Understructure Horizontal Metal Apron Tube */}
                <rect x="58" y="120" width="384" height="12" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.5" />
                <text x="250" y="129" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  40 × 40 mm CRCA Metal Understructure
                </text>

                {/* Under-Desk Wire Raceway (ONLY IF hasWireRaceway) */}
                {hasWireRaceway && (
                  <g>
                    <rect x="140" y="136" width="220" height="22" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.5" />
                    <rect x="160" y="141" width="24" height="12" fill={tColors.cardBg} stroke={tColors.accent} strokeWidth="1" />
                    <rect x="240" y="141" width="24" height="12" fill={tColors.cardBg} stroke={tColors.accent} strokeWidth="1" />
                    <rect x="320" y="141" width="24" height="12" fill={tColors.cardBg} stroke={tColors.accent} strokeWidth="1" />
                    <text x="250" y="172" fill={tColors.textMuted} fontSize="8" textAnchor="middle">Wire Raceway with Switch Cutouts</text>
                  </g>
                )}

                {/* Legs Geometry: Render U-shape loop, Angular A-frame, or Straight legs */}
                {isAngularLegs ? (
                  <g id="frontAngularLegs">
                    {/* Left Slanted Angular Leg (Slim 40mm CRCA scale) */}
                    <polygon points="70,120 84,120 54,260 40,260" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <line x1="36" y1="260" x2="58" y2="260" stroke={tColors.accent} strokeWidth="2" />
                    <text x="47" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">Angular Leg</text>

                    {/* Right Slanted Angular Leg (Slim 40mm CRCA scale) */}
                    <polygon points="416,120 430,120 460,260 446,260" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <line x1="442" y1="260" x2="464" y2="260" stroke={tColors.accent} strokeWidth="2" />
                    <text x="453" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">Angular Leg</text>
                  </g>
                ) : isUShapeLegs ? (
                  <g id="frontUShapeLegs">
                    {/* Left U-Shape Loop Leg (Slim 40mm CRCA profile) */}
                    <rect x="48" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    {/* Welded corner reinforcement gusset */}
                    <polygon points="62,120 62,132 74,120" fill={tColors.paper} stroke={tColors.line} strokeWidth="1" />
                    {/* Floor contact line */}
                    <line x1="44" y1="260" x2="66" y2="260" stroke={tColors.accent} strokeWidth="2" />
                    <text x="55" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">U-Loop Frame</text>

                    {/* Right U-Shape Loop Leg (Slim 40mm CRCA profile) */}
                    <rect x="438" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    {/* Welded corner reinforcement gusset */}
                    <polygon points="438,120 438,132 426,120" fill={tColors.paper} stroke={tColors.line} strokeWidth="1" />
                    {/* Floor contact line */}
                    <line x1="434" y1="260" x2="456" y2="260" stroke={tColors.accent} strokeWidth="2" />
                    <text x="445" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">U-Loop Frame</text>
                  </g>
                ) : (
                  <g id="frontStraightLegs">
                    {/* Left Straight Leg (Slim 40mm CRCA profile) */}
                    <rect x="48" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <text x="55" y="274" fill={tColors.textMuted} fontSize="8" textAnchor="middle">40×40mm</text>

                    {/* Right Straight Leg (Slim 40mm CRCA profile) */}
                    <rect x="438" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <text x="445" y="274" fill={tColors.textMuted} fontSize="8" textAnchor="middle">40×40mm</text>
                  </g>
                )}

                {/* Exactly ONE Center Intermediate Support Leg for 1800mm+ spans or Multi-Person Pods */}
                {(widthMm >= 1800 || personQty > 1) && (
                  <g id="frontCenterSupportLeg">
                    <rect x="243" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <line x1="238" y1="260" x2="262" y2="260" stroke={tColors.accent} strokeWidth="2" />
                    <text x="250" y="274" fill={tColors.accent} fontSize="8" fontWeight="bold" textAnchor="middle">
                      40×40mm Center Support
                    </text>
                  </g>
                )}

                {/* Knee Clearance Label */}
                <text x={(widthMm >= 1800 || personQty > 1) ? 145 : 250} y="240" fill={tColors.textMuted} fontSize="8.5" fontWeight="600" textAnchor="middle">
                  725 MM KNEE CLEARANCE
                </text>
                {(widthMm >= 1800 || personQty > 1) && (
                  <text x="355" y="240" fill={tColors.textMuted} fontSize="8.5" fontWeight="600" textAnchor="middle">
                    725 MM KNEE CLEARANCE
                  </text>
                )}

                {/* FRONT WIDTH DIMENSION WITH SIZES */}
                <line x1="40" y1="0" x2="460" y2="0" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                <line x1="40" y1="0" x2="40" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="460" y1="0" x2="460" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="250" y="-8" fill={tColors.dimText} fontSize="12" fontWeight="bold" textAnchor="middle">
                  {widthMm} MM (OVERALL WIDTH)
                </text>

                {/* DESK HEIGHT DIMENSION WITH SIZES */}
                <line x1="490" y1="105" x2="490" y2="260" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                <line x1="460" y1="105" x2="500" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="460" y1="260" x2="500" y2="260" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="502" y="185" fill={tColors.dimText} fontSize="11" fontWeight="bold" transform="rotate(90, 502, 185)" textAnchor="middle">
                  {heightMm} MM (DESK HEIGHT)
                </text>
              </g>

              {/* ============================================================== */}
              {/* 3. ELEVATION 2: SIDE ELEVATION (WITH SIZES)                     */}
              {/* ============================================================== */}
              <g id="sideElevation" transform="translate(680, 165)">
                <rect x="0" y="0" width="220" height="26" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1" rx="4" />
                <text x="12" y="18" fill={tColors.accent} fontSize="12" fontWeight="800">
                  2. SIDE ELEVATION
                </text>

                {/* Prominent Leg Depth Spec Badge */}
                <g id="sideLegDepthSpecBadge">
                  <rect x="50" y="38" width="260" height="28" rx="4" fill={tColors.cardBg} stroke={tColors.accent} strokeWidth="1.2" />
                  <text x="180" y="52" fill={tColors.accent} fontSize="9" fontWeight="bold" textAnchor="middle">
                    LEG DEPTH: {depthMm - 50} MM • 40×40 MM CRCA TUBE
                  </text>
                  <text x="180" y="62" fill={tColors.textMuted} fontSize="7.5" textAnchor="middle">
                    Overall Desk Depth: {depthMm}mm • 25mm Front &amp; Rear Overhang
                  </text>
                </g>

                {/* Ground Reference */}
                <line x1="-15" y1="260" x2="380" y2="260" stroke={tColors.border} strokeWidth="1.5" strokeDasharray="8,4" />

                {/* Side Tabletop */}
                <rect x="40" y="105" width="280" height="15" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="2" rx="1" />

                {/* Tabletop Overhang Dimension Ticks */}
                <line x1="40" y1="95" x2="40" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" />
                <line x1="48" y1="95" x2="48" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" />
                <text x="44" y="92" fill={tColors.dimText} fontSize="6.5" fontWeight="bold" textAnchor="middle">25mm</text>

                <line x1="312" y1="95" x2="312" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" />
                <line x1="320" y1="95" x2="320" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" />
                <text x="316" y="92" fill={tColors.dimText} fontSize="6.5" fontWeight="bold" textAnchor="middle">25mm</text>

                {/* Side Screen (ONLY IF hasScreen) */}
                {hasScreen && (
                  <g>
                    <rect x="45" y="25" width="8" height="80" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="2" />
                    <rect x="42" y="95" width="14" height="20" fill="#ffffff" stroke={tColors.line} strokeWidth="1.5" rx="1" />
                  </g>
                )}

                {/* Side Legs Geometry: U-Shape Loop, Angular A-Frame, or Straight Legs (Slim Proportional 40mm CRCA) */}
                {isUShapeLegs ? (
                  <g id="sideUShapeLoopFrame">
                    {/* Continuous Slim 40mm CRCA Closed U-Loop Profile */}
                    <path 
                      d="M 48,120 L 48,260 L 312,260 L 312,120 L 298,120 L 298,246 L 62,246 L 62,120 Z" 
                      fill={tColors.cardBg} 
                      stroke={tColors.line} 
                      strokeWidth="1.8" 
                    />
                    {/* Top Support Crossbeam */}
                    <rect x="62" y="120" width="236" height="12" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="180" y="129" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">40×40mm U-Loop Subframe</text>
                    {/* Bottom Floor Runner Highlight */}
                    <line x1="62" y1="246" x2="298" y2="246" stroke={tColors.accent} strokeWidth="1" strokeDasharray="3,2" />
                    <text x="180" y="255" fill={tColors.accent} fontSize="8" fontWeight="bold" textAnchor="middle">40×40mm Closed U-Loop Frame (Welded)</text>
                    <text x="55" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">U-Loop</text>
                    <text x="305" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">U-Loop</text>
                  </g>
                ) : isAngularLegs ? (
                  <g id="sideAngularAFrame">
                    {/* Top Subframe Support Plate under Tabletop */}
                    <rect x="75" y="120" width="210" height="12" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="180" y="129" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">40×40mm Understructure Subframe</text>

                    {/* Integrated Sheet Metal Side Modesty / Gable Panel (Trapezoid) */}
                    <polygon 
                      points="98,128 262,128 296,226 64,226" 
                      fill={tColors.cardBg} 
                      stroke={tColors.line} 
                      strokeWidth="1.5" 
                    />
                    <text x="180" y="162" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">
                      Integrated Metal Gable Panel
                    </text>

                    {/* 2 Staggered Rows of Perforated Air/Cable Slots as in Reference Design */}
                    {/* Row 1 Slots */}
                    <g fill={tColors.paper} stroke={tColors.line} strokeWidth="0.8">
                      <rect x="82" y="196" width="16" height="4.5" rx="2" />
                      <rect x="108" y="196" width="16" height="4.5" rx="2" />
                      <rect x="134" y="196" width="16" height="4.5" rx="2" />
                      <rect x="160" y="196" width="16" height="4.5" rx="2" />
                      <rect x="186" y="196" width="16" height="4.5" rx="2" />
                      <rect x="212" y="196" width="16" height="4.5" rx="2" />
                      <rect x="238" y="196" width="16" height="4.5" rx="2" />
                      <rect x="264" y="196" width="16" height="4.5" rx="2" />

                      {/* Row 2 Staggered Slots */}
                      <rect x="95" y="206" width="16" height="4.5" rx="2" />
                      <rect x="121" y="206" width="16" height="4.5" rx="2" />
                      <rect x="147" y="206" width="16" height="4.5" rx="2" />
                      <rect x="173" y="206" width="16" height="4.5" rx="2" />
                      <rect x="199" y="206" width="16" height="4.5" rx="2" />
                      <rect x="225" y="206" width="16" height="4.5" rx="2" />
                      <rect x="251" y="206" width="16" height="4.5" rx="2" />
                      <rect x="277" y="206" width="16" height="4.5" rx="2" />
                    </g>

                    {/* Front Slanted 40x40mm CRCA Metal Post */}
                    <polygon points="85,120 99,120 48,260 34,260" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    {/* Front Leveling Glide */}
                    <rect x="37" y="258" width="8" height="4" rx="1" fill={tColors.accent} stroke={tColors.line} strokeWidth="0.8" />

                    {/* Rear Slanted 40x40mm CRCA Metal Post */}
                    <polygon points="261,120 275,120 326,260 312,260" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    {/* Rear Leveling Glide */}
                    <rect x="315" y="258" width="8" height="4" rx="1" fill={tColors.accent} stroke={tColors.line} strokeWidth="0.8" />

                    <text x="180" y="248" fill={tColors.accent} fontSize="8" fontWeight="bold" textAnchor="middle">
                      40×40mm Angular A-Frame with Perforated Side Fascia
                    </text>
                    <text x="39" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">Angular</text>
                    <text x="321" y="274" fill={tColors.textMuted} fontSize="8" fontWeight="bold" textAnchor="middle">Angular</text>
                  </g>
                ) : (
                  <g id="sideStraightLegs">
                    {/* Side Horizontal 40x40 CRCA Metal Support Beam */}
                    <rect x="58" y="120" width="244" height="12" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="180" y="129" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">40×40mm CRCA Subframe</text>

                    {/* Front & Rear 40x40mm CRCA Metal Straight Legs (Slim 14px) */}
                    <rect x="48" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <text x="55" y="274" fill={tColors.textMuted} fontSize="8" textAnchor="middle">40×40</text>

                    <rect x="298" y="120" width="14" height="140" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.8" />
                    <text x="305" y="274" fill={tColors.textMuted} fontSize="8" textAnchor="middle">40×40</text>
                  </g>
                )}



                {/* CPU Dolly Stand (ONLY IF hasCpuStand) */}
                {hasCpuStand && (
                  <g transform="translate(190, 215)">
                    <rect x="0" y="35" width="65" height="5" fill={tColors.line} />
                    <rect x="0" y="15" width="4" height="25" fill={tColors.line} />
                    <rect x="61" y="15" width="4" height="25" fill={tColors.line} />
                    <rect x="6" y="0" width="53" height="35" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1" />
                    <circle cx="10" cy="43" r="3" fill={tColors.line} />
                    <circle cx="55" cy="43" r="3" fill={tColors.line} />
                    <text x="32" y="20" fill={tColors.textMuted} fontSize="7" textAnchor="middle">CPU DOLLY</text>
                  </g>
                )}

                {/* SIDE DEPTH OVERALL TABLETOP DIMENSION WITH SIZES */}
                <line x1="40" y1="8" x2="320" y2="8" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                <line x1="40" y1="8" x2="40" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="320" y1="8" x2="320" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="180" y="0" fill={tColors.dimText} fontSize="12" fontWeight="bold" textAnchor="middle">
                  {depthMm} MM (OVERALL TABLETOP DEPTH)
                </text>

                {/* LEG FRAME DEPTH DIMENSION LINE (WITH EXACT SIZES & MIDDLE LEG SPAN) */}
                {(widthMm >= 1800 || personQty > 1) ? (
                  <g id="sideDualBayLegDimensions">
                    {/* Rear Post to Middle Leg Dimension */}
                    <line x1="55" y1="298" x2="180" y2="298" stroke={tColors.dimLine} strokeWidth="1.3" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="55" y1="260" x2="55" y2="303" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="180" y1="260" x2="180" y2="303" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="117" y="310" fill={tColors.dimText} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {Math.round((depthMm - 50) / 2)} MM
                    </text>

                    {/* Middle Leg to Front Post Dimension */}
                    <line x1="180" y1="298" x2="305" y2="298" stroke={tColors.dimLine} strokeWidth="1.3" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="305" y1="260" x2="305" y2="303" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="242" y="310" fill={tColors.dimText} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {Math.round((depthMm - 50) / 2)} MM
                    </text>

                    {/* Total Leg Frame Depth Span Dimension */}
                    <line x1="55" y1="324" x2="305" y2="324" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="55" y1="303" x2="55" y2="330" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="305" y1="303" x2="305" y2="330" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="180" y="337" fill={tColors.accent} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                      {depthMm - 50} MM TOTAL LEG DEPTH (40×40mm CRCA)
                    </text>
                  </g>
                ) : (
                  <g id="sideSingleBayLegDimensions">
                    {/* Leg-to-Leg Depth Span Dimension */}
                    <line x1="55" y1="298" x2="305" y2="298" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="55" y1="260" x2="55" y2="308" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="305" y1="260" x2="305" y2="308" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="180" y="311" fill={tColors.dimText} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                      {depthMm - 50} MM (LEG FRAME DEPTH • 40×40mm)
                    </text>
                    <text x="180" y="325" fill={tColors.textMuted} fontSize="8" textAnchor="middle">
                      25mm Front Overhang + 25mm Rear Overhang = {depthMm}mm Total Tabletop
                    </text>
                  </g>
                )}

                {/* SIDE DESK HEIGHT DIMENSION */}
                <line x1="350" y1="105" x2="350" y2="260" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                <line x1="320" y1="105" x2="360" y2="105" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="320" y1="260" x2="360" y2="260" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="362" y="185" fill={tColors.dimText} fontSize="10" fontWeight="bold" transform="rotate(90, 362, 185)" textAnchor="middle">
                  {heightMm} MM (DESK HT)
                </text>
              </g>

              {/* ============================================================== */}
              {/* 4. ROW 2: TOP ELEVATION (LEFT) & 3D ISOMETRIC VIEW (RIGHT)      */}
              {/* ============================================================== */}

              {/* 4A. ELEVATION 3: TOP ELEVATION / PLAN VIEW (LEFT QUADRANT) */}
              <g id="topPlanView" transform="translate(60, 510)">
                {/* Title and Subtitle */}
                <rect x="0" y="0" width="200" height="26" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1" rx="4" />
                <text x="12" y="18" fill={tColors.accent} fontSize="11" fontWeight="800">
                  3. TOP ELEVATION (PLAN)
                </text>
                <text x="215" y="18" fill={tColors.textMuted} fontSize="9.5" fontStyle="italic">
                  Plan view • Leg Depth: {depthMm - 50}mm
                </text>

                {/* TOP PLAN WIDTH DIMENSION WITH SIZES */}
                {(widthMm >= 1800 || personQty > 1) ? (
                  <g id="topPlanDualBayDimensions">
                    {/* Overall Span Line */}
                    <line x1="30" y1="36" x2="470" y2="36" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="30" y1="36" x2="30" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="470" y1="36" x2="470" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="250" y="30" fill={tColors.dimText} fontSize="10" fontWeight="bold" textAnchor="middle">
                      {widthMm} MM (OVERALL TOP SPAN)
                    </text>

                    {/* Left Bay Width Dimension */}
                    <line x1="30" y1="56" x2="250" y2="56" stroke={tColors.dimLine} strokeWidth="1.3" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="250" y1="56" x2="250" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="140" y="51" fill={tColors.dimText} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {Math.round(widthMm / 2)} MM
                    </text>

                    {/* Right Bay Width Dimension */}
                    <line x1="250" y1="56" x2="470" y2="56" stroke={tColors.dimLine} strokeWidth="1.3" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <text x="360" y="51" fill={tColors.dimText} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {Math.round(widthMm / 2)} MM
                    </text>
                  </g>
                ) : (
                  <g id="topPlanSingleBayDimensions">
                    <line x1="30" y1="48" x2="470" y2="48" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                    <line x1="30" y1="48" x2="30" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="470" y1="48" x2="470" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x="250" y="42" fill={tColors.dimText} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                      {widthMm} MM (OVERALL TOP SPAN)
                    </text>
                  </g>
                )}

                {/* Table Top Outline */}
                <rect x="30" y="78" width="440" height="195" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="2.5" rx="2" />

                {/* Footprint Geometry for U-Shape Loop, Angular, or Straight Legs */}
                {isUShapeLegs ? (
                  <g id="topUShapeRunners">
                    {/* Left U-Loop Floor Runner */}
                    <rect x="34" y="80" width="10" height="191" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.5" rx="1" />
                    <rect x="34" y="80" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <rect x="34" y="261" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="39" y="175" fill={tColors.accent} fontSize="6.5" fontWeight="bold" transform="rotate(-90, 39, 175)" textAnchor="middle">40×40mm U-RUNNER</text>

                    {/* Right U-Loop Floor Runner */}
                    <rect x="456" y="80" width="10" height="191" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.5" rx="1" />
                    <rect x="456" y="80" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <rect x="456" y="261" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="461" y="175" fill={tColors.accent} fontSize="6.5" fontWeight="bold" transform="rotate(90, 461, 175)" textAnchor="middle">40×40mm U-RUNNER</text>
                  </g>
                ) : isAngularLegs ? (
                  <g id="topAngularRunners">
                    {/* Left Angular A-Frame Base Runner */}
                    <rect x="22" y="75" width="14" height="201" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.5" strokeDasharray="4,2" rx="1" />
                    <rect x="24" y="80" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <rect x="24" y="261" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="29" y="175" fill={tColors.accent} fontSize="6.5" fontWeight="bold" transform="rotate(-90, 29, 175)" textAnchor="middle">A-FRAME BASE</text>

                    {/* Right Angular A-Frame Base Runner */}
                    <rect x="464" y="75" width="14" height="201" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.5" strokeDasharray="4,2" rx="1" />
                    <rect x="466" y="80" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <rect x="466" y="261" width="10" height="10" fill={tColors.cardBg} stroke={tColors.line} strokeWidth="1.2" />
                    <text x="471" y="175" fill={tColors.accent} fontSize="6.5" fontWeight="bold" transform="rotate(90, 471, 175)" textAnchor="middle">A-FRAME BASE</text>
                  </g>
                ) : (
                  <g id="topStraightCornerLegs">
                    <rect x="34" y="80" width="10" height="10" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.2" />
                    <line x1="34" y1="80" x2="44" y2="90" stroke={tColors.accent} strokeWidth="0.8" />
                    <rect x="456" y="80" width="10" height="10" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.2" />
                    <line x1="456" y1="80" x2="466" y2="90" stroke={tColors.accent} strokeWidth="0.8" />
                    <rect x="34" y="261" width="10" height="10" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.2" />
                    <line x1="34" y1="261" x2="44" y2="271" stroke={tColors.accent} strokeWidth="0.8" />
                    <rect x="456" y="261" width="10" height="10" fill={tColors.paper} stroke={tColors.line} strokeWidth="1.2" />
                    <line x1="456" y1="261" x2="466" y2="271" stroke={tColors.accent} strokeWidth="0.8" />
                  </g>
                )}

                {/* Center Intermediate Support Leg Footprints for 1800mm+ Spans or Multi-Person Pods */}
                {(widthMm >= 1800 || personQty > 1) && (
                  <g id="topCenterIntermediateLegs">
                    <rect x="245" y="80" width="10" height="10" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.2" />
                    <line x1="245" y1="80" x2="255" y2="90" stroke={tColors.accent} strokeWidth="0.8" />
                    <rect x="245" y="261" width="10" height="10" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.2" />
                    <line x1="245" y1="261" x2="255" y2="271" stroke={tColors.accent} strokeWidth="0.8" />
                    <rect x="200" y="166" width="100" height="18" rx="3" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1" />
                    <text x="250" y="178" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                      40×40mm CENTER SUPPORT
                    </text>
                  </g>
                )}

                {/* Central Spine Screen Divider (ONLY IF hasScreen && isCluster) */}
                {hasScreen && isCluster && (
                  <g>
                    <rect x="30" y="171" width="440" height="9" fill={tColors.paper} stroke={tColors.accent} strokeWidth="1.5" />
                    <text x="250" y="178" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                      CENTRAL SPINE SCREEN
                    </text>
                  </g>
                )}

                {/* Single Desk Screen on Back Edge (ONLY IF hasScreen && !isCluster) */}
                {hasScreen && !isCluster && (
                  <g>
                    <rect x="30" y="79" width="440" height="6" fill={tColors.accent} stroke={tColors.line} strokeWidth="1" />
                    <text x="250" y="74" fill={tColors.accent} fontSize="7.5" fontWeight="bold" textAnchor="middle">
                      REAR PRIVACY SCREEN ({screenColorStr})
                    </text>
                  </g>
                )}

                {/* User Seating Position Marking */}
                <text x="250" y={isCluster ? 105 : 215} fill={tColors.textMuted} fontSize="10" fontWeight="700" textAnchor="middle">
                  [ {personQty}-SEATED WORKSTATION AREA ]
                </text>

                {/* Depth Dimension on Right */}
                <line x1="485" y1="78" x2="485" y2="273" stroke={tColors.dimLine} strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
                <line x1="470" y1="78" x2="495" y2="78" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="470" y1="273" x2="495" y2="273" stroke={tColors.dimLine} strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="498" y="175" fill={tColors.dimText} fontSize="9.5" fontWeight="bold" transform="rotate(90, 498, 175)" textAnchor="middle">
                  {depthMm} MM (TOP) • {depthMm - 50} MM (LEG)
                </text>
              </g>

              {/* 4B. ELEVATION 4: 3D ISOMETRIC CAD PERSPECTIVE RENDERING (RIGHT QUADRANT) */}
              <g id="isometric3DView" transform="translate(640, 510)">
                {/* Title and Subtitle */}
                <rect x="0" y="0" width="220" height="26" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1" rx="4" />
                <text x="12" y="18" fill={tColors.accent} fontSize="11" fontWeight="800">
                  4. 3D ISOMETRIC VIEW
                </text>
                <text x="235" y="18" fill={tColors.textMuted} fontSize="9.5" fontStyle="italic">
                  3D Perspective • Material &amp; Hardware Specs
                </text>

                {/* 3D Stage Card Viewport */}
                <rect x="10" y="38" width="490" height="240" rx="6" fill={tColors.cardBg} stroke={tColors.cardBorder} strokeWidth="1.5" />
                
                {selectedImageSrc ? (
                  /* Embed Pure Captured 3D Perspective Image (Only Image) */
                  <g id="embedded3DSnapshot">
                    <image 
                      href={selectedImageSrc} 
                      x="12" 
                      y="40" 
                      width="486" 
                      height="236" 
                      preserveAspectRatio="xMidYMid meet" 
                    />
                  </g>
                ) : (
                  /* High-Fidelity 2.5D Isometric Vector Visualizer Fallback */
                  <g id="vector3DIsometricFallback" transform="translate(255, 155)">
                    {/* Shadow Ground */}
                    <ellipse cx="0" cy="80" rx="180" ry="25" fill={tColors.border} opacity="0.4" />

                    {/* Tabletop Surface in Isometric Projection */}
                    <polygon 
                      points="-140,0 60,-55 160,-20 -40,35" 
                      fill={tColors.paper} 
                      stroke={tColors.line} 
                      strokeWidth="2" 
                    />
                    {/* Tabletop Edge Thickness */}
                    <polygon 
                      points="-140,0 -40,35 -40,43 -140,8" 
                      fill={tColors.accent} 
                      opacity="0.3" 
                      stroke={tColors.line} 
                      strokeWidth="1.5" 
                    />
                    <polygon 
                      points="-40,35 160,-20 160,-12 -40,43" 
                      fill={tColors.accent} 
                      opacity="0.15" 
                      stroke={tColors.line} 
                      strokeWidth="1.5" 
                    />

                    {/* Privacy Screen (if hasScreen) */}
                    {hasScreen && (
                      <g>
                        <polygon 
                          points="55,-54 155,-19 155,-60 55,-95" 
                          fill={tColors.accent} 
                          opacity="0.8" 
                          stroke={tColors.line} 
                          strokeWidth="1.5" 
                        />
                        <text x="105" y="-55" fill="#ffffff" fontSize="7" fontWeight="bold" transform="rotate(-18, 105, -55)" textAnchor="middle">
                          {frontScreenStr}
                        </text>
                      </g>
                    )}

                    {/* 40x40mm CRCA Understructure Legs */}
                    {/* Left Front Leg */}
                    <line x1="-130" y1="8" x2="-130" y2="82" stroke={tColors.line} strokeWidth="4" strokeLinecap="square" />
                    {/* Right Front Leg */}
                    <line x1="-30" y1="43" x2="-30" y2="102" stroke={tColors.line} strokeWidth="4" strokeLinecap="square" />
                    {/* Right Rear Leg */}
                    <line x1="150" y1="-12" x2="150" y2="58" stroke={tColors.line} strokeWidth="4" strokeLinecap="square" />
                    {/* Left Rear Leg */}
                    <line x1="50" y1="-50" x2="50" y2="20" stroke={tColors.line} strokeWidth="3" strokeLinecap="square" />

                    {/* Center Intermediate Support Leg (for 1800mm+ spans) */}
                    {(widthMm >= 1800 || personQty > 1) && (
                      <g>
                        <line x1="-80" y1="25" x2="-80" y2="92" stroke={tColors.accent} strokeWidth="4" strokeLinecap="square" />
                        <line x1="100" y1="-30" x2="100" y2="39" stroke={tColors.accent} strokeWidth="3" strokeLinecap="square" />
                      </g>
                    )}

                    {/* U-Shape Loop Floor Runners (if isUShapeLegs) */}
                    {isUShapeLegs && (
                      <g>
                        <line x1="-130" y1="82" x2="-30" y2="102" stroke={tColors.line} strokeWidth="4" />
                        <line x1="50" y1="20" x2="150" y2="58" stroke={tColors.line} strokeWidth="4" />
                      </g>
                    )}
                  </g>
                )}
              </g>

              {/* ============================================================== */}
              {/* 5. FOOTER CERTIFICATION & LEGAL BLOCK                          */}
              {/* ============================================================== */}
              <g id="footerBlock" transform="translate(60, 895)">
                <line x1="0" y1="0" x2="1080" y2="0" stroke={tColors.border} strokeWidth="1" />
                <text x="0" y="18" fill={tColors.textMuted} fontSize="9" fontWeight="500">
                  CONFIDENTIAL • SRK MODULAR FURNITURE • 2D CAD TECHNICAL ELEVATIONS &amp; 3D ISOMETRIC SPECIFICATIONS
                </text>
                <text x="0" y="32" fill={tColors.textMuted} fontSize="8">
                  All dimensions in millimeters (mm) • 40×40mm CRCA metal understructure • Leg Frame Depth: {depthMm - 50}mm • {edgeBandMm} PVC edge band • Tolerance: ±1.5mm.
                </text>
                <text x="1080" y="22" fill={tColors.accent} fontSize="10" fontWeight="bold" textAnchor="end">
                  SRK-CAD-APPROVED
                </text>
              </g>
            </svg>

            {/* CHOSEN WORKSTATION QUOTATION SPECIFICATIONS CARD (IN MODAL) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Chosen Workstation Quotation Specifications</span>
                </h4>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Active Configuration
                </span>
              </div>

              {/* 4-Column Specification Table (Clean, with 40x40mm CRCA Metal and 0.8/1.0mm Edge Band, no glides) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Parameter / Item</th>
                      <th className="py-2 px-3">Chosen Quotation Specification</th>
                      <th className="py-2 px-3">Parameter / Item</th>
                      <th className="py-2 px-3">Chosen Quotation Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Overall Dimensions</td>
                      <td className="py-2 px-3 font-bold text-white">{widthMm}W × {depthMm}D × {heightMm}H mm</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Seating Capacity</td>
                      <td className="py-2 px-3 font-bold text-white">{personQty}-Person ({isCluster ? 'Face-to-Face Pod' : 'Linear Desk'})</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Tabletop Core Substrate</td>
                      <td className="py-2 px-3 text-slate-200">{materialStr} ({thicknessVal}mm Thickness)</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Tabletop Finish & Edge</td>
                      <td className="py-2 px-3 font-bold text-sky-400">{topColorStr} ({edgeBandStr})</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Understructure & Legs</td>
                      <td className="py-2 px-3 text-slate-200 font-bold text-white">{understructureStr}</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Frame Powder Coat</td>
                      <td className="py-2 px-3 font-bold text-sky-400">{legColorStr} Finish (50-60µ Pure Epoxy)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Leg Frame Depth</td>
                      <td className="py-2 px-3 text-slate-200 font-bold text-emerald-400">{depthMm - 50} mm Depth (25mm Front/Rear Overhang)</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Intermediate Center Leg</td>
                      <td className="py-2 px-3 text-slate-200 font-medium text-sky-300">
                        {(widthMm >= 1800 || personQty > 1) ? '40×40mm Center Support Post Included' : 'N/A (Standard Single Span)'}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Privacy Partition Screen</td>
                      <td className="py-2 px-3 text-slate-200">{hasScreen ? `${frontScreenStr} (${screenHVal}mm Height)` : 'None'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Screen Color & Corner</td>
                      <td className="py-2 px-3 text-slate-200">{hasScreen ? `${screenColorStr} (R40 Safety Corners)` : 'N/A'}</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Power & Cable Management</td>
                      <td className="py-2 px-3 text-slate-200">{electricStr}</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Modesty Privacy Panel</td>
                      <td className="py-2 px-3 text-slate-200">{modestyStr} ({modestyQty})</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-400">Understructure Spec</td>
                      <td className="py-2 px-3 text-slate-200 font-medium">40 × 40 mm CRCA Metal Tube</td>
                      <td className="py-2 px-3 font-semibold text-slate-400">Configured Add-ons</td>
                      <td className="py-2 px-3 font-medium text-emerald-400">{addOnsStr}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Engineering Standards Block */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                  Engineering Standards & Quality Compliance
                </div>
                <p>• Woodwork & Frame: IS-12823 E1 Grade Prelam with {edgeBandMm} PVC edge hot-melt adhesion & 40 × 40 mm CRCA metal understructure.</p>
                <p>• Compliance Standards: BIFMA X5.5-2021 (Desk Products), ISO 9001:2015 Quality Certified, 5-Year Structural Warranty.</p>
                <p>• Tolerance: ±1.5mm on linear woodwork dimensions • All CRCA metal joints are MIG pulse welded & powder coated.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{downloadSuccess}</span>
              </span>
            )}
            {!downloadSuccess && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                Download the 2D CAD technical elevations (Front, Side & Top with sizes) and quotation specifications:
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Vector SVG */}
            <button
              type="button"
              onClick={handleDownloadSVG}
              disabled={isDownloading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Download Vector SVG CAD file"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Vector SVG</span>
            </button>

            {/* Download High-Res Infographic PNG */}
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Download High-Res 4K Infographic Image"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Infographic PNG (4K)</span>
            </button>

            {/* Download A4 CAD & Quotation Specs PDF (Primary Action) */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-indigo-500/25"
              title="Download Print-Ready A4 Technical 2D CAD & Quotation Specification PDF (210 × 297 mm)"
            >
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-black uppercase tracking-wider">A4</span>
              <Printer className="w-4 h-4 text-white" />
              <span>{isDownloading ? 'Generating A4 PDF...' : 'Download A4 CAD & Specs PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
