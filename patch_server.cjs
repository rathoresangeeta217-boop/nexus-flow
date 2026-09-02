const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf-8');

const seedEndpoint = `
  app.post("/api/seed-users", async (req, res) => {
    try {
      const config = require('./firebase-applet-config.json');
      const apiKey = config.apiKey;
      const projectId = config.projectId;
      const databaseId = config.firestoreDatabaseId;

      const users = [
        { name: "Anshuman Singh", email: "anshuman@srkmodular.com", password: "Anshu9785", role: "super_admin" },
        { name: "Bhawna Khandelwal", email: "bmethi@srkmodular.com", password: "bmethi@71718", role: "super_admin" },
        { name: "Nidhi Sharma", email: "nidhi@srkmodular.com", password: "nidhi@5209", role: "admin" },
        { name: "Khushboo", email: "khushboo@srkmodular.com", password: "khushboo@5128", role: "sales_executive" },
        { name: "Abhilasha Verma", email: "abhilasha@srkmodular.com", password: "abhilasha@6462", role: "sales_executive" },
        { name: "Deepak Khandelwal", email: "deepak@srkmodular.com", password: "Deepak@123*", role: "super_admin" }
      ];

      const results = [];

      for (const user of users) {
        let uid, idToken;
        
        let fetchRes = await fetch(\`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=\${apiKey}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
        });
        
        let data = await fetchRes.json();
        
        if (data.error && data.error.message === 'EMAIL_EXISTS') {
          fetchRes = await fetch(\`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=\${apiKey}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
          });
          data = await fetchRes.json();
        }
        
        if (data.error) {
          results.push({ email: user.email, status: 'error', error: data.error.message });
          continue;
        }
        
        uid = data.localId;
        idToken = data.idToken;

        await fetch(\`https://identitytoolkit.googleapis.com/v1/accounts:update?key=\${apiKey}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, displayName: user.name, returnSecureToken: false })
        });

        const firestoreUrl = \`https://firestore.googleapis.com/v1/projects/\${projectId}/databases/\${databaseId}/documents/users/\${uid}\`;
        const docData = {
          fields: {
            uid: { stringValue: uid },
            email: { stringValue: user.email },
            displayName: { stringValue: user.name },
            role: { stringValue: user.role },
            isActive: { booleanValue: true },
            createdAt: { timestampValue: new Date().toISOString() },
            updatedAt: { timestampValue: new Date().toISOString() }
          }
        };
        
        await fetch(firestoreUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${idToken}\`
          },
          body: JSON.stringify(docData)
        });
        
        results.push({ email: user.email, status: 'success' });
      }
      
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
`;

content = content.replace(
  'app.post("/api/visual-match", async (req, res) => {',
  seedEndpoint + '\n\n  app.post("/api/visual-match", async (req, res) => {'
);

fs.writeFileSync(file, content);
