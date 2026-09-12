const fs = require('fs');

let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const old5to8 = `        {/* 5. Modesty */}
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
        </div>`;

const new5to8 = `        {/* 5. Partition Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Partition Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
            <option>1200mm Height</option>
            <option>1500mm Height</option>
          </select>
        </div>

        {/* 6. Modesty */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">6. Modesty <span className="text-slate-400 font-normal">(Optional)</span></label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>None</option>
            <option>Include Modesty Panel</option>
          </select>
        </div>

        {/* 7. Electric Function */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">7. Electric Function</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Wire Raceway</option>
            <option>2 switch</option>
            <option>3 switch</option>
            <option>4 switch</option>
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
        </div>`;

if (content.includes(old5to8)) {
  content = content.replace(old5to8, new5to8);
  fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
  console.log('Successfully updated StorefrontTab.tsx');
} else {
  console.log('Could not find the expected string in StorefrontTab.tsx');
}
