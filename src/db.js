import Dexie from 'dexie';

export const db = new Dexie('DukaFlowLocal');

// Change pendingSales to sales and map the fields you are querying on
db.version(2).stores({
  products: '_id, name, price, stock', // Local cache of products
  sales: '_id, receiptId, synced, createdAt' // Matches your component calls exactly
});
