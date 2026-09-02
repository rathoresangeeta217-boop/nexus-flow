const fs = require('fs');
const file = 'src/tabs/UsersTab.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "if (profile?.role !== 'admin') {",
  "if (profile?.role !== 'super_admin') {"
);

content = content.replace(
  "const handleRoleChange = async (uid: string, newRole: 'admin' | 'employee' | 'viewer') => {",
  "const handleRoleChange = async (uid: string, newRole: 'super_admin' | 'admin' | 'sales_executive' | 'employee' | 'viewer') => {"
);

const roleOptions = `
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="sales_executive">Sales Executive</option>
                      <option value="employee">Employee</option>
                      <option value="viewer">Viewer</option>
`;
content = content.replace(
  /<option value="admin">Admin<\/option>\s*<option value="employee">Employee<\/option>\s*<option value="viewer">Viewer<\/option>/g,
  roleOptions.trim()
);

fs.writeFileSync(file, content);
