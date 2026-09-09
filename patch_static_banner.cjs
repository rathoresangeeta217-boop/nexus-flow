const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetUploadSection = `          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white backdrop-blur-sm z-20">
              <Upload className="w-8 h-8 mb-2" />
              <span className="font-bold tracking-wider uppercase text-sm">Upload New Banner</span>
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </label>
          )}`;

content = content.replace(targetUploadSection, "");
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched StorefrontTab to make banner static");
