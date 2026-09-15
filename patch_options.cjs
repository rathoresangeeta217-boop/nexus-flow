const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf-8');

const oldSection = `        {/* 5. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Front Screen Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
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
          <label className="block text-sm font-medium text-slate-700 mb-2">8. Add-ons</label>`;

const newSection = `        {/* 5. Front Screen Height */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">5. Front Screen Height</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>300MM</option>
            <option>400MM</option>
            <option>450MM</option>
          </select>
        </div>

        {/* 6. Screen Colours */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">6. Screen Colours</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Blue</option>
            <option>Grey</option>
            <option>Green</option>
            <option>Red</option>
            <option>Orange</option>
            <option>Custom Colour</option>
          </select>
        </div>

        {/* 7. Modesty */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">7. Modesty <span className="text-slate-400 font-normal">(Optional)</span></label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>None</option>
            <option>Include Modesty Panel</option>
          </select>
        </div>

        {/* 8. Electric Function */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">8. Electric Function</label>
          <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option>Wire Raceway</option>
            <option>2 switch</option>
            <option>3 switch</option>
            <option>4 switch</option>
          </select>
        </div>
        
        {/* 9. Add-ons */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">9. Add-ons</label>`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
  console.log("Successfully patched StorefrontTab.tsx");
} else {
  console.log("Could not find the target string to patch.");
}
