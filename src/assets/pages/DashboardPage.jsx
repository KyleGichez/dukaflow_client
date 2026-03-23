import React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import "../styles/DashboardPage.css";
import { db } from "../../../src/db.js";
import api from "../../../src/api/axios";

const DashboardPage = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // 3. Calculate days left (only if user exists)
  const daysLeft = user?.trialEndDate
    ? Math.ceil(
        (new Date(user.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("today");
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalItemsSold: 0,
    totalTransactions: 0,
    totalStockValue: 0,
    paymentBreakdown: {},
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Track online status

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Step A: Load everything from local Dexie DB IMMEDIATELY
      const cachedProducts = await db.products.toArray();
      const cachedOnlineSales = db.cachedSales ? await db.cachedSales.toArray() : [];
      const pendingSales = await db.offlineSales.toArray();

      // Show cached data so the dashboard isn't empty while waiting for API
      setProducts(cachedProducts);
      setSales([...cachedOnlineSales, ...pendingSales]);

      // Step B: If online, fetch fresh data and update the cache
      if (navigator.onLine) {
        const [salesRes, prodRes] = await Promise.all([
          api.get(`/sales?range=${filter}`),
          api.get(`/products`),
        ]);

        // Format products to match your "item/qty" schema in IndexedDB
        const formattedProducts = prodRes.data.map((p) => ({
          _id: p._id,
          item: p.name || p.item,
          category: p.category || "Unconfirmed",
          qty: p.quantity || p.qty,
          units: p.units,
          price: p.price,
        }));

        setProducts(formattedProducts);
        setSales([...salesRes.data, ...pendingSales]);

        // Update Dexie Caches for next offline session
        if (db.cachedSales && db.products) {
          await db.cachedSales.clear();
          await db.cachedSales.bulkPut(salesRes.data);
          await db.products.clear();
          await db.products.bulkPut(formattedProducts);
        }
      }
    } catch (error) {
      console.error("Sync error, staying in offline mode:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Monitor Online/Offline Status
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserName(userData.FName || "User");
    }
    loadDashboard();
  }, [loadDashboard]);

  const useOfflineSync = () => {
    useEffect(() => {
      const handleSync = async () => {
        if (navigator.onLine) {
          const offlineSales = await db.offlineSales.toArray();

          if (offlineSales.length > 0) {
            console.log("Syncing offline sales to cloud...");
            try {
              const token = localStorage.getItem("token");

              // Push each sale to your Render API
              for (const sale of offlineSales) {
                await axios.post(
                  "https://dukaflow-server.onrender.com/api/sales",
                  sale,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                // Remove from phone once successfully uploaded
                await db.offlineSales.delete(sale.id);
              }

              console.log("Sync Complete!");
            } catch (err) {
              console.error("Sync failed, will retry later.");
            }
          }
        }
      };

      // Listen for the browser coming back online
      window.addEventListener("online", handleSync);
      // Also try to sync when the app first loads
      handleSync();

      return () => window.removeEventListener("online", handleSync);
    }, []);
  };

  // Create a displaySummary that works even when navigator.onLine is false
  const displaySummary = useMemo(() => {
    return {
      totalRevenue: sales.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
      totalTransactions: sales.length,
      totalItemsSold: sales.reduce((acc, curr) => acc + (Number(curr.quantitySold) || 0), 0),
      totalStockValue: products.reduce((acc, p) => acc + (Number(p.qty || 0) * Number(p.price || 0)), 0),
      paymentBreakdown: {
        Cash: sales.filter((s) => s.paymentMethod === "Cash").reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
        "M-pesa": sales.filter((s) => s.paymentMethod === "M-pesa").reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
      },
    };
  }, [sales, products]);

  const allCategories = [...new Set(products.map((p) => p.category))].length;
  const productsRemaining = products.filter((p) => p.qty > 0).length;
  const lowStockCount = products.filter((p) => p.qty > 0 && p.qty <= 5).length;

  const uniqueCategories = [...new Set(products.map((p) => p.category))];
  const emptyCategories = uniqueCategories.filter((cat) =>
    products.filter((p) => p.category === cat).every((p) => p.qty === 0)
  ).length;

  const unconfirmedItemsCount = products.filter(
    (p) => !p.category || p.category.toLowerCase() === "unconfirmed"
  ).length;

  const topSellingItems = Object.values(
    sales.reduce((acc, sale) => {
      // Handle both populated API data and flat offline data
      const name = sale.productId?.name || sale.productName || "Unknown Item";
      const units = sale.productId?.units || sale.units || "";

      if (!acc[name]) {
        acc[name] = { name, totalSold: 0, units: units };
      }

      acc[name].totalSold += Number(sale.quantitySold || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.totalSold - a.totalSold) // Sort by highest volume
    .slice(0, 4); // Take top 4

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="w-[100%]">
        <div className="w-[70%] mx-auto flex gap-[20px]">
          <div className="reportPage-content-wrapper-menu">
            <div className="reportPage-content-menu">
              <ul>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="dashicons:products" width="20" height="20" />
                  </span>
                  <a href="/products">Products</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="lsicon:management-stockout-filled"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/stock">Stock</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>
                  <a href="/sales">Sales</a>
                </li>
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="garden:file-spreadsheet-fill-12"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/summary">Reports</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="reportPage-content-info">
            <div className="grid grid-cols-4 gap-6 mb-[20px]">
              {loading ? (
                // Show 8 skeleton cards if loading
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="summary-card skeleton skeleton-card"
                    ></div>
                  ))
              ) : (
                // Show actual data when ready
                <>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Total Revenue</h2>
                    <p className="py-[10px]">
                      Ksh {summary.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Items Sold</h2>
                    <p className="py-[10px]">
                      Ksh {summary.totalItemsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">All Transactions</h2>
                    <p className="py-[10px]">
                      Ksh {summary.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Cash Sales</h2>
                    <p className="py-[10px]">
                      Ksh{" "}
                      {Number(
                        summary?.paymentBreakdown?.["Cash"] || 0
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">M-pesa Sales</h2>
                    <p className="py-[10px]">
                      Ksh{" "}
                      {Number(
                        summary?.paymentBreakdown?.["M-pesa"] || 0
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Bank-Transfer</h2>
                    <p className="py-[10px]">
                      Ksh{" "}
                      {Number(
                        summary?.paymentBreakdown?.["Bank-Transfer"] || 0
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Stock Value</h2>
                    <p className="py-[10px]">
                      Ksh{" "}
                      {Number(summary?.totalStockValue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h2 className="font-bold uppercase">Date Today</h2>
                    <p className="py-[10px]">{getTodaysDate()}</p>
                  </div>
                </>
              )}
            </div>
            <div className="reportPage-table">
              <h3 className="font-bold uppercase mb-[20px]">Sales Summary</h3>
              <div className="reports-table">
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Item Sold</th>
                      <th className="py-2 px-3">Quantity Sold</th>
                      <th className="py-2 px-3">Total Price(Ksh)</th>
                      <th className="py-2 px-3">Payment Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? // Show 5 skeleton rows if loading
                        Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <tr key={i}>
                              <td colSpan="6" className="py-2">
                                <div className="skeleton skeleton-row"></div>
                              </td>
                            </tr>
                          ))
                      : sales.map((sale, index) => (
                          <tr key={sale._id}>
                            <th className="py-2 px-3" scope="row">
                              {index + 1}
                            </th>
                            <td className="py-3 px-3">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 capitalize">
                              {sale.productId?.name || "N/A"}
                            </td>
                            <td className="py-3 px-3">
                              {sale.quantitySold} {sale.productId?.units}
                            </td>
                            <td className="py-3 px-3">
                              Ksh {sale.totalPrice?.toLocaleString()}
                            </td>
                            <td className="py-3 px-3">{sale.paymentMethod}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {user && daysLeft > 0 && daysLeft <= 3 && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4">
          Your free trial ends in {daysLeft} days. Upgrade now to avoid
          interruption!
        </div>
      )}
      <div className="dashboard-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">
          Dashboard{" "}
          {isOnline ? (
            <span className="text-green-500 text-xs text-none">● Online</span>
          ) : (
            <span className="text-gray-400 text-xs">● Offline</span>
          )}
        </h1>
        <h2 className="mb-[20px]">
          Welcome back, <strong className="capitalize">{userName}</strong>
        </h2>
        <div className="dashboard-content-wrapper flex justify-between gap-[20px]">
          <div className="dashboard-content-wrapper-menu">
            <div className="dashboard-content-menu">
              <ul>
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="dashicons:products" width="20" height="20" />
                  </span>
                  <a href="/products">Products</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="lsicon:management-stockout-filled"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/stock">Stock</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>
                  <a href="/sales">Sales</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="garden:file-spreadsheet-fill-12"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/summary">Reports</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="/staff">Staff</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="si:add-fill" width="24" height="24" />
                  </span>
                  <a href="/subscription">Subscription</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="dashboard-content-wrapper-info">
            <div className="dashboard-content-stats-cards flex gap-[20px] mb-[30px]">
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Today's Sales</h3>
                  <p>Ksh {displaySummary.totalRevenue.toLocaleString()}</p>
                  <p>{displaySummary.totalItemsSold} items sold</p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Total Products</h3>
                  <p>{products.length} products</p>
                  <p>{allCategories} categories</p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Available Stock</h3>
                  <p>{productsRemaining} products remaining</p>
                  <p>{emptyCategories} categories empty</p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Stock Value</h3>
                  <p>
                    Ksh {displaySummary.totalStockValue.toLocaleString() || 0}
                  </p>
                  <p>Date: {getTodaysDate()}</p>
                </div>
              </div>
            </div>
            <div className="dashboard-product-details">
              <div className="flex gap-[20px] mb-[30px] dashboard-product-detail">
                <div className="dashboard-product-stats-left">
                  <h4 className="font-bold uppercase">Product Details</h4>
                  <p className="flex justify-between my-2">
                    <span>
                      <a
                        href="/products?filter=low-stock"
                        className="text-red-700"
                      >
                        Low Stock Items
                      </a>
                    </span>
                    <span className="text-red-700">
                      {lowStockCount.toLocaleString()}
                    </span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span>
                      <a href="/stock">All Categories</a>
                    </span>
                    <span>{allCategories}</span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span>
                      <a href="/products" className="text-green-700">
                        All Items
                      </a>
                    </span>
                    <span className="text-green-700">
                      {products
                        .reduce((sum, p) => sum + (p.qty || 0), 0)
                        .toLocaleString()}
                    </span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span>
                      <a
                        href="/products?category=Unconfirmed"
                        className="text-orange-700"
                      >
                        Unconfirmed Items
                      </a>
                    </span>
                    <span className="text-orange-700">
                      {unconfirmedItemsCount.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="dashboard-product-stats-right">
                  <h4 className="font-bold uppercase">Top Selling Items</h4>
                  <div className="dashboard-product-stat">
                    <ul>
                      {topSellingItems.length > 0 ? (
                        topSellingItems.map((item, index) => (
                          <li key={index} className="flex justify-between my-2">
                            <span className="capitalize">{item.name}</span>
                            <span className="font-normal">
                              {item.totalSold.toLocaleString()} {item.units}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">
                          No sales recorded today
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="dashboard-product-sales">
                <h5 className="font-bold uppercase flex items-center justify-between">
                  Sales Summary
                  <span>
                    <label htmlFor="sales-made"></label>
                    <select
                      name="sales-made"
                      id="sales-made"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="today">Today</option>
                      <option value="this-week">This Week</option>
                      <option value="this-month">This Month</option>
                      <option value="all-time">All Time</option>
                    </select>
                  </span>
                </h5>
                <div className="sales-table">
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Item Sold</th>
                        <th className="py-2 px-3">Quantity Sold</th>
                        <th className="py-2 px-3">Total Price(Ksh)</th>
                        <th className="py-2 px-3">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.length > 0 ? (
                        recentSales.map((sale, index) => (
                          <tr key={sale._id}>
                            <th className="py-2 px-3">{index + 1}</th>
                            <td className="py-2 px-3">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 capitalize">
                              {sale.productId?.name ||
                                sale.productName ||
                                "New Sale"}
                            </td>
                            <td className="py-2 px-3">
                              {sale.quantitySold}{" "}
                              {sale.productId?.units || sale.units || ""}
                            </td>
                            <td className="py-2 px-3">
                              Ksh {sale.totalPrice?.toLocaleString()}
                            </td>
                            <td className="py-2 px-3">{sale.paymentMethod}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-3 py-2 text-center">
                            No recent sales found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-right">
                  <a
                    href="/sales"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    View All Sales →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
