const fs = require('fs');
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf-8');

if (!content.includes("import { saveOrder } from '../lib/orders';")) {
  content = content.replace(
    "import { getPaymentForOrder, PaymentRecord } from '../lib/payments';",
    "import { getPaymentForOrder, PaymentRecord } from '../lib/payments';\nimport { saveOrder } from '../lib/orders';"
  );
  content = content.replace(
    "import { Clock, TrendingUp } from 'lucide-react';",
    "import { Clock, TrendingUp, Edit2, Check } from 'lucide-react';"
  );
}

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched imports");
