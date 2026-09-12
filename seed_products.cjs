const fs = require('fs');

async function seed() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId;

  const products = [
    { name: 'ErgoPro Standing Desk', category: "Workstation's", salesRate: 14500, specification: 'Electric height adjustable standing desk with memory presets.' },
    { name: 'L-Shaped Corner Workstation', category: "Workstation's", salesRate: 22000, specification: 'Spacious L-shaped desk with built-in cable management and storage.' },
    { name: 'Compact Office Pod', category: "Workstation's", salesRate: 35000, specification: 'Acoustic privacy pod with integrated desk and ventilation.' },
    { name: 'Collaborative Bench Desk', category: "Workstation's", salesRate: 28000, specification: '2-person bench desk with acoustic divider screen.' },
    { name: 'Executive Home Office Desk', category: "Workstation's", salesRate: 18500, specification: 'Premium engineered wood desk with drawer pedestal.' }
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const docId = 'seed_ws_' + Date.now() + '_' + i;
    const url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/' + databaseId + '/documents/products/' + docId;
    
    const docData = {
      fields: {
        id: { stringValue: docId },
        name: { stringValue: p.name },
        category: { stringValue: p.category },
        salesRate: { integerValue: p.salesRate },
        specification: { stringValue: p.specification },
        createdAt: { timestampValue: new Date().toISOString() },
        isActive: { booleanValue: true }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    console.log('Seeded ' + p.name + ': ' + res.status);
  }
}

seed().catch(console.error);
