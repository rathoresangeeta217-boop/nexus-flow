const fs = require('fs');
let content = fs.readFileSync('src/lib/orders.ts', 'utf8');

const target = `export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const { getUserProfile } = await import('./users');
      const profile = await getUserProfile(user.uid);
      
      const q = query(getOrdersCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        let orders = snapshot.docs.map(doc => ({
          ...doc.data(),
          // Use firestore id as the backup if id is missing
          id: doc.data().id || doc.id,
          docId: doc.id
        })) as Order[];
        
        // Filter orders for sales executives and employees
        if (profile && (profile.role === 'sales_executive' || profile.role === 'employee')) {
          const profileName = (profile.displayName || '').toLowerCase().trim();
          
          orders = orders.filter(order => {
            const empName = (order.details?.employeeName || '').toLowerCase().trim();
            if (!empName) return false;
            
            const empFirstName = empName.split(' ')[0];
            const profileFirstName = profileName.split(' ')[0];
            
            return empName === profileName ||
                   profileName.includes(empName) ||
                   empName.includes(profileName) ||
                  (empFirstName && profileFirstName && empFirstName === profileFirstName);
          });
        }
        
        callback(orders);
      }, (error) => {
        console.error("Error fetching orders:", error);
      });
    } else {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      callback([]);
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};`;

const replacement = `let globalOrdersCache: Order[] = [];
let isSubscribed = false;
let globalUnsubscribeSnapshot: (() => void) | null = null;
let globalUnsubscribeAuth: (() => void) | null = null;
const orderListeners = new Set<(orders: Order[]) => void>();

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  orderListeners.add(callback);
  
  if (isSubscribed) {
    callback(globalOrdersCache);
  } else {
    isSubscribed = true;
    
    globalUnsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile: any = null;
        try {
            const { getUserProfile } = await import('./users');
            profile = await getUserProfile(user.uid);
        } catch (e) {
            console.error('Error fetching profile for orders:', e);
            const isAdmin = user.email === 'marketing.srkmodular@gmail.com' || user.email === 'rathoresangeeta217@gmail.com';
            profile = { role: isAdmin ? 'super_admin' : 'employee', displayName: user.displayName || 'Unknown User' };
        }
        
        const q = query(getOrdersCollection(), orderBy('createdAt', 'desc'));
        globalUnsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          let orders = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.data().id || doc.id,
            docId: doc.id
          })) as Order[];
          
          if (profile && (profile.role === 'sales_executive' || profile.role === 'employee')) {
            const profileName = (profile.displayName || '').toLowerCase().trim();
            orders = orders.filter(order => {
              const empName = (order.details?.employeeName || '').toLowerCase().trim();
              if (!empName) return false;
              
              const empFirstName = empName.split(' ')[0];
              const profileFirstName = profileName.split(' ')[0];
              
              return empName === profileName ||
                     profileName.includes(empName) ||
                     empName.includes(profileName) ||
                    (empFirstName && profileFirstName && empFirstName === profileFirstName);
            });
          }
          
          globalOrdersCache = orders;
          orderListeners.forEach(cb => cb(globalOrdersCache));
        }, (error) => {
          console.error("Error fetching orders:", error);
        });
      } else {
        if (globalUnsubscribeSnapshot) {
          globalUnsubscribeSnapshot();
          globalUnsubscribeSnapshot = null;
        }
        globalOrdersCache = [];
        orderListeners.forEach(cb => cb([]));
      }
    });
  }

  return () => {
    orderListeners.delete(callback);
    if (orderListeners.size === 0) {
      if (globalUnsubscribeSnapshot) {
        globalUnsubscribeSnapshot();
        globalUnsubscribeSnapshot = null;
      }
      if (globalUnsubscribeAuth) {
        globalUnsubscribeAuth();
        globalUnsubscribeAuth = null;
      }
      isSubscribed = false;
      globalOrdersCache = [];
    }
  };
};`;

content = content.replace(target, replacement);
fs.writeFileSync('src/lib/orders.ts', content);
console.log("Patched orders.ts");
