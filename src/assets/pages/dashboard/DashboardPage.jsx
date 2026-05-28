import React from "react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import "../../styles/DashboardPage.css";
import { db } from "../../../db.js";
import api from "../../../api/axios";

const DashboardPage = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // Check if user is Admin
  const isAdmin = user?.role === "admin";

  // 3. Calculate days left (only if user exists)
  const daysLeft = user?.trialEndDate
    ? Math.ceil(
        (new Date(user.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  {
    user && daysLeft > 0 && daysLeft <= 3 && (
      <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4">
        Your free trial ends in {daysLeft} days. Upgrade now to avoid
        interruption!
      </div>
    );
  }

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

  // 1. Memoized Fetch Function (allows for manual refresh)
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, salesRes, prodRes] = await Promise.all([
        api.get(`/sales/summary?range=${filter}`),
        api.get(`/sales?range=${filter}`),
        api.get(`/products`),
      ]);

      // Update states with real data from backend
      setSummary(summaryRes.data);
      setSales(salesRes.data);

      const formattedProducts = prodRes.data.map((p) => ({
        id: p._id,
        item: p.name,
        category: p.category || "Unconfirmed",
        qty: p.quantity,
        units: p.units,
        price: p.price,
      }));
      setProducts(formattedProducts);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
      // Fallback to empty state on error to prevent UI crash
      setSummary({
        totalRevenue: 0,
        totalItemsSold: 0,
        totalTransactions: 0,
        totalStockValue: 0,
        paymentBreakdown: {},
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserName(userData.FName || "User");
    }
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserName(userData.fname || "User");
    }
  });

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

  // --- Derived Calculations ---
  const allCategories = [...new Set(products.map((p) => p.category))].length;
  const productsRemaining = products.filter((p) => p.qty > 0).length;
  const lowStockCount = products.filter((p) => p.qty > 0 && p.qty <= 20).length;

  const uniqueCategories = [...new Set(products.map((p) => p.category))];
  const emptyCategories = uniqueCategories.filter((cat) =>
    products.filter((p) => p.category === cat).every((p) => p.qty === 0)
  ).length;

  const unconfirmedItemsCount = products.filter(
    (p) => !p.category || p.category.toLowerCase() === "unconfirmed"
  ).length;

  const topSellingCategories = Object.values(
    sales.reduce((acc, sale) => {
      const category = sale.productId?.category || "Uncategorized";

      if (!acc[category]) {
        acc[category] = {
          category,
          totalSold: 0,
        };
      }

      acc[category].totalSold += sale.quantitySold || 0;

      return acc;
    }, {})
  )
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 4);

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-content">
          <h1 className="text-2xl font-bold uppercase mb-[20px]">Dashboard</h1>
          <h2 className="mb-[20px] flex items-center gap-2">
            Welcome back, <div className="skeleton h-6 w-32 rounded"></div>
          </h2>

          <div className="dashboard-content-wrapper flex justify-between gap-[20px]">
            {/* Sidebar Skeleton */}
            <div className="dashboard-content-wrapper-menu">
              <div className="dashboard-content-menu">
                <ul className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <li key={i} className="flex items-center gap-[10px] p-2">
                      <div className="skeleton h-6 w-6 rounded"></div>
                      <div className="skeleton h-4 w-24 rounded"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="dashboard-content-wrapper-info">
              {/* Top 4 Stats Cards */}
              <div className="dashboard-content-stats-cards flex gap-[20px] mb-[30px]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="content-stats-card flex-1">
                    <div className="content-stat-card p-4 bg-white rounded shadow-sm">
                      <div className="skeleton h-3 w-3/4 mb-3 rounded"></div>
                      <div className="skeleton h-6 w-1/2 mb-2 rounded"></div>
                      <div className="skeleton h-3 w-2/3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Details & Top Selling Section */}
              <div className="dashboard-product-details">
                <div className="flex gap-[20px] mb-[30px] dashboard-product-detail">
                  {/* Left side stats list */}
                  <div className="dashboard-product-stats-left flex-1 p-4 bg-white rounded shadow-sm">
                    <div className="skeleton h-4 w-1/2 mb-4 rounded"></div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between my-4">
                        <div className="skeleton h-3 w-1/3 rounded"></div>
                        <div className="skeleton h-3 w-10 rounded"></div>
                      </div>
                    ))}
                  </div>

                  {/* Right side Top Selling list */}
                  <div className="dashboard-product-stats-right flex-1 p-4 bg-white rounded shadow-sm">
                    <div className="skeleton h-4 w-1/2 mb-4 rounded"></div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between my-4">
                        <div className="skeleton h-3 w-1/2 rounded"></div>
                        <div className="skeleton h-3 w-12 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales Table Skeleton */}
                <div className="dashboard-product-sales mb-[30px] p-4 bg-white rounded shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="skeleton h-5 w-40 rounded"></div>
                    <div className="skeleton h-8 w-24 rounded"></div>
                  </div>
                  <div className="sales-table">
                    <table className="table-auto w-full">
                      <thead>
                        <tr>
                          {[...Array(6)].map((_, i) => (
                            <th key={i} className="py-2 px-3">
                              <div className="skeleton h-4 w-16 rounded"></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(5)].map((_, i) => (
                          <tr key={i} className="border-b">
                            {[...Array(6)].map((_, j) => (
                              <td key={j} className="py-4 px-3">
                                <div className="skeleton h-3 w-full rounded"></div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Dashboard</h1>
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
                {isAdmin && (
                  <>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span>
                        <Icon icon="fa:users" width="24" height="24" />
                      </span>
                      <a href="/staff">Staff</a>
                    </li>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span>
                        <Icon icon="ri:heart-add-fill" width="24" height="24" />
                      </span>
                      <a href="/subscription">Subscription</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="dashboard-content-wrapper-info">
            <div className="dashboard-content-stats-cards flex flex-wrap gap-[20px] mb-[30px]">
              <div className="content-stats-card flex-1">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Total Revenue</h3>
                  <p className="">
                    KES {summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Profit / 7 days</h3>
                  <p className="">KES 790,696</p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Avg Daily Profit</h3>
                  <p className="">KES 320,670</p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Total Expenses</h3>
                  <p className=""> KES 405,270</p>
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
                  <p>KES {summary.totalStockValue.toLocaleString()}</p>
                  <p>{summary.totalItemsSold || 0} Items Sold</p>
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
                        .reduce((sum, p) => sum + p.qty, 0)
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
                      {topSellingCategories.length > 0 ? (
                        topSellingCategories.map((item, index) => (
                          <li key={index} className="flex justify-between my-2">
                            <span className="capitalize">{item.category}</span>

                            <span className="font-normal">
                              {item.totalSold.toLocaleString()} items sold
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
              <div className="dashboard-product-sales mb-[30px]">
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
                              {sale.productId?.name || "Deleted Product"}
                            </td>
                            <td className="py-2 px-3">
                              {sale.quantitySold} {sale.productId?.units}
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
