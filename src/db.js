// db.js
import Dexie from "dexie";

export const db = new Dexie("DukaflowDB");

db.version(9).stores({
  products: "_id, name, price, quantity, units, category", 
  stock: "_id, date, name, price, quantity, units, category", 
  sales: "_id, date, amount, productId, totalPrice, paymentMethod, isOffline", // Must match your component call
  offlineSales: "++id, date, productId, productName, quantitySold, totalPrice, paymentMethod, units",
  summary: "id, totalRevenue, totalItemsSold, totalTransactions, totalStockValue", 
  cachedSales: "_id, date, totalPrice, paymentMethod"
});