import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  LayoutDashboard,
  Package,
  Database,
  ShoppingCart,
  BarChart3,
  Users,
  HeartPlus,
  CoinsIcon,
} from "lucide-react";
import "../../styles/DashboardPage.css";
import { db } from "../../../db.js";
import api from "../../../api/axios";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === "admin";

  const navigate = useNavigate();
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Keep track of the actual network status reactively
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Load dashboard data from backend APIs
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, salesRes, prodRes] = await Promise.all([
        api.get(`/sales/summary?range=${filter}`),
        api.get(`/sales?range=${filter}`),
        api.get(`/products`),
      ]);

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

  // Synchronized user data mapping & asset parsing
  useEffect(() => {
    if (user) {
      setUserName(user.FName || user.fname || "User");
    }
    loadDashboard();
  }, [loadDashboard]);

  // Unified background synchronization loop
  useEffect(() => {
    const handleSync = async () => {
      if (!navigator.onLine) return;

      try {
        const offlineSales = await db.sales.toArray();
        if (offlineSales.length > 0) {
          console.log("Syncing offline transactions to backend database...");

          const validBusinessId =
            user?.businessId && user.businessId !== 1 ? user.businessId : null;

          for (const sale of offlineSales) {
            const { _id, id, ...salePayload } = sale;

            try {
              await api.post("/sales", {
                ...salePayload,
                ...(validBusinessId && { businessId: validBusinessId }),
              });

              await db.sales.delete(_id || id);
            } catch (singleSaleError) {
              console.error(
                `Failed to process transaction ID ${_id || id}:`,
                singleSaleError
              );
              if (singleSaleError.response?.status === 401) {
                console.warn(
                  "Session expired during background sync. Aborting queue processing."
                );
                break;
              }
            }
          }
          console.log("Background synchronization passes finished.");
          loadDashboard();
        }
      } catch (err) {
        console.error("Fatal exception tripped worker queue process:", err);
      }
    };

    window.addEventListener("online", handleSync);
    handleSync();

    return () => window.removeEventListener("online", handleSync);
  }, [loadDashboard, user?.businessId]);

  // --- Derived Metrics & Dynamic Data Computations ---
  const totalCreditsAmount = sales
    .filter((s) => s.paymentMethod?.toLowerCase() === "credit")
    .reduce((acc, sale) => acc + Number(sale.balance || 0), 0);

  const displayRevenue =
    summary.totalRevenue ||
    sales.reduce((sum, sale) => sum + Number(sale.totalPrice || 0), 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const running7DaySales = sales.filter((s) => {
    const saleDate = new Date(s.date || s.createdAt);
    return (
      saleDate >= new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
  });

  let base7DaySalesRevenue = 0;
  let dynamic7DayCreditsIssued = 0;

  running7DaySales.forEach((sale) => {
    const total = Number(sale.totalPrice || 0);
    base7DaySalesRevenue += total;
    if (sale.paymentMethod?.toLowerCase() === "credit") {
      dynamic7DayCreditsIssued += Number(sale.balance || 0);
    }
  });

  const profit7Days = Math.max(
    0,
    base7DaySalesRevenue - dynamic7DayCreditsIssued
  );
  const avgDailyProfit = Math.round(profit7Days / 7);

  // Safe category mapping
  const uniqueCategories = [
    ...new Set(products.filter((p) => p && p.category).map((p) => p.category)),
  ];
  const allCategories = uniqueCategories.length;

  const productsRemaining = products.filter(
    (p) => Number(p.qty || 0) > 0
  ).length;
  const lowStockCount = products.filter(
    (p) => Number(p.qty || 0) > 0 && Number(p.qty || 0) <= 20
  ).length;

  const emptyCategories = uniqueCategories.filter((cat) =>
    products
      .filter((p) => p.category === cat)
      .every((p) => Number(p.qty || 0) === 0)
  ).length;

  const unconfirmedItemsCount = products.filter(
    (p) => !p.category || p.category.toLowerCase() === "unconfirmed"
  ).length;

  // Safe Top Selling reduction
  const topSellingItems = Object.values(
    (sales || []).reduce((acc, sale) => {
      if (!sale) return acc;
      const itemName =
        sale.productId?.name ||
        sale.itemName ||
        sale.productName ||
        "Unknown Item";

      const qtySold = Number(
        sale.quantitySold ?? sale.qty ?? sale.quantity ?? 0
      );

      if (!acc[itemName]) {
        acc[itemName] = { name: itemName, totalSold: 0 };
      }
      acc[itemName].totalSold += qtySold;
      return acc;
    }, {})
  )
    .filter((item) => item.totalSold > 0)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 4);

  const recentSales = [...sales]
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    )
    .slice(0, 10);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-content">
          {/* Header */}
          <h1 className="text-2xl font-bold uppercase mb-[20px]">Dashboard</h1>

          <h2 className="mb-[20px] flex items-center gap-2">
            Welcome back,
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
          </h2>

          <div className="dashboard-content-wrapper flex justify-between gap-[20px]">
            {/* Sidebar Skeleton */}
            <div className="dashboard-content-wrapper-menu">
              <div className="dashboard-content-menu">
                <ul className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <li key={i} className="flex items-center gap-3 p-2">
                      <div className="animate-pulse bg-gray-200 h-6 w-6 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-28 rounded"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content-wrapper-info flex-1">
              {/* Stats Cards */}
              <div className="dashboard-content-stats-cards flex flex-wrap gap-[20px] mb-[30px]">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="content-stats-card flex-1 min-w-[220px]"
                  >
                    <div className="content-stat-card p-4 bg-white rounded shadow-sm">
                      <div className="animate-pulse bg-gray-200 h-3 w-24 rounded mb-3"></div>
                      <div className="animate-pulse bg-gray-200 h-7 w-32 rounded mb-2"></div>
                      <div className="animate-pulse bg-gray-200 h-3 w-20 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Details + Top Selling */}
              <div className="flex gap-[20px] mb-[30px] dashboard-product-detail">
                <div className="dashboard-product-stats-left flex-1 bg-white p-4 rounded shadow-sm">
                  <div className="animate-pulse bg-gray-200 h-5 w-40 rounded mb-4"></div>

                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between mb-3">
                      <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-product-stats-right flex-1 bg-white p-4 rounded shadow-sm">
                  <div className="animate-pulse bg-gray-200 h-5 w-40 rounded mb-4"></div>

                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between mb-3">
                      <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales Summary Table */}
              <div className="dashboard-product-sales mb-[30px] bg-white p-4 rounded shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="animate-pulse bg-gray-200 h-5 w-40 rounded"></div>

                  <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-9 gap-4 mb-4">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-300 h-4 rounded"
                    ></div>
                  ))}
                </div>

                {/* Table Rows */}
                {[...Array(8)].map((_, row) => (
                  <div key={row} className="grid grid-cols-9 gap-4 mb-4">
                    {[...Array(9)].map((_, col) => (
                      <div
                        key={col}
                        className="animate-pulse bg-gray-200 h-4 rounded"
                      ></div>
                    ))}
                  </div>
                ))}

                <div className="flex justify-end mt-4">
                  <div className="animate-pulse bg-gray-200 h-4 w-28 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper w-full overflow-hidden max-w-full box-border">
      <div className="dashboard-content w-full p-4 lg:p-6">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Dashboard</h1>
        <h2 className="mb-[20px]">
          Welcome back, <strong className="capitalize">{userName}</strong>
        </h2>
        <div className="dashboard-content-wrapper flex flex-col md:flex-row justify-between gap-[20px] w-full items-start">
          {/* Menu / Sidebar */}
          <div className="dashboard-content-wrapper-menu">
            <div className="dashboard-content-menu">
              <ul>
                <li
                  onClick={() => navigate("/dashboard")}
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <span>
                    <LayoutDashboard width="24" height="24" />
                  </span>
                  Dashboard
                </li>
                <li
                  onClick={() => navigate("/products")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Package width="24" height="24" />
                  </span>
                  Products
                </li>
                <li
                  onClick={() => navigate("/stock")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Database width="24" height="24" />
                  </span>
                  Stock
                </li>
                <li
                  onClick={() => navigate("/sales")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <ShoppingCart width="24" height="24" />
                  </span>
                  Sales
                </li>
                <li
                  onClick={() => navigate("/credit")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>
                  Credit
                </li>
                <li
                  onClick={() => navigate("/invoice")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Receipt height="24" width="24" />
                  </span>
                  Invoices
                </li>
                {isAdmin && (
                  <>
                    <li
                      onClick={() => navigate("/summary")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <BarChart3 width="24" height="24" />
                      </span>
                      Reports
                    </li>
                    <li
                      onClick={() => navigate("/staff")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <Users width="24" height="24" />
                      </span>
                      Staff
                    </li>
                    <li
                      onClick={() => navigate("/subscription")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <HeartPlus width="24" height="24" />
                      </span>
                      Subscription
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          {/* Main Info Blocks */}
          <div className="dashboard-content-wrapper-info flex-1 w-full min-w-0">
            <div className="dashboard-content-stats-cards flex flex-wrap gap-[20px] mb-[30px]">
              <div className="content-stats-card flex-1">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Today's Sales</h3>
                  <p className="font-semibold text-gray-700">
                    KSH {displayRevenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Items Sold</h3>
                  <p className="font-semibold text-amber-800">
                    {summary.totalItemsSold || 0} Items
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">All Transactions</h3>
                  <p className="font-semibold text-green-700">
                    Txns: {summary?.totalTransactions || 0}
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Total Products</h3>
                  <p className="text-gray-700 font-semibold">
                    {products.length} products
                  </p>
                  <p className="text-gray-700 font-semibold">
                    {allCategories} categories
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Available Stock</h3>
                  <p className="text-gray-700 font-semibold">
                    {productsRemaining} products
                  </p>
                  <p className="text-gray-700 font-semibold">
                    {emptyCategories} categories empty
                  </p>
                </div>
              </div>
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Stock Value</h3>
                  <p className="font-semibold text-gray-700">
                    KSH {summary.totalStockValue?.toLocaleString() || 0}
                  </p>
                  <p className="font-semibold text-gray-700">
                    Date: {getTodaysDate()}
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-product-details">
              <div className="flex gap-[20px] mb-[30px] dashboard-product-detail">
                <div className="dashboard-product-stats-left">
                  <h4 className="font-bold uppercase">Product Details</h4>
                  <p className="flex justify-between my-2">
                    <span className="text-red-700">Low Stock Items</span>
                    <span className="text-red-700">
                      {lowStockCount.toLocaleString()}
                    </span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span className="text-gray-700">All Categories</span>
                    <span className="text-gray-700">{allCategories}</span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span className="text-green-700">All Items</span>
                    <span className="text-green-700">
                      {products
                        .reduce((sum, p) => sum + p.qty, 0)
                        .toLocaleString()}
                    </span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span className="text-orange-700">Unconfirmed Items</span>
                    <span className="text-orange-700">
                      {unconfirmedItemsCount.toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="dashboard-product-stats-right">
                  <h4 className="font-bold uppercase flex justify-between mb-[20px]">
                    Top Selling Items
                    <span className="flex gap-[10px]">
                      <select
                        name="sales-made"
                        id="sales-made"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="credit-content-search border rounded p-1 text-sm"
                      >
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                        <option value="all-time">All Time</option>
                      </select>
                    </span>
                  </h4>
                  <div className="dashboard-product-stat">
                    <ul>
                      {topSellingItems.length > 0 ? (
                        topSellingItems.map((item, index) => (
                          <li key={index} className="flex justify-between my-2">
                            <span className="font-semibold text-sm text-gray-700 uppercase">
                              {item.name}
                            </span>
                            <span className="font-normal">
                              {item.totalSold.toLocaleString()} items
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">
                          No sales recorded for this timeframe
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sales Summary Table */}
              <div className="dashboard-product-sales mb-[30px]">
                <h5 className="font-bold uppercase flex items-center justify-between">
                  Sales Summary
                  <span>
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

                <div className="sales-table w-full overflow-x-auto">
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Item Sold</th>
                        <th className="py-2 px-3">Quantity</th>
                        <th className="py-2 px-3">Total(Ksh)</th>
                        <th className="py-2 px-3">Payment</th>
                        <th className="py-2 px-3">Sold At</th>
                        <th className="py-2 px-3">Sold By</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {recentSales.length > 0 ? (
                        recentSales.map((sale, index) => (
                          <tr key={sale._id || sale.id}>
                            <th className="py-2 px-3">{index + 1}</th>
                            <td className="py-2 px-3 uppercase text-gray-700 font-semibold text-xs">
                              {sale.productId?.name ||
                                sale.itemName ||
                                "Offline Product"}
                            </td>
                            <td className="py-2 px-3">
                              {sale.quantitySold ||
                                sale.qty ||
                                sale.quantity ||
                                0}{" "}
                              {sale.productId?.units || sale.units}{" "}
                              {sale.productId?.units || "pcs"}
                            </td>
                            <td className="py-2 px-3 font-mono uppercase">
                              Ksh{" "}
                              {(
                                sale.totalPrice ||
                                sale.total ||
                                sale.amount ||
                                0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">{sale.paymentMethod}</td>
                            <td className="py-2 px-3">
                              <p>
                                {new Date(
                                  sale.createdAt || sale.date
                                ).toLocaleDateString()}
                              </p>
                              <p className="font-semibold text-xs text-gray-500">
                                {new Date(
                                  sale.createdAt || sale.date
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </td>
                            <td className="py-2 px-3">
                              {sale.soldBy?.fname ?? "cashier"}
                              <p className="text-xs font-semibold text-gray-500 uppercase">
                                {sale.soldBy?.role || "staff"}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`status-badge ${
                                  sale.paymentStatus?.toLowerCase() ||
                                  "completed"
                                }`}
                              >
                                {sale.paymentStatus || "Completed"}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {sale.paymentMethod === "Credit" &&
                              sale.balance > 0 ? (
                                <span className="text-red-800 font-bold">
                                  Ksh {sale.balance.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">
                                  No Balance
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-3 py-2 text-center">
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
