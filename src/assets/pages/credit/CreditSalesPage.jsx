import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import "../../styles/CreditSalesPage.css";
import API_URL from "../../../api";
import api from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import {db} from "../../../db";
import {
  Receipt,
  LayoutDashboard,
  Package,
  Database,
  ShoppingCart,
  BarChart3,
  Users,
  Plus,
  HeartPlus,
  CoinsIcon,
} from "lucide-react";

const CreditSalesTable = () => {
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === "admin";

  const businessName = user?.businessName;
  const businessPhone = user?.businessPhone;

  const navigate = useNavigate();
  const [creditsData, setCreditsData] = useState([]);
  const [creditPage, setCreditPage] = useState(1);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handles showing the on-screen modern print preview panel
  const [showPreview, setShowPreview] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const rowsPerPage = 20;

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // FIX 1: Pointing to /api/credits to fix the 404 route matching issue
      const res = await fetch(`${API_URL}/api/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // FIX 2: fetch doesn't throw on 404/500 errors. We must throw manually 
      // to force execution into our offline catch block!
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();
      
      // Safety guard: Ensure data is actually an array before setting state
      setCreditsData(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.warn("Offline/Error: Fetching credit records from local IndexedDB cache...", err.message);
      
      try {
        // 1. Grab all raw offline sales records queued in Dexie
        const offlineRecords = await db.sales
          .where("synced")
          .equals(0)
          .toArray();

        // 2. Filter for transactions marked as Credit and parse their payloads
        const localCreditSales = offlineRecords
          .map((record) =>
            typeof record.payload === "string"
              ? JSON.parse(record.payload)
              : record.payload
          )
          .filter((payload) => payload.paymentMethod === "Credit")
          .map((payload, index) => ({
            _id: `offline-credit-${index}`,
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            totalAmount: payload.totalAmount,
            amountPaid: payload.amountPaid,
            balance: payload.balance,
            createdAt: payload.createdAt || new Date().toISOString(),
            paymentHistory: [],
            productId: { name: payload.productId?.name || "Offline Item" },
            quantitySold: payload.quantitySold || 1,
            paymentMethod: "Credit", // Added so creditRows filter doesn't skip it
            isOffline: true,
          }));

        setCreditsData(localCreditSales);
      } catch (dbErr) {
        console.error("Failed to read local credits queue", dbErr);
        setCreditsData([]); // Absolute fallback to prevent UI crash
      }
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const creditRows = Array.isArray(creditsData) 
  ? creditsData.filter((sale) => sale.paymentMethod === "Credit" || sale.totalAmount > 0)
  : [];

  const groupCreditsByCustomerAndDate = (data) => {
    const groups = {};

    data.forEach((sale) => {
      const dateStr = new Date(sale.createdAt).toLocaleDateString("en-KE");
      const customerKey = sale.customerName
        ? sale.customerName.trim().toLowerCase()
        : "walking-client";

      const groupKey = `${customerKey}-${dateStr}`;
      const itemName = sale.productId?.name || "Unknown Item";
      const initialMethod = sale.paymentMethod || "Credit";
      const saleTotal = Number(sale.totalAmount || 0);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...sale,
          itemsList: [itemName],
          quantitySold: Number(sale.quantitySold || 1),
          totalAmount: saleTotal,
          paymentHistory: Array.isArray(sale.paymentHistory)
            ? [...sale.paymentHistory]
            : [],
          methodsList: [initialMethod],
          allIds: [sale._id],
        };
      } else {
        if (!groups[groupKey].itemsList.includes(itemName)) {
          groups[groupKey].itemsList.push(itemName);
        }

        groups[groupKey].quantitySold += Number(sale.quantitySold || 1);
        groups[groupKey].totalAmount += saleTotal;
        groups[groupKey].allIds.push(sale._id);

        if (!groups[groupKey].methodsList.includes(initialMethod)) {
          groups[groupKey].methodsList.push(initialMethod);
        }

        if (Array.isArray(sale.paymentHistory)) {
          groups[groupKey].paymentHistory = [
            ...groups[groupKey].paymentHistory,
            ...sale.paymentHistory,
          ];
        }
      }
    });

    Object.values(groups).forEach((group) => {
      const validPayments = group.paymentHistory.filter(
        (p) => p !== null && p !== undefined
      );

      let totalPaidFromHistory = 0;
      validPayments.forEach((payment) => {
        const amt =
          typeof payment === "object"
            ? Number(payment.amount || 0)
            : Number(payment || 0);
        totalPaidFromHistory += amt;

        if (payment?.method && !group.methodsList.includes(payment.method)) {
          group.methodsList.push(payment.method);
        }
      });

      group.aggregatedPaid =
        validPayments.length > 0 ? Math.max(0, totalPaidFromHistory) : 0;
      group.remainingBalance = Math.max(
        0,
        group.totalAmount - group.aggregatedPaid
      );

      group.paymentHistory.sort(
        (a, b) => new Date(a?.date || a) - new Date(b?.date || b)
      );
    });

    return Object.values(groups);
  };

  const handleDeleteCredit = async (credit) => {
    try {
      const token = localStorage.getItem("token");
      let failureCount = 0;

      for (const id of credit.allIds) {
        const res = await fetch(`${API_URL}/api/credits/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status !== 404) failureCount++;
      }

      if (failureCount === 0) {
        toast.success("Records successfully deleted from ledger.");
        await fetchCredits();
      } else {
        toast.error("Some records failed to delete completely.");
      }
    } catch (error) {
      console.error("Error deleting ledger records:", error);
      toast.error("An error occurred while attempting to delete records.");
    }
  };

  const confirmDelete = (credit) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-gray-800">
            Are you sure you want to delete the cleared ledger records for
            <span className="mx-1">
              {credit.customerName || "this client"}?
            </span>
          </span>
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-300 rounded"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => {
                toast.dismiss(t.id);
                handleDeleteCredit(credit);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  };

  const combinedCreditRows = groupCreditsByCustomerAndDate(creditsData);
  const activeCreditRows = combinedCreditRows.filter(
    (credit) => Math.max(0, Number(credit.remainingBalance || 0)) > 0
  );

  const filteredCreditRows = activeCreditRows.filter((credit) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;

    const nameMatch = credit.customerName
      ? credit.customerName.toLowerCase().includes(searchLower)
      : false;
    const phoneMatch = credit.customerPhone
      ? credit.customerPhone.toLowerCase().includes(searchLower)
      : false;

    return nameMatch || phoneMatch;
  });

  const paginatedCredits = filteredCreditRows.slice(
    (creditPage - 1) * rowsPerPage,
    creditPage * rowsPerPage
  );

  const activeDebtsCount = activeCreditRows.length;

  const handleOpenPaymentModal = (credit) => {
    setSelectedCredit(credit);
    const currentBalance = Math.max(0, Number(credit.remainingBalance || 0));
    setPaymentAmount(currentBalance);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const typedAmount = Number(paymentAmount);
    const totalAllowedBalance = Math.max(
      0,
      Number(selectedCredit.remainingBalance || 0)
    );

    if (typedAmount > totalAllowedBalance) {
      toast.error(
        "Payment amount cannot exceed the total remaining customer balance!"
      );
      setIsSubmitting(false);
      return;
    }

    let remainingPayment = typedAmount;
    let finalRemainingDebtFromServer = totalAllowedBalance - typedAmount;
    let serverReceiptNo = null;

    try {
      const token = localStorage.getItem("token");

      // Filter and compute remaining specific item balances accurately out of fresh baseline records
      const rawClientDebts = creditsData.filter(
        (credit) =>
          selectedCredit.allIds.includes(credit._id) &&
          Number(credit.totalAmount || 0) -
            (Array.isArray(credit.paymentHistory)
              ? credit.paymentHistory.reduce(
                  (acc, curr) => acc + (Number(curr.amount) || 0),
                  0
                )
              : 0) >
            0
      );

      // Sort sequentially to systematically clear older ledger debts first (FIFO principles)
      rawClientDebts.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      // CRITICAL FIX: Use a sequential for...of loop instead of a concurrent mapping execution
      for (const debt of rawClientDebts) {
        if (remainingPayment <= 0) break;

        const currentDebtPaid = Array.isArray(debt.paymentHistory)
          ? debt.paymentHistory.reduce(
              (acc, curr) => acc + (Number(curr.amount) || 0),
              0
            )
          : 0;
        const debtBalance = Number(debt.totalAmount || 0) - currentDebtPaid;
        const paymentForThisRecord = Math.min(remainingPayment, debtBalance);

        if (paymentForThisRecord <= 0) continue;

        // Await the response completely before allowing loop to step next, avoiding database locked errors
        const response = await fetch(`${API_URL}/api/credits/${debt._id}/pay`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: paymentForThisRecord,
            method: paymentMethod,
            nextPaymentDate: null,
          }),
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(
            resData.message || "Failed during cascading processing loop step."
          );
        }

        if (resData.receiptNo) serverReceiptNo = resData.receiptNo;
        remainingPayment -= paymentForThisRecord;
      }

      toast.success("Payment processed successfully!");

      setPrintReceiptData({
        customerName: selectedCredit.customerName || "Walking Client",
        customerPhone: selectedCredit.customerPhone || "N/A",
        itemsOrdered: selectedCredit.itemsList || [],
        totalQuantity: selectedCredit.quantitySold || 1,
        amountPaid: typedAmount,
        paymentMethod: paymentMethod,
        date: new Date(),
        receiptNo: serverReceiptNo || `REC-${Date.now().toString().slice(-6)}`,
        remainingDebt: Math.max(0, finalRemainingDebtFromServer),
      });

      setShowPreview(true);
      setSearchQuery("");
      setSelectedCredit(null);
      setPaymentAmount("");

      // Re-fetch the updated structural rows directly from the server database
      await fetchCredits();
    } catch (error) {
      console.error("Repayment error:", error);
      toast.error(
        error.message || "An error occurred while splitting the payment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSystemPrint = () => {
    window.print();
  };

  return (
    <>
      <div className="credit-wrapper">
        <div className="credit-content">
          <h1 className="text-2xl font-bold uppercase mb-[20px]">
            Credit Sales
          </h1>
          <div className="credit-content-wrapper flex justify-between gap-[20px]">
            {/* Sidebar navigation */}
            <div className="credit-content-wrapper-menu">
              <div className="credit-content-menu">
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
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>
                  Credit
                </li>
                {/* <li
                  onClick={() => navigate("/invoice")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Receipt height="24" width="24" />
                  </span>
                  Invoices
                </li> */}
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

            {/* Main ledger block */}
            <div className="credit-content-wrapper-info flex-1 min-w-0 space-y-4">
              <div className="credit-content-table p-4 rounded-lg shadow border border-gray-200 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Icon icon="lucide:search" width="18" height="18" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search customer by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCreditPage(1);
                    }}
                    className="credit-content-search w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <Icon icon="lucide:x" width="16" height="16" />
                    </button>
                  )}
                </div>
              </div>

              <div className="credit-content-search rounded-lg shadow border border-gray-200 overflow-x-auto">
                <div className="credit-content-search p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                    Credit Log Ledger (Book of Debts)
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {activeDebtsCount || 0} Active Customer Debts
                  </span>
                </div>

                <div className="credit-content-search w-full overflow-x-auto">
                  <table className="credit-content-search w-full min-w-full table-auto text-left text-xs text-gray-700 whitespace-nowrap">
                    <thead className="text-[10px] uppercase text-gray-600 border-b">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items Ordered</th>
                        <th className="py-3 px-4 text-center">Total Qty</th>
                        <th className="py-3 px-4 text-right">Total (KSh)</th>
                        <th className="py-3 px-4 text-right">Paid (KSh)</th>
                        <th className="py-3 px-4 text-right">Balance (KSh)</th>
                        <th className="py-3 px-4 text-center">
                          Payment Method
                        </th>
                        <th className="py-3 px-4">Last Payment</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="credit-content-search divide-y divide-gray-200 text-xs">
                      {paginatedCredits.length > 0 ? (
                        paginatedCredits.map((credit) => {
                          const total = Number(credit.totalAmount || 0);
                          const balance = Math.max(
                            0,
                            Number(credit.remainingBalance || 0)
                          );
                          const amountPaid = Number(credit.aggregatedPaid || 0);

                          return (
                            <tr
                              key={credit._id}
                              className={`hover:bg-gray-50 ${
                                balance > 0
                                  ? "bg-red-50/30"
                                  : "bg-emerald-50/20"
                              }`}
                            >
                              <td className="py-3 px-4 text-gray-800 font-semibold">
                                {new Date(credit.createdAt).toLocaleDateString(
                                  "en-KE"
                                )}
                                <p className="text-xs text-emerald-600">
                                  {new Date(
                                    credit.createdAt
                                  ).toLocaleTimeString("en-KE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-gray-900 capitalize">
                                  {credit.customerName || "Walking Client"}
                                </p>
                                <p className="text-gray-500">
                                  {credit.customerPhone || "N/A"}
                                </p>
                              </td>
                              <td className="py-3 px-4 capitalize font-semibold text-emerald-700 max-w-xs truncate">
                                {credit.itemsList.join(", ")}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {credit.quantitySold} pcs
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {total.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                {amountPaid.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-red-600">
                                {balance > 0
                                  ? balance.toLocaleString()
                                  : "Cleared"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {credit.methodsList?.map((method, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        method === "M-pesa"
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                          : "bg-blue-100 text-blue-800 border-blue-300"
                                      }`}
                                    >
                                      {method}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-500">
                                {credit.paymentHistory?.length > 0 ? (
                                  (() => {
                                    const lastPaymentObj =
                                      credit.paymentHistory[
                                        credit.paymentHistory.length - 1
                                      ];
                                    const paymentDate =
                                      lastPaymentObj?.date || lastPaymentObj;
                                    return (
                                      <div className="flex flex-col justify-center leading-tight">
                                        <span className="font-semibold text-gray-800">
                                          {new Date(
                                            paymentDate
                                          ).toLocaleDateString("en-KE")}
                                        </span>
                                        <span className="font-semibold text-xs text-emerald-600">
                                          {new Date(
                                            paymentDate
                                          ).toLocaleTimeString("en-KE", {
                                            hour12: true,
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400 italic">
                                    No Payments
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center items-center gap-[5px]">
                                  {balance > 0 ? (
                                    <button
                                      onClick={() =>
                                        handleOpenPaymentModal(credit)
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow"
                                    >
                                      Pay Partial
                                    </button>
                                  ) : (
                                    <>
                                      <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                                        Cleared
                                      </span>
                                      <button
                                        onClick={() => confirmDelete(credit)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow flex items-center gap-1"
                                      >
                                        <Icon
                                          icon="lucide:trash-2"
                                          width="12"
                                          height="12"
                                        />{" "}
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="11"
                            className="text-center py-8 text-gray-400 font-medium"
                          >
                            No credit records match your search filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Repayment Modal */}
      {selectedCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="credit-content-search rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 uppercase tracking-wide">
              Record Debt Payment
            </h3>
            <form onSubmit={handlePaymentSubmit} className="credit-content-search space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Amount (KSh) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="credit-content-search w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="M-pesa">M-pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCredit(null)}
                  className="flex-1 border text-gray-700 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold shadow"
                >
                  {isSubmitting ? "Processing..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-Screen Print Preview Modal / Interface Container */}
      {showPreview && printReceiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden max-h-[90vh]">
            {/* Control Header */}
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Icon
                  icon="lucide:eye"
                  width="16"
                  height="16"
                  className="text-emerald-600"
                />
                Live Receipt Preview
              </span>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPrintReceiptData(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-200"
              >
                <Icon icon="lucide:x" width="18" height="18" />
              </button>
            </div>

            {/* Scrollable Simulated Thermal Voucher Blueprint Window */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex justify-center">
              <div className="bg-white border p-5 shadow-sm max-w-[80mm] w-full text-black font-mono text-xs leading-relaxed border-gray-300 rounded">
                <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                  {/* <h2 className="text-base font-black tracking-tight uppercase">DUKAFLOW</h2>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5">Retail Inventory & POS System</p> */}
                  <div className="mt-2 text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full inline-block font-sans font-semibold">
                    Payment Receipt
                  </div>
                </div>

                <div className="space-y-1 text-[11px] border-b pb-2 mb-2 border-gray-100">
                  <p>
                    <span className="text-gray-500">Receipt No :</span>{" "}
                    <span className="font-bold">
                      {printReceiptData.receiptNo}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Date Info :</span>{" "}
                    {new Date(printReceiptData.date).toLocaleDateString(
                      "en-KE",
                      { hour12: true, hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">Customer :</span>{" "}
                    <span className="font-bold uppercase text-gray-900">
                      {printReceiptData.customerName}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Phone ref :</span>{" "}
                    {printReceiptData.customerPhone}
                  </p>
                </div>

                {/* New Segment: Detailed items ordered listing breakdown */}
                <div className="my-2 text-[11px]">
                  <p className="font-sans font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">
                    Items Included in Debt Line:
                  </p>
                  <div className="bg-gray-50 rounded p-2 border border-gray-100">
                    <ul className="list-none space-y-1">
                      {printReceiptData.itemsOrdered?.map((item, index) => (
                        <li
                          key={index}
                          className="flex justify-between font-semibold text-gray-800 capitalize"
                        >
                          <span>
                            {index + 1}. {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-right border-t border-gray-200 mt-1.5 pt-1 text-[10px] text-gray-500">
                      Total quantity volume: {printReceiptData.totalQuantity}{" "}
                      pcs
                    </div>
                  </div>
                </div>

                <div className="border-b border-t border-dashed border-gray-400 py-2.5 my-2.5 text-base font-black flex justify-between bg-gray-50 px-2 rounded">
                  <span className="text-xs font-sans text-gray-600 self-center">
                    AMOUNT PAID:
                  </span>
                  <span className="text-emerald-700">
                    KSh{" "}
                    {parseFloat(printReceiptData.amountPaid).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-3 mb-3">
                  <p>
                    <span className="text-gray-500">Pay Method :</span>{" "}
                    <span className="font-bold">
                      {printReceiptData.paymentMethod}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Bal Remain :</span>{" "}
                    <span className="font-bold text-rose-600">
                      KSh {printReceiptData.remainingDebt?.toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="text-center text-[10px] font-sans text-gray-400 italic pt-1">
                  <p>Thank you customer for clearing your balance!</p>
                </div>
              </div>
            </div>

            {/* Print Trigger Action Footer */}
            <div className="bg-gray-100 p-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  setPrintReceiptData(null);
                }}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={triggerSystemPrint}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-bold shadow flex items-center justify-center gap-2 transition-colors"
              >
                <Icon icon="lucide:printer" width="16" height="16" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Plain Text Layout Target strictly read by standard 80mm ESC/POS Thermal Hardware Engines */}
      {printReceiptData && (
        <div className="print-only hidden p-4 max-w-[80mm] text-black font-mono text-xs">
          <div className="text-center border-b border-dashed pb-2 mb-2">
            <h2 className="text-sm font-bold uppercase">
              Debt Repayment Receipt
            </h2>
            {/* <p className="text-[10px]">Debt Repayment Receipt</p> */}
          </div>
          <div className="space-y-1 mb-2">
            <p>
              <strong>Receipt No:</strong> {printReceiptData.receiptNo}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(printReceiptData.date).toLocaleString("en-GB")}
            </p>
            <p>
              <strong>Customer:</strong> {printReceiptData.customerName}
            </p>
          </div>
          <div className="my-2 border-t border-b border-dashed py-1">
            <p className="font-bold text-[10px]">ITEMS ORDERED:</p>
            {printReceiptData.itemsOrdered?.map((item, idx) => (
              <p key={idx} className="capitalize">
                - {item}
              </p>
            ))}
          </div>
          <div className="border-b border-t border-dashed py-2 my-2 font-bold text-sm flex justify-between">
            <span>AMOUNT PAID:</span>
            <span>
              KSh {parseFloat(printReceiptData.amountPaid).toLocaleString()}
            </span>
          </div>
          <div className="space-y-1 text-[10px] border-b border-dashed pb-2 mb-2">
            <p>
              <strong>Payment Method:</strong> {printReceiptData.paymentMethod}
            </p>
            <p>
              <strong>Remaining Debt:</strong> KSh{" "}
              {printReceiptData.remainingDebt?.toLocaleString()}
            </p>
          </div>
          <div className="text-center pt-2 text-[9px] italic">
            <p>Thank you for your payment!</p>
            <p>Powered by DukaFlow</p>
          </div>
        </div>
      )}
    </>
  );
};

export default CreditSalesTable;
