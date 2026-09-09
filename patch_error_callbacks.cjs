const fs = require('fs');

function addErrorCallback(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("console.error('Firestore snapshot error'")) return;
  
  content = content.replace(
    /  \}\);\n\};/g,
    "  }, (error) => { console.error('Firestore snapshot error in " + filePath + ":', error); });\n};"
  );
  fs.writeFileSync(filePath, content);
}

['src/lib/payments.ts', 'src/lib/vendorPayments.ts', 'src/lib/installers.ts', 'src/lib/quotes.ts'].forEach(addErrorCallback);
console.log("Patched error callbacks");
