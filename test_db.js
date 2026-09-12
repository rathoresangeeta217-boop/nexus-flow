import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function check() {
  const snapshot = await db.collection('orders').get();
  console.log("Orders count:", snapshot.size);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("Order ID:", data.id, "Doc ID:", doc.id, "Customer:", data.customer, "Amount:", data.amount);
  });
}
check();
