const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const oldHeight = `        {/* 5. Partition Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Partition Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
            <option>1200mm Height</option>
            <option>1500mm Height</option>
          </select>
        </div>`;

const newHeight = `        {/* 5. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Front Screen Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
          </select>
        </div>`;

content = content.replace(oldHeight, newHeight);

const oldAddons = `        {/* 8. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">8. Add-ons</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>No Add-ons</option>
            <option>3-Drawer Mobile Pedestal</option>
            <option>Keyboard Tray & CPU Trolley</option>
          </select>
        </div>`;

const newAddons = `        {/* 8. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">8. Add-ons</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">3-Drawer Mobile Pedestal</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">Keyboard Tray</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">CPU Stand</span>
            </label>
          </div>
        </div>`;

content = content.replace(oldAddons, newAddons);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched StorefrontTab");
