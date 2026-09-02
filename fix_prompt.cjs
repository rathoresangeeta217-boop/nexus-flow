const fs = require('fs');
const file = 'src/components/DispatchView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `<p className="text-sm text-slate-600 mb-4">
                  The remaining payment for this order is not zero. You must provide a reason for creating a Challan, which will be sent to the admin.
                </p>`,
  `<p className="text-sm text-slate-600 mb-4">
                  {order.details?.challanApprovalStatus === 'Rejected' 
                    ? "Your previous challan request was rejected by the admin. Please provide a new reason to resubmit for approval."
                    : "The remaining payment for this order is not zero. You must provide a reason for creating a Challan, which will be sent to the admin."}
                </p>`
);

fs.writeFileSync(file, content);
