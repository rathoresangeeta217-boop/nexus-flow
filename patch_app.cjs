const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The file might be compressed into one line. 
// We will replace the block from "useEffect(() => {" up to "}, [activeTab]);" with the correct order.

const targetRegex = /useEffect\(\(\) => \{[^}]+const params = new URLSearchParams[^}]+qId[^}]+aId[^}]+}, \[\]\);.*?if \(loading\) \{ return null; \}.*?if \(!user \|\| !profile \|\| !profile\.isActive\) \{.*?return <AuthView \/>;.*?\}.*?if \(approvalOrderId\) \{.*?return <AdminApprovalView orderId=\{approvalOrderId\} \/>;.*?\}.*?\/\/ Reset search query when changing tabs.*?useEffect\(\(\) => \{.*?setSearchQuery\(''\);.*?\}, \[activeTab\]\);/;

const replacement = `  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quoteId');
    const aId = params.get('approveChallan');
    if (qId) {
      setQuoteId(qId);
    }
    if (aId) {
      setApprovalOrderId(aId);
    }
  }, []);

  // Reset search query when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  if (loading) { return null; }

  if (!user || !profile || !profile.isActive) {
    return <AuthView />;
  }

  if (approvalOrderId) {
    return <AdminApprovalView orderId={approvalOrderId} />;
  }
`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync(file, content);
