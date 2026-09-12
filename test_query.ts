import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function check() {
  const snapshot = await getDocs(collection(db, 'orders'));
  console.log("Orders count:", snapshot.size);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("Order ID:", data.id, "Doc ID:", doc.id, "Customer:", data.customer, "Amount:", data.amount);
  });
  
  const pSnapshot = await getDocs(collection(db, 'payments'));
  console.log("Payments count:", pSnapshot.size);
  pSnapshot.forEach(doc => {
    const data = doc.data();
    console.log("Payment orderId:", data.orderId, "GrandTotal:", data.grandTotal);
  });
  process.exit(0);
}
check();
