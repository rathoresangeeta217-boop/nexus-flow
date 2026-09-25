import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WorkstationSetupData, getTableTopHex, getScreenHex, getLegHex } from './WorkstationLiveRenderer';
import { 
  RotateCw, 
  Eye, 
  Maximize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Compass,
  Play,
  Pause,
  Layers,
  Sparkles
} from 'lucide-react';

interface Workstation3DViewerProps {
  setup?: WorkstationSetupData | null;
  className?: string;
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

export const Workstation3DViewer: React.FC<Workstation3DViewerProps> = ({ setup, className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tableGroupRef = useRef<THREE.Group | null>(null);
  const reqAnimRef = useRef<number | null>(null);

  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [currentAngleDeg, setCurrentAngleDeg] = useState<number>(45);
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);

  // Parse table dimensions
  const { widthM, depthM, heightM } = useMemo(() => {
    let w = 1.2;
    let d = 0.6;
    const h = 0.75; // Standard 750mm desk height
    if (setup?.dimensions) {
      const parts = setup.dimensions.match(/(\d+)\s*[xX*]\s*(\d+)/);
      if (parts) {
        const parsedW = parseInt(parts[1], 10);
        const parsedD = parseInt(parts[2], 10);
        if (parsedW > 0) w = parsedW / 1000;
        if (parsedD > 0) d = parsedD / 1000;
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

  // Color hexes
  const topColorHex = useMemo(() => getTableTopHex(setup?.tableTopColor), [setup?.tableTopColor]);
  const screenColorHex = useMemo(() => getScreenHex(setup?.screenColor), [setup?.screenColor]);
  const legColorHex = useMemo(() => getLegHex(setup?.legColor, setup?.legMaterial), [setup?.legColor, setup?.legMaterial]);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    // Start at an attractive 3/4 isometric viewpoint
    camera.position.set(1.9, 1.4, 2.1);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.8;
    controls.target.set(0, heightM / 2 + 0.05, 0);
    controls.minDistance = 0.9;
    controls.maxDistance = 5.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above floor level
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      setIsUserInteracting(true);
    });
    controls.addEventListener('end', () => {
      setIsUserInteracting(false);
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    keyLight.position.set(3.5, 4.5, 2.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.1);
    fillLight.position.set(-3, 2.5, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Subtle studio floor shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 2.4);
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
    const hasModesty = setup?.modesty === 'Include Modesty Panel';
    const frontScreen = setup?.frontScreen || 'Acrylic Screen';
    const hasScreen = frontScreen !== 'No Screen';
    const hasPedestal = setup?.addons?.includes('3-Drawer Mobile Pedestal');
    const hasKeyboard = setup?.addons?.includes('Keyboard Tray');
    const hasCpuStand = setup?.addons?.includes('CPU Stand');
    const hasRaceway = setup?.electricFunction && setup.electricFunction !== 'Wire Raceway';

    const halfW = widthM / 2;
    const halfD = depthM / 2;
    const topY = heightM - thicknessM / 2;

    // 1. TABLE TOP MESH
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

    const topGeo = new THREE.BoxGeometry(widthM, thicknessM, depthM);
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.set(0, topY, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    tableGroup.add(topMesh);

    // Bevel edge accent on tabletop
    const edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(topColorHex.edge),
      roughness: 0.5,
    });
    const frontEdgeGeo = new THREE.BoxGeometry(widthM + 0.002, thicknessM, 0.002);
    const frontEdgeMesh = new THREE.Mesh(frontEdgeGeo, edgeMat);
    frontEdgeMesh.position.set(0, topY, halfD + 0.001);
    tableGroup.add(frontEdgeMesh);

    // 2. LEGS & FRAME
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

    const legInset = legSizeM / 2 + 0.02; // Inset from table edges
    const legHeight = heightM - thicknessM;
    const legY = legHeight / 2;

    const cornerPositions = [
      { x: -halfW + legInset, z: -halfD + legInset, isRear: true, isLeft: true },   // Rear Left
      { x: halfW - legInset, z: -halfD + legInset, isRear: true, isLeft: false },    // Rear Right
      { x: -halfW + legInset, z: halfD - legInset, isRear: false, isLeft: true },   // Front Left
      { x: halfW - legInset, z: halfD - legInset, isRear: false, isLeft: false },   // Front Right
    ];

    if (legStyle === 'U shape legs') {
      // U-shape continuous closed loop on Left & Right sides
      // Left U-frame
      [-halfW + legInset, halfW - legInset].forEach((xPos) => {
        // Vertical front & back posts
        const postGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
        const frontPost = new THREE.Mesh(postGeo, legMat);
        frontPost.position.set(xPos, legY, halfD - legInset);
        frontPost.castShadow = true;
        tableGroup.add(frontPost);

        const rearPost = new THREE.Mesh(postGeo, legMat);
        rearPost.position.set(xPos, legY, -halfD + legInset);
        rearPost.castShadow = true;
        tableGroup.add(rearPost);

        // Bottom horizontal runner connecting posts along floor
        const runnerSpan = depthM - legInset * 2;
        const runnerGeo = new THREE.BoxGeometry(legSizeM, legSizeM, runnerSpan);
        const runnerMesh = new THREE.Mesh(runnerGeo, legMat);
        runnerMesh.position.set(xPos, legSizeM / 2, 0);
        runnerMesh.castShadow = true;
        tableGroup.add(runnerMesh);

        // Top horizontal beam under table
        const topBeamGeo = new THREE.BoxGeometry(legSizeM, legSizeM * 0.75, runnerSpan);
        const topBeamMesh = new THREE.Mesh(topBeamGeo, legMat);
        topBeamMesh.position.set(xPos, heightM - thicknessM - (legSizeM * 0.75) / 2, 0);
        tableGroup.add(topBeamMesh);

        // Glides on bottom runner
        const glideGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
        const g1 = new THREE.Mesh(glideGeo, glideMat);
        g1.position.set(xPos, 0.003, halfD - legInset);
        tableGroup.add(g1);
        const g2 = new THREE.Mesh(glideGeo, glideMat);
        g2.position.set(xPos, 0.003, -halfD + legInset);
        tableGroup.add(g2);
      });
    } else if (legStyle === 'Angular legs') {
      // A-frame angular flared legs
      const angle = 0.12; // Outward angle radians
      cornerPositions.forEach(pos => {
        const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
        const legMesh = new THREE.Mesh(legGeo, legMat);
        const dirX = pos.isLeft ? -1 : 1;
        legMesh.rotation.z = dirX * angle;
        legMesh.position.set(pos.x + dirX * 0.02, legY, pos.z);
        legMesh.castShadow = true;
        tableGroup.add(legMesh);

        const glideGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16);
        const glideMesh = new THREE.Mesh(glideGeo, glideMat);
        glideMesh.position.set(pos.x + dirX * (0.02 + legHeight * Math.tan(angle) * 0.5), 0.004, pos.z);
        tableGroup.add(glideMesh);
      });
    } else {
      // Standard Straight legs
      cornerPositions.forEach(pos => {
        const legGeo = new THREE.BoxGeometry(legSizeM, legHeight, legSizeM);
        const legMesh = new THREE.Mesh(legGeo, legMat);
        legMesh.position.set(pos.x, legY, pos.z);
        legMesh.castShadow = true;
        tableGroup.add(legMesh);

        // Chrome / black glide disc at bottom
        const glideGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16);
        const glideMesh = new THREE.Mesh(glideGeo, glideMat);
        glideMesh.position.set(pos.x, 0.004, pos.z);
        tableGroup.add(glideMesh);
      });
    }

    // Top under-structure frame rails (longitudinal apron)
    const railMat = new THREE.MeshStandardMaterial({
      color: legColorObj,
      roughness: 0.4,
    });
    const railLength = widthM - legInset * 2 - legSizeM;
    if (railLength > 0.3) {
      // Front rail
      const railGeo = new THREE.BoxGeometry(railLength, 0.035, 0.025);
      const frontRail = new THREE.Mesh(railGeo, railMat);
      frontRail.position.set(0, heightM - thicknessM - 0.018, halfD - legInset - 0.02);
      tableGroup.add(frontRail);

      // Back rail
      const backRail = new THREE.Mesh(railGeo, railMat);
      backRail.position.set(0, heightM - thicknessM - 0.018, -halfD + legInset + 0.02);
      tableGroup.add(backRail);
    }

    // 3. FRONT PRIVACY SCREEN (Mounted on rear edge of table)
    if (hasScreen) {
      const screenH = setup?.screenHeight === '450MM' ? 0.45 : setup?.screenHeight === '400MM' ? 0.4 : 0.32;
      const screenThickness = 0.008;
      const screenW = widthM - 0.06;
      const screenY = heightM + screenH / 2 - 0.04; // Starts slightly below table level
      const screenZ = -halfD + 0.02;

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

      const screenGeo = new THREE.BoxGeometry(screenW, screenH, screenThickness);
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, screenY, screenZ);
      screenMesh.castShadow = true;
      tableGroup.add(screenMesh);

      // Aluminium framing border if selected
      if (frontScreen === 'Aluminium framing') {
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.8,
          roughness: 0.2,
        });
        const frameBorderW = 0.012;
        // Top and bottom bars
        const hBarGeo = new THREE.BoxGeometry(screenW + frameBorderW * 2, frameBorderW, screenThickness + 0.004);
        const topBar = new THREE.Mesh(hBarGeo, frameMat);
        topBar.position.set(0, screenY + screenH / 2, screenZ);
        tableGroup.add(topBar);

        const bottomBar = new THREE.Mesh(hBarGeo, frameMat);
        bottomBar.position.set(0, screenY - screenH / 2, screenZ);
        tableGroup.add(bottomBar);

        // Left and right vertical bars
        const vBarGeo = new THREE.BoxGeometry(frameBorderW, screenH, screenThickness + 0.004);
        const leftBar = new THREE.Mesh(vBarGeo, frameMat);
        leftBar.position.set(-screenW / 2, screenY, screenZ);
        tableGroup.add(leftBar);

        const rightBar = new THREE.Mesh(vBarGeo, frameMat);
        rightBar.position.set(screenW / 2, screenY, screenZ);
        tableGroup.add(rightBar);
      }

      // Chrome clamps securing screen to tabletop
      const clampMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.85,
        roughness: 0.2,
      });
      const clampGeo = new THREE.BoxGeometry(0.03, 0.045, 0.035);
      const clampOffset = screenW * 0.32;

      const leftClamp = new THREE.Mesh(clampGeo, clampMat);
      leftClamp.position.set(-clampOffset, heightM + 0.01, screenZ);
      tableGroup.add(leftClamp);

      const rightClamp = new THREE.Mesh(clampGeo, clampMat);
      rightClamp.position.set(clampOffset, heightM + 0.01, screenZ);
      tableGroup.add(rightClamp);
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
      tableGroup.add(modestyMesh);
    }

    // 5. WIRE RACEWAY / ELECTRIC POWER TRAY
    if (hasRaceway) {
      const racewayW = Math.min(widthM * 0.65, 0.7);
      const racewayH = 0.07;
      const racewayD = 0.12;
      const racewayY = heightM - thicknessM - racewayH / 2 - 0.01;
      const racewayZ = -halfD + depthM * 0.35;

      const racewayMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.3,
      });
      const racewayGeo = new THREE.BoxGeometry(racewayW, racewayH, racewayD);
      const racewayMesh = new THREE.Mesh(racewayGeo, racewayMat);
      racewayMesh.position.set(0, racewayY, racewayZ);
      tableGroup.add(racewayMesh);

      // Power switch indicators
      const switchMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const switchCount = setup?.electricFunction?.includes('4 switch') ? 4 : setup?.electricFunction?.includes('3 switch') ? 3 : 2;
      for (let s = 0; s < switchCount; s++) {
        const switchGeo = new THREE.BoxGeometry(0.018, 0.018, 0.005);
        const switchMesh = new THREE.Mesh(switchGeo, switchMat);
        const sx = -0.04 + s * 0.028;
        switchMesh.position.set(sx, racewayY, racewayZ + racewayD / 2 + 0.003);
        tableGroup.add(switchMesh);
      }
    }

    // 6. ADDONS: MOBILE PEDESTAL (3 Drawers)
    if (hasPedestal) {
      const pedW = 0.38;
      const pedH = heightM - thicknessM - 0.08;
      const pedD = depthM * 0.75;
      const pedX = -halfW + legInset + legSizeM + pedW / 2 + 0.04;
      const pedY = pedH / 2 + 0.04;
      const pedZ = 0;

      const pedBodyMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.3,
        metalness: 0.1,
      });

      // Pedestal body
      const pedGeo = new THREE.BoxGeometry(pedW, pedH, pedD);
      const pedMesh = new THREE.Mesh(pedGeo, pedBodyMat);
      pedMesh.position.set(pedX, pedY, pedZ);
      pedMesh.castShadow = true;
      tableGroup.add(pedMesh);

      // 3 Drawer faces & handles
      const drawerH = (pedH - 0.04) / 3;
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });

      for (let d = 0; d < 3; d++) {
        const dy = pedY - pedH / 2 + 0.02 + drawerH * d + drawerH / 2;
        // Drawer separator gap
        const faceGeo = new THREE.BoxGeometry(pedW - 0.01, drawerH - 0.008, 0.006);
        const faceMesh = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
        faceMesh.position.set(pedX, dy, pedD / 2 + 0.003);
        tableGroup.add(faceMesh);

        // Handle
        const handleGeo = new THREE.BoxGeometry(0.1, 0.012, 0.01);
        const handleMesh = new THREE.Mesh(handleGeo, handleMat);
        handleMesh.position.set(pedX, dy, pedD / 2 + 0.01);
        tableGroup.add(handleMesh);
      }

      // 4 Caster wheels
      const casterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const casterGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 12);
      casterGeo.rotateZ(Math.PI / 2);
      [
        { cx: pedX - pedW / 2 + 0.04, cz: pedZ - pedD / 2 + 0.04 },
        { cx: pedX + pedW / 2 - 0.04, cz: pedZ - pedD / 2 + 0.04 },
        { cx: pedX - pedW / 2 + 0.04, cz: pedZ + pedD / 2 - 0.04 },
        { cx: pedX + pedW / 2 - 0.04, cz: pedZ + pedD / 2 - 0.04 },
      ].forEach(c => {
        const cMesh = new THREE.Mesh(casterGeo, casterMat);
        cMesh.position.set(c.cx, 0.02, c.cz);
        tableGroup.add(cMesh);
      });
    }

    // 7. ADDONS: KEYBOARD TRAY
    if (hasKeyboard) {
      const kbW = 0.55;
      const kbD = 0.25;
      const kbH = 0.015;
      const kbY = heightM - thicknessM - 0.07;
      const kbZ = halfD - kbD / 2 - 0.04;

      const kbMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
      const kbMesh = new THREE.Mesh(new THREE.BoxGeometry(kbW, kbH, kbD), kbMat);
      kbMesh.position.set(0, kbY, kbZ);
      tableGroup.add(kbMesh);

      // Slider rails
      const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      [-kbW / 2, kbW / 2].forEach(rx => {
        const rMesh = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, kbD), railMat);
        rMesh.position.set(rx, heightM - thicknessM - 0.035, kbZ);
        tableGroup.add(rMesh);
      });
    }

    // 8. ADDONS: CPU STAND
    if (hasCpuStand) {
      const cpuW = 0.22;
      const cpuH = 0.42;
      const cpuD = 0.42;
      const cpuX = halfW - legInset - legSizeM - cpuW / 2 - 0.04;
      const cpuY = 0.22;
      const cpuZ = 0;

      const cpuMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.4, roughness: 0.4 });
      const cpuMesh = new THREE.Mesh(new THREE.BoxGeometry(cpuW, cpuH, cpuD), cpuMat);
      cpuMesh.position.set(cpuX, cpuY, cpuZ);
      cpuMesh.castShadow = true;
      tableGroup.add(cpuMesh);

      // Power button LED
      const ledGeo = new THREE.BoxGeometry(0.015, 0.015, 0.005);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(cpuX, cpuY + cpuH * 0.35, cpuZ + cpuD / 2 + 0.002);
      tableGroup.add(ledMesh);
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

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center relative select-none ${className}`}>
      {/* 3D WebGL Canvas Mount Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full min-h-[360px] cursor-grab active:cursor-grabbing flex items-center justify-center relative touch-none"
      />

      {/* Floating Badges (Top Left) */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[85%] z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-sm backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: topColorHex.main }} />
          Top: {setup?.tableTopColor || 'Frosty white'} ({setup?.thickness || '25 mm'})
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-sm backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: screenColorHex.fill }} />
          Screen: {setup?.screenColor || 'Blue'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-sm backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: legColorHex.main }} />
          Legs: {setup?.legColor || (setup?.legMaterial === 'wooden' ? 'Natural Teak' : 'Black')} ({setup?.legSize || '40 x 40'})
        </span>
      </div>

      {/* 360 Degree Live Compass Indicator (Top Right) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-slate-900/90 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold shadow-md">
        <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: isAutoRotating ? '8s' : '0s' }} />
        <span>360° View</span>
        <span className="text-slate-400 font-mono text-[11px]">{currentAngleDeg}°</span>
      </div>

      {/* Interactive Controls Toolbar (Bottom) */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Drag Hint & Quick Camera Presets */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200 p-1 rounded-xl shadow-md text-xs font-semibold text-slate-700">
          {/* Auto-Spin Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
              isAutoRotating 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle 360° continuous turntable spin"
          >
            {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>360° Spin</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Quick Preset Angles */}
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
            title="Front View"
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
            title="Isometric View"
          >
            Iso 45°
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
            title="Side View"
          >
            Side
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('rear')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
            title="Rear & Raceway View"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
            title="Top Surface View"
          >
            Top
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200 p-1 rounded-xl shadow-md text-xs">
          <button
            type="button"
            onClick={() => handleZoom(0.85)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.15)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Reset to default angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Touch/Mouse Interaction Drag Helper Badge */}
      <div className={`absolute bottom-16 inset-x-0 flex justify-center pointer-events-none transition-opacity duration-300 ${isUserInteracting ? 'opacity-0' : 'opacity-85'}`}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs shadow-md">
          <RotateCw className="w-3 h-3 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          Drag horizontally/vertically to rotate 360° • Scroll to zoom
        </span>
      </div>
    </div>
  );
};
