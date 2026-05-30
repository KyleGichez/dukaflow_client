import React from "react";
import { useState, useEffect } from "react";
import axiosInstance from "axios";
import "../../styles/ReportsPage.css";
import { Icon } from "@iconify/react";
import CoinsIcon from "@iconify-react/lucide/coins";
import API_URL from "../../../api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [sales, setSales] = useState([]);
  const [filter, setFilter] = useState("today");
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

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

        const [summaryRes, salesRes, creditsRes] = await Promise.all([
          axiosInstance.get(
            `${API_URL}/api/sales/summary?range=${filter}`,
            config
          ),
          axiosInstance.get(`${API_URL}/api/sales?range=${filter}`, config),
          axiosInstance.get(`${API_URL}/api/credits`, config).catch((err) => {
            console.warn("Credits endpoint failed fallback:", err.message);
            return { data: [] };
          }),
        ]);

        setSummary(summaryRes.data);
        setSales(salesRes.data);
        setCredits(creditsRes.data || []);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filter]);

  const recentSales = sales
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // =========================================================
  // 💰 REAL-TIME CASH FLOW COMBINATION ENGINE (REPAIRED)
  // =========================================================

  const directCashSales = sales
    .filter((s) => s.paymentMethod === "Cash")
    .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  const directMpesaSales = sales
    .filter((s) => s.paymentMethod === "M-pesa")
    .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  const directBankSales = sales
    .filter(
      (s) =>
        s.paymentMethod === "Bank-Transfer" ||
        s.paymentMethod === "Bank Transfer"
    )
    .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);

  let cashRepayments = 0;
  let mpesaRepayments = 0;
  let bankRepayments = 0;

  const now = new Date();
  let rangeStartDate = new Date();
  rangeStartDate.setHours(0, 0, 0, 0);

  if (filter === "this-week") {
    rangeStartDate.setDate(now.getDate() - 7);
  } else if (filter === "this-month") {
    rangeStartDate.setMonth(now.getMonth() - 1);
  } else if (filter === "all-time") {
    rangeStartDate = new Date(0);
  }

  credits.forEach((creditRecord) => {
    if (Array.isArray(creditRecord.paymentHistory)) {
      creditRecord.paymentHistory.forEach((payment) => {
        const paymentDate = new Date(payment.date || creditRecord.updatedAt);

        if (paymentDate >= rangeStartDate) {
          const amount = Number(payment.amount || 0);
          const method = payment.method;

          if (method === "Cash") cashRepayments += amount;
          else if (method === "M-pesa") mpesaRepayments += amount;
          else if (method === "Bank Transfer" || method === "Bank-Transfer")
            bankRepayments += amount;
        }
      });
    }
  });

  const finalCashTotal = directCashSales + cashRepayments;
  const finalMpesaTotal = directMpesaSales + mpesaRepayments;
  const finalBankTotal = directBankSales + bankRepayments;
  const trueRealizedRevenue = finalCashTotal + finalMpesaTotal + finalBankTotal;

  const remainingActiveCredit = credits.reduce((sum, record) => {
    const totalAmount = Number(record.totalAmount || 0);

    const totalPaid = Array.isArray(record.paymentHistory)
      ? record.paymentHistory.reduce(
          (acc, payment) => acc + Number(payment?.amount || 0),
          0
        )
      : 0;

    const balance = Math.max(0, totalAmount - totalPaid);

    return sum + balance;
  }, 0);

  const trueGrossRevenue = trueRealizedRevenue;

  // ==========================================
  // 📈 FIXED 7-DAY ROLLING PERFORMANCE ENGINE
  // ==========================================

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // 1. Calculate base sales across windows
  const last7DaysSales = sales.filter(
    (s) => new Date(s.date || s.createdAt) >= sevenDaysAgo
  );

  // 🟢 MAKE SURE THIS LINE IS PRESENT AND ACCESSIBLE:
  const previousWeekSales = sales.filter((s) => {
    const d = new Date(s.date || s.createdAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  let base7DaySalesRevenue = 0;
  let last7DaysCreditsIssued = 0;

  last7DaysSales.forEach((sale) => {
    const total = Number(sale.totalPrice || 0);
    const method = sale.paymentMethod?.toLowerCase() || "";

    if (method === "credit") {
      const matchingCreditRecord = credits.find(
        (c) => c.saleId === sale._id || c._id === sale.creditId
      );

      if (matchingCreditRecord) {
        const trueRemainingBalance =
          matchingCreditRecord.balance !== undefined
            ? Number(matchingCreditRecord.balance)
            : Number(matchingCreditRecord.amount || 0) -
              Number(matchingCreditRecord.totalPaid || 0);

        last7DaysCreditsIssued += Math.max(0, trueRemainingBalance);
      } else {
        last7DaysCreditsIssued += total;
      }
    }
    base7DaySalesRevenue += total;
  });

  // 2. Fetch and aggregate debt repayments collected strictly within those rolling windows
  let rolling7DayRepayments = 0;
  let rollingPreviousWeekRepayments = 0;

  credits.forEach((creditRecord) => {
    if (Array.isArray(creditRecord.paymentHistory)) {
      creditRecord.paymentHistory.forEach((payment) => {
        const paymentDate = new Date(payment.date || creditRecord.updatedAt);
        const amount = Number(payment.amount || 0);

        if (paymentDate >= sevenDaysAgo) {
          rolling7DayRepayments += amount;
        } else if (
          paymentDate >= fourteenDaysAgo &&
          paymentDate < sevenDaysAgo
        ) {
          rollingPreviousWeekRepayments += amount;
        }
      });
    }
  });

  // 3. Re-synthesize precise metric velocities
  const last7DaysRevenue = base7DaySalesRevenue + rolling7DayRepayments;
  const last7DaysProfits =
    base7DaySalesRevenue - last7DaysCreditsIssued + rolling7DayRepayments;
  const avgDailyProfit = last7DaysProfits / 7;

  const currentWeekProductivity = trueGrossRevenue;

  // 🟢 This assignment will now find 'previousWeekSales' safely up above
  const lastWeekProductivity =
    previousWeekSales.reduce(
      (acc, curr) => acc + Number(curr.totalPrice || 0),
      0
    ) + rollingPreviousWeekRepayments;

  // 4. Distribution map allocation with integrated repayments
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const last7DaysProgressMap = [];

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(startOfToday);
    targetDate.setDate(targetDate.getDate() - i);

    const nextTargetDate = new Date(targetDate);
    nextTargetDate.setDate(nextTargetDate.getDate() + 1);

    const daySalesRevenue = sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= targetDate && d < nextTargetDate;
      })
      .reduce((acc, curr) => acc + Number(curr.totalPrice || 0), 0);

    let dayRepaymentsCollected = 0;
    credits.forEach((creditRecord) => {
      if (Array.isArray(creditRecord.paymentHistory)) {
        creditRecord.paymentHistory.forEach((payment) => {
          const paymentDate = new Date(payment.date || creditRecord.updatedAt);
          if (paymentDate >= targetDate && paymentDate < nextTargetDate) {
            dayRepaymentsCollected += Number(payment.amount || 0);
          }
        });
      }
    });

    const totalDayCombinedRevenue = daySalesRevenue + dayRepaymentsCollected;

    const sharePercentage =
      last7DaysRevenue > 0
        ? Math.round((totalDayCombinedRevenue / last7DaysRevenue) * 100)
        : 0;

    last7DaysProgressMap.push({
      dayLabel: dayLabels[targetDate.getDay()],
      revenue: totalDayCombinedRevenue,
      percentage: sharePercentage,
    });
  }

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("DukaFlow - Sales Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Filter Range: ${filter.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`,
      14,
      22
    );

    const tableColumn = [
      "#",
      "Date",
      "Item Sold",
      "Qty",
      "Total (Ksh)",
      "Payment",
      "Sold By",
      "Status",
    ];
    const tableRows = [];

    sales.forEach((sale, index) => {
      const saleData = [
        index + 1,
        new Date(sale.date).toLocaleDateString(),
        sale.productId?.name || "Deleted Product",
        `${sale.quantitySold} ${sale.productId?.units || ""}`,
        sale.totalPrice?.toLocaleString(),
        sale.paymentMethod,
        sale.soldBy?.fname ?? "cashier",
        sale.paymentStatus,
      ];
      tableRows.push(saleData);
    });

    autoTable(doc, {
      startY: 28,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Sales_Report_${filter}_${new Date().toLocaleDateString()}.pdf`);
  };

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
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>
                  <a href="/credit">Credit</a>
                </li>
                {isAdmin && (
                  <>
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
                        <Icon icon="ri:heart-add-fill" width="24" height="24" />
                      </span>
                      <a href="/subscription">Subscription</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="reportPage-content-info">
            {/* Core Statistics Financial Grid */}
            <div className="grid grid-cols-4 gap-6 mb-[20px]">
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
                  Realized Profits
                </h2>
                <p className="py-[10px] text-xl font-semibold text-green-800">
                  Ksh {trueGrossRevenue.toLocaleString()}
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
              Revenue Collection (Sales + Repayments)
            </h3>
            <div className="grid grid-cols-4 gap-6 mb-[30px]">
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-400">
                  Cash Register
                </h2>
                <p className="py-[10px] text-lg font-medium text-gray-800">
                  Ksh {finalCashTotal.toLocaleString()}
                </p>
                <span className="text-[10px] text-gray-400 block">
                  Sales: {directCashSales.toLocaleString()} | Repayments:{" "}
                  {cashRepayments.toLocaleString()}
                </span>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-400">
                  M-pesa Till / Paybill
                </h2>
                <p className="py-[10px] text-lg font-medium text-gray-800">
                  Ksh {finalMpesaTotal.toLocaleString()}
                </p>
                <span className="text-[10px] text-gray-400 block">
                  Sales: {directMpesaSales.toLocaleString()} | Repayments:{" "}
                  {mpesaRepayments.toLocaleString()}
                </span>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-400">
                  Bank Account
                </h2>
                <p className="py-[10px] text-lg font-medium text-gray-800">
                  Ksh {finalBankTotal.toLocaleString()}
                </p>
                <span className="text-[10px] text-gray-400 block">
                  Sales: {directBankSales.toLocaleString()} | Repayments:{" "}
                  {bankRepayments.toLocaleString()}
                </span>
              </div>
              <div className="summary-card">
                <h2 className="font-bold uppercase text-xs text-gray-400">
                  Total Collections
                </h2>
                <p className="py-[10px] text-lg font-bold text-green-600">
                  Ksh {trueRealizedRevenue.toLocaleString()}
                </p>
              </div>
            </div>

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
                Rolling 7-Day Performance Indicators
              </h3>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <span className="text-xs text-gray-400 uppercase font-medium">
                    7 Days Realized Cash Flow
                  </span>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    Ksh {last7DaysProfits.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Liquid cash collections plus active debt repayments
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <span className="text-xs text-gray-400 uppercase font-medium">
                    Avg. Daily Cash Flow
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
                    Current Week Progress Distribution
                  </h4>
                  <div className="space-y-3">
                    {last7DaysProgressMap.map((day, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500 w-8">
                          {day.dayLabel}
                        </span>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                          <div
                            style={{ width: `${day.percentage}%` }}
                            className={`h-full transition-all duration-500 ${
                              day.percentage > 25
                                ? "bg-blue-600"
                                : day.percentage > 10
                                ? "bg-sky-400"
                                : "bg-slate-300"
                            }`}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-10 text-right">
                          {day.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Summary Data Table Container */}
            <div className="reportPage-table mb-[30px]">
              <h3 className="font-bold uppercase flex justify-between mb-[20px]">
                Sales Summary ({filter})
                <span className="flex gap-[10px]">
                  <select
                    name="sales-made"
                    id="sales-made"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border rounded p-1 text-sm bg-white"
                  >
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                    <option value="all-time">All Time</option>
                  </select>

                  {/* <button
                    onClick={exportToPDF}
                    className="export-btn flex items-center gap-2 bg-rose-600 text-white px-3 py-1 text-sm rounded hover:bg-rose-700 transition"
                  >
                    <Icon
                      icon="fluent:document-pdf-24-filled"
                      width="16"
                      height="16"
                    />
                    Download PDF
                  </button> */}
                </span>
              </h3>
              <div className="reports-table">
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
                  <tbody>
                    {recentSales.length > 0 ? (
                      recentSales.map((sale, index) => (
                        <tr key={sale._id} className="border-b">
                          <th className="py-2 px-3">{index + 1}</th>
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
                          <td className="py-2 px-3">
                            <p className="">
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
                              {sale.soldBy?.role}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`status-badge ${sale.paymentStatus?.toLowerCase()}`}
                            >
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {sale.paymentMethod === "Credit" &&
                            sale.balance > 0 ? (
                              <span className="text-red-800 font-bold">
                                Ksh {sale.balance.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400"> No Balance</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="9"
                          className="text-center px-3 py-8 text-gray-400"
                        >
                          No recent sales found for this filter range.
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
