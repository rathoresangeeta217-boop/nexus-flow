const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

// I also need to update the client code in NewProductModal.tsx so that it reads `data.error` when `!res.ok`
// and shows that in the alert. Right now it just catches network errors in `catch (e)`.

const handleGenerateDescriptionCode = `  const handleGenerateDescription = async () => {
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
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || \`Server returned \${res.status}\`);
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to auto-write details: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingDesc(false);
    }
  };`;

content = content.replace(/const handleGenerateDescription = async \(\) => \{[\s\S]*?setIsGeneratingDesc\(false\);\s*\}\s*\};\s*const handleChange/m, handleGenerateDescriptionCode + '\n\n  const handleChange');

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal error message display");
