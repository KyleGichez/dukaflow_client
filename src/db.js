import Dexie from 'dexie';

export const db = new Dexie('DukaFlowLocal');
db.version(1).stores({
  products: '_id, name, price, stock', // Local cache of products
  pendingSales: '++id, items, total, createdAt' // Sales made while offline
});

const syncOfflineSales = async () => {
    const offlineSales = await db.pendingSales.toArray();
    
    if (offlineSales.length > 0 && navigator.onLine) {
      try {
        for (const sale of offlineSales) {
          await axios.post('https://dukaflow-server.onrender.com/api/sales', sale);
          await db.pendingSales.delete(sale.id); // Remove from phone once uploaded
        }
        console.log("Cloud backup complete!");
      } catch (err) {
        console.error("Sync failed, will retry later.");
      }
    }
  };
  
  // Auto-sync when the user comes back online
  window.addEventListener('online', syncOfflineSales);