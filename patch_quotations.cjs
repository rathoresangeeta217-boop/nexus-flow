const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf-8');

// Add imports
if (!content.includes("NewProductModal")) {
  content = content.replace(
    "import { Badge } from '../components/Badge';",
    "import { Badge } from '../components/Badge';\nimport { NewProductModal } from '../components/NewProductModal';\nimport { saveProduct } from '../lib/products';\nimport { subscribeToVendors, Vendor } from '../lib/vendors';\nimport { ShoppingBag } from 'lucide-react';"
  );
}

// Add state
if (!content.includes("isNewProductModalOpen")) {
  content = content.replace(
    "const [quotes, setQuotes] = useState<QuoteRequest[]>([]);",
    "const [quotes, setQuotes] = useState<QuoteRequest[]>([]);\n  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);\n  const [vendors, setVendors] = useState<Vendor[]>([]);\n\n  useEffect(() => {\n    const unsub = subscribeToVendors(setVendors);\n    return () => unsub();\n  }, []);\n\n  const handleAddProduct = async (productData: any) => {\n    try {\n      await saveProduct(productData);\n      setIsNewProductModalOpen(false);\n    } catch (error) {\n      console.error('Error saving product:', error);\n    }\n  };"
  );
}

// Add button
if (!content.includes("Add Quotation Product")) {
  content = content.replace(
    "<div className=\"flex items-center gap-3\">\n          <button",
    "<div className=\"flex items-center gap-3\">\n          <button \n            onClick={() => setIsNewProductModalOpen(true)}\n            className=\"flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm\"\n          >\n            <ShoppingBag className=\"w-4 h-4\" />\n            Add Quotation Product\n          </button>\n          <button"
  );
}

// Add modal
if (!content.includes("<NewProductModal")) {
  content = content.replace(
    "</div>\n  );\n}",
    "</div>\n\n      <NewProductModal \n        mode=\"purchase\"\n        isOpen={isNewProductModalOpen}\n        onClose={() => setIsNewProductModalOpen(false)}\n        onAddProduct={handleAddProduct}\n        vendors={vendors}\n      />\n    </div>\n  );\n}"
  );
}

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
console.log("Patched QuotationsTab");
