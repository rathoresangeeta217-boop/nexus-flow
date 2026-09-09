const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'ai-studio-nexusflowenterpr-71986131-a5cc-4eb8-8637-e19c6c912d2c'
});

const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snap = await usersRef.get();
  console.log("Users:", snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));

  const ordersRef = db.collection('orders');
  const snap2 = await ordersRef.get();
  console.log("Orders:", snap2.size);
  // snap2.forEach(doc => console.log(doc.id, doc.data()));
}
run();
