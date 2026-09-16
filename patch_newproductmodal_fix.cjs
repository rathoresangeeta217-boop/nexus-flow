const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

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
  "  const handleChange =",
  handler + "\n  const handleChange ="
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal.tsx fix");
