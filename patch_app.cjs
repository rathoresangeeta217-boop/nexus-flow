const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "import { AdminApprovalView } from './components/AdminApprovalView';",
  "import { AdminApprovalView } from './components/AdminApprovalView';\nimport { useAuth } from './contexts/AuthContext';\nimport { AuthView } from './components/AuthView';\nimport { UsersTab } from './tabs/UsersTab';"
);

content = content.replace(
  "export default function App() {",
  "export default function App() {\n  const { user, profile, loading } = useAuth();"
);

content = content.replace(
  "if (approvalOrderId) {",
  "if (loading) { return null; }\n\n  if (!user || !profile || !profile.isActive) {\n    return <AuthView />;\n  }\n\n  if (approvalOrderId) {"
);

content = content.replace(
  "{activeTab === 'Analytics' && <AnalyticsTab />}",
  "{activeTab === 'Analytics' && <AnalyticsTab />}\n            {activeTab === 'Users' as any && <UsersTab />}"
);

fs.writeFileSync(file, content);
