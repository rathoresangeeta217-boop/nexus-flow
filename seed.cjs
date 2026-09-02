const fs = require('fs');

async function seed() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
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

  for (const user of users) {
    console.log(`Processing ${user.email}...`);
    let uid, idToken;
    
    // 1. Try to create the user
    let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
    });
    
    let data = await res.json();
    if (data.error && data.error.message === 'EMAIL_EXISTS') {
      console.log(`User ${user.email} exists, logging in...`);
      res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
      });
      data = await res.json();
    }
    
    if (data.error) {
      console.error("Error with auth:", data.error.message);
      // Might be that identity toolkit is not enabled for email/password.
      continue;
    }
    
    uid = data.localId;
    idToken = data.idToken;
    console.log(`UID: ${uid}`);

    // 2. Set display name
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, displayName: user.name, returnSecureToken: false })
    });

    // 3. Write profile to Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
    
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
    
    const fsRes = await fetch(firestoreUrl, {
      method: 'PATCH', // PATCH with no updateMask will create or overwrite
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(docData)
    });
    
    const fsData = await fsRes.json();
    if (fsData.error) {
      console.error("Error writing to Firestore:", fsData.error);
    } else {
      console.log(`Profile written to Firestore for ${user.email}`);
    }
  }
}

seed().catch(console.error);
