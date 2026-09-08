const fs = require('fs');
const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldSelectTarget = `            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="New">New Order</option>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
              <option value="Scheduled Dispatched">Scheduled Dispatched</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>`;

const newSelectReplacement = `            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="New Order">New Order</option>
              <option value="Purchase">Purchase</option>
              <option value="Production">Production</option>
              <option value="Scheduled Dispatched">Scheduled Dispatched</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Installation Scheduled">Installation Scheduled</option>
              <option value="Installation Complete">Installation Complete</option>
            </select>`;

if (content.includes(oldSelectTarget)) {
  content = content.replace(oldSelectTarget, newSelectReplacement);
  console.log("Updated dropdown.");
} else {
  console.log("Could not find dropdown block.");
}

// Update the filter logic to handle legacy 'New' status as 'New Order'
const filterTarget = `    if (statusFilter !== 'all' && order.status !== statusFilter) return false;`;
const filterReplacement = `    if (statusFilter !== 'all') {
      if (statusFilter === 'New Order' && (order.status === 'New Order' || order.status === 'New')) {
        // match legacy
      } else if (order.status !== statusFilter) {
        return false;
      }
    }`;

if (content.includes(filterTarget)) {
  content = content.replace(filterTarget, filterReplacement);
  console.log("Updated filter logic.");
}

// Update the Badge logic in the table
const oldBadgeTarget = `                    <Badge variant={
                      order.status === 'Completed' ? 'success' : 
                      order.status === 'Processing' ? 'info' :
                      order.status === 'Scheduled Dispatched' ? 'indigo' :
                      order.status === 'Dispatched' ? 'success' : 
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
  console.log("Updated badge logic.");
} else {
  console.log("Could not find badge target");
}

// Update new order creation
const newOrderTarget = `status: 'New',`;
const newOrderReplacement = `status: 'New Order',`;
if (content.includes(newOrderTarget)) {
    content = content.replace(newOrderTarget, newOrderReplacement);
}


fs.writeFileSync(path, content);
