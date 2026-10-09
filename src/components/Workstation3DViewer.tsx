import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WorkstationSetupData, getTableTopHex, getScreenHex, getLegHex } from './WorkstationLiveRenderer';
import JSZip from 'jszip';
import { 
  RotateCw, 
  Eye, 
  Maximize2, 
  Minimize2,
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Compass,
  Play,
  Pause,
  Layers,
  Sparkles,
  Tag,
  Camera,
  Sun,
  Moon,
  X,
  Download,
  Check,
  Images,
  Loader2,
  FolderArchive,
  FileCheck,
  FileText
} from 'lucide-react';
import { WorkstationTechnicalInfographicModal } from './WorkstationTechnicalInfographicModal';

interface Workstation3DViewerProps {
  setup?: WorkstationSetupData | null;
  className?: string;
  isExpandedView?: boolean;
  onToggleExpand?: () => void;
  onToggleMiddlePartition?: () => void;
}

// Procedurally generate a wood texture on a canvas
function createWoodTexture(baseColorHex: string, grainColorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle grain lines
    ctx.strokeStyle = grainColorHex;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;

    for (let i = 0; i < 512; i += 4) {
      ctx.beginPath();
      const wave = Math.sin(i * 0.05) * 8;
      ctx.moveTo(0, i + wave);
      ctx.bezierCurveTo(170, i - wave * 1.5, 340, i + wave * 1.5, 512, i - wave);
      ctx.stroke();
    }

    // Wood rings / knots
    ctx.globalAlpha = 0.12;
    for (let k = 0; k < 3; k++) {
      const cx = 100 + k * 160;
      const cy = 200 + (k % 2) * 100;
      for (let r = 10; r < 90; r += 14) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.8, r * 0.5, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Procedural soft contact shadow texture
function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.2)');
    grad.addColorStop(0.85, 'rgba(15, 23, 42, 0.05)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

// Safe cross-browser rounded rectangle helper for canvas textures
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}



export const Workstation3DViewer: React.FC<Workstation3DViewerProps> = ({ 
  setup, 
  className = '',
  isExpandedView,
  onToggleExpand,
  onToggleMiddlePartition
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tableGroupRef = useRef<THREE.Group | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  const topCalloutRef = useRef<HTMLDivElement>(null);
  const screenCalloutRef = useRef<HTMLDivElement>(null);
  const flipBoxCalloutRef = useRef<HTMLDivElement>(null);
  const modestyCalloutRef = useRef<HTMLDivElement>(null);
  const legCalloutRef = useRef<HTMLDivElement>(null);

  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [currentAngleDeg, setCurrentAngleDeg] = useState<number>(45);
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [hasWebGLError, setHasWebGLError] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);
  const [isDownloadingAllAngles, setIsDownloadingAllAngles] = useState<boolean>(false);
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');
  const [downloadAllSuccess, setDownloadAllSuccess] = useState<boolean>(false);
  const [showInfographicModal, setShowInfographicModal] = useState<boolean>(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [angleImages, setAngleImages] = useState<{ label: string; dataUrl: string }[]>([]);

  const handleOpenInfographic = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (renderer && scene && camera && controls) {
      // Save camera state
      const originalPos = camera.position.clone();
      const originalTarget = controls.target.clone();
      const prevAutoRotate = isAutoRotating;
      setIsAutoRotating(false);
      controls.autoRotate = false;

      // Capture main view
      renderer.render(scene, camera);
      const mainDataURL = renderer.domElement.toDataURL('image/jpeg', 0.95);
      setPreviewImageSrc(mainDataURL);

      // Capture 6 clean studio angle renders for the A4 PDF Checklist packet
      const dist = 2.45;
      const targetY = heightM / 2 + 0.05;
      controls.target.set(0, targetY, 0);

      const anglePresets = [
        { label: 'Isometric 3D Perspective (45°)', getPos: (d: number, tY: number) => new THREE.Vector3(d * 0.72, tY + 0.65, d * 0.72) },
        { label: 'Front Orthographic View (0°)', getPos: (d: number, tY: number) => new THREE.Vector3(0, tY + 0.25, d) },
        { label: 'Side Profile View (90°)', getPos: (d: number, tY: number) => new THREE.Vector3(d * 1.05, tY + 0.2, 0) },
        { label: 'Top Overhead Plan (90° Down)', getPos: (d: number, tY: number) => new THREE.Vector3(0.001, d * 1.4, 0.001) },
        { label: 'Rear Wire Raceway View (180°)', getPos: (d: number, tY: number) => new THREE.Vector3(0, tY + 0.35, -d) },
        { label: 'Isometric Opposite Angle (-45°)', getPos: (d: number, tY: number) => new THREE.Vector3(-d * 0.72, tY + 0.65, d * 0.72) }
      ];

      const captured: { label: string; dataUrl: string }[] = [];
      for (const p of anglePresets) {
        camera.position.copy(p.getPos(dist, targetY));
        camera.lookAt(controls.target);
        controls.update();
        renderer.render(scene, camera);
        captured.push({
          label: p.label,
          dataUrl: renderer.domElement.toDataURL('image/jpeg', 0.9)
        });
      }

      setAngleImages(captured);

      // Restore camera state
      camera.position.copy(originalPos);
      controls.target.copy(originalTarget);
      controls.update();
      renderer.render(scene, camera);
      setIsAutoRotating(prevAutoRotate);
    }
    setShowInfographicModal(true);
  };

  // Sync external expanded state if provided
  useEffect(() => {
    if (isExpandedView !== undefined) {
      setIsFullScreen(isExpandedView);
    }
  }, [isExpandedView]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        onToggleExpand?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, onToggleExpand]);

  // Trigger resize and lock body scroll on fullscreen toggle
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const w = isFullScreen ? window.innerWidth : (mountRef.current.clientWidth || window.innerWidth);
        const h = isFullScreen ? window.innerHeight : (mountRef.current.clientHeight || window.innerHeight);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h, true);
        if (sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    };

    handleResize();
    const t1 = setTimeout(handleResize, 30);
    const t2 = setTimeout(handleResize, 100);
    const t3 = setTimeout(handleResize, 300);
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = '';
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullScreen]);

  // Update background when theme mode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(themeMode === 'dark' ? 0x090d16 : 0xf1f5f9);
    }
  }, [themeMode]);

  const toggleFullScreen = () => {
    const nextState = !isFullScreen;
    setIsFullScreen(nextState);
    onToggleExpand?.();
  };

  const handleTakeSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `workstation_3d_${(setup?.dimensions || 'custom').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2200);
  };

  // Robust parsing of table dimensions (e.g. "1800 x 600", "1800 mm x 600 mm", "1800L x 600W mm", "1800mm")
  const { widthM, depthM, heightM } = useMemo(() => {
    let w = 1.2;
    let d = 0.6;
    const h = 0.75; // Standard 750mm desk height
    if (setup?.dimensions) {
      const match = setup.dimensions.match(/(\d{3,4})\s*(?:mm|L|W)?\s*[xX*×-]\s*(\d{3,4})/);
      if (match) {
        const parsedW = parseInt(match[1], 10);
        const parsedD = parseInt(match[2], 10);
        if (parsedW > 0) w = parsedW / 1000;
        if (parsedD > 0) d = parsedD / 1000;
      } else {
        const single = setup.dimensions.match(/(\d{3,4})/);
        if (single) {
          const parsed = parseInt(single[1], 10);
          if (parsed >= 600) w = parsed / 1000;
        }
      }
    }
    return { widthM: w, depthM: d, heightM: h };
  }, [setup?.dimensions]);

  // Thickness in meters
  const thicknessM = useMemo(() => {
    if (setup?.thickness === '36 mm') return 0.036;
    if (setup?.thickness === '18 mm') return 0.018;
    return 0.025; // default 25mm
  }, [setup?.thickness]);

  // Leg cross section (40x40 or 50x50)
  const legSizeM = useMemo(() => {
    return setup?.legSize === '50 x 50' ? 0.05 : 0.04;
  }, [setup?.legSize]);

  const electricFunction = setup?.electricFunction || 'None';
  const hasFlipBox = electricFunction !== 'None' && electricFunction !== 'Wire Raceway' && (electricFunction.includes('Flip Box') || setup?.addons?.includes('Flip Box'));

  // 1-Click Download of All 8 Angle Images + Contact Sheet in a ZIP archive
  const handleDownloadAllAngles = async () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!renderer || !scene || !camera || !controls || isDownloadingAllAngles) return;

    setIsDownloadingAllAngles(true);
    setDownloadAllSuccess(false);
    const prevAutoRotate = isAutoRotating;
    setIsAutoRotating(false);
    controls.autoRotate = false;

    // Save current camera state
    const originalPos = camera.position.clone();
    const originalTarget = controls.target.clone();

    // Hide callout pins during high-res capture
    const prevShowHotspots = showHotspots;
    setShowHotspots(false);

    const anglePresets = [
      { name: '01_Front_View.png', label: 'Front View (0°)', getPos: (d: number, tY: number) => new THREE.Vector3(0, tY + 0.25, d) },
      { name: '02_Isometric_Front_Right.png', label: 'Isometric Front-Right (45°)', getPos: (d: number, tY: number) => new THREE.Vector3(d * 0.72, tY + 0.65, d * 0.72) },
      { name: '03_Isometric_Front_Left.png', label: 'Isometric Front-Left (-45°)', getPos: (d: number, tY: number) => new THREE.Vector3(-d * 0.72, tY + 0.65, d * 0.72) },
      { name: '04_Side_Right_View.png', label: 'Side Right View (90°)', getPos: (d: number, tY: number) => new THREE.Vector3(d * 1.05, tY + 0.2, 0) },
      { name: '05_Side_Left_View.png', label: 'Side Left View (-90°)', getPos: (d: number, tY: number) => new THREE.Vector3(-d * 1.05, tY + 0.2, 0) },
      { name: '06_Rear_View.png', label: 'Rear & Raceway View (180°)', getPos: (d: number, tY: number) => new THREE.Vector3(0, tY + 0.35, -d) },
      { name: '07_Isometric_Rear_Angle.png', label: 'Isometric Rear Angle (135°)', getPos: (d: number, tY: number) => new THREE.Vector3(d * 0.72, tY + 0.65, -d * 0.72) },
      { name: '08_Top_Plan_View.png', label: 'Top Plan View (90° Down)', getPos: (d: number, tY: number) => new THREE.Vector3(0.001, d * 1.4, 0.001) },
    ];

    const zip = new JSZip();
    const dist = 2.45;
    const targetY = heightM / 2 + 0.05;
    controls.target.set(0, targetY, 0);

    const capturedImages: { name: string; label: string; dataUrl: string }[] = [];

    try {
      for (let i = 0; i < anglePresets.length; i++) {
        const preset = anglePresets[i];
        setDownloadProgressText(`Rendering ${preset.label} (${i + 1}/${anglePresets.length})...`);
        
        const pos = preset.getPos(dist, targetY);
        camera.position.copy(pos);
        camera.lookAt(controls.target);
        controls.update();

        // Render frame
        renderer.render(scene, camera);
        await new Promise(res => setTimeout(res, 50));
        renderer.render(scene, camera);

        const dataURL = renderer.domElement.toDataURL('image/png', 1.0);
        const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
        
        zip.file(preset.name, base64Data, { base64: true });
        capturedImages.push({
          name: preset.name,
          label: preset.label,
          dataUrl: dataURL
        });
      }

      setDownloadProgressText('Creating High-Res Contact Overview Sheet...');
      // Create an 8-panel high-res composite collage overview sheet
      const compositeCanvas = document.createElement('canvas');
      const cols = 4;
      const rows = 2;
      const cellW = 800;
      const cellH = 500;
      const headerH = 120;
      compositeCanvas.width = cols * cellW;
      compositeCanvas.height = rows * cellH + headerH;
      const ctx = compositeCanvas.getContext('2d');

      if (ctx) {
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

        // Header branding
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(`SRK MODULAR — ${setup?.dimensions || 'Workstation'} (${setup?.personQuantity && setup.personQuantity > 1 ? `${setup.personQuantity}-Person Pod` : 'Single Desk'})`, 40, 55);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Top: ${setup?.tableTopColor || 'Frosty white'} (${setup?.thickness || '25 mm'}) | Screen: ${setup?.frontScreen || 'Acrylic sheet'} (${setup?.screenColor || 'Blue'}) | Legs: ${setup?.legSize || '40x40'} ${setup?.legColor || 'Black'} | 8-Angle Multi-View CAD Sheet`, 40, 95);

        // Draw each cell
        for (let i = 0; i < capturedImages.length; i++) {
          const item = capturedImages[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * cellW;
          const y = headerH + row * cellH;

          const img = new Image();
          img.src = item.dataUrl;
          await new Promise((res) => { 
            img.onload = res; 
            img.onerror = res;
          });

          // Cell background
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 10, y + 10, cellW - 20, cellH - 20);

          ctx.drawImage(img, x + 15, y + 15, cellW - 30, cellH - 70);

          // Label pill at bottom of cell
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 20, y + cellH - 50, cellW - 40, 34);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.label, x + cellW / 2, y + cellH - 27);
          ctx.textAlign = 'left';
        }

        const compositeDataURL = compositeCanvas.toDataURL('image/png', 1.0);
        const compositeBase64 = compositeDataURL.replace(/^data:image\/png;base64,/, '');
        zip.file('00_All_Angles_Overview_Sheet.png', compositeBase64, { base64: true });
      }

      setDownloadProgressText('Packaging All Angles into ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Trigger download
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      const cleanDim = (setup?.dimensions || 'workstation').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `Workstation_All_Angles_${cleanDim}_${setup?.personQuantity || 1}P.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadAllSuccess(true);
      setDownloadProgressText('All 8 Angle Images Downloaded!');
      setTimeout(() => {
        setIsDownloadingAllAngles(false);
        setDownloadProgressText('');
        setDownloadAllSuccess(false);
      }, 2500);

    } catch (err) {
      console.error('Error downloading all angles:', err);
      setDownloadProgressText('Download failed. Please try again.');
      setTimeout(() => {
        setIsDownloadingAllAngles(false);
        setDownloadProgressText('');
      }, 2000);
    } finally {
      // Restore original camera & controls
      camera.position.copy(originalPos);
      controls.target.copy(originalTarget);
      controls.update();
      setIsAutoRotating(prevAutoRotate);
      controls.autoRotate = prevAutoRotate;
      setShowHotspots(prevShowHotspots);
    }
  };

  // Keep latest parameters in ref for animation frame tracking
  const dynamicParamsRef = useRef({
    widthM,
    depthM,
    heightM,
    thicknessM,
    legSizeM,
    hasScreen: setup?.frontScreen && setup.frontScreen !== 'No Screen',
    hasModesty: setup?.modesty !== 'None',
    hasFlipBox,
    showHotspots,
    personQuantity: setup?.personQuantity ?? 1,
    layoutType: setup?.layoutType ?? 'cluster'
  });

  useEffect(() => {
    dynamicParamsRef.current = {
      widthM,
      depthM,
      heightM,
      thicknessM,
      legSizeM,
      hasScreen: setup?.frontScreen && setup.frontScreen !== 'No Screen',
      hasModesty: setup?.modesty !== 'None',
      hasFlipBox,
      showHotspots,
      personQuantity: setup?.personQuantity ?? 1,
      layoutType: setup?.layoutType ?? 'cluster'
    };
  }, [widthM, depthM, heightM, thicknessM, legSizeM, setup?.frontScreen, setup?.modesty, hasFlipBox, showHotspots, setup?.personQuantity, setup?.layoutType]);

  // Color hexes
  const topColorHex = useMemo(() => getTableTopHex(setup?.tableTopColor), [setup?.tableTopColor]);
  const screenColorHex = useMemo(() => getScreenHex(setup?.screenColor), [setup?.screenColor]);
  const legColorHex = useMemo(() => getLegHex(setup?.legColor, setup?.legMaterial), [setup?.legColor, setup?.legMaterial]);

  // Initialize Three.js scene
  useEffect(() => {
    try {
      const container = mountRef.current;
      if (!container) return;

      const width = container.clientWidth || 400;
      const height = container.clientHeight || 400;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
      // Start at an expansive isometric viewpoint suitable for wide tables & multi-person pods
      camera.position.set(2.4, 1.6, 2.6);
      cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 1.2;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.4;
    controls.target.set(0, heightM / 2 + 0.05, 0);
    controls.minDistance = 0.8;
    controls.maxDistance = 6.5;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep camera above floor level
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      setIsUserInteracting(true);
      setIsAutoRotating(false);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
    });
    controls.addEventListener('end', () => {
      setIsUserInteracting(false);
    });

    // Balanced studio lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.6);
    keyLight.position.set(4.5, 5.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    fillLight.position.set(-4, 3.5, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

    // Showroom 3D turntable platform stage (expanded for wide 1800-2400mm tables & pods)
    const turntableGeo = new THREE.CylinderGeometry(3.1, 3.16, 0.02, 64);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.05,
    });
    const turntableMesh = new THREE.Mesh(turntableGeo, turntableMat);
    turntableMesh.position.y = -0.01;
    turntableMesh.receiveShadow = true;
    scene.add(turntableMesh);

    // Turntable accent ring
    const ringGeo = new THREE.TorusGeometry(3.12, 0.01, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.3,
      metalness: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.001;
    scene.add(ringMesh);

    // Subtle studio floor shadow (expanded)
    const shadowGeo = new THREE.PlaneGeometry(6.0, 4.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.002;
    scene.add(shadowMesh);

    // Desk Group container
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);
    tableGroupRef.current = tableGroup;

    // Animation Loop
    let lastAngleUpdate = 0;
    const animate = (time: number) => {
      reqAnimRef.current = requestAnimationFrame(animate);
      controls.update();

      // Update 360 degree compass angle for UI feedback (throttled to ~10fps)
      if (time - lastAngleUpdate > 100) {
        lastAngleUpdate = time;
        const angleRad = controls.getAzimuthalAngle();
        let deg = Math.round((angleRad * 180) / Math.PI);
        if (deg < 0) deg += 360;
        setCurrentAngleDeg(deg);
      }

      // Update 3D interactive callout badges in screen space
      if (dynamicParamsRef.current.showHotspots && container && camera) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const p = dynamicParamsRef.current;
        const legInset = p.legSizeM / 2 + 0.02;
        const personQty = p.personQuantity || 1;
        const layoutType = p.layoutType || 'cluster';
        const cols = Math.ceil(personQty / 2);
        // Position of the primary front-left desk in the cluster/bench
        const primaryDeskX = personQty > 1 ? (layoutType === 'cluster' ? (0 - (cols - 1) / 2) * p.widthM : (0 - (personQty - 1) / 2) * p.widthM) : 0;
        const primaryDeskZ = personQty > 1 ? (layoutType === 'cluster' ? p.depthM / 2 : 0) : 0;

        // 1. Table Top Callout (Pointing directly on table top surface)
        if (topCalloutRef.current) {
          const v = new THREE.Vector3(primaryDeskX - p.widthM * 0.18, p.heightM, primaryDeskZ + p.depthM * 0.08);
          v.project(camera);
          if (v.z < 1) {
            topCalloutRef.current.style.display = 'flex';
            const px = (v.x * 0.5 + 0.5) * w;
            const py = (-v.y * 0.5 + 0.5) * h;
            topCalloutRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
          } else {
            topCalloutRef.current.style.display = 'none';
          }
        }

        // 2. Privacy Screen Callout (Pointing directly on screen)
        if (screenCalloutRef.current) {
          if (p.hasScreen) {
            const v = new THREE.Vector3(primaryDeskX + p.widthM * 0.22, p.heightM + 0.18, primaryDeskZ - p.depthM / 2 + 0.02);
            v.project(camera);
            if (v.z < 1) {
              screenCalloutRef.current.style.display = 'flex';
              const px = (v.x * 0.5 + 0.5) * w;
              const py = (-v.y * 0.5 + 0.5) * h;
              screenCalloutRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
            } else {
              screenCalloutRef.current.style.display = 'none';
            }
          } else {
            screenCalloutRef.current.style.display = 'none';
          }
        }

        // 3. Flip Box Callout (Pointing directly on flip box if present)
        if (flipBoxCalloutRef.current) {
          if (p.hasFlipBox) {
            const v = new THREE.Vector3(primaryDeskX, p.heightM + 0.005, primaryDeskZ - p.depthM / 2 + 0.13);
            v.project(camera);
            if (v.z < 1) {
              flipBoxCalloutRef.current.style.display = 'flex';
              const px = (v.x * 0.5 + 0.5) * w;
              const py = (-v.y * 0.5 + 0.5) * h;
              flipBoxCalloutRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
            } else {
              flipBoxCalloutRef.current.style.display = 'none';
            }
          } else {
            flipBoxCalloutRef.current.style.display = 'none';
          }
        }

        // 4. Modesty Panel Callout (Pointing directly on modesty panel)
        if (modestyCalloutRef.current) {
          if (p.hasModesty) {
            const v = new THREE.Vector3(primaryDeskX, p.heightM - 0.22, primaryDeskZ - p.depthM / 2 + 0.04);
            v.project(camera);
            if (v.z < 1) {
              modestyCalloutRef.current.style.display = 'flex';
              const px = (v.x * 0.5 + 0.5) * w;
              const py = (-v.y * 0.5 + 0.5) * h;
              modestyCalloutRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
            } else {
              modestyCalloutRef.current.style.display = 'none';
            }
          } else {
            modestyCalloutRef.current.style.display = 'none';
          }
        }

        // 5. Legs Callout (Pointing directly on front leg)
        if (legCalloutRef.current) {
          const v = new THREE.Vector3(primaryDeskX - p.widthM / 2 + legInset, p.heightM * 0.45, primaryDeskZ + p.depthM / 2 - legInset);
          v.project(camera);
          if (v.z < 1) {
            legCalloutRef.current.style.display = 'flex';
            const px = (v.x * 0.5 + 0.5) * w;
            const py = (-v.y * 0.5 + 0.5) * h;
            legCalloutRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
          } else {
            legCalloutRef.current.style.display = 'none';
          }
        }
      } else {
        if (topCalloutRef.current) topCalloutRef.current.style.display = 'none';
        if (screenCalloutRef.current) screenCalloutRef.current.style.display = 'none';
        if (flipBoxCalloutRef.current) flipBoxCalloutRef.current.style.display = 'none';
        if (modestyCalloutRef.current) modestyCalloutRef.current.style.display = 'none';
        if (legCalloutRef.current) legCalloutRef.current.style.display = 'none';
      }

      renderer.render(scene, camera);
    };
    reqAnimRef.current = requestAnimationFrame(animate);

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  } catch (err) {
    console.warn("WebGL is unavailable or encountered an error:", err);
    setHasWebGLError(true);
  }
}, []);

  // Update autoRotate flag when state changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // Rebuild 3D Workstation Geometry whenever specifications change
  useEffect(() => {
    const tableGroup = tableGroupRef.current;
    if (!tableGroup) return;

    // Clear previous mesh objects
    while (tableGroup.children.length > 0) {
      const obj = tableGroup.children[0];
      tableGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const isWoodenLegs = setup?.legMaterial === 'wooden';
    const legStyle = setup?.legStyle || 'Straight legs';
    const hasModesty = setup?.modesty ? setup.modesty !== 'None' : true;
    const frontScreen = setup?.frontScreen || 'Acrylic Screen';
    const hasScreen = frontScreen !== 'No Screen';
    const hasPedestal = setup?.addons?.includes('3-Drawer Mobile Pedestal');
    const hasKeyboard = setup?.addons?.includes('Keyboard Tray');
    const hasCpuStand = setup?.addons?.includes('CPU Stand');
    const electricFunctionVal = setup?.electricFunction || 'None';
    const hasFlipBoxMesh = electricFunctionVal !== 'None' && electricFunctionVal !== 'Wire Raceway' && (electricFunctionVal.includes('Flip Box') || setup?.addons?.includes('Flip Box'));
    const hasRacewayMesh = electricFunctionVal !== 'None';

    const personQty = setup?.personQuantity ?? 1;
    const layoutType = setup?.layoutType ?? 'cluster';

    const halfW = widthM / 2;
    const halfD = depthM / 2;
    const topY = heightM - thicknessM / 2;

    // Shared materials
    let topMat: THREE.Material;
    if (topColorHex.isWood) {
      const woodTex = setup?.tableTopColor === 'Beach' 
        ? createWoodTexture('#d4a373', '#a16207')
        : createWoodTexture('#854d0e', '#582e08');
      topMat = new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.45,
        metalness: 0.05,
      });
    } else {
      topMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(topColorHex.main),
        roughness: setup?.tableTopColor === 'Frosty white' ? 0.3 : 0.4,
        metalness: 0.02,
      });
    }

    const edgeTrimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(topColorHex.edge || 0x94a3b8),
      roughness: 0.45,
    });

    const legColorObj = new THREE.Color(legColorHex.main);
    let legMat: THREE.Material;
    if (isWoodenLegs) {
      legMat = new THREE.MeshStandardMaterial({
        color: legColorObj,
        roughness: 0.65,
        metalness: 0.05,
      });
    } else {
      legMat = new THREE.MeshStandardMaterial({
        color: legColorObj,
        roughness: 0.35,
        metalness: setup?.legColor === 'Silver / Grey' ? 0.75 : 0.4,
      });
    }

    const glideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0f172a),
      roughness: 0.8,
    });

    let screenMat: THREE.Material;
    if (frontScreen === 'Wooden') {
      const woodTex = setup?.tableTopColor === 'Beach' 
        ? createWoodTexture('#d4a373', '#a16207')
        : createWoodTexture('#854d0e', '#582e08');
      screenMat = new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.5,
      });
    } else {
      screenMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(screenColorHex.fill),
        transmission: 0.65,
        opacity: 0.85,
        transparent: true,
        roughness: 0.12,
        ior: 1.45,
        thickness: 0.01,
      });
    }

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
    });
    const clampMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.2,
    });
    const clampGeo = new THREE.BoxGeometry(0.03, 0.045, 0.035);
    const frameBorderW = 0.012;

    const legInset = legSizeM / 2 + 0.02;
    const legHeight = heightM - thicknessM;
    const legY = legHeight / 2;

    // Helper to create screens with soft curved top corners (filleted top edges)
    const createCurvedTopScreenGeometry = (w: number, h: number, t: number, radius: number = 0.04): THREE.BufferGeometry => {
      const r = Math.min(radius, w / 4, h / 3);
      const shape = new THREE.Shape();
      const hw = w / 2;
      const hh = h / 2;

      // Bottom-left
      shape.moveTo(-hw, -hh);
      // Bottom-right
      shape.lineTo(hw, -hh);
      // Right edge up to top-right corner curve
      shape.lineTo(hw, hh - r);
      // Top-right smooth rounded arc
      shape.quadraticCurveTo(hw, hh, hw - r, hh);
      // Top horizontal edge
      shape.lineTo(-hw + r, hh);
      // Top-left smooth rounded arc
      shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
      // Left edge down to bottom-left
      shape.lineTo(-hw, -hh);

      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: t,
        bevelEnabled: false,
      });
      geo.translate(0, 0, -t / 2);
      geo.computeVertexNormals();
      return geo;
    };

    // Helper to create perpendicular dividers with soft curved top corners
    const createCurvedTopDividerGeometry = (d: number, h: number, t: number, radius: number = 0.04): THREE.BufferGeometry => {
      const r = Math.min(radius, d / 4, h / 3);
      const shape = new THREE.Shape();
      const hd = d / 2;
      const hh = h / 2;

      // Bottom-front
      shape.moveTo(-hd, -hh);
      // Bottom-back
      shape.lineTo(hd, -hh);
      // Back vertical edge up to top-back curve
      shape.lineTo(hd, hh - r);
      // Top-back smooth rounded arc
      shape.quadraticCurveTo(hd, hh, hd - r, hh);
      // Top horizontal edge
      shape.lineTo(-hd + r, hh);
      // Top-front smooth rounded arc
      shape.quadraticCurveTo(-hd, hh, -hd, hh - r);
      // Front vertical edge down to bottom-front
      shape.lineTo(-hd, -hh);

      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: t,
        bevelEnabled: false,
      });
      geo.translate(0, 0, -t / 2);
      geo.rotateY(Math.PI / 2);
      geo.computeVertexNormals();
      return geo;
    };

    const buildDeskUnit = (deskParent: THREE.Group, numPersons: number = 1, isClusterRearRow: boolean = false, isCluster: boolean = false) => {
      const stationWidth = widthM / numPersons;

      // 1. TABLE TOP MESH
      const topGeo = new THREE.BoxGeometry(widthM, thicknessM, depthM);
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.set(0, topY, 0);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      deskParent.add(topMesh);

      // Edge banding
      const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(widthM + 0.002, thicknessM, 0.002), edgeTrimMat);
      frontEdge.position.set(0, topY, halfD + 0.001);
      deskParent.add(frontEdge);
      const backEdge = new THREE.Mesh(new THREE.BoxGeometry(widthM + 0.002, thicknessM, 0.002), edgeTrimMat);
      backEdge.position.set(0, topY, -halfD - 0.001);
      deskParent.add(backEdge);
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.002, thicknessM, depthM), edgeTrimMat);
      leftEdge.position.set(-halfW - 0.001, topY, 0);
      deskParent.add(leftEdge);
      const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(0.002, thicknessM, depthM), edgeTrimMat);
      rightEdge.position.set(halfW + 0.001, topY, 0);
      deskParent.add(rightEdge);

      // 2. LEGS & FRAME (For single linear desk rows; cluster pod legs are unified across full depth)
      if (!isCluster) {
        const legColorObj = new THREE.Color(legColorHex.main);
        let legMat: THREE.Material;
        if (isWoodenLegs) {
          legMat = new THREE.MeshStandardMaterial({
            color: legColorObj,
            roughness: 0.65,
            metalness: 0.05,
          });
        } else {
          legMat = new THREE.MeshStandardMaterial({
            color: legColorObj,
            roughness: 0.35,
            metalness: setup?.legColor === 'Silver / Grey' ? 0.75 : 0.4,
          });
        }

        // Foot glide material
        const glideMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x0f172a),
          roughness: 0.8,
        });

        const cornerPositions = [
          { x: -halfW + legInset, z: -halfD + legInset, isRear: true, isLeft: true },   // Rear Left
          { x: halfW - legInset, z: -halfD + legInset, isRear: true, isLeft: false },    // Rear Right
          { x: -halfW + legInset, z: halfD - legInset, isRear: false, isLeft: true },   // Front Left
          { x: halfW - legInset, z: halfD - legInset, isRear: false, isLeft: false },   // Front Right
        ];

        // Calculate intermediate leg positions: exactly ONE middle leg at the exact center (x = 0) for wide / multi-person tables
        const intermediateXPositions: number[] = [];
        if (numPersons >= 2 || widthM >= 1.8) {
          intermediateXPositions.push(0); // Exactly ONE leg in the middle
        }

        // Front intermediate middle leg is recessed inside by 160mm (0.16m) for ergonomic knee clearance
        const midLegInsetFront = legInset + 0.16;
        const midLegInsetRear = legInset;

        const isUShape = Boolean(
          legStyle && (
            legStyle.toLowerCase().includes('u shape') || 
            legStyle.toLowerCase().includes('u-shape') || 
            legStyle.toLowerCase().includes('loop') || 
            legStyle.toLowerCase().includes('o-leg') || 
            legStyle.toLowerCase().includes('goalpost')
          )
        );

        const isAngular = Boolean(
          legStyle && (
            legStyle.toLowerCase().includes('angular') || 
            legStyle.toLowerCase().includes('a-frame') || 
            legStyle.toLowerCase().includes('slanted') || 
            legStyle.toLowerCase().includes('trapezoid') || 
            legStyle.toLowerCase().includes('triangle') || 
            legStyle.toLowerCase().includes('triangular')
          )
        );

        // Outer Corner Legs & Loop Frames
        if (isUShape) {
          // 1. Outer U-shape loop on Left & Right perimeter
          const uPositions = [-halfW + legInset, halfW - legInset];
          uPositions.forEach((xPos) => {
            // Vertical front & back posts
            const postGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            const frontPost = new THREE.Mesh(postGeo, legMat);
            frontPost.position.set(xPos, legY, halfD - legInset);
            frontPost.castShadow = true;
            deskParent.add(frontPost);

            const rearPost = new THREE.Mesh(postGeo, legMat);
            rearPost.position.set(xPos, legY, -halfD + legInset);
            rearPost.castShadow = true;
            deskParent.add(rearPost);

            // Bottom horizontal runner connecting posts along floor
            const runnerSpan = depthM - legInset * 2;
            const runnerGeo = new THREE.BoxGeometry(legSizeM, legSizeM, runnerSpan);
            const runnerMesh = new THREE.Mesh(runnerGeo, legMat);
            runnerMesh.position.set(xPos, legSizeM / 2, 0);
            runnerMesh.castShadow = true;
            deskParent.add(runnerMesh);

            // Top horizontal beam under table
            const topBeamGeo = new THREE.BoxGeometry(legSizeM, legSizeM * 0.75, runnerSpan);
            const topBeamMesh = new THREE.Mesh(topBeamGeo, legMat);
            topBeamMesh.position.set(xPos, heightM - thicknessM - (legSizeM * 0.75) / 2, 0);
            deskParent.add(topBeamMesh);

            // Glides on bottom runner
            const glideGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
            const g1 = new THREE.Mesh(glideGeo, glideMat);
            g1.position.set(xPos, 0.003, halfD - legInset);
            deskParent.add(g1);
            const g2 = new THREE.Mesh(glideGeo, glideMat);
            g2.position.set(xPos, 0.003, -halfD + legInset);
            deskParent.add(g2);
          });

          // 2. Intermediate Middle U-Leg Loops (Recessed inside for legroom)
          intermediateXPositions.forEach((xPos) => {
            const postGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            // Middle Front Post (Recessed inside)
            const midFrontPost = new THREE.Mesh(postGeo, legMat);
            midFrontPost.position.set(xPos, legY, halfD - midLegInsetFront);
            midFrontPost.castShadow = true;
            deskParent.add(midFrontPost);

            // Middle Rear Post
            const midRearPost = new THREE.Mesh(postGeo, legMat);
            midRearPost.position.set(xPos, legY, -halfD + midLegInsetRear);
            midRearPost.castShadow = true;
            deskParent.add(midRearPost);

            // Connecting bottom runner
            const midRunnerSpan = (halfD - midLegInsetFront) - (-halfD + midLegInsetRear);
            const midRunnerCenterZ = (-halfD + midLegInsetRear + (halfD - midLegInsetFront)) / 2;
            const runnerGeo = new THREE.BoxGeometry(legSizeM, legSizeM, midRunnerSpan);
            const runnerMesh = new THREE.Mesh(runnerGeo, legMat);
            runnerMesh.position.set(xPos, legSizeM / 2, midRunnerCenterZ);
            runnerMesh.castShadow = true;
            deskParent.add(runnerMesh);

            // Top horizontal beam under table
            const topBeamGeo = new THREE.BoxGeometry(legSizeM, legSizeM * 0.75, midRunnerSpan);
            const topBeamMesh = new THREE.Mesh(topBeamGeo, legMat);
            topBeamMesh.position.set(xPos, heightM - thicknessM - (legSizeM * 0.75) / 2, midRunnerCenterZ);
            deskParent.add(topBeamMesh);

            // Glides
            const glideGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
            const g1 = new THREE.Mesh(glideGeo, glideMat);
            g1.position.set(xPos, 0.003, halfD - midLegInsetFront);
            deskParent.add(g1);
            const g2 = new THREE.Mesh(glideGeo, glideMat);
            g2.position.set(xPos, 0.003, -halfD + midLegInsetRear);
            deskParent.add(g2);
          });

        } else if (isAngular) {
          // A-frame angular flared legs on perimeter (flaring in Z depth and X width)
          const angleZ = 0.12; // Forward/backward slant
          const angleX = 0.04; // Slight outward width flare

          cornerPositions.forEach(pos => {
            const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            const legMesh = new THREE.Mesh(legGeo, legMat);
            const dirX = pos.isLeft ? -1 : 1;
            const dirZ = pos.isRear ? -1 : 1;
            
            legMesh.rotation.z = dirX * angleX;
            legMesh.rotation.x = dirZ * angleZ;
            legMesh.position.set(
              pos.x + dirX * 0.01,
              legY,
              pos.z + dirZ * 0.02
            );
            legMesh.castShadow = true;
            deskParent.add(legMesh);

            const glideGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16);
            const glideMesh = new THREE.Mesh(glideGeo, glideMat);
            glideMesh.position.set(
              pos.x + dirX * (0.01 + legHeight * Math.tan(angleX) * 0.5),
              0.004,
              pos.z + dirZ * (0.02 + legHeight * Math.tan(angleZ) * 0.5)
            );
            deskParent.add(glideMesh);
          });

          // Left & Right Side Metal Gable Modesty Panels (spanning between slanted posts)
          const sideGableGeo = new THREE.BoxGeometry(0.006, legHeight * 0.55, depthM - legInset * 2.2);
          const sideGableMat = new THREE.MeshStandardMaterial({
            color: legColorObj,
            roughness: 0.4,
            metalness: 0.3
          });
          
          const leftGable = new THREE.Mesh(sideGableGeo, sideGableMat);
          leftGable.position.set(-halfW + legInset, heightM - thicknessM - (legHeight * 0.55) / 2 - 0.02, 0);
          leftGable.castShadow = true;
          deskParent.add(leftGable);

          const rightGable = new THREE.Mesh(sideGableGeo, sideGableMat);
          rightGable.position.set(halfW - legInset, heightM - thicknessM - (legHeight * 0.55) / 2 - 0.02, 0);
          rightGable.castShadow = true;
          deskParent.add(rightGable);

          // Intermediate Middle Support Legs (Recessed inside)
          intermediateXPositions.forEach((xPos) => {
            const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            // Middle Rear Leg
            const midRearLeg = new THREE.Mesh(legGeo, legMat);
            midRearLeg.position.set(xPos, legY, -halfD + midLegInsetRear);
            midRearLeg.castShadow = true;
            deskParent.add(midRearLeg);

            // Middle Front Leg (Recessed inside for seating knee clearance)
            const midFrontLeg = new THREE.Mesh(legGeo, legMat);
            midFrontLeg.position.set(xPos, legY, halfD - midLegInsetFront);
            midFrontLeg.castShadow = true;
            deskParent.add(midFrontLeg);

            // Glides
            const glideGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16);
            const g1 = new THREE.Mesh(glideGeo, glideMat);
            g1.position.set(xPos, 0.004, -halfD + midLegInsetRear);
            deskParent.add(g1);
            const g2 = new THREE.Mesh(glideGeo, glideMat);
            g2.position.set(xPos, 0.004, halfD - midLegInsetFront);
            deskParent.add(g2);
          });

        } else {
          // Standard Straight legs on outer corners
          cornerPositions.forEach(pos => {
            const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            const legMesh = new THREE.Mesh(legGeo, legMat);
            legMesh.position.set(pos.x, legY, pos.z);
            legMesh.castShadow = true;
            deskParent.add(legMesh);

            // Chrome / black glide disc at bottom
            const glideGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16);
            const glideMesh = new THREE.Mesh(glideGeo, glideMat);
            glideMesh.position.set(pos.x, 0.004, pos.z);
            deskParent.add(glideMesh);
          });

          // Intermediate Middle Support Legs (Recessed inside for legroom)
          intermediateXPositions.forEach((xPos) => {
            const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
            // Middle Rear Leg
            const midRearLeg = new THREE.Mesh(legGeo, legMat);
            midRearLeg.position.set(xPos, legY, -halfD + midLegInsetRear);
            midRearLeg.castShadow = true;
            deskParent.add(midRearLeg);

            // Middle Front Leg (Recessed inside for comfortable leg clearance)
            const midFrontLeg = new THREE.Mesh(legGeo, legMat);
            midFrontLeg.position.set(xPos, legY, halfD - midLegInsetFront);
            midFrontLeg.castShadow = true;
            deskParent.add(midFrontLeg);

            // Glides
            const glideGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16);
            const g1 = new THREE.Mesh(glideGeo, glideMat);
            g1.position.set(xPos, 0.004, -halfD + midLegInsetRear);
            deskParent.add(g1);
            const g2 = new THREE.Mesh(glideGeo, glideMat);
            g2.position.set(xPos, 0.004, halfD - midLegInsetFront);
            deskParent.add(g2);

            // Top cross brace connecting middle front and rear legs under tabletop
            const braceSpan = (halfD - midLegInsetFront) - (-halfD + midLegInsetRear);
            const braceCenterZ = (-halfD + midLegInsetRear + (halfD - midLegInsetFront)) / 2;
            const braceGeo = new THREE.BoxGeometry(legSizeM, 0.025, braceSpan);
            const braceMesh = new THREE.Mesh(braceGeo, legMat);
            braceMesh.position.set(xPos, heightM - thicknessM - 0.0125, braceCenterZ);
            deskParent.add(braceMesh);
          });
        }

        // Top under-structure frame rails (4-sided perimeter metal apron pipes)
        const railMat = new THREE.MeshStandardMaterial({
          color: legColorObj,
          roughness: 0.4,
          metalness: setup?.legColor === 'Silver / Grey' ? 0.75 : 0.4,
        });

        const railLengthX = widthM - legInset * 2;
        const railSpanZ = depthM - legInset * 2;
        const railH = 0.035;
        const railW = 0.025;
        const railY = heightM - thicknessM - railH / 2;

        if (railLengthX > 0.3) {
          // Front longitudinal metal pipe
          const frontRailGeo = new THREE.BoxGeometry(railLengthX, railH, railW);
          const frontRail = new THREE.Mesh(frontRailGeo, railMat);
          frontRail.position.set(0, railY, halfD - legInset);
          frontRail.castShadow = true;
          deskParent.add(frontRail);

          // Back longitudinal metal pipe
          const backRailGeo = new THREE.BoxGeometry(railLengthX, railH, railW);
          const backRail = new THREE.Mesh(backRailGeo, railMat);
          backRail.position.set(0, railY, -halfD + legInset);
          backRail.castShadow = true;
          deskParent.add(backRail);
        }

        // Side metal pipes connecting Front Leg to Rear Leg under tabletop (Left & Right)
        if (railSpanZ > 0.2 && legStyle !== 'U shape legs') {
          const sideRailGeo = new THREE.BoxGeometry(railW, railH, railSpanZ);
          
          // Left Side Metal Pipe
          const leftSideRail = new THREE.Mesh(sideRailGeo, railMat);
          leftSideRail.position.set(-halfW + legInset, railY, 0);
          leftSideRail.castShadow = true;
          deskParent.add(leftSideRail);

          // Right Side Metal Pipe
          const rightSideRail = new THREE.Mesh(sideRailGeo, railMat);
          rightSideRail.position.set(halfW - legInset, railY, 0);
          rightSideRail.castShadow = true;
          deskParent.add(rightSideRail);
        }
      }

      // 3. PRIVACY SCREENS (Single shared central screen in face-to-face pods, or individual per-desk screen)
      if (hasScreen && !isClusterRearRow) {
        const screenH = setup?.screenHeight === '450MM' ? 0.45 : setup?.screenHeight === '400MM' ? 0.4 : 0.32;
        const screenThickness = 0.008;
        const screenSideW = depthM - 0.06;
        const screenY = heightM + screenH / 2 - 0.04;
        const screenZ = isCluster ? -halfD : -halfD + 0.02;
        const screenQty = setup?.screenQuantity ?? 1;

        let screenMat: THREE.Material;
        if (frontScreen === 'Wooden') {
          const woodTex = setup?.tableTopColor === 'Beach' 
            ? createWoodTexture('#d4a373', '#a16207')
            : createWoodTexture('#854d0e', '#582e08');
          screenMat = new THREE.MeshStandardMaterial({
            map: woodTex,
            roughness: 0.5,
          });
        } else {
          // Acrylic semi-transparent screen
          screenMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(screenColorHex.fill),
            transmission: 0.65,
            opacity: 0.85,
            transparent: true,
            roughness: 0.12,
            ior: 1.45,
            thickness: 0.01,
          });
        }

        const frameMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.8,
          roughness: 0.2,
        });
        const clampMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.15,
          roughness: 0.25,
        });
        const clampGeo = new THREE.BoxGeometry(0.03, 0.045, 0.035);
        const frameBorderW = 0.012;

        if (numPersons <= 1) {
          // --- SINGLE USER FRONT SCREEN (with smooth curved top corners) ---
          const screenW = widthM - 0.06;
          const screenGeo = createCurvedTopScreenGeometry(screenW, screenH, screenThickness, 0.04);
          const screenMesh = new THREE.Mesh(screenGeo, screenMat);
          screenMesh.position.set(0, screenY, screenZ);
          screenMesh.castShadow = true;
          deskParent.add(screenMesh);

          // Aluminium framing for Front Screen
          if (frontScreen === 'Aluminium framing') {
            const hBarGeo = new THREE.BoxGeometry(screenW + frameBorderW * 2, frameBorderW, screenThickness + 0.004);
            const topBar = new THREE.Mesh(hBarGeo, frameMat);
            topBar.position.set(0, screenY + screenH / 2, screenZ);
            deskParent.add(topBar);

            const bottomBar = new THREE.Mesh(hBarGeo, frameMat);
            bottomBar.position.set(0, screenY - screenH / 2, screenZ);
            deskParent.add(bottomBar);

            const vBarGeo = new THREE.BoxGeometry(frameBorderW, screenH, screenThickness + 0.004);
            const leftBar = new THREE.Mesh(vBarGeo, frameMat);
            leftBar.position.set(-screenW / 2, screenY, screenZ);
            deskParent.add(leftBar);

            const rightBar = new THREE.Mesh(vBarGeo, frameMat);
            rightBar.position.set(screenW / 2, screenY, screenZ);
            deskParent.add(rightBar);
          }

          // Chrome clamps for Front Screen
          const clampOffset = screenW * 0.32;
          const leftClamp = new THREE.Mesh(clampGeo, clampMat);
          leftClamp.position.set(-clampOffset, heightM + 0.01, screenZ);
          deskParent.add(leftClamp);

          const rightClamp = new THREE.Mesh(clampGeo, clampMat);
          rightClamp.position.set(clampOffset, heightM + 0.01, screenZ);
          deskParent.add(rightClamp);
        } else {
          // --- MULTI-PERSON SHARED TABLE: INDIVIDUAL FRONT SCREEN FOR EACH SEATER ---
          const stationW = widthM / numPersons;
          const seatScreenW = stationW - 0.05;

          for (let k = 0; k < numPersons; k++) {
            const seatCenterX = -halfW + (k + 0.5) * stationW;

            // Individual screen panel for Person (k+1) with curved top edges
            const seatScreenGeo = createCurvedTopScreenGeometry(seatScreenW, screenH, screenThickness, 0.038);
            const seatScreenMesh = new THREE.Mesh(seatScreenGeo, screenMat);
            seatScreenMesh.position.set(seatCenterX, screenY, screenZ);
            seatScreenMesh.castShadow = true;
            deskParent.add(seatScreenMesh);

            // Aluminium frame around each individual screen
            if (frontScreen === 'Aluminium framing') {
              const hBarGeo = new THREE.BoxGeometry(seatScreenW + frameBorderW * 2, frameBorderW, screenThickness + 0.004);
              const topBar = new THREE.Mesh(hBarGeo, frameMat);
              topBar.position.set(seatCenterX, screenY + screenH / 2, screenZ);
              deskParent.add(topBar);

              const bottomBar = new THREE.Mesh(hBarGeo, frameMat);
              bottomBar.position.set(seatCenterX, screenY - screenH / 2, screenZ);
              deskParent.add(bottomBar);

              const vBarGeo = new THREE.BoxGeometry(frameBorderW, screenH, screenThickness + 0.004);
              const leftBar = new THREE.Mesh(vBarGeo, frameMat);
              leftBar.position.set(seatCenterX - seatScreenW / 2, screenY, screenZ);
              deskParent.add(leftBar);

              const rightBar = new THREE.Mesh(vBarGeo, frameMat);
              rightBar.position.set(seatCenterX + seatScreenW / 2, screenY, screenZ);
              deskParent.add(rightBar);
            }

            // 2 Clamps per individual screen
            const cOffset = seatScreenW * 0.32;
            const c1 = new THREE.Mesh(clampGeo, clampMat);
            c1.position.set(seatCenterX - cOffset, heightM + 0.01, screenZ);
            deskParent.add(c1);

            const c2 = new THREE.Mesh(clampGeo, clampMat);
            c2.position.set(seatCenterX + cOffset, heightM + 0.01, screenZ);
            deskParent.add(c2);
          }

          // --- INTERMEDIATE CROSS-DIVIDER PARTITION SCREENS BETWEEN SEATERS (OPTIONAL) ---
          const hasMiddlePartition = setup?.middlePartition !== 'None';
          if (hasMiddlePartition) {
            const dividerDepth = depthM * 0.68;
            const dividerZ = -halfD + dividerDepth / 2 + 0.02;

            for (let k = 1; k < numPersons; k++) {
              const divX = -halfW + k * stationW;

              // Perpendicular divider partition between Person k and Person (k+1) with curved top edges
              const divGeo = createCurvedTopDividerGeometry(dividerDepth, screenH, screenThickness, 0.038);
              const divMesh = new THREE.Mesh(divGeo, screenMat);
              divMesh.position.set(divX, screenY, dividerZ);
              divMesh.castShadow = true;
              deskParent.add(divMesh);

              // Aluminium frame on the intermediate divider
              if (frontScreen === 'Aluminium framing') {
                const divHBarGeo = new THREE.BoxGeometry(screenThickness + 0.004, frameBorderW, dividerDepth + frameBorderW * 2);
                const topDivBar = new THREE.Mesh(divHBarGeo, frameMat);
                topDivBar.position.set(divX, screenY + screenH / 2, dividerZ);
                deskParent.add(topDivBar);

                const bottomDivBar = new THREE.Mesh(divHBarGeo, frameMat);
                bottomDivBar.position.set(divX, screenY - screenH / 2, dividerZ);
                deskParent.add(bottomDivBar);
              }

              // Clamps securing intermediate partition to tabletop
              const divClamp1 = new THREE.Mesh(clampGeo, clampMat);
              divClamp1.rotation.y = Math.PI / 2;
              divClamp1.position.set(divX, heightM + 0.01, dividerZ - dividerDepth * 0.25);
              deskParent.add(divClamp1);

              const divClamp2 = new THREE.Mesh(clampGeo, clampMat);
              divClamp2.rotation.y = Math.PI / 2;
              divClamp2.position.set(divX, heightM + 0.01, dividerZ + dividerDepth * 0.25);
              deskParent.add(divClamp2);
            }
          }
        }

        // --- OUTER SIDE SCREENS (if selected) ---
        if (screenQty >= 2) {
          const sideScreenGeo = createCurvedTopDividerGeometry(screenSideW, screenH, screenThickness, 0.038);
          const leftSideMesh = new THREE.Mesh(sideScreenGeo, screenMat);
          leftSideMesh.position.set(-halfW + 0.02, screenY, 0);
          leftSideMesh.castShadow = true;
          deskParent.add(leftSideMesh);

          if (frontScreen === 'Aluminium framing') {
            const sideHBarGeo = new THREE.BoxGeometry(screenThickness + 0.004, frameBorderW, screenSideW + frameBorderW * 2);
            const topSideBar = new THREE.Mesh(sideHBarGeo, frameMat);
            topSideBar.position.set(-halfW + 0.02, screenY + screenH / 2, 0);
            deskParent.add(topSideBar);

            const bottomSideBar = new THREE.Mesh(sideHBarGeo, frameMat);
            bottomSideBar.position.set(-halfW + 0.02, screenY - screenH / 2, 0);
            deskParent.add(bottomSideBar);
          }

          const sideClamp1 = new THREE.Mesh(clampGeo, clampMat);
          sideClamp1.rotation.y = Math.PI / 2;
          sideClamp1.position.set(-halfW + 0.02, heightM + 0.01, -screenSideW * 0.25);
          deskParent.add(sideClamp1);

          const sideClamp2 = new THREE.Mesh(clampGeo, clampMat);
          sideClamp2.rotation.y = Math.PI / 2;
          sideClamp2.position.set(-halfW + 0.02, heightM + 0.01, screenSideW * 0.25);
          deskParent.add(sideClamp2);
        }

        if (screenQty >= 3) {
          const sideScreenGeo = createCurvedTopDividerGeometry(screenSideW, screenH, screenThickness, 0.038);
          const rightSideMesh = new THREE.Mesh(sideScreenGeo, screenMat);
          rightSideMesh.position.set(halfW - 0.02, screenY, 0);
          rightSideMesh.castShadow = true;
          deskParent.add(rightSideMesh);

          if (frontScreen === 'Aluminium framing') {
            const sideHBarGeo = new THREE.BoxGeometry(screenThickness + 0.004, frameBorderW, screenSideW + frameBorderW * 2);
            const topSideBar = new THREE.Mesh(sideHBarGeo, frameMat);
            topSideBar.position.set(halfW - 0.02, screenY + screenH / 2, 0);
            deskParent.add(topSideBar);

            const bottomSideBar = new THREE.Mesh(sideHBarGeo, frameMat);
            bottomSideBar.position.set(halfW - 0.02, screenY - screenH / 2, 0);
            deskParent.add(bottomSideBar);
          }

          const rightSideClamp1 = new THREE.Mesh(clampGeo, clampMat);
          rightSideClamp1.rotation.y = Math.PI / 2;
          rightSideClamp1.position.set(halfW - 0.02, heightM + 0.01, -screenSideW * 0.25);
          deskParent.add(rightSideClamp1);

          const rightSideClamp2 = new THREE.Mesh(clampGeo, clampMat);
          rightSideClamp2.rotation.y = Math.PI / 2;
          rightSideClamp2.position.set(halfW - 0.02, heightM + 0.01, screenSideW * 0.25);
          deskParent.add(rightSideClamp2);
        }
      }

      // 4. MODESTY PANEL
      if (hasModesty) {
        const modestyH = 0.32;
        const modestyW = widthM - legInset * 2 - legSizeM * 2 - 0.04;
        const modestyY = heightM - thicknessM - modestyH / 2 - 0.02;
        const modestyZ = -halfD + legInset + 0.01;

        const modestyMat = new THREE.MeshStandardMaterial({
          color: topColorHex.isWood ? new THREE.Color(topColorHex.main) : new THREE.Color(0x475569),
          roughness: 0.5,
        });

        const modestyGeo = new THREE.BoxGeometry(modestyW, modestyH, 0.015);
        const modestyMesh = new THREE.Mesh(modestyGeo, modestyMat);
        modestyMesh.position.set(0, modestyY, modestyZ);
        modestyMesh.castShadow = true;
        deskParent.add(modestyMesh);
      }

      // 5. FLIP BOX (Embedded Tabletop Cable Management Box - OPTIONAL)
      if (hasFlipBoxMesh) {
        const flipBoxW = Math.min(0.24, (widthM / numPersons) * 0.45);
        const flipBoxD = 0.11;
        const flipBoxH = 0.004;
        const flipBoxY = topY + thicknessM / 2 + flipBoxH / 2;
        const flipBoxZ = -halfD + 0.13;

        const flipBezelMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.85,
          roughness: 0.25,
        });
        const lidMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.8,
          roughness: 0.3,
        });
        const brushMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

        const stationWidth = widthM / numPersons;
        for (let k = 0; k < numPersons; k++) {
          const seatCenterX = numPersons === 1 ? 0 : -halfW + (k + 0.5) * stationWidth;

          // Outer aluminium bezel
          const flipBezelGeo = new THREE.BoxGeometry(flipBoxW, flipBoxH, flipBoxD);
          const flipBezelMesh = new THREE.Mesh(flipBezelGeo, flipBezelMat);
          flipBezelMesh.position.set(seatCenterX, flipBoxY, flipBoxZ);
          flipBezelMesh.castShadow = true;
          deskParent.add(flipBezelMesh);

          // Flaps
          const lidHalfW = flipBoxW - 0.016;
          const lidHalfD = (flipBoxD - 0.018) / 2;
          const lidFrontGeo = new THREE.BoxGeometry(lidHalfW, flipBoxH + 0.001, lidHalfD);
          const lidFrontMesh = new THREE.Mesh(lidFrontGeo, lidMat);
          lidFrontMesh.position.set(seatCenterX, flipBoxY + 0.0006, flipBoxZ + lidHalfD / 2 + 0.002);
          deskParent.add(lidFrontMesh);

          const lidRearMesh = new THREE.Mesh(lidFrontGeo, lidMat);
          lidRearMesh.position.set(seatCenterX, flipBoxY + 0.0006, flipBoxZ - lidHalfD / 2 - 0.002);
          deskParent.add(lidRearMesh);

          // Brush seam
          const brushGeo = new THREE.BoxGeometry(lidHalfW, flipBoxH + 0.0015, 0.004);
          const brushMesh = new THREE.Mesh(brushGeo, brushMat);
          brushMesh.position.set(seatCenterX, flipBoxY + 0.0008, flipBoxZ);
          deskParent.add(brushMesh);
        }
      }

      // Wire Raceway: 1 under-desk raceway unit per person with 1, 2, or 3 switch holes (OPTIONAL)
      if (hasRacewayMesh) {
        const flipBoxZ = -halfD + 0.13;
        const racewayH = 0.07;
        const racewayD = 0.15;
        const racewayY = heightM - thicknessM - racewayH / 2 - 0.01;
        const racewayZ = flipBoxZ;

        const racewayMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.65,
          roughness: 0.35,
        });

        const switchMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.3, roughness: 0.5 });

        // Determine switch hole count: 1, 2, or 3
        const ef = (setup?.electricFunction || '').toLowerCase();
        let switchCount = 2; // default
        if (ef.includes('1 switch') || ef.includes('1 hole') || ef.includes('1')) {
          switchCount = 1;
        } else if (ef.includes('3 switch') || ef.includes('3 hole') || ef.includes('3')) {
          switchCount = 3;
        } else if (ef.includes('4 switch') || ef.includes('4 hole') || ef.includes('4')) {
          switchCount = 4;
        } else if (ef.includes('2 switch') || ef.includes('2 hole') || ef.includes('2') || ef.includes('wire raceway')) {
          switchCount = 2;
        }

        const personRacewayW = Math.min(stationWidth * 0.72, 0.65);

        for (let k = 0; k < numPersons; k++) {
          const seatCenterX = numPersons === 1 ? 0 : -halfW + (k + 0.5) * stationWidth;

          // 1 under-desk raceway unit per person
          const racewayGeo = new THREE.BoxGeometry(personRacewayW, racewayH, racewayD);
          const racewayMesh = new THREE.Mesh(racewayGeo, racewayMat);
          racewayMesh.position.set(seatCenterX, racewayY, racewayZ);
          racewayMesh.castShadow = true;
          deskParent.add(racewayMesh);

          // Switch hole cutouts / modular socket faceplates
          if (switchCount > 0) {
            const plateWidth = switchCount * 0.026 + 0.012;
            const plateGeo = new THREE.BoxGeometry(plateWidth, 0.034, 0.004);
            const plateMesh = new THREE.Mesh(plateGeo, plateMat);
            plateMesh.position.set(seatCenterX, racewayY, racewayZ + racewayD / 2 + 0.002);
            deskParent.add(plateMesh);

            for (let s = 0; s < switchCount; s++) {
              const switchGeo = new THREE.BoxGeometry(0.018, 0.018, 0.005);
              const switchMesh = new THREE.Mesh(switchGeo, switchMat);
              const startX = seatCenterX - ((switchCount - 1) * 0.024) / 2;
              const sx = startX + s * 0.024;
              switchMesh.position.set(sx, racewayY, racewayZ + racewayD / 2 + 0.004);
              deskParent.add(switchMesh);
            }
          }
        }
      }

      // 6. ADDONS: MOBILE PEDESTAL (3 Drawers)
      if (hasPedestal) {
        const pedW = Math.min(0.38, stationWidth * 0.4);
        const pedH = heightM - thicknessM - 0.08;
        const pedD = depthM * 0.75;
        const pedBodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.1 });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });

        for (let k = 0; k < numPersons; k++) {
          const seatCenterX = numPersons === 1 ? 0 : -halfW + (k + 0.5) * stationWidth;
          const pedX = seatCenterX - stationWidth * 0.32;
          const pedY = pedH / 2 + 0.04;
          const pedZ = 0;

          const pedGeo = new THREE.BoxGeometry(pedW, pedH, pedD);
          const pedMesh = new THREE.Mesh(pedGeo, pedBodyMat);
          pedMesh.position.set(pedX, pedY, pedZ);
          pedMesh.castShadow = true;
          deskParent.add(pedMesh);

          // 3 Drawer faces
          const drawerH = (pedH - 0.04) / 3;
          for (let d = 0; d < 3; d++) {
            const dy = pedY - pedH / 2 + 0.02 + drawerH * d + drawerH / 2;
            const faceGeo = new THREE.BoxGeometry(pedW - 0.01, drawerH - 0.008, 0.006);
            const faceMesh = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
            faceMesh.position.set(pedX, dy, pedD / 2 + 0.003);
            deskParent.add(faceMesh);

            const handleGeo = new THREE.BoxGeometry(0.08, 0.012, 0.01);
            const handleMesh = new THREE.Mesh(handleGeo, handleMat);
            handleMesh.position.set(pedX, dy, pedD / 2 + 0.01);
            deskParent.add(handleMesh);
          }
        }
      }

      // 7. ADDONS: KEYBOARD TRAY
      if (hasKeyboard) {
        const kbW = Math.min(0.55, stationWidth * 0.8);
        const kbD = 0.25;
        const kbH = 0.015;
        const kbY = heightM - thicknessM - 0.07;
        const kbZ = halfD - kbD / 2 - 0.04;
        const kbMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });

        for (let k = 0; k < numPersons; k++) {
          const seatCenterX = numPersons === 1 ? 0 : -halfW + (k + 0.5) * stationWidth;
          const kbMesh = new THREE.Mesh(new THREE.BoxGeometry(kbW, kbH, kbD), kbMat);
          kbMesh.position.set(seatCenterX, kbY, kbZ);
          deskParent.add(kbMesh);

          // Rails
          [-kbW / 2, kbW / 2].forEach(rx => {
            const rMesh = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, kbD), railMat);
            rMesh.position.set(seatCenterX + rx, heightM - thicknessM - 0.035, kbZ);
            deskParent.add(rMesh);
          });
        }
      }

      // 8. ADDONS: MOBILE ADJUSTABLE METAL CPU STAND WITH WHEELS (Matching Exact Metal Dolly Design)
      if (hasCpuStand) {
        // Mobile Stand Dimensions
        const standW = 0.24; // Width between side wings
        const standD = 0.40; // Depth of the stand
        const baseThickness = 0.005;
        const wheelRadius = 0.02;
        const wheelHeight = 0.045;
        const baseY = wheelHeight + baseThickness / 2; // elevated on caster wheels
        const wingHeight = 0.14; // upright side clamp wings
        const wingThickness = 0.004;

        // Materials
        const standMetalMat = new THREE.MeshStandardMaterial({
          color: 0x18181b, // Matte powder-coated black steel
          metalness: 0.65,
          roughness: 0.35,
        });

        const rubberMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.9,
          metalness: 0.05,
        });

        const boltMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.9,
          roughness: 0.2,
        });

        const casterHousingMat = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          metalness: 0.5,
          roughness: 0.5,
        });

        const casterWheelMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          metalness: 0.1,
          roughness: 0.8,
        });

        // Computer Tower Case Materials
        const towerBodyMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.5,
          roughness: 0.3,
        });
        const glassSideMat = new THREE.MeshPhysicalMaterial({
          color: 0x1e293b,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          metalness: 0.1,
        });
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

        for (let k = 0; k < numPersons; k++) {
          const seatCenterX = numPersons === 1 ? 0 : -halfW + (k + 0.5) * stationWidth;
          const cpuX = seatCenterX + Math.min(stationWidth * 0.35, 0.45);
          const cpuZ = 0;

          const standGroup = new THREE.Group();
          standGroup.position.set(cpuX, 0, cpuZ);

          // 1. Bottom Main Chassis Plate
          const baseGeo = new THREE.BoxGeometry(standW, baseThickness, standD);
          const baseMesh = new THREE.Mesh(baseGeo, standMetalMat);
          baseMesh.position.set(0, baseY, 0);
          baseMesh.castShadow = true;
          standGroup.add(baseMesh);

          // Anti-slip rubber pads on bottom tray
          [-standD * 0.25, standD * 0.25].forEach(pz => {
            const padGeo = new THREE.BoxGeometry(standW * 0.45, 0.003, 0.04);
            const padMesh = new THREE.Mesh(padGeo, rubberMat);
            padMesh.position.set(0, baseY + baseThickness / 2 + 0.0015, pz);
            standGroup.add(padMesh);
          });

          // 2. Upright Side Clamp Wings (L-shaped folded brackets)
          [-standW / 2 + wingThickness / 2, standW / 2 - wingThickness / 2].forEach((wx, sideIdx) => {
            // Vertical wing plate
            const wingGeo = new THREE.BoxGeometry(wingThickness, wingHeight, standD * 0.85);
            const wingMesh = new THREE.Mesh(wingGeo, standMetalMat);
            wingMesh.position.set(wx, baseY + wingHeight / 2, 0);
            wingMesh.castShadow = true;
            standGroup.add(wingMesh);

            // Flared outer bottom edge
            const flangeGeo = new THREE.BoxGeometry(0.025, baseThickness, standD * 0.85);
            const flangeMesh = new THREE.Mesh(flangeGeo, standMetalMat);
            const fx = sideIdx === 0 ? wx - 0.012 : wx + 0.012;
            flangeMesh.position.set(fx, baseY, 0);
            standGroup.add(flangeMesh);

            // Inner anti-scratch rubber pads on side wings
            const padWingGeo = new THREE.BoxGeometry(0.003, wingHeight * 0.65, standD * 0.7);
            const padWingMesh = new THREE.Mesh(padWingGeo, rubberMat);
            const padX = sideIdx === 0 ? wx + wingThickness / 2 + 0.0015 : wx - wingThickness / 2 - 0.0015;
            padWingMesh.position.set(padX, baseY + wingHeight * 0.55, 0);
            standGroup.add(padWingMesh);

            // Width Adjustment Locking Bolts & Nuts (front & rear)
            [-standD * 0.35, standD * 0.35].forEach(bz => {
              const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 12);
              const boltMesh = new THREE.Mesh(boltGeo, boltMat);
              boltMesh.position.set(fx, baseY + baseThickness / 2 + 0.004, bz);
              standGroup.add(boltMesh);
            });
          });

          // 3. Four 360° Swivel Caster Wheels (with dual wheels and brake levers)
          const wheelOffsets = [
            { x: -standW / 2 + 0.02, z: -standD / 2 + 0.04, isFront: false },
            { x: standW / 2 - 0.02, z: -standD / 2 + 0.04, isFront: false },
            { x: -standW / 2 + 0.02, z: standD / 2 - 0.04, isFront: true },
            { x: standW / 2 - 0.02, z: standD / 2 - 0.04, isFront: true },
          ];

          wheelOffsets.forEach(pos => {
            // Caster top swivel bracket / post
            const bracketGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.018, 12);
            const bracketMesh = new THREE.Mesh(bracketGeo, casterHousingMat);
            bracketMesh.position.set(pos.x, baseY - baseThickness / 2 - 0.009, pos.z);
            standGroup.add(bracketMesh);

            // Twin caster wheels
            [-0.007, 0.007].forEach(wx => {
              const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.006, 16);
              const wheelMesh = new THREE.Mesh(wheelGeo, casterWheelMat);
              wheelMesh.rotation.z = Math.PI / 2;
              wheelMesh.position.set(pos.x + wx, wheelRadius + 0.002, pos.z);
              standGroup.add(wheelMesh);
            });

            // Wheel axle pin
            const axleGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8);
            const axleMesh = new THREE.Mesh(axleGeo, boltMat);
            axleMesh.rotation.z = Math.PI / 2;
            axleMesh.position.set(pos.x, wheelRadius + 0.002, pos.z);
            standGroup.add(axleMesh);

            // Front brake lock tabs
            if (pos.isFront) {
              const brakeGeo = new THREE.BoxGeometry(0.006, 0.014, 0.01);
              const brakeMesh = new THREE.Mesh(brakeGeo, casterHousingMat);
              brakeMesh.position.set(pos.x, wheelRadius + 0.008, pos.z + 0.014);
              standGroup.add(brakeMesh);
            }
          });

          // 4. Computer Tower Chassis Resting Snugly Inside the Mobile Stand
          const towerW = standW - 0.04;
          const towerH = 0.38;
          const towerD = standD * 0.9;
          const towerY = baseY + baseThickness + towerH / 2 + 0.003;

          const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
          const towerMesh = new THREE.Mesh(towerGeo, towerBodyMat);
          towerMesh.position.set(0, towerY, 0);
          towerMesh.castShadow = true;
          standGroup.add(towerMesh);

          // Side Glass Window
          const glassGeo = new THREE.BoxGeometry(0.003, towerH * 0.85, towerD * 0.85);
          const glassMesh = new THREE.Mesh(glassGeo, glassSideMat);
          glassMesh.position.set(towerW / 2 + 0.002, towerY, 0);
          standGroup.add(glassMesh);

          // Front Panel Bezel & Power LED
          const frontPowerGeo = new THREE.BoxGeometry(0.01, 0.01, 0.003);
          const powerMesh = new THREE.Mesh(frontPowerGeo, ledMat);
          powerMesh.position.set(0, towerY + towerH * 0.38, towerD / 2 + 0.002);
          standGroup.add(powerMesh);

          // Front Ventilation Grille lines
          for (let g = 0; g < 4; g++) {
            const grillGeo = new THREE.BoxGeometry(towerW * 0.6, 0.004, 0.002);
            const grillMesh = new THREE.Mesh(grillGeo, boltMat);
            grillMesh.position.set(0, towerY - towerH * 0.2 + g * 0.02, towerD / 2 + 0.002);
            standGroup.add(grillMesh);
          }

          deskParent.add(standGroup);
        }
      }
    };

    // Build Unified Joint Understructure for Face-to-Face Pods (ZERO GAP IN THE MIDDLE)
    const buildClusterUnderstructure = (podGroup: THREE.Group, cols: number) => {
      const legColorObj = new THREE.Color(legColorHex.main);
      let legMat: THREE.Material;
      if (isWoodenLegs) {
        legMat = new THREE.MeshStandardMaterial({
          color: legColorObj,
          roughness: 0.65,
          metalness: 0.05,
        });
      } else {
        legMat = new THREE.MeshStandardMaterial({
          color: legColorObj,
          roughness: 0.35,
          metalness: setup?.legColor === 'Silver / Grey' ? 0.75 : 0.4,
        });
      }

      const glideMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x0f172a),
        roughness: 0.8,
      });

      const isUShape = Boolean(
        legStyle && (
          legStyle.toLowerCase().includes('u shape') || 
          legStyle.toLowerCase().includes('u-shape') || 
          legStyle.toLowerCase().includes('loop') || 
          legStyle.toLowerCase().includes('o-leg') || 
          legStyle.toLowerCase().includes('goalpost')
        )
      );

      const isAngular = Boolean(
        legStyle && (
          legStyle.toLowerCase().includes('angular') || 
          legStyle.toLowerCase().includes('a-frame') || 
          legStyle.toLowerCase().includes('slanted') || 
          legStyle.toLowerCase().includes('trapezoid') || 
          legStyle.toLowerCase().includes('triangle') || 
          legStyle.toLowerCase().includes('triangular')
        )
      );

      // In cluster mode, the pod spans from z = -depthM to z = +depthM (Total Pod Depth = 2 * depthM)
      const outerFrontZ = depthM - legInset;
      const outerRearZ = -depthM + legInset;
      const fullPodSpanZ = outerFrontZ - outerRearZ; // 2 * depthM - 2 * legInset
      const outerXPositions = [-halfW + legInset, halfW - legInset];

      // Intermediate X positions for multi-seater pods (x = 0)
      const intermediateXPositions: number[] = [];
      if (cols >= 2 || widthM >= 1.8) {
        intermediateXPositions.push(0);
      }

      const midLegInsetFront = legInset + 0.16;

      if (isUShape) {
        // --- 1. UNIFIED JOINT U-SHAPE LOOP LEGS (CLEAN OPEN SIDE PROFILE, NO MIDDLE LEG VISIBLE FROM SIDE) ---
        outerXPositions.forEach((xPos) => {
          const postGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);

          // Front Vertical Post (Outer front edge)
          const frontPost = new THREE.Mesh(postGeo, legMat);
          frontPost.position.set(xPos, legY, outerFrontZ);
          frontPost.castShadow = true;
          podGroup.add(frontPost);

          // Rear Vertical Post (Outer back edge)
          const rearPost = new THREE.Mesh(postGeo, legMat);
          rearPost.position.set(xPos, legY, outerRearZ);
          rearPost.castShadow = true;
          podGroup.add(rearPost);

          // Continuous Single Full-Depth Bottom Runner along Floor (NO middle leg dividing the side)
          const runnerGeo = new THREE.BoxGeometry(legSizeM, legSizeM, fullPodSpanZ);
          const runnerMesh = new THREE.Mesh(runnerGeo, legMat);
          runnerMesh.position.set(xPos, legSizeM / 2, 0);
          runnerMesh.castShadow = true;
          podGroup.add(runnerMesh);

          // Continuous Top Horizontal Subframe Beam
          const topBeamGeo = new THREE.BoxGeometry(legSizeM, legSizeM * 0.75, fullPodSpanZ);
          const topBeamMesh = new THREE.Mesh(topBeamGeo, legMat);
          topBeamMesh.position.set(xPos, heightM - thicknessM - (legSizeM * 0.75) / 2, 0);
          podGroup.add(topBeamMesh);

          // Glides (Front & Rear only - clean open side loop)
          const glideGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
          const g1 = new THREE.Mesh(glideGeo, glideMat);
          g1.position.set(xPos, 0.003, outerFrontZ);
          podGroup.add(g1);
          const g3 = new THREE.Mesh(glideGeo, glideMat);
          g3.position.set(xPos, 0.003, outerRearZ);
          podGroup.add(g3);
        });

        // Intermediate Joint Middle U-Leg Frame (Recessed inside for knee clearance)
        intermediateXPositions.forEach((xPos) => {
          const midFrontZ = depthM - midLegInsetFront;
          const midRearZ = -depthM + midLegInsetFront;
          const midSpanZ = midFrontZ - midRearZ;

          const postGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);

          // Middle Front Post
          const midFrontPost = new THREE.Mesh(postGeo, legMat);
          midFrontPost.position.set(xPos, legY, midFrontZ);
          midFrontPost.castShadow = true;
          podGroup.add(midFrontPost);

          // Middle Rear Post
          const midRearPost = new THREE.Mesh(postGeo, legMat);
          midRearPost.position.set(xPos, legY, midRearZ);
          midRearPost.castShadow = true;
          podGroup.add(midRearPost);

          // Continuous Middle Bottom Runner (Clean continuous frame)
          const midRunnerGeo = new THREE.BoxGeometry(legSizeM, legSizeM, midSpanZ);
          const midRunnerMesh = new THREE.Mesh(midRunnerGeo, legMat);
          midRunnerMesh.position.set(xPos, legSizeM / 2, 0);
          midRunnerMesh.castShadow = true;
          podGroup.add(midRunnerMesh);

          // Continuous Middle Top Subframe Beam
          const midTopBeamGeo = new THREE.BoxGeometry(legSizeM, legSizeM * 0.75, midSpanZ);
          const midTopBeamMesh = new THREE.Mesh(midTopBeamGeo, legMat);
          midTopBeamMesh.position.set(xPos, heightM - thicknessM - (legSizeM * 0.75) / 2, 0);
          podGroup.add(midTopBeamMesh);

          // Glides (Front & Rear)
          const glideGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
          const g1 = new THREE.Mesh(glideGeo, glideMat);
          g1.position.set(xPos, 0.003, midFrontZ);
          podGroup.add(g1);
          const g3 = new THREE.Mesh(glideGeo, glideMat);
          g3.position.set(xPos, 0.003, midRearZ);
          podGroup.add(g3);
        });

      } else if (isAngular) {
        // --- 2. UNIFIED JOINT ANGULAR A-FRAME LEGS ---
        const angleZ = 0.12;
        const angleX = 0.04;

        outerXPositions.forEach((xPos, idx) => {
          const isLeft = idx === 0;
          const dirX = isLeft ? -1 : 1;
          const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);

          // Front Flared Leg
          const frontMesh = new THREE.Mesh(legGeo, legMat);
          frontMesh.rotation.z = dirX * angleX;
          frontMesh.rotation.x = angleZ;
          frontMesh.position.set(xPos + dirX * 0.01, legY, outerFrontZ + 0.02);
          frontMesh.castShadow = true;
          podGroup.add(frontMesh);

          // Rear Flared Leg
          const rearMesh = new THREE.Mesh(legGeo, legMat);
          rearMesh.rotation.z = dirX * angleX;
          rearMesh.rotation.x = -angleZ;
          rearMesh.position.set(xPos + dirX * 0.01, legY, outerRearZ - 0.02);
          rearMesh.castShadow = true;
          podGroup.add(rearMesh);

          // Full-span side gable modesty panel
          const sideGableGeo = new THREE.BoxGeometry(0.006, legHeight * 0.55, fullPodSpanZ);
          const sideGableMat = new THREE.MeshStandardMaterial({
            color: legColorObj,
            roughness: 0.4,
            metalness: 0.3
          });
          const sideGable = new THREE.Mesh(sideGableGeo, sideGableMat);
          sideGable.position.set(xPos, heightM - thicknessM - (legHeight * 0.55) / 2 - 0.02, 0);
          sideGable.castShadow = true;
          podGroup.add(sideGable);

          // Glides
          const glideGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16);
          const g1 = new THREE.Mesh(glideGeo, glideMat);
          g1.position.set(xPos + dirX * (0.01 + legHeight * Math.tan(angleX) * 0.5), 0.004, outerFrontZ + (0.02 + legHeight * Math.tan(angleZ) * 0.5));
          podGroup.add(g1);
          const g3 = new THREE.Mesh(glideGeo, glideMat);
          g3.position.set(xPos + dirX * (0.01 + legHeight * Math.tan(angleX) * 0.5), 0.004, outerRearZ - (0.02 + legHeight * Math.tan(angleZ) * 0.5));
          podGroup.add(g3);
        });

        // Intermediate Center Leg (Recessed front and rear posts only)
        intermediateXPositions.forEach((xPos) => {
          const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
          const midFrontLeg = new THREE.Mesh(legGeo, legMat);
          midFrontLeg.position.set(xPos, legY, depthM - midLegInsetFront);
          podGroup.add(midFrontLeg);

          const midRearLeg = new THREE.Mesh(legGeo, legMat);
          midRearLeg.position.set(xPos, legY, -depthM + midLegInsetFront);
          podGroup.add(midRearLeg);
        });

      } else {
        // --- 3. UNIFIED STRAIGHT LEGS IN CLUSTER POD ---
        outerXPositions.forEach((xPos) => {
          const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);

          // Front Corner Post
          const frontPost = new THREE.Mesh(legGeo, legMat);
          frontPost.position.set(xPos, legY, outerFrontZ);
          frontPost.castShadow = true;
          podGroup.add(frontPost);

          // Rear Corner Post
          const rearPost = new THREE.Mesh(legGeo, legMat);
          rearPost.position.set(xPos, legY, outerRearZ);
          rearPost.castShadow = true;
          podGroup.add(rearPost);

          // Glides
          const glideGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16);
          const g1 = new THREE.Mesh(glideGeo, glideMat);
          g1.position.set(xPos, 0.004, outerFrontZ);
          podGroup.add(g1);
          const g3 = new THREE.Mesh(glideGeo, glideMat);
          g3.position.set(xPos, 0.004, outerRearZ);
          podGroup.add(g3);
        });

        // Intermediate Center Legs (Recessed front and rear posts only)
        intermediateXPositions.forEach((xPos) => {
          const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
          const midFrontLeg = new THREE.Mesh(legGeo, legMat);
          midFrontLeg.position.set(xPos, legY, depthM - midLegInsetFront);
          podGroup.add(midFrontLeg);

          const midRearLeg = new THREE.Mesh(legGeo, legMat);
          midRearLeg.position.set(xPos, legY, -depthM + midLegInsetFront);
          podGroup.add(midRearLeg);
        });
      }

      // Continuous Longitudinal Metal Apron Tie Pipes
      const railMat = new THREE.MeshStandardMaterial({
        color: legColorObj,
        roughness: 0.4,
        metalness: setup?.legColor === 'Silver / Grey' ? 0.75 : 0.4,
      });

      const railLengthX = widthM - legInset * 2;
      const railH = 0.035;
      const railW = 0.025;
      const railY = heightM - thicknessM - railH / 2;

      if (railLengthX > 0.3) {
        // Front longitudinal pipe
        const frontRailGeo = new THREE.BoxGeometry(railLengthX, railH, railW);
        const frontRail = new THREE.Mesh(frontRailGeo, railMat);
        frontRail.position.set(0, railY, outerFrontZ);
        podGroup.add(frontRail);

        // Rear longitudinal pipe
        const backRail = new THREE.Mesh(frontRailGeo, railMat);
        backRail.position.set(0, railY, outerRearZ);
        podGroup.add(backRail);

        // Shared Center Spine Tie Pipe
        const spineRailGeo = new THREE.BoxGeometry(railLengthX, railH, railW * 1.2);
        const spineRail = new THREE.Mesh(spineRailGeo, railMat);
        spineRail.position.set(0, railY, 0);
        podGroup.add(spineRail);
      }
    };

    // Instantiate Single Desk or Multi-Person Workstation Layout in 3D
    if (personQty <= 1) {
      const singleDesk = new THREE.Group();
      buildDeskUnit(singleDesk, 1);
      tableGroup.add(singleDesk);
    } else {
      if (layoutType === 'cluster') {
        // Face-to-Face 2-Row Pod Layout
        const cols = Math.ceil(personQty / 2);
        const rearQty = personQty - cols > 0 ? personQty - cols : cols;

        // Front Row (facing inward toward spine) - Builds the single shared spine screen at z = 0
        const frontRow = new THREE.Group();
        frontRow.position.set(0, 0, halfD);
        buildDeskUnit(frontRow, cols, false, true);
        tableGroup.add(frontRow);

        // Back Row (facing inward toward spine) - Skips spine screen (only 1 shared screen per pod)
        const backRow = new THREE.Group();
        backRow.position.set(0, 0, -halfD);
        backRow.rotation.y = Math.PI;
        buildDeskUnit(backRow, rearQty, true, true);
        tableGroup.add(backRow);

        // Build unified joint understructure / U-shape loop legs for the pod with NO middle gap!
        buildClusterUnderstructure(tableGroup, cols);
      } else {
        // Linear Row (Side-by-side seating on the SAME continuous 1500+ mm table)
        const sharedDesk = new THREE.Group();
        buildDeskUnit(sharedDesk, personQty, false, false);
        tableGroup.add(sharedDesk);
      }
    }

  }, [
    widthM, 
    depthM, 
    heightM, 
    thicknessM, 
    legSizeM, 
    topColorHex, 
    screenColorHex, 
    legColorHex, 
    setup
  ]);

  // Camera presets
  const setCameraPreset = (type: 'front' | 'iso' | 'side' | 'rear' | 'top') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setIsAutoRotating(false);

    const dist = 2.4;
    const targetY = heightM / 2 + 0.05;
    controls.target.set(0, targetY, 0);

    switch (type) {
      case 'front':
        camera.position.set(0, targetY + 0.25, dist);
        break;
      case 'iso':
        camera.position.set(dist * 0.7, targetY + 0.7, dist * 0.7);
        break;
      case 'side':
        camera.position.set(dist, targetY + 0.2, 0);
        break;
      case 'rear':
        camera.position.set(0, targetY + 0.35, -dist);
        break;
      case 'top':
        camera.position.set(0.01, dist * 1.35, 0.01);
        break;
    }
    controls.update();
  };

  const handleZoom = (delta: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.multiplyScalar(delta);
    controls.update();
  };

  const handleReset = () => {
    setCameraPreset('iso');
    setIsAutoRotating(true);
  };

  const handleRotateStep = (direction: 'left' | 'right') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setIsAutoRotating(false);
    controls.autoRotate = false;

    const angleDelta = direction === 'left' ? -Math.PI / 8 : Math.PI / 8;
    const x = camera.position.x - controls.target.x;
    const z = camera.position.z - controls.target.z;
    const cos = Math.cos(angleDelta);
    const sin = Math.sin(angleDelta);
    camera.position.x = controls.target.x + (x * cos - z * sin);
    camera.position.z = controls.target.z + (x * sin + z * cos);
    camera.lookAt(controls.target);
    controls.update();
  };

  if (hasWebGLError) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-xl ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm mb-1">Workstation Configured</h3>
        <p className="text-xs text-slate-500 mb-4">WebGL 3D preview is initializing or unsupported on this display.</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
          <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-1 rounded-lg font-bold">
            {setup?.frontScreen || 'Acrylic sheet'}
          </span>
          <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-lg font-bold">
            {setup?.material ? `${setup.material} Board` : 'PLPB Board'} {setup?.thickness || '25 mm'}
          </span>
          <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-bold">
            Legs: {setup?.legSize || '40 x 40'} ({setup?.legColor || 'Black'})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`select-none transition-colors duration-150 ${
        isFullScreen 
          ? 'fixed inset-0 z-[999999] w-screen h-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden m-0 p-0' 
          : `w-full h-full flex flex-col items-center justify-center relative ${className}`
      }`}
      style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999 } : undefined}
    >
      {/* 3D WebGL Canvas Mount Container */}
      <div 
        ref={mountRef} 
        className={`${isFullScreen ? 'w-screen h-screen' : 'w-full h-full min-h-[360px]'} cursor-grab active:cursor-grabbing flex items-center justify-center relative touch-none`}
        style={isFullScreen ? { width: '100vw', height: '100vh' } : undefined}
      />

      {/* Dynamic 3D Projected Callout Pins (Anchored directly to 3D components) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {/* 1. Table Top Callout (Pointing directly onto table top surface) */}
        <div 
          ref={topCalloutRef}
          className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-opacity duration-75"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xl border border-amber-500/50 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0 border border-slate-300 shadow-xs" style={{ backgroundColor: topColorHex.main }} />
            <span className="text-amber-300 font-black">{setup?.material ? `${setup.material} Board` : 'PLPB Board'} {setup?.thickness || '25 mm'}</span>
            <span className="text-slate-300">• {setup?.tableTopColor || 'Frosty white'}</span>
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-amber-500/50" />
          <div className="w-2 h-2 rounded-full bg-amber-400 ring-4 ring-amber-400/30 animate-pulse mt-0.5" />
        </div>

        {/* 2. Privacy Screen Callout (Pointing directly on screen) */}
        <div 
          ref={screenCalloutRef}
          className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-opacity duration-75"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xl border border-indigo-500/50 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0 border border-white/60 shadow-xs" style={{ backgroundColor: screenColorHex.fill }} />
            <span className="text-indigo-300 font-black">{setup?.frontScreen || 'Acrylic sheet'}</span>
            <span className="text-slate-300">• {setup?.screenColor || 'Blue'} ({setup?.screenHeight || '300MM'}){(setup?.screenQuantity || 1) > 1 ? ` • ${setup?.screenQuantity} Screens` : ''}</span>
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-indigo-500/50" />
          <div className="w-2 h-2 rounded-full bg-indigo-400 ring-4 ring-indigo-400/30 animate-pulse mt-0.5" />
        </div>

        {/* 3. Flip Box Callout (Pointing directly on flip box) */}
        <div 
          ref={flipBoxCalloutRef}
          className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-opacity duration-75"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xl border border-cyan-500/60 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0 bg-cyan-400 shadow-xs" />
            <span className="text-cyan-300 font-black">Flip Box</span>
            <span className="text-slate-300">• Wire & Power Access</span>
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-cyan-500/60" />
          <div className="w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-cyan-400/30 animate-pulse mt-0.5" />
        </div>

        {/* 4. Modesty Panel Callout (Pointing directly on modesty panel) */}
        <div 
          ref={modestyCalloutRef}
          className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-opacity duration-75"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xl border border-emerald-500/50 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 shadow-xs" />
            <span className="text-emerald-300 font-black">Modesty Panel</span>
            <span className="text-slate-300">• Under-Desk Privacy</span>
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-emerald-500/50" />
          <div className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 animate-pulse mt-0.5" />
        </div>

        {/* 5. Legs Callout (Pointing directly on front leg) */}
        <div 
          ref={legCalloutRef}
          className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-opacity duration-75"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xl border border-slate-600/60 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0 border border-slate-400 shadow-xs" style={{ backgroundColor: legColorHex.main }} />
            <span className="text-emerald-300 font-black">{setup?.legSize || '40 x 40'} Legs</span>
            <span className="text-slate-300">• {setup?.legColor || (setup?.legMaterial === 'wooden' ? 'Natural Teak' : 'Black')}</span>
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-slate-600/60" />
          <div className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 animate-pulse mt-0.5" />
        </div>
      </div>

      {/* Dynamic Top Floating Header Bar */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-auto gap-2">
        {/* Left Specifications Summary Pill */}
        <div className="flex items-center gap-2 pointer-events-none">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm backdrop-blur-md border ${
            isFullScreen ? 'bg-slate-900/90 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-xs" />
            <span className="font-bold">{setup?.dimensions || '1200 x 600 mm'}</span>
            <span className="text-slate-400">•</span>
            <span className="font-medium">{setup?.personQuantity && setup.personQuantity > 1 ? `${setup.personQuantity}-Seater Pod` : 'Single Desk'}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-medium">Height 750 mm</span>
          </span>
        </div>

        {/* Right Controls: Infographic, Compass, Theme, Snapshot, and Large View Toggle */}
        <div className="flex items-center gap-2">
          {/* 2D Technical Infographic Specs Sheet Button */}
          <button
            type="button"
            onClick={handleOpenInfographic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
              isFullScreen
                ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/40'
                : 'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white ring-2 ring-amber-500/20'
            } hover:scale-105 active:scale-95`}
            title="Open 2D Technical Line Drawing Infographic with All Sizes & Specs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-100" />
            <span>2D CAD & A4 PDF</span>
          </button>

          {/* 1-Click Download All Angles (ZIP archive with 8 angles + Contact Sheet) */}
          <button
            type="button"
            onClick={handleDownloadAllAngles}
            disabled={isDownloadingAllAngles}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
              downloadAllSuccess
                ? 'bg-emerald-600 text-white'
                : isDownloadingAllAngles
                  ? 'bg-indigo-700 text-white opacity-90 cursor-wait'
                  : 'bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white ring-2 ring-indigo-500/20 hover:scale-105 active:scale-95'
            }`}
            title="Download All 8 Angle Images + Contact Sheet in 1 Click (ZIP)"
          >
            {isDownloadingAllAngles ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Capturing...</span>
              </>
            ) : downloadAllSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-3.5 h-3.5 text-indigo-200" />
                <span>Download All Angles</span>
              </>
            )}
          </button>

          {/* Single Snapshot Button */}
          <button
            type="button"
            onClick={handleTakeSnapshot}
            disabled={isDownloadingAllAngles}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              snapshotSuccess
                ? 'bg-emerald-600 text-white'
                : isFullScreen
                  ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            title="Download Single Angle High-Resolution Snapshot"
          >
            {snapshotSuccess ? <Check className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5 text-indigo-500" />}
            <span className="hidden sm:inline">{snapshotSuccess ? 'Saved!' : 'Snapshot'}</span>
          </button>

          {/* Theme switcher in Fullscreen */}
          {isFullScreen && (
            <button
              type="button"
              onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-xl bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 shadow-sm transition-colors cursor-pointer"
              title={`Switch to ${themeMode === 'dark' ? 'Light Showroom' : 'Dark Studio'} Theme`}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            </button>
          )}

          {/* 360 Degree Live Compass Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 text-white backdrop-blur-xs px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-md">
            <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: isAutoRotating ? '8s' : '0s' }} />
            <span className="font-mono text-[11px]">{currentAngleDeg}°</span>
          </div>

          {/* Large View / Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullScreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
              isFullScreen
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/20'
            }`}
            title={isFullScreen ? 'Exit Large View (Esc)' : 'Open Large View Fullscreen 3D'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Large View 3D</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Controls Toolbar (Bottom) */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Left: Rotate Steppers, 360 Spin & Camera Presets */}
        <div className={`flex items-center gap-1 p-1 rounded-xl shadow-lg text-xs font-semibold backdrop-blur-md border ${
          isFullScreen ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          {/* Rotate Left & Right Steppers */}
          <button
            type="button"
            onClick={() => handleRotateStep('left')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rotate Left 22.5°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleRotateStep('right')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rotate Right 22.5°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className={`h-4 w-px mx-0.5 ${isFullScreen ? 'bg-slate-700' : 'bg-slate-200'}`} />

          {/* Auto-Spin Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
              isAutoRotating 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : isFullScreen ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle 360° continuous turntable spin"
          >
            {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>360° Spin</span>
          </button>

          <div className={`h-4 w-px mx-0.5 ${isFullScreen ? 'bg-slate-700' : 'bg-slate-200'}`} />

          {/* Quick Preset Angles */}
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Front View"
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Isometric View"
          >
            Iso 45°
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Side View"
          >
            Side
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('rear')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rear & Raceway View"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Top Surface View"
          >
            Top
          </button>

          <div className={`h-4 w-px mx-0.5 ${isFullScreen ? 'bg-slate-700' : 'bg-slate-200'}`} />

          {/* Fixed Non-Rotating Labels Toggle */}
          <button
            type="button"
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-[11px] font-semibold ${
              showHotspots 
                ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs font-bold' 
                : isFullScreen ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Toggle stationary specifications (Labels remain fixed and do not rotate with the workstation)"
          >
            <Tag className="w-3 h-3 text-amber-600" />
            <span>Labels {showHotspots ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Right: Zoom & Reset Controls */}
        <div className={`flex items-center gap-1 p-1 rounded-xl shadow-lg text-xs backdrop-blur-md border ${
          isFullScreen ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => handleZoom(0.85)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.15)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className={`h-4 w-px mx-0.5 ${isFullScreen ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <button
            type="button"
            onClick={handleReset}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFullScreen ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Reset to default angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Touch/Mouse Interaction Drag Helper Badge */}
      <div className={`absolute bottom-18 inset-x-0 flex justify-center pointer-events-none transition-opacity duration-300 ${isUserInteracting || isDownloadingAllAngles ? 'opacity-0' : 'opacity-85'}`}>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs shadow-md">
          <RotateCw className="w-3 h-3 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          Drag horizontally/vertically to rotate 360° • Scroll to zoom
        </span>
      </div>

      {/* 1-Click All Angles Download Progress Modal */}
      {isDownloadingAllAngles && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 text-white rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 flex items-center justify-center mb-3.5 shadow-inner">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
            <h4 className="font-bold text-base text-white mb-1">Rendering 360° All Angles</h4>
            <p className="text-xs text-indigo-300 font-mono mb-4 px-2.5 py-1.5 bg-slate-800/90 rounded-lg border border-slate-700/80 w-full text-center">
              {downloadProgressText || 'Capturing 3D angle images...'}
            </p>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2.5">
              <div className="bg-linear-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full w-full animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Capturing 8 studio-grade camera views + overview contact sheet into a single ZIP archive.
            </p>
          </div>
        </div>
      )}

      {/* 2D Technical Infographic Specification Modal */}
      <WorkstationTechnicalInfographicModal
        isOpen={showInfographicModal}
        onClose={() => setShowInfographicModal(false)}
        setup={setup}
        previewImageSrc={previewImageSrc}
        angleImages={angleImages}
      />
    </div>
  );
};
