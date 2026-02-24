import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import API from '../../api';
import "../styles/DashboardPage.css";
import API_URL from "../../api";

const DashboardPage = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState(['today']);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Guest");

  // const res = API.get("/products");

  useEffect(() => {
    // 1. Get the 'user' string from localStorage
    const savedUser = localStorage.getItem("user");
    
    if (savedUser) {
      // 2. Parse it back into an object
      const userData = JSON.parse(savedUser);
      
      // 3. Set the name (using FName to match your schema)
      setUserName(userData.FName || "User");
    }
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // Fetch both the summary cards and the table list based on filter
        const [summaryRes, salesRes] = await Promise.all([
          axios.get(`${API_URL}/api/sales/summary?range=${filter}`),
          axios.get(`${API_URL}/api/sales?range=${filter}`),
        ]);

        setSummary(summaryRes.data);
        setSales(salesRes.data);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filter]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch products and today's sales
        const [prodRes, salesRes] = await Promise.all([
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/sales?range=today`),
        ]);

        // Map backend 'name' to 'item' and 'quantity' to 'qty' to match your existing logic
        const formattedProducts = prodRes.data.map((p) => ({
          id: p._id,
          item: p.name,
          category: p.category || "Unconfirmed",
          qty: p.quantity,
          units: p.units,
          price: p.price,
        }));

        setProducts(formattedProducts);
        setSales(salesRes.data);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stockStatus = products.map((product) => {
    const totalSold = sales
      .filter((sale) => (sale.productId?._id || sale.productId) === product.id)
      .reduce((sum, sale) => sum + sale.quantitySold, 0); // Backend uses quantitySold

    const remaining = product.qty; // Backend quantity is already the current remaining stock

    return { ...product, sold: totalSold, remaining };
  });

  // Calculate stats based on stockStatus
  const totalQuantityInitial = products.reduce((sum, p) => sum + p.qty, 0);
  const allCategories = [...new Set(products.map((p) => p.category))].length;
  const productsRemaining = products.filter((p) => p.qty > 0).length;
  const stockValue = products.reduce((sum, p) => sum + p.qty * p.price, 0);
  // 1. Get unique categories from the live product list
  const uniqueCategories = [
    ...new Set(products.map((product) => product.category)),
  ];

  const totalCategories = uniqueCategories.length;

  // 2. Calculate empty categories (where all products in that category have 0 quantity)
  const emptyCategories = uniqueCategories.filter((category) => {
    const productsInCategory = products.filter(
      (product) => product.category === category
    );
    // If every product in this category has 0 qty, the category is "empty"
    return productsInCategory.every((p) => p.qty === 0);
  }).length;

  // 3. Count unconfirmed items
  // This checks for "Unconfirmed", empty strings, or missing category fields
  // In Dashboard.jsx
  const unconfirmedItemsCount = products.filter(
    (p) =>
      !p.category ||
      p.category.trim() === "" ||
      p.category.toLowerCase() === "unconfirmed"
  ).length;

  // Ensure low stock count is actually calculated correctly (e.g., less than 5 units)
  const lowStockCount = products.filter((p) => p.qty > 0 && p.qty <= 5).length;

  // Daily Report logic using backend field names
  const report = {
    totalRevenue: sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    totalItemsSold: sales.reduce((sum, s) => sum + (s.quantitySold || 0), 0),
  };

  // Calculate Top Selling Items from live sales data
  const topSellingItems = Object.values(
    sales.reduce((acc, sale) => {
      const name = sale.productId?.name || "Unknown";
      if (!acc[name]) {
        acc[name] = { name, totalSold: 0, units: sale.productId?.units || "" };
      }
      acc[name].totalSold += sale.quantitySold;
      return acc;
    }, {})
  )
    .sort((a, b) => b.totalSold - a.totalSold) // Sort by highest quantity
    .slice(0, 4); // Take top 4

  const recentSales = sales
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by newest first
    .slice(0, 5); // Take only the first 5 items

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
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:settings"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/settings">Settings</a>
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
      <div className="dashboard-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Dashboard</h1>
        <h2 className="mb-[20px]">
          Welcome back, <strong>{userName}</strong>
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
                    <Icon
                      icon="material-symbols:settings"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/dashboard">Settings</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="dashboard-content-wrapper-info">
            <div className="dashboard-content-stats-cards flex gap-[20px] mb-[30px]">
              <div className="content-stats-card">
                <div className="content-stat-card">
                  <h3 className="font-bold uppercase">Today's Sales</h3>
                  <p>Ksh {report.totalRevenue.toLocaleString()}</p>
                  <p>{report.totalItemsSold} items sold</p>
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
                  <p>Ksh {stockValue.toLocaleString()}</p>
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
                    <span>{totalCategories}</span>
                  </p>
                  <p className="flex justify-between my-2">
                    <span>
                      <a href="/products" className="text-green-700">
                        All Items
                      </a>
                    </span>
                    <span className="text-green-700">
                      {totalQuantityInitial.toLocaleString()}
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
