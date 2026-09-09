const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// 1. Add idb-keyval import
if (!content.includes("import { set, get } from 'idb-keyval';")) {
  content = content.replace(
    "import { getProductFile } from '../lib/fileStorage';",
    "import { getProductFile } from '../lib/fileStorage';\nimport { set, get } from 'idb-keyval';"
  );
}
if (!content.includes("import { useAuth } from '../contexts/AuthContext';")) {
  content = content.replace(
    "import { getProductFile } from '../lib/fileStorage';",
    "import { getProductFile } from '../lib/fileStorage';\nimport { useAuth } from '../contexts/AuthContext';"
  );
}
if (!content.includes("Upload, ImagePlus")) {
  content = content.replace(
    "ShoppingCart, Search, Menu, Star, Zap, ChevronRight, X",
    "ShoppingCart, Search, Menu, Star, Zap, ChevronRight, X, Upload, ImagePlus"
  );
}

// 2. Add banner state to StorefrontTab
if (!content.includes("const [bannerUrl, setBannerUrl] = useState")) {
  content = content.replace(
    "const [isCartOpen, setIsCartOpen] = useState(false);",
    "const [isCartOpen, setIsCartOpen] = useState(false);\n  const [bannerUrl, setBannerUrl] = useState<string | null>(null);\n  const { profile } = useAuth();\n  useEffect(() => {\n    get('storefront_banner').then(url => { if (url) setBannerUrl(url as string); });\n  }, []);\n\n  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (file) {\n      const reader = new FileReader();\n      reader.onloadend = () => {\n        const base64 = reader.result as string;\n        setBannerUrl(base64);\n        set('storefront_banner', base64);\n      };\n      reader.readAsDataURL(file);\n    }\n  };\n"
  );
}

// 3. Replace Hero Section
const heroStart = `{/* Hero Section */}`;
const heroEnd = `)}`;
const startIndex = content.indexOf(heroStart);
let endIndex = content.indexOf(heroEnd, startIndex);
if (endIndex !== -1) {
  endIndex += heroEnd.length;
  
  const newHero = `{/* Hero Section */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="relative w-full overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center group">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Storefront Banner" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <ImagePlus className="w-12 h-12 mb-2 opacity-50" />
              <p className="font-medium uppercase tracking-widest text-sm opacity-50">No Banner Uploaded</p>
            </div>
          )}
          
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white backdrop-blur-sm z-20">
              <Upload className="w-8 h-8 mb-2" />
              <span className="font-bold tracking-wider uppercase text-sm">Upload New Banner</span>
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </label>
          )}
        </div>
      )}`;
      
  content = content.substring(0, startIndex) + newHero + content.substring(endIndex);
}

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched Storefront banner");
