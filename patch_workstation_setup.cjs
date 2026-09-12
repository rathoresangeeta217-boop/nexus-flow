const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const oldSetupBlock = `{selectedProduct.category === "Workstation's" && (
                  <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Let's make your Setup</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Desk Size</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>1200L x 600W mm</option>
                          <option>1500L x 600W mm</option>
                          <option>1800L x 750W mm</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Partition Height</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>1200mm Height</option>
                          <option>1500mm Height</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Add-ons</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>No Add-ons</option>
                          <option>3-Drawer Mobile Pedestal</option>
                          <option>Keyboard Tray & CPU Trolley</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}`;

const newSetupBlock = `{selectedProduct.category === "Workstation's" && <WorkstationSetup />}`;

if (content.includes(oldSetupBlock)) {
  content = content.replace(oldSetupBlock, newSetupBlock);
} else {
  console.log("Could not find the exact old block");
}

const workstationSetupComponent = `

function WorkstationSetup() {
  const [sizeType, setSizeType] = useState<'per_person' | 'total'>('per_person');

  return (
    <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Let's make your Setup</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
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
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Partition Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>1200mm Height</option>
            <option>1500mm Height</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Add-ons</label>
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

content = content + workstationSetupComponent;

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Appended WorkstationSetup and patched usage");
