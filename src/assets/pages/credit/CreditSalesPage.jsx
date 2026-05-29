import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import "../../styles/CreditSalesPage.css";
import CoinsIcon from "@iconify-react/lucide/coins";
import API_URL from "../../../api";

const CreditSalesTable = () => {
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === "admin";

  const [creditsData, setCreditsData] = useState([]);
  const [creditPage, setCreditPage] = useState(1);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowsPerPage = 20;

  const fetchCredits = async () => {
    try {
      const res = await fetch(`${API_URL}/api/credits`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCreditsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
      toast.error("Failed to sync latest ledger records.");
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const creditRows = creditsData.filter(
    (sale) => sale.paymentMethod === "Credit" || sale.totalAmount > 0
  );

  // Group transactions and sort payment history to find the absolute latest payment date
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

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...sale,
          itemsList: [itemName],
          quantitySold: sale.quantitySold || 1,
          totalAmount: sale.totalAmount || 0,
          amountPaid: sale.amountPaid || 0,
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
        groups[groupKey].quantitySold += sale.quantitySold || 1;
        groups[groupKey].totalAmount += sale.totalAmount || 0;
        groups[groupKey].amountPaid += sale.amountPaid || 0;
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
      group.paymentHistory.forEach((payment) => {
        if (payment?.method && !group.methodsList.includes(payment.method)) {
          group.methodsList.push(payment.method);
        }
      });

      // FIX: Explicitly sort history by timestamp so the index engine grabs the true latest payment
      group.paymentHistory.sort((a, b) => {
        const dateA = new Date(a?.date || a);
        const dateB = new Date(b?.date || b);
        return dateA - dateB;
      });
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok && res.status !== 404) {
          failureCount++;
        }
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
            <span className="mx-1">{credit.customerName || "this client"}?</span>
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
      {
        duration: 6000,
      }
    );
  };

const combinedCreditRows = groupCreditsByCustomerAndDate(creditRows);

const activeCreditRows = combinedCreditRows.filter(
  (credit) => credit.status === "PENDING" || credit.status === "PARTIAL"
);

const paginatedCredits = activeCreditRows.slice(
  (creditPage - 1) * rowsPerPage,
  creditPage * rowsPerPage
);

const activeDebtsCount = activeCreditRows.length;

  const handleOpenPaymentModal = (credit) => {
    setSelectedCredit(credit);
    const currentBalance = (credit.totalAmount || 0) - (credit.amountPaid || 0);
    setPaymentAmount(currentBalance);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let remainingPayment = Number(paymentAmount);
    const totalAllowedBalance =
      (selectedCredit.totalAmount || 0) - (selectedCredit.amountPaid || 0);

    if (remainingPayment > totalAllowedBalance) {
      toast.error(
        "Payment amount cannot exceed the total remaining customer balance!"
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const rawClientDebts = creditsData.filter(
        (credit) =>
          selectedCredit.allIds.includes(credit._id) &&
          (credit.totalAmount || 0) - (credit.amountPaid || 0) > 0
      );

      rawClientDebts.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      for (const debt of rawClientDebts) {
        if (remainingPayment <= 0) break;

        const debtBalance = (debt.totalAmount || 0) - (debt.amountPaid || 0);
        const paymentForThisRecord = Math.min(remainingPayment, debtBalance);

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

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.message || "Failed during cascading processing loop step."
          );
        }

        remainingPayment -= paymentForThisRecord;
      }

      toast.success(
        "Payment successfully applied across customer ledger balances!"
      );
      await fetchCredits();
      setSelectedCredit(null);
    } catch (error) {
      console.error("Repayment update integration error:", error);
      toast.error(
        error.message || "An error occurred while splitting the payment."
      );
    } finally {
      setIsSubmitting(false);
    }
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
                      <CoinsIcon height="24" width="24" />
                    </span>
                    <a href="/credit">Credit</a>
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
                          <Icon
                            icon="ri:heart-add-fill"
                            width="24"
                            height="24"
                          />
                        </span>
                        <a href="/subscription">Subscription</a>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Main ledger block */}
            <div className="credit-content-wrapper-info flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                    Credit Log Ledger (Book of Debts)
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {activeDebtsCount || 0} Active Customer Debts
                  </span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-full table-auto text-left text-xs text-gray-700 whitespace-nowrap">
                    <thead className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Phone</th>
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
                    <tbody className="divide-y divide-gray-200">
                      {paginatedCredits.length > 0 ? (
                        paginatedCredits.map((credit) => {
                          const balance =
                            (credit.totalAmount || 0) -
                            (credit.amountPaid || 0);

                          return (
                            <tr
                              key={credit._id}
                              className={`hover:bg-gray-50 ${
                                balance > 0
                                  ? "bg-red-50/30"
                                  : "bg-emerald-50/20"
                              }`}
                            >
                              <td className="py-3 px-4 font-medium">
                                {new Date(credit.createdAt).toLocaleDateString(
                                  "en-KE"
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900 capitalize">
                                {credit.customerName || "Walking Client"}
                              </td>
                              <td className="py-3 px-4">
                                {credit.customerPhone || "N/A"}
                              </td>
                              <td className="py-3 px-4 capitalize font-semibold text-emerald-700 max-w-xs truncate">
                                {credit.itemsList.join(", ")}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {credit.quantitySold} pcs
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {(credit.totalAmount || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                {(credit.amountPaid || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-red-600">
                                {balance > 0
                                  ? balance.toLocaleString()
                                  : "Cleared"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {credit.methodsList &&
                                  credit.methodsList.length > 0 ? (
                                    credit.methodsList.map((method, idx) => {
                                      let badgeColor =
                                        "bg-gray-100 text-gray-700 border-gray-300";
                                      if (method === "M-pesa")
                                        badgeColor =
                                          "bg-emerald-100 text-emerald-800 border-emerald-300";
                                      if (method === "Cash")
                                        badgeColor =
                                          "bg-blue-100 text-blue-800 border-blue-300";

                                      return (
                                        <span
                                          key={idx}
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}
                                        >
                                          {method}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">
                                      N/A
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* LAST PAID TIMESTAMP CELL */}
                              <td className="py-3 px-4 text-gray-500">
                                {Array.isArray(credit.paymentHistory) &&
                                credit.paymentHistory.length > 0 ? (
                                  (() => {
                                    // Because history is now sorted ascending, the last array item is the absolute latest payment timestamp
                                    const lastPaymentObj =
                                      credit.paymentHistory[
                                        credit.paymentHistory.length - 1
                                      ];
                                    const paymentDate =
                                      lastPaymentObj?.date || lastPaymentObj;

                                    if (
                                      paymentDate &&
                                      !isNaN(Date.parse(paymentDate))
                                    ) {
                                      const parsedDate = new Date(paymentDate);

                                      return (
                                        <div className="flex flex-col justify-center leading-tight">
                                          <span className="font-semibold text-gray-800">
                                            {parsedDate.toLocaleDateString(
                                              "en-KE"
                                            )}
                                          </span>
                                          <span className="text-[10px] text-emerald-600 font-semibold">
                                            {parsedDate.toLocaleTimeString(
                                              "en-KE",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true,
                                              }
                                            )}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <span className="text-gray-400 italic">
                                        No Payments
                                      </span>
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
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow transition-colors"
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
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow transition-colors flex items-center gap-1"
                                      title="Delete Cleared Debt Record"
                                    >
                                      <Icon
                                        icon="lucide:trash-2"
                                        width="12"
                                        height="12"
                                      />
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
                            No active credits found in this ledger cycle.
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 uppercase tracking-wide">
              Record Debt Payment
            </h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
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
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
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
                  {isSubmitting ? "Processing..." : "Submit Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreditSalesTable;
