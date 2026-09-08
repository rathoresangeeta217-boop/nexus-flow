const fs = require('fs');

const modals = [
  'src/components/NewOrderModal.tsx',
  'src/components/OrderDetailsModal.tsx',
  'src/components/CreatePOModal.tsx',
  'src/components/ReceiveDeliveryModal.tsx',
  'src/components/VendorPaymentModal.tsx',
  'src/components/PaymentManagementModal.tsx',
  'src/components/NewProductModal.tsx',
  'src/components/NewVendorModal.tsx'
];

for (const modal of modals) {
  if (!fs.existsSync(modal)) continue;
  let content = fs.readFileSync(modal, 'utf8');

  // Change inset-0 flex items-center p-4 sm:p-6 to be slightly better for mobile (like max-h-[95vh])
  const maxHeightOld = `max-h-[90vh]`;
  const maxHeightNew = `max-h-[100dvh] md:max-h-[90vh]`;
  if (content.includes(maxHeightOld)) {
    content = content.replace(maxHeightOld, maxHeightNew);
  }

  // Change modal container radius on mobile (often full screen or rounded-t-xl is nicer on mobile, but just full height is fine)
  const roundedOld = `rounded-2xl`;
  const roundedNew = `rounded-none md:rounded-2xl`;
  if (content.includes(roundedOld)) {
    // Only replace the first occurrence which is usually the main modal window
    content = content.replace(roundedOld, roundedNew);
  }

  // Ensure main wrapper allows scrolling with 100dvh
  const wrapperOld = `className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"`;
  const wrapperNew = `className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 sm:p-6"`;
  if (content.includes(wrapperOld)) {
    content = content.replace(wrapperOld, wrapperNew);
  }
  
  // same for without sm:p-6
  const wrapperOld2 = `className="fixed inset-0 z-50 flex items-center justify-center p-4"`;
  const wrapperNew2 = `className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"`;
  if (content.includes(wrapperOld2)) {
    content = content.replace(wrapperOld2, wrapperNew2);
  }

  fs.writeFileSync(modal, content);
}
console.log("Patched modals for mobile.");
