const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

// 1. Add state for loading
content = content.replace(
  "const [isProcessing, setIsProcessing] = useState(false);",
  "const [isProcessing, setIsProcessing] = useState(false);\n  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);"
);

// 2. Add generate handler
const handler = `
  const handleGenerateDescription = async () => {
    if (!formData.productName || formData.details) return;
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: formData.productName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.description) {
          setFormData(prev => ({ ...prev, details: data.description }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };
`;

content = content.replace(
  "  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {",
  handler + "\n  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {"
);

// 3. Update the Product Name input to call the handler on blur
content = content.replace(
  "onChange={handleChange}",
  "onChange={handleChange}\n                      onBlur={handleGenerateDescription}"
);

// 4. Update the Details label to show a loading indicator
content = content.replace(
  '<label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Details</label>',
  `<label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      Details 
                      {isGeneratingDesc && <span className="text-indigo-500 lowercase text-[10px] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> auto writing...</span>}
                    </label>`
);

// 5. Ensure Loader2 is imported
if (!content.includes("Loader2")) {
  content = content.replace(
    "import { X, ShoppingBag, Upload, Image as ImageIcon } from 'lucide-react';",
    "import { X, ShoppingBag, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';"
  );
}

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal.tsx");
