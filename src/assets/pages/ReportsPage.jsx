import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/ReportsPage.css";
import { Icon } from "@iconify/react";
import * as XLSX from "xlsx";
import API_URL from "../../api";

const ReportsPage = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const user = JSON.parse(localStorage.getItem("user"));


  const exportToExcel = () => {
    // 1. Prepare clean data
    const dataToExport = sales.map((sale, index) => ({
      "#": index + 1,
      Date: new Date(sale.date).toLocaleDateString(),
      "Item Sold": sale.productId?.name || "N/A",
      Quantity: `${sale.quantitySold} ${sale.productId?.units || ""}`,
      "Unit Price (Ksh)": sale.unitPrice,
      "Total Price (Ksh)": sale.totalPrice,
      "Payment Method": sale.paymentMethod,
    }));

    // 2. Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // 3. AUTO-WIDTH LOGIC
    // Calculate the width based on the longest string in each column
    const columnWidths = Object.keys(dataToExport[0] || {}).map((key) => {
      // Get lengths of all values in this column + the header itself
      const maxLength = Math.max(
        key.length,
        ...dataToExport.map((row) =>
          row[key] ? row[key].toString().length : 0
        )
      );
      return { wch: maxLength + 2 }; // +2 for extra padding
    });

    worksheet["!cols"] = columnWidths;

    // 4. Create workbook and download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Summary");
    XLSX.writeFile(
      workbook,
      `Inventory_Report_${filter}_${new Date().toLocaleDateString()}.xlsx`
    );
  };

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalItemsSold: 0,
    totalTransactions: 0,
    totalStockValue: 0,
    paymentBreakdown: {},
  });
  const [sales, setSales] = useState([]); // State for the table
  const [filter, setFilter] = useState("today"); // State for the dropdown
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // 1. Get the token from localStorage
        const token = localStorage.getItem("token");
        
        // 2. Define the headers
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        // 3. Pass the config object as the second argument to axios.get
        const [summaryRes, salesRes] = await Promise.all([
          axios.get(`${API_URL}/api/sales/summary?range=${filter}`, config),
          axios.get(`${API_URL}/api/sales?range=${filter}`, config),
        ]);

        setSummary(summaryRes.data);
        setSales(salesRes.data);
      } catch (error) {
        console.error("Error fetching report data:", error);
        // If it's a 401, you might want to redirect to login
        if (error.response?.status === 401) {
            console.error("Session expired or invalid token");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filter]);

  const recentSales = sales
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by newest first
    .slice(0, 10); // Take only the first 10 items

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
    <div className="reportPage-wrapper">
      <div className="reportPage-content"> 
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Reports</h1>
        <div className="reportPage-content-wrapper flex gap-[20px]">
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
          <div className="reportPage-content-info">
            <div className="grid grid-cols-4 gap-6 mb-[20px]">
              <div className="summary-card">
                <h2 className="font-bold uppercase">Total Revenue</h2>
                <p className="py-[10px]">
                  Ksh {Number(summary?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase">Items Sold</h2>
                <p className="py-[10px]">
                  {Number(summary?.totalItemsSold).toLocaleString()} Items
                </p>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase">All Transactions</h2>
                <p className="py-[10px]">
                  {Number(summary?.totalTransactions)} Transactions
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
                <h2 className="font-bold uppercase">Date Today</h2>
                <p className="py-[10px]">{getTodaysDate()}</p>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase">Stock Value</h2>
                <p className="py-[10px]">
                  Ksh {Number(summary?.totalStockValue || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="reportPage-table mb-[30px]">
              <h3 className="font-bold uppercase flex justify-between mb-[20px]">
                Sales Summary
                <span className="flex gap-[10px]">
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
                  <button
                    onClick={exportToExcel}
                    className="export-btn flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    <Icon
                      icon="file-icons:microsoft-excel"
                      width="20"
                      height="20"
                    />
                    Export to Excel
                  </button>
                </span>
              </h3>
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
                        <td colSpan="6" className="text-center px-3 py-2">No recent sales found.</td>
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
  );
};

export default ReportsPage;
