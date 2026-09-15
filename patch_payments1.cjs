const fs = require('fs');
let content = fs.readFileSync('src/tabs/PaymentsTab.tsx', 'utf-8');

// 1. Add paymentFilter state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');",
  "const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');\n  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid'>('all');"
);

// 2. Rewrite filteredOrders useMemo
const oldFilteredOrders = `  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.id?.toLowerCase().includes(q) || 
      o.docId?.toLowerCase().includes(q) ||
      o.customer?.toLowerCase().includes(q) ||
      o.project?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);`;

const newFilteredOrders = `  const filteredOrders = useMemo(() => {
    let result = orders;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.id?.toLowerCase().includes(q) || 
        o.docId?.toLowerCase().includes(q) ||
        o.customer?.toLowerCase().includes(q) ||
        o.project?.toLowerCase().includes(q)
      );
    }
    
    if (paymentFilter === 'unpaid') {
      result = result.filter(order => {
        const match = (order.amount || "").toString().match(/\\d[\\d,]*(\\.\\d+)?/);
        const orderAmt = match ? parseFloat(match[0].replace(/,/g, "")) : 0;
        const paymentRecord = customerPayments.find(p => p.orderId === order.id || p.orderId === order.docId);
        
        const parseVal = (str) => {
          if (!str) return 0;
          const strVal = str.toString();
          const matchAmt = strVal.match(/\\d[\\d,]*(\\.\\d+)?/);
          return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
        };

        const parseValWithBase = (str, baseTotal) => {
          if (!str) return 0;
          const strVal = str.toString();
          const pctMatch = strVal.match(/(\\d[\\d,]*(\\.\\d+)?)\\s*%/);
          if (pctMatch && baseTotal > 0) {
            const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
            return (pct / 100) * baseTotal;
          }
          return parseVal(str);
        };

        let calculatedRemaining = orderAmt;
        let displayTotalAmt = orderAmt;
        
        if (paymentRecord) {
          const grandTotal = parseValWithBase(paymentRecord.grandTotal, 0) || orderAmt;
          const transport = parseValWithBase(paymentRecord.transportationCharges || paymentRecord.loadingCharges, grandTotal);
          const install = parseValWithBase(paymentRecord.installationCharges, grandTotal);
          
          displayTotalAmt = grandTotal + transport + install;
          
          let receivedPhasesTotal = 0;
          if (paymentRecord.phases) {
            paymentRecord.phases.forEach(phase => {
              if (phase.status === 'Received') {
                receivedPhasesTotal += parseValWithBase(phase.amount, grandTotal);
              }
            });
          }
          calculatedRemaining = displayTotalAmt - receivedPhasesTotal;
        }
        
        const remainingAmount = Math.max(0, calculatedRemaining);
        
        return displayTotalAmt > 0 && remainingAmount === displayTotalAmt;
      });
    }

    return result;
  }, [orders, searchQuery, customerPayments, paymentFilter]);`;

content = content.replace(oldFilteredOrders, newFilteredOrders);

fs.writeFileSync('src/tabs/PaymentsTab.tsx', content);
console.log("Patched filteredOrders useMemo");
