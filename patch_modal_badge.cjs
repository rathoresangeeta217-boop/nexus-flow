const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBadgeTarget = `                    <Badge variant={
                      order.status === 'Completed' ? 'success' : 
                      order.status === 'Processing' ? 'info' : 
                      order.status === 'New' ? 'purple' : 
                      order.status === 'Cancelled' ? 'error' : 'warning'
                    }>
                      {order.status}
                    </Badge>`;

const newBadgeReplacement = `                    <Badge variant={
                      order.status === 'Installation Complete' ? 'success' : 
                      order.status === 'Installation Scheduled' ? 'info' :
                      order.status === 'Dispatched' ? 'success' : 
                      order.status === 'Scheduled Dispatched' ? 'indigo' :
                      order.status === 'Production' ? 'warning' :
                      order.status === 'Purchase' ? 'purple' :
                      (order.status === 'New Order' || order.status === 'New') ? 'default' : 'default'
                    }>
                      {order.status === 'New' ? 'New Order' : order.status}
                    </Badge>`;

if (content.includes(oldBadgeTarget)) {
  content = content.replace(oldBadgeTarget, newBadgeReplacement);
  fs.writeFileSync(path, content);
  console.log("Updated modal badge.");
} else {
  console.log("Could not find modal badge.");
}
