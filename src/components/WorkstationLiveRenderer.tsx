import React from 'react';

export interface WorkstationSetupData {
  sizeType?: 'per_person' | 'total';
  dimensions?: string;
  material?: string;
  thickness?: string;
  tableTopColor?: string;
  legMaterial?: 'metal' | 'wooden';
  legStyle?: string;
  legColor?: string;
  legSize?: string;
  frontScreen?: string;
  screenHeight?: string;
  screenColor?: string;
  modesty?: string;
  electricFunction?: string;
  addons?: string[];
  calculatedPrice?: number;
}

export const getLegHex = (color?: string, material?: 'metal' | 'wooden'): { main: string; edge: string; text: string } => {
  if (material === 'wooden') {
    switch (color?.toLowerCase()) {
      case 'beach wood':
      case 'beach':
        return { main: '#d4a373', edge: '#b58351', text: '#451a03' };
      case 'walnut':
      case 'dark wenge':
        return { main: '#451a03', edge: '#2e1065', text: '#FFFFFF' };
      case 'black wood':
        return { main: '#1e293b', edge: '#0f172a', text: '#FFFFFF' };
      case 'natural teak':
      case 'teak':
      default:
        return { main: '#854d0e', edge: '#713f12', text: '#FEF08A' };
    }
  }
  switch (color?.toLowerCase()) {
    case 'white':
    case 'frosty white':
      return { main: '#f8fafc', edge: '#94a3b8', text: '#0f172a' };
    case 'silver / grey':
    case 'silver':
    case 'grey':
      return { main: '#94a3b8', edge: '#64748b', text: '#0f172a' };
    case 'anthracite':
    case 'dark grey':
      return { main: '#334155', edge: '#1e293b', text: '#FFFFFF' };
    case 'custom colour':
      return { main: '#7c3aed', edge: '#6d28d9', text: '#FFFFFF' };
    case 'black':
    default:
      return { main: '#0f172a', edge: '#020617', text: '#FFFFFF' };
  }
};

export const getTableTopHex = (color?: string): { main: string; edge: string; text: string; isWood?: boolean } => {
  switch (color?.toLowerCase()) {
    case 'ghotic gray':
      return { main: '#475569', edge: '#334155', text: '#F8FAFC' };
    case 'teak':
      return { main: '#854d0e', edge: '#713f12', text: '#FEF08A', isWood: true };
    case 'beach':
      return { main: '#d4a373', edge: '#b58351', text: '#451a03', isWood: true };
    case 'custom colour':
      return { main: '#7c3aed', edge: '#6d28d9', text: '#FFFFFF' };
    case 'frosty white':
    default:
      return { main: '#F8FAFC', edge: '#E2E8F0', text: '#1E293B' };
  }
};

export const getScreenHex = (color?: string): { fill: string; stroke: string; glow: string } => {
  switch (color?.toLowerCase()) {
    case 'grey':
      return { fill: '#64748b', stroke: '#475569', glow: 'rgba(100, 116, 139, 0.4)' };
    case 'green':
      return { fill: '#16a34a', stroke: '#15803d', glow: 'rgba(22, 163, 74, 0.4)' };
    case 'red':
      return { fill: '#dc2626', stroke: '#b91c1c', glow: 'rgba(220, 38, 38, 0.4)' };
    case 'orange':
      return { fill: '#ea580c', stroke: '#c2410c', glow: 'rgba(234, 88, 12, 0.4)' };
    case 'custom colour':
      return { fill: '#9333ea', stroke: '#7e22ce', glow: 'rgba(147, 51, 234, 0.4)' };
    case 'blue':
    default:
      return { fill: '#2563eb', stroke: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.4)' };
  }
};

export const WorkstationLiveRenderer: React.FC<{ setup?: WorkstationSetupData | null }> = ({ setup }) => {
  const topColor = getTableTopHex(setup?.tableTopColor);
  const screenColor = getScreenHex(setup?.screenColor);
  
  // Thickness height adjustment
  const thicknessVal = setup?.thickness || '25 mm';
  const edgeDepth = thicknessVal === '36 mm' ? 16 : thicknessVal === '25 mm' ? 12 : 8;

  // Screen height scale
  const screenH = setup?.screenHeight === '450MM' ? 70 : setup?.screenHeight === '400MM' ? 60 : 50;

  // Leg styling
  const isWooden = setup?.legMaterial === 'wooden';
  const legHex = getLegHex(setup?.legColor, setup?.legMaterial);
  const legColor = legHex.main;
  const legStroke = legHex.edge;
  const legStyle = setup?.legStyle || 'Straight legs';
  const is50x50 = setup?.legSize === '50 x 50';
  const legBackWidth = isWooden ? (is50x50 ? 13 : 10) : (is50x50 ? 11 : 8);
  const legFrontWidth = isWooden ? (is50x50 ? 15 : 12) : (is50x50 ? 12 : 9);

  // Modesty panel
  const hasModesty = setup?.modesty === 'Include Modesty Panel';

  // Addons
  const hasPedestal = setup?.addons?.includes('3-Drawer Mobile Pedestal');
  const hasKeyboard = setup?.addons?.includes('Keyboard Tray');
  const hasCpuStand = setup?.addons?.includes('CPU Stand');

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      {/* SVG Interactive Render */}
      <svg
        viewBox="0 0 540 380"
        className="w-full h-full max-h-[420px] drop-shadow-xl"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Wood grain pattern for Teak / Beach */}
          <pattern id="teakGrain" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
            <rect width="40" height="40" fill="#854d0e" />
            <path d="M 0 10 Q 20 12 40 10 M 0 25 Q 20 23 40 25 M 0 35 Q 20 37 40 35" stroke="#713f12" strokeWidth="1.2" fill="none" opacity="0.45" />
          </pattern>
          <pattern id="beachGrain" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
            <rect width="40" height="40" fill="#d4a373" />
            <path d="M 0 10 Q 20 12 40 10 M 0 25 Q 20 23 40 25 M 0 35 Q 20 37 40 35" stroke="#b58351" strokeWidth="1.2" fill="none" opacity="0.4" />
          </pattern>

          {/* Acrylic screen gradient */}
          <linearGradient id="acrylicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={screenColor.fill} stopOpacity="0.88" />
            <stop offset="50%" stopColor={screenColor.fill} stopOpacity="0.75" />
            <stop offset="100%" stopColor={screenColor.fill} stopOpacity="0.92" />
          </linearGradient>

          {/* Reflection highlight */}
          <linearGradient id="screenGloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Tabletop soft shadow */}
          <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
            <stop offset="60%" stopColor="rgba(0,0,0,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Ambient Floor Shadow */}
        <ellipse cx="270" cy="340" rx="200" ry="32" fill="url(#floorShadow)" />

        {/* --- LEGS & FRAME (Back & Lower) --- */}
        {/* Left Back Leg */}
        <line x1="125" y1="200" x2="125" y2="320" stroke={legColor} strokeWidth={legBackWidth} strokeLinecap="square" />
        {/* Right Back Leg */}
        <line x1="415" y1="200" x2="415" y2="320" stroke={legColor} strokeWidth={legBackWidth} strokeLinecap="square" />

        {/* Modesty Panel (if selected) */}
        {hasModesty && (
          <g>
            <polygon
              points="140,220 400,220 400,285 140,285"
              fill={topColor.isWood ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') : '#64748B'}
              stroke="#475569"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <line x1="140" y1="225" x2="400" y2="225" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
            <text x="270" y="260" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" opacity="0.6">
              MODESTY PANEL
            </text>
          </g>
        )}

        {/* Wire Raceway / Electric Tray */}
        {setup?.electricFunction && setup.electricFunction !== 'Wire Raceway' && (
          <g>
            <rect x="200" y="212" width="140" height="14" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            {setup.electricFunction.includes('2 switch') && (
              <>
                <rect x="235" y="215" width="8" height="8" rx="1" fill="#38BDF8" />
                <rect x="250" y="215" width="8" height="8" rx="1" fill="#38BDF8" />
              </>
            )}
            {setup.electricFunction.includes('3 switch') && (
              <>
                <rect x="230" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="242" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="254" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
              </>
            )}
            {setup.electricFunction.includes('4 switch') && (
              <>
                <rect x="225" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="236" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="247" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="258" y="215" width="7" height="8" rx="1" fill="#38BDF8" />
              </>
            )}
            <text x="300" y="223" fill="#94A3B8" fontSize="7" fontWeight="bold">POWER RACEWAY</text>
          </g>
        )}

        {/* Mobile Pedestal Addon (Left side below desk) */}
        {hasPedestal && (
          <g>
            <rect x="145" y="235" width="75" height="95" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
            {/* Drawers */}
            <rect x="150" y="242" width="65" height="24" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="172" y1="254" x2="192" y2="254" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
            
            <rect x="150" y="271" width="65" height="24" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="172" y1="283" x2="192" y2="283" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />

            <rect x="150" y="300" width="65" height="24" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="172" y1="312" x2="192" y2="312" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />

            {/* Wheels */}
            <circle cx="155" cy="333" r="3.5" fill="#334155" />
            <circle cx="210" cy="333" r="3.5" fill="#334155" />
          </g>
        )}

        {/* CPU Stand Addon (Right side) */}
        {hasCpuStand && (
          <g>
            <rect x="375" y="295" width="45" height="35" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <rect x="382" y="302" width="6" height="6" rx="1" fill="#38BDF8" />
            <line x1="382" y1="315" x2="410" y2="315" stroke="#334155" strokeWidth="1" />
            <text x="397" y="325" textAnchor="middle" fill="#94A3B8" fontSize="6">CPU STAND</text>
          </g>
        )}

        {/* Keyboard Tray (beneath front edge) */}
        {hasKeyboard && (
          <polygon points="200,215 340,215 330,225 210,225" fill="#1E293B" stroke="#475569" strokeWidth="1" />
        )}

        {/* Left Front Leg */}
        {legStyle === 'U shape legs' ? (
          <path d="M 75 200 L 75 335 L 125 335 L 125 200" fill="none" stroke={legColor} strokeWidth={is50x50 ? 10 : 8} strokeLinecap="square" />
        ) : legStyle === 'Angular legs' ? (
          <polygon points="70,200 95,200 135,335 115,335" fill={legColor} stroke={legStroke} strokeWidth={is50x50 ? 2 : 1} />
        ) : (
          <line x1="85" y1="200" x2="85" y2="335" stroke={legColor} strokeWidth={legFrontWidth} strokeLinecap="square" />
        )}

        {/* Right Front Leg */}
        {legStyle === 'U shape legs' ? (
          <path d="M 465 200 L 465 335 L 415 335 L 415 200" fill="none" stroke={legColor} strokeWidth={is50x50 ? 10 : 8} strokeLinecap="square" />
        ) : legStyle === 'Angular legs' ? (
          <polygon points="470,200 445,200 405,335 425,335" fill={legColor} stroke={legStroke} strokeWidth={is50x50 ? 2 : 1} />
        ) : (
          <line x1="455" y1="200" x2="455" y2="335" stroke={legColor} strokeWidth={legFrontWidth} strokeLinecap="square" />
        )}

        {/* --- FRONT SCREEN (Mounted along back edge of tabletop) --- */}
        {/* Screen back polygon: 120, 160-screenH to 420, 160-screenH */}
        <g>
          {/* Main screen panel */}
          <polygon
            points={`120,${160 - screenH} 420,${160 - screenH} 420,165 120,165`}
            fill={setup?.frontScreen === 'Wooden' 
              ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
              : 'url(#acrylicGrad)'
            }
            stroke={screenColor.stroke}
            strokeWidth={setup?.frontScreen === 'Aluminium framing' ? '4' : '1.5'}
            style={{ filter: `drop-shadow(0 4px 12px ${screenColor.glow})` }}
          />

          {/* Gloss overlay highlight */}
          <polygon
            points={`120,${160 - screenH} 420,${160 - screenH} 420,${160 - screenH / 2} 120,${160 - screenH / 3}`}
            fill="url(#screenGloss)"
          />

          {/* Aluminium frame line accent */}
          {setup?.frontScreen === 'Aluminium framing' && (
            <rect x="122" y={162 - screenH} width="296" height={screenH + 1} fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
          )}

          {/* Pin up board texture accent */}
          {setup?.frontScreen === 'Pin up board' && (
            <line x1="120" y1={160 - screenH / 2} x2="420" y2={160 - screenH / 2} stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
          )}

          {/* Screen Chrome Clamps on desk */}
          <rect x="170" y="160" width="8" height="10" rx="1" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.8" />
          <rect x="362" y="160" width="8" height="10" rx="1" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.8" />

          {/* Screen Spec Text Badge */}
          <text
            x="270"
            y={160 - screenH / 2 + 3}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            letterSpacing="1"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
          >
            {setup?.frontScreen || 'Acrylic Screen'} • {setup?.screenColor || 'Blue'}
          </text>
        </g>

        {/* --- TABLE TOP (Perspective Polygon) --- */}
        {/* Table Top Surface: Back: 110,165 to 430,165. Front: 60,205 to 480,205 */}
        <polygon
          points="110,165 430,165 480,205 60,205"
          fill={topColor.isWood ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') : topColor.main}
          stroke={topColor.edge}
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
        />

        {/* Top glossy reflection beam */}
        <polygon
          points="112,166 220,166 180,204 64,204"
          fill="#FFFFFF"
          opacity={setup?.tableTopColor === 'Frosty white' ? 0.35 : 0.12}
        />

        {/* Front Edge Thickness (reflects 18mm, 25mm, 36mm) */}
        <polygon
          points={`60,205 480,205 480,${205 + edgeDepth} 60,${205 + edgeDepth}`}
          fill={topColor.edge}
          stroke="#334155"
          strokeWidth="0.8"
        />

        {/* Left Side Thickness Bevel */}
        <polygon
          points={`60,205 110,165 110,${165 + edgeDepth} 60,${205 + edgeDepth}`}
          fill={topColor.edge}
          opacity="0.85"
        />

        {/* Tabletop Specifications Badge (Material, Size, Color) */}
        <g>
          <rect x="200" y="180" width="140" height="18" rx="9" fill="rgba(15, 23, 42, 0.75)" backdropFilter="blur(4px)" />
          <text x="270" y="192" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="bold">
            {setup?.tableTopColor || 'Frosty white'} • {setup?.thickness || '25 mm'}
          </text>
        </g>
      </svg>

      {/* Floating Status Badges Over Visualizer */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[85%] z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-xs backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: topColor.main }} />
          Top: {setup?.tableTopColor || 'Frosty white'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-xs backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: screenColor.fill }} />
          Screen: {setup?.screenColor || 'Blue'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-xs backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: legHex.main }} />
          Legs: {setup?.legColor || (isWooden ? 'Natural Teak' : 'Black')} ({setup?.legSize || '40 x 40'})
        </span>
      </div>

      <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-900/85 text-white backdrop-blur-xs shadow-xs">
          Interactive Live Color & Setup Preview
        </span>
      </div>
    </div>
  );
};
