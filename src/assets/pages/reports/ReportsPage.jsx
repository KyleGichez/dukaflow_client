import React, { useState, useEffect } from "react";
import axiosInstance from "axios";
import "../../styles/ReportsPage.css";
import { Icon } from "@iconify/react";
import API_URL from "../../../api";
import { useNavigate } from "react-router-dom";
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

const ReportsPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalItemsSold: 0,
    totalTransactions: 0,
    totalStockValue: 0,
    paymentBreakdown: {},
  });

  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filter, setFilter] = useState("today");
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    cashReceived: 0,
    creditIssued: 0,
  });

  // 📊 Live Backend Metrics State
  const [liveMetrics, setLiveMetrics] = useState({
    trueGrossRevenue: 0,
    rangeProfit: 0,
    remainingActiveCredit: 0,
    trueRealizedRevenue: 0,
    finalCashTotal: 0,
    directCashSales: 0,
    cashRepayments: 0,
    finalMpesaTotal: 0,
    directMpesaSales: 0,
    creditInitialPaymentsCollected: 0,
    mpesaRepayments: 0,
    finalBankTotal: 0,
    directBankSales: 0,
    bankRepayments: 0,
    totalCollections: 0,
    last7DaysProfits: 0,
    avgDailyProfit: 0,
    lastWeekProductivity: 0,
    currentWeekProductivity: 0,
    last7DaysProgressMap: [],
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const queryParams = `?range=${filter}&startDate=${startDate}&endDate=${endDate}&paymentMethod=${paymentFilter}`;

        const [summaryRes, salesRes, creditsRes, analyticsRes] =
          await Promise.all([
            axiosInstance.get(
              `${API_URL}/api/sales/summary${queryParams}`,
              config
            ),
            axiosInstance.get(`${API_URL}/api/sales${queryParams}`, config),
            axiosInstance.get(`${API_URL}/api/credits`, config).catch((err) => {
              console.warn("Credits endpoint failed fallback:", err.message);
              return { data: [] };
            }),
            axiosInstance
              .get(
                `${API_URL}/api/analytics/revenue-summary${queryParams}`,
                config
              )
              .catch((err) => {
                console.error(
                  "Analytics revenue-summary engine blocked:",
                  err.response?.data || err.message
                );
                return null;
              }),
          ]);

        setSummary(summaryRes.data);
        setSales(salesRes.data);
        setCredits(creditsRes.data || []);

        if (analyticsRes && analyticsRes.data) {
          setLiveMetrics({
            trueGrossRevenue: analyticsRes.data.trueGrossRevenue || 0,
            rangeProfit: analyticsRes.data.rangeProfit || 0,
            remainingActiveCredit: analyticsRes.data.remainingActiveCredit || 0,
            trueRealizedRevenue: analyticsRes.data.trueRealizedRevenue || 0,

            // 🌟 FIXED: Map card values to direct sales totals returned by the clean backend variables
            finalCashTotal: analyticsRes.data.finalCashTotal || 0,
            directCashSales: analyticsRes.data.directCashSales || 0,
            cashRepayments: analyticsRes.data.cashRepayments || 0,

            finalMpesaTotal: analyticsRes.data.finalMpesaTotal || 0,
            directMpesaSales: analyticsRes.data.directMpesaSales || 0,
            creditInitialPaymentsCollected:
              analyticsRes.data.creditInitialPaymentsCollected || 0,
            mpesaRepayments: analyticsRes.data.mpesaRepayments || 0,

            finalBankTotal: analyticsRes.data.finalBankTotal || 0,
            directBankSales: analyticsRes.data.directBankSales || 0,
            bankRepayments: analyticsRes.data.bankRepayments || 0,

            totalCollections: analyticsRes.data.totalCollections || 0,

            last7DaysProfits: analyticsRes.data.last7DaysProfits || 0,
            avgDailyProfit: analyticsRes.data.avgDailyProfit || 0,
            lastWeekProductivity: analyticsRes.data.lastWeekProductivity || 0,
            currentWeekProductivity:
              analyticsRes.data.currentWeekProductivity || 0,
            last7DaysProgressMap: analyticsRes.data.progressMap || [],
          });
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filter, startDate, endDate, paymentFilter]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    fetch(`${API_URL}/api/sales/summary`, config)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(async () => {
        console.warn("Offline: Generating offline analytics summary...");
        if (window.db) {
          const offlineQueue = await window.db.sales
            .where("synced")
            .equals(0)
            .toArray();

          let extraRevenue = 0;
          let extraCash = 0;
          let extraCredit = 0;

          offlineQueue.forEach((item) => {
            const payload =
              typeof item.payload === "string"
                ? JSON.parse(item.payload)
                : item.payload;

            extraRevenue += Number(payload.totalAmount || 0);
            if (payload.paymentMethod === "Credit") {
              extraCash += Number(payload.amountPaid || 0);
              extraCredit += Number(payload.balance || 0);
            } else {
              extraCash += Number(payload.totalAmount || 0);
            }
          });

          setStats({
            totalRevenue: extraRevenue,
            cashReceived: extraCash,
            creditIssued: extraCredit,
            isStaleOfflineSummary: true,
          });
        }
      });
  }, []);

  const recentSales = [...sales]
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    )
    .slice(0, 10);

  const {
    trueGrossRevenue,
    rangeProfit,
    remainingActiveCredit,
    trueRealizedRevenue,
    finalCashTotal,
    totalCollections,
    finalMpesaTotal,
    finalBankTotal,
    last7DaysProfits,
    avgDailyProfit,
    lastWeekProductivity,
    currentWeekProductivity,
    last7DaysProgressMap,
  } = liveMetrics;

  if (loading) {
    return (
      <div className="reportPage-wrapper">
        <div className="reportPage-content">
          <h1 className="text-2xl font-bold uppercase mb-[20px]">Reports</h1>

          <div className="reportPage-content-wrapper flex gap-[20px]">
            {/* Sidebar Skeleton */}
            <div className="reportPage-content-wrapper-menu">
              <div className="reportPage-content-menu">
                <ul className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <li key={i} className="flex items-center gap-3 p-2">
                      <div className="animate-pulse bg-gray-200 h-6 w-6 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-28 rounded"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="reportPage-content-info flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded shadow-sm">
                    <div className="animate-pulse bg-gray-200 h-3 w-24 rounded mb-3"></div>
                    <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Payment Breakdown Cards */}
              <div className="grid grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded shadow-sm">
                    <div className="animate-pulse bg-gray-200 h-3 w-20 rounded mb-3"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded mb-2"></div>
                    <div className="animate-pulse bg-gray-200 h-2 w-full rounded"></div>
                  </div>
                ))}
              </div>

              {/* Items & Transactions */}
              <div className="bg-white p-4 rounded shadow-sm mb-6">
                <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-4"></div>
                <div className="animate-pulse bg-gray-200 h-3 w-40 rounded mb-2"></div>
                <div className="animate-pulse bg-gray-200 h-3 w-32 rounded"></div>
              </div>

              {/* Analytics Section */}
              <div className="bg-white p-6 rounded shadow-sm mb-6">
                <div className="animate-pulse bg-gray-200 h-5 w-64 rounded mb-6"></div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded p-4">
                      <div className="animate-pulse bg-gray-200 h-3 w-28 rounded mb-3"></div>
                      <div className="animate-pulse bg-gray-200 h-7 w-32 rounded"></div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse bg-gray-200 h-4 w-full rounded mb-4"
                      ></div>
                    ))}
                  </div>

                  <div>
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 mb-3">
                        <div className="animate-pulse bg-gray-200 h-3 w-8 rounded"></div>
                        <div className="animate-pulse bg-gray-200 h-3 flex-1 rounded"></div>
                        <div className="animate-pulse bg-gray-200 h-3 w-10 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="bg-white p-4 rounded shadow-sm">
                <div className="animate-pulse bg-gray-200 h-5 w-40 rounded mb-6"></div>

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
          {/* Navigation Sidebar */}
          <div className="reportPage-content-wrapper-menu">
            <div className="reportPage-content-menu">
              <ul>
                <li
                  onClick={() => navigate("/dashboard")}
                  className="menu-item flex items-center gap-[10px]"
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
                      className="menu-item active flex items-center gap-[10px]"
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

          <div className="reportPage-content-info flex-1">
            <div className="filter-range flex items-center gap-2 flex-wrap mb-[20px] bg-white px-3 py-4 rounded">
              {/* Start Date */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500">
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white"
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500">
                  To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white"
                />
              </div>

              {/* Payment Method */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500">
                  Payment
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white"
                >
                  <option value="All">All</option>
                  <option value="Cash">Cash</option>
                  <option value="M-pesa">M-pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Existing Range Filter */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500">
                  Quick Filter
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white"
                >
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="all-time">All Time</option>
                </select>
              </div>

              <div className="reset-btn">
                {(startDate || endDate || paymentFilter) && (
                  <button
                    className="flex items-center gap-1 text-sm bg-emerald-600 rounded p-2 text-black-600 font-semibold hover:text-red-800 hover:underline transition-colors pb-2"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setPaymentFilter("");
                    }}
                  >
                    <Icon icon="system-uicons:reset" width="18" height="18" />
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Core Statistics Financial Grid */}
            <div className="grid grid-cols-4 gap-4 mb-[20px]">
              <div className="summary-card border-l-4 border-blue-500">
                <h2 className="font-bold uppercase text-xs text-gray-500">
                  Total Revenue(Gross)
                </h2>
                <p className="py-[10px] text-xl font-semibold">
                  Ksh {trueGrossRevenue.toLocaleString()}
                </p>
              </div>
              <div className="summary-card border-l-4 border-amber-500 bg-amber-50/30">
                <h2 className="font-bold uppercase text-xs text-amber-700">
                  Active Credits
                </h2>
                <p className="py-[10px] text-xl font-semibold text-amber-800">
                  Ksh {remainingActiveCredit.toLocaleString()}
                </p>
              </div>
              <div className="summary-card border-l-4 border-green-500 bg-green-50/30">
                <h2 className="font-bold uppercase text-xs text-green-700">
                  Realized Cashflow
                </h2>
                <p className="py-[10px] text-xl font-semibold text-orange-600">
                  Ksh {trueRealizedRevenue.toLocaleString()}
                </p>
              </div>
              <div className="summary-card border-l-4 border-amber-500 bg-amber-50/30">
                <h2 className="font-bold uppercase text-xs text-amber-700">
                  Net Profit Margin
                </h2>
                <p className="py-[10px] text-xl font-semibold text-green-600">
                  Ksh {(rangeProfit || 0).toLocaleString()}
                </p>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-500">
                  Stock Value
                </h2>
                <p className="py-[10px] text-xl font-semibold">
                  Ksh {Number(summary?.totalStockValue || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Collected Methods Breakdown */}
            <h3 className="font-bold uppercase text-sm text-gray-600 mb-[10px] tracking-wider">
              Revenue Collection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-[30px]">
              {/* CASH CARD */}
              {(!paymentFilter ||
                paymentFilter === "All" ||
                paymentFilter === "Cash") && (
                <div className="summary-card">
                  <h2 className="font-bold uppercase text-xs text-gray-400">
                    Cash Register
                  </h2>
                  <p className="py-[10px] text-lg font-medium text-gray-800">
                    Ksh {finalCashTotal.toLocaleString()}
                  </p>
                  {/* <span className="text-gray-500 text-xs">Sales: {directCashSales} | Repayments: {cashRepayments}</span> */}
                </div>
              )}

              {/* M-PESA CARD */}
              {(!paymentFilter ||
                paymentFilter === "All" ||
                paymentFilter === "M-pesa") && (
                <div className="summary-card">
                  <h2 className="font-bold uppercase text-xs text-gray-400">
                    M-pesa Till / Paybill
                  </h2>
                  <p className="py-[10px] text-lg font-medium text-gray-800">
                    Ksh {finalMpesaTotal.toLocaleString()}
                  </p>
                  {/* <span className="text-gray-500 text-xs">Sales: {directMpesaSales} | Repayments: {mpesaRepayments}</span> */}
                </div>
              )}

              {/* BANK CARD */}
              {(!paymentFilter ||
                paymentFilter === "All" ||
                paymentFilter === "Bank Transfer") && (
                <div className="summary-card">
                  <h2 className="font-bold uppercase text-xs text-gray-400">
                    Bank Account
                  </h2>
                  <p className="py-[10px] text-lg font-medium text-gray-800">
                    Ksh {finalBankTotal.toLocaleString()}
                  </p>
                  {/* <span className="text-gray-500 text-xs">Sales: {directBankSales} | Repayments: {bankRepayments}</span> */}
                </div>
              )}

              {/* TOTAL COLLECTIONS CARD */}
              {(!paymentFilter || paymentFilter === "All") && (
                <div className="summary-card bg-slate-50/50 border border-dashed border-gray-200">
                  <h2 className="font-bold uppercase text-xs text-gray-400">
                    Total Collections
                  </h2>
                  <p className="py-[10px] text-lg font-bold text-green-600">
                    Ksh {totalCollections.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Items & Transactions Row */}
            <div className="grid grid-cols-1 mb-[30px]">
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-400">
                  Items & Transactions
                </h2>
                <div className="flex items-center gap-2">
                  <p className="py-[5px] text-sm text-gray-600">
                    Items:{" "}
                    <span className="font-bold">
                      {Number(summary?.totalItemsSold).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Txns:{" "}
                    <span className="font-bold">
                      {Number(summary?.totalTransactions)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Rolling 7-Day Performance Indicators Dashboard */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-[30px]">
              <h3 className="font-bold uppercase text-sm text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
                <Icon
                  icon="fluent:data-trending-20-filled"
                  width="20"
                  height="20"
                  className="text-blue-600"
                />
                Rolling Weekly Performance Indicators
              </h3>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <span className="text-xs text-gray-400 uppercase font-medium">
                    Last 7 Days Realized Profits
                  </span>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    Ksh {last7DaysProfits.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Calculated over the last 7 days revenue
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <span className="text-xs text-gray-400 uppercase font-medium">
                    Avg. Daily Profits
                  </span>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    Ksh {Math.round(avgDailyProfit).toLocaleString()}/day
                  </p>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Calculated over a rolling 7-day window
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 items-start pt-2">
                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-500 mb-3 tracking-wider">
                    Weekly Productivity Benchmark
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm border-b pb-1">
                      <span className="text-gray-500">Last Week Velocity:</span>
                      <span className="font-semibold text-gray-700">
                        Ksh {lastWeekProductivity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-b pb-1">
                      <span className="text-gray-500">
                        Current Week Velocity:
                      </span>
                      <span className="font-semibold text-blue-600">
                        Ksh {currentWeekProductivity.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-500 mb-3 tracking-wider">
                    7-Days Productivity Progress
                  </h4>
                  <div className="space-y-2">
                    {last7DaysProgressMap.map((day, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-xs gap-2"
                      >
                        <span className="w-8 font-medium text-gray-500">
                          {day.dayLabel}
                        </span>
                        <div className="flex-1 bg-gray-100 h-2 rounded overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${day.percentage}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-semibold text-gray-700">
                          Ksh {day.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
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
                                sale.paymentStatus?.toLowerCase() || "completed"
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
                              <span className="text-gray-400">No Balance</span>
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
  );
};

export default ReportsPage;
