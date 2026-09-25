const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');
content = content.replace('<div className="mt-8"><div className="mt-8">', '<div className="mt-8">');
content = content.replace('<div className="mt-8">\\n<div className="mt-8">', '<div className="mt-8">');
content = content.replace('<div className="mt-8">\\r\\n<div className="mt-8">', '<div className="mt-8">');
// use a regex
content = content.replace(/<div className="mt-8">\s*<div className="mt-8">/g, '<div className="mt-8">');
fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("fixed");
