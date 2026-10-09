import React from 'react';

export interface WorkstationSetupData {
  sizeType?: 'per_person' | 'total';
  dimensions?: string;
  personQuantity?: number;
  layoutType?: 'cluster' | 'linear';
  material?: string;
  thickness?: string;
  tableTopColor?: string;
  legMaterial?: 'metal' | 'wooden';
  legStyle?: string;
  legColor?: string;
  legSize?: string;
  frontScreen?: string;
  middlePartition?: 'Included' | 'None' | string;
  screenQuantity?: number;
  screenHeight?: string;
  screenColor?: string;
  modesty?: string;
  electricFunction?: string;
  addons?: string[];
  calculatedPrice?: number;
  priceBreakdown?: any;
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

  // Modesty panel
  const hasModesty = setup?.modesty ? setup.modesty !== 'None' : true;

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
        {/* Draw rear posts for Straight legs only (U-shape and Angular draw full integral frames) */}
        {!isUShape && !isAngular && (
          <g id="straightBackLegs">
            <line x1="125" y1="200" x2="125" y2="320" stroke={legColor} strokeWidth={legBackWidth} strokeLinecap="square" />
            <line x1="415" y1="200" x2="415" y2="320" stroke={legColor} strokeWidth={legBackWidth} strokeLinecap="square" />
          </g>
        )}

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

        {/* Wire Raceway / Electric Tray (1 under-desk tray per person with 1, 2, or 3 switch cutouts) */}
        {setup?.electricFunction && setup.electricFunction.startsWith('Wire Raceway') && (
          <g>
            <rect x="185" y="210" width="170" height="16" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <rect x="220" y="213" width="48" height="10" rx="1.5" fill="#0F172A" />
            
            {/* 1 Switch Hole */}
            {setup.electricFunction.includes('1 Switch') && (
              <rect x="240" y="214" width="8" height="8" rx="1" fill="#38BDF8" />
            )}

            {/* 2 Switch Holes */}
            {(setup.electricFunction.includes('2 Switch') || setup.electricFunction === 'Wire Raceway') && (
              <>
                <rect x="233" y="214" width="8" height="8" rx="1" fill="#38BDF8" />
                <rect x="247" y="214" width="8" height="8" rx="1" fill="#38BDF8" />
              </>
            )}

            {/* 3 Switch Holes */}
            {setup.electricFunction.includes('3 Switch') && (
              <>
                <rect x="226" y="214" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="237" y="214" width="7" height="8" rx="1" fill="#38BDF8" />
                <rect x="248" y="214" width="7" height="8" rx="1" fill="#38BDF8" />
              </>
            )}
            <text x="310" y="222" fill="#94A3B8" fontSize="7" fontWeight="bold">POWER RACEWAY</text>
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

        {/* Mobile Adjustable Metal CPU Stand Addon (Right side on caster wheels) */}
        {hasCpuStand && (
          <g>
            {/* Stand Chassis Base Tray */}
            <rect x="368" y="322" width="54" height="4" rx="1" fill="#18181B" stroke="#3F3F46" strokeWidth="0.8" />
            
            {/* Left & Right Upright Side Clamp Wings */}
            <rect x="366" y="295" width="4" height="28" rx="1" fill="#27272A" />
            <rect x="420" y="295" width="4" height="28" rx="1" fill="#27272A" />
            
            {/* Inner Rubber Pads */}
            <rect x="369" y="300" width="2" height="18" fill="#09090B" />
            <rect x="419" y="300" width="2" height="18" fill="#09090B" />

            {/* Computer Tower PC inside */}
            <rect x="372" y="260" width="46" height="62" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="1" />
            <rect x="376" y="265" width="5" height="5" rx="1" fill="#38BDF8" />
            <line x1="385" y1="267" x2="412" y2="267" stroke="#475569" strokeWidth="1" />
            <line x1="376" y1="310" x2="414" y2="310" stroke="#334155" strokeWidth="1.5" />
            <line x1="376" y1="314" x2="414" y2="314" stroke="#334155" strokeWidth="1.5" />
            
            {/* 4 Swivel Caster Wheels */}
            <circle cx="373" cy="330" r="3.5" fill="#09090B" stroke="#27272A" strokeWidth="0.5" />
            <circle cx="417" cy="330" r="3.5" fill="#09090B" stroke="#27272A" strokeWidth="0.5" />
          </g>
        )}

        {/* Keyboard Tray (beneath front edge) */}
        {hasKeyboard && (
          <polygon points="200,215 340,215 330,225 210,225" fill="#1E293B" stroke="#475569" strokeWidth="1" />
        )}

        {/* --- LEGS GEOMETRY: FULL U-SHAPE LOOP, ANGULAR A-FRAME, OR STRAIGHT --- */}
        {isUShape ? (
          <g id="uShapeLoopLegs">
            {/* Left Closed Continuous U-Loop Frame (Slim 40mm CRCA scale) */}
            <path
              d="M 82 200 L 82 335 L 125 320 L 125 188 L 118 188 L 118 312 L 89 326 L 89 200 Z"
              fill={legColor}
              stroke={legStroke}
              strokeWidth={1.2}
            />
            {/* Left Top Subframe Connector */}
            <line x1="82" y1="200" x2="125" y2="188" stroke={legColor} strokeWidth={is50x50 ? 7 : 5} />
            {/* Left Floor Runner Highlight */}
            <line x1="82" y1="335" x2="125" y2="320" stroke={legColor} strokeWidth={is50x50 ? 7 : 5} strokeLinecap="round" />

            {/* Right Closed Continuous U-Loop Frame (Slim 40mm CRCA scale) */}
            <path
              d="M 458 200 L 458 335 L 415 320 L 415 188 L 422 188 L 422 312 L 451 326 L 451 200 Z"
              fill={legColor}
              stroke={legStroke}
              strokeWidth={1.2}
            />
            {/* Right Top Subframe Connector */}
            <line x1="458" y1="200" x2="415" y2="188" stroke={legColor} strokeWidth={is50x50 ? 7 : 5} />
            {/* Right Floor Runner Highlight */}
            <line x1="458" y1="335" x2="415" y2="320" stroke={legColor} strokeWidth={is50x50 ? 7 : 5} strokeLinecap="round" />
          </g>
        ) : isAngular ? (
          <g id="angularAFrameLegs">
            {/* Left Side Metal Gable Panel with Decorative Slots */}
            <polygon points="96,200 125,188 101,285 58,298" fill={legColor} opacity="0.25" stroke={legStroke} strokeWidth="0.8" />
            <rect x="68" y="280" width="10" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.9" transform="rotate(-15, 68, 280)" />
            <rect x="82" y="276" width="10" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.9" transform="rotate(-15, 82, 276)" />
            
            {/* Left Flared Angular Legs (Front and Rear Slanted Posts) */}
            <polygon points="85,200 96,200 60,335 49,335" fill={legColor} stroke={legStroke} strokeWidth={1} />
            <polygon points="125,188 134,188 105,320 96,320" fill={legColor} stroke={legStroke} strokeWidth={1} />

            {/* Right Side Metal Gable Panel with Decorative Slots */}
            <polygon points="444,200 415,188 439,285 482,298" fill={legColor} opacity="0.25" stroke={legStroke} strokeWidth="0.8" />
            <rect x="448" y="276" width="10" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.9" transform="rotate(15, 448, 276)" />
            <rect x="462" y="280" width="10" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.9" transform="rotate(15, 462, 280)" />

            {/* Right Flared Angular Legs (Front and Rear Slanted Posts) */}
            <polygon points="455,200 444,200 480,335 491,335" fill={legColor} stroke={legStroke} strokeWidth={1} />
            <polygon points="415,188 406,188 435,320 444,320" fill={legColor} stroke={legStroke} strokeWidth={1} />
          </g>
        ) : (
          <g id="straightFrontLegs">
            {/* Left Front Straight Leg */}
            <line x1="85" y1="200" x2="85" y2="335" stroke={legColor} strokeWidth={legFrontWidth * 0.8} strokeLinecap="square" />
            {/* Right Front Straight Leg */}
            <line x1="455" y1="200" x2="455" y2="335" stroke={legColor} strokeWidth={legFrontWidth * 0.8} strokeLinecap="square" />
          </g>
        )}

        {/* Exactly ONE Middle Leg (Recessed inside) for wide 1800mm+ / 2400mm tables */}
        {((setup?.personQuantity || 1) > 1 || (setup?.dimensions && parseInt(setup.dimensions, 10) >= 1800)) && (
          <g id="middleSupportLeg">
            <line x1="270" y1="202" x2="270" y2="330" stroke={legColor} strokeWidth={legFrontWidth * 0.75} strokeLinecap="square" opacity="0.9" />
            {isUShape && (
              <line x1="270" y1="330" x2="285" y2="320" stroke={legColor} strokeWidth={is50x50 ? 6 : 4.5} opacity="0.8" />
            )}
          </g>
        )}

        {/* --- FRONT PRIVACY SCREENS (Mounted along back edge of tabletop) --- */}
        {setup?.frontScreen !== 'No Screen' && (
          <g>
            {(setup?.personQuantity || 1) <= 1 ? (
              // Single user screen spanning the back edge (with curved top corners)
              <g>
                <path
                  d={`M 120,165 L 120,${160 - screenH + 10} Q 120,${160 - screenH} 130,${160 - screenH} L 410,${160 - screenH} Q 420,${160 - screenH} 420,${160 - screenH + 10} L 420,165 Z`}
                  fill={setup?.frontScreen === 'Wooden' 
                    ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
                    : 'url(#acrylicGrad)'
                  }
                  stroke={screenColor.stroke}
                  strokeWidth={setup?.frontScreen === 'Aluminium framing' ? '3' : '1.5'}
                  style={{ filter: `drop-shadow(0 4px 12px ${screenColor.glow})` }}
                />
                <path
                  d={`M 120,${160 - screenH + 10} Q 120,${160 - screenH} 130,${160 - screenH} L 410,${160 - screenH} Q 420,${160 - screenH} 420,${160 - screenH + 10} L 420,${160 - screenH / 2} L 120,${160 - screenH / 3} Z`}
                  fill="url(#screenGloss)"
                />
                {setup?.frontScreen === 'Aluminium framing' && (
                  <rect x="122" y={162 - screenH} width="296" height={screenH + 1} rx="8" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
                )}
                <rect x="170" y="160" width="8" height="10" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                <rect x="362" y="160" width="8" height="10" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
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
            ) : (
              // Multi-Person Shared Table: Individual Separated Screens per Seater + Central Divider Partition
              <g>
                {/* Person 1 (Left Seater) Individual Screen */}
                <path
                  d={`M 120,165 L 120,${160 - screenH + 8} Q 120,${160 - screenH} 128,${160 - screenH} L 255,${160 - screenH} Q 263,${160 - screenH} 263,${160 - screenH + 8} L 263,165 Z`}
                  fill={setup?.frontScreen === 'Wooden' 
                    ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
                    : 'url(#acrylicGrad)'
                  }
                  stroke={screenColor.stroke}
                  strokeWidth={setup?.frontScreen === 'Aluminium framing' ? '2.5' : '1.5'}
                  style={{ filter: `drop-shadow(0 4px 10px ${screenColor.glow})` }}
                />
                {/* Person 1 Gloss & Clamps */}
                <path
                  d={`M 120,${160 - screenH + 8} Q 120,${160 - screenH} 128,${160 - screenH} L 255,${160 - screenH} Q 263,${160 - screenH} 263,${160 - screenH + 8} L 263,${160 - screenH / 2} L 120,${160 - screenH / 3} Z`}
                  fill="url(#screenGloss)"
                />
                <rect x="155" y="160" width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                <rect x="225" y="160" width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                <text
                  x="191"
                  y={160 - screenH / 2 + 3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  P1 Screen
                </text>

                {/* Person 2 (Right Seater) Individual Screen */}
                <path
                  d={`M 277,165 L 277,${160 - screenH + 8} Q 277,${160 - screenH} 285,${160 - screenH} L 412,${160 - screenH} Q 420,${160 - screenH} 420,${160 - screenH + 8} L 420,165 Z`}
                  fill={setup?.frontScreen === 'Wooden' 
                    ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
                    : 'url(#acrylicGrad)'
                  }
                  stroke={screenColor.stroke}
                  strokeWidth={setup?.frontScreen === 'Aluminium framing' ? '2.5' : '1.5'}
                  style={{ filter: `drop-shadow(0 4px 10px ${screenColor.glow})` }}
                />
                {/* Person 2 Gloss & Clamps */}
                <path
                  d={`M 277,${160 - screenH + 8} Q 277,${160 - screenH} 285,${160 - screenH} L 412,${160 - screenH} Q 420,${160 - screenH} 420,${160 - screenH + 8} L 420,${160 - screenH / 2} L 277,${160 - screenH / 3} Z`}
                  fill="url(#screenGloss)"
                />
                <rect x="310" y="160" width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                <rect x="385" y="160" width="7" height="9" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                <text
                  x="348"
                  y={160 - screenH / 2 + 3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  P2 Screen
                </text>

                {/* Intermediate Cross-Divider Privacy Partition Screen dividing P1 and P2 (Optional) */}
                {setup?.middlePartition !== 'None' && (
                  <g>
                    <polygon
                      points={`269,${160 - screenH * 0.95} 271,${160 - screenH * 0.95} 271,192 269,192`}
                      fill={screenColor.stroke}
                      stroke={screenColor.stroke}
                      strokeWidth="3.5"
                      opacity="0.9"
                    />
                    <rect x="267" y="172" width="6" height="8" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                  </g>
                )}
              </g>
            )}

            {/* Left Side Screen (if screenQuantity >= 2) */}
            {(setup?.screenQuantity || 1) >= 2 && (
              <g opacity="0.95">
                <polygon
                  points={`120,${160 - screenH} 75,${200 - screenH} 75,200 120,165`}
                  fill={setup?.frontScreen === 'Wooden' 
                    ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
                    : 'url(#acrylicGrad)'
                  }
                  stroke={screenColor.stroke}
                  strokeWidth="1.5"
                />
                <rect x="95" y="180" width="8" height="8" rx="1" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.8" />
              </g>
            )}

            {/* Right Side Screen (if screenQuantity >= 3) */}
            {(setup?.screenQuantity || 1) >= 3 && (
              <g opacity="0.95">
                <polygon
                  points={`420,${160 - screenH} 465,${200 - screenH} 465,200 420,165`}
                  fill={setup?.frontScreen === 'Wooden' 
                    ? (setup?.tableTopColor === 'Beach' ? 'url(#beachGrain)' : 'url(#teakGrain)') 
                    : 'url(#acrylicGrad)'
                  }
                  stroke={screenColor.stroke}
                  strokeWidth="1.5"
                />
                <rect x="440" y="180" width="8" height="8" rx="1" fill="#CBD5E1" stroke="#64748B" strokeWidth="0.8" />
              </g>
            )}
          </g>
        )}

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
          <rect x="200" y="180" width="140" height="18" rx="9" fill="rgba(15, 23, 42, 0.75)" />
          <text x="270" y="192" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="bold">
            {setup?.tableTopColor || 'Frosty white'} • {setup?.thickness || '25 mm'}
          </text>
        </g>
      </svg>

      {/* Floating Status Badges Over Visualizer */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[90%] z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
          <span className="w-2 h-2 rounded-full bg-indigo-200 shrink-0" />
          {setup?.personQuantity && setup.personQuantity > 1 ? `${setup.personQuantity}-Seater Cluster` : '1-Seater Workstation'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/95 border border-indigo-200 text-indigo-950 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full border border-indigo-400 shrink-0" style={{ backgroundColor: screenColor.fill }} />
          Screen: {setup?.frontScreen || 'Acrylic sheet'} ({setup?.screenColor || 'Blue'})
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/95 border border-amber-200 text-amber-950 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full border border-amber-400 shrink-0" style={{ backgroundColor: topColor.main }} />
          Top: {setup?.material ? `${setup.material} Board` : 'PLPB Board'} {setup?.thickness || '25 mm'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/95 border border-emerald-200 text-emerald-950 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Modesty: {setup?.modesty === 'None' ? 'Optional' : 'Included'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/95 border border-cyan-200 text-cyan-950 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
          Flip Box Included
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/95 border border-slate-200 text-slate-800 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: legHex.main }} />
          Legs: {setup?.legSize || '40 x 40'} ({setup?.legColor || (isWooden ? 'Natural Teak' : 'Black')})
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
