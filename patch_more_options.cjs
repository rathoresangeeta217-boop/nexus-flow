const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const startIdx = content.indexOf('function WorkstationSetup() {');
if (startIdx === -1) {
  console.log("Could not find WorkstationSetup");
  process.exit(1);
}

const componentCode = `function WorkstationSetup() {
  const [sizeType, setSizeType] = useState<'per_person' | 'total'>('per_person');
  const [legMaterial, setLegMaterial] = useState<'metal' | 'wooden'>('metal');

  return (
    <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Let's make your Setup</h3>
      
      <div className="space-y-5">
        {/* 1. Size */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">1. Size</label>
          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${sizeType === 'per_person' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}\`}
              onClick={() => setSizeType('per_person')}
            >
              Per Person
            </button>
            <button 
              type="button"
              className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${sizeType === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}\`}
              onClick={() => setSizeType('total')}
            >
              Total
            </button>
          </div>

          {sizeType === 'per_person' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Width</label>
                <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option>800 mm</option>
                  <option>900 mm</option>
                  <option>1000 mm</option>
                  <option>1050 mm</option>
                  <option>1200 mm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Depth</label>
                <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option>600 mm</option>
                  <option>750 mm</option>
                  <option>800 mm</option>
                </select>
              </div>
            </div>
          )}

          {sizeType === 'total' && (
            <div>
              <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option>1200L x 600W mm</option>
                <option>1500L x 600W mm</option>
                <option>1800L x 750W mm</option>
                <option>2400L x 1200W mm</option>
              </select>
            </div>
          )}
        </div>

        {/* 2. Table Top Colour */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">2. Table Top Colour</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Frosty white</option>
            <option>Ghotic Gray</option>
            <option>Teak</option>
            <option>Beach</option>
            <option>Custom Colour</option>
          </select>
        </div>

        {/* 3. Legs */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">3. Legs</label>
          <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${legMaterial === 'metal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}\`}
              onClick={() => setLegMaterial('metal')}
            >
              Metal
            </button>
            <button 
              type="button"
              className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${legMaterial === 'wooden' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}\`}
              onClick={() => setLegMaterial('wooden')}
            >
              Wooden
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Leg Style</label>
            <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
              {legMaterial === 'metal' ? (
                <>
                  <option>Straight legs</option>
                  <option>U shape legs</option>
                  <option>Angular legs</option>
                </>
              ) : (
                <option>Straight leg</option>
              )}
            </select>
          </div>
        </div>
        
        {/* 4. Front Screen's */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">4. Front Screen's</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Acrylic sheet</option>
            <option>Pin up board</option>
            <option>Aluminium framing</option>
            <option>Magnetic glass</option>
            <option>Wooden</option>
          </select>
        </div>

        {/* 5. Modesty */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Modesty <span className="text-slate-400 font-normal">(Optional)</span></label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>None</option>
            <option>Include Modesty Panel</option>
          </select>
        </div>

        {/* 6. Electric Function */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">6. Electric Function</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Wire Raceway</option>
            <option>2 switch</option>
            <option>3 switch</option>
            <option>4 switch</option>
          </select>
        </div>
        
        {/* 7. Partition Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">7. Partition Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>1200mm Height</option>
            <option>1500mm Height</option>
          </select>
        </div>

        {/* 8. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">8. Add-ons</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>No Add-ons</option>
            <option>3-Drawer Mobile Pedestal</option>
            <option>Keyboard Tray & CPU Trolley</option>
          </select>
        </div>
      </div>
    </div>
  );
}
`;

content = content.substring(0, startIdx) + componentCode;
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Successfully added Modesty and Electric Function");
