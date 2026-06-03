import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import "../../styles/CreditSalesPage.css";
import CoinsIcon from "@iconify-react/lucide/coins";
import API_URL from "../../../api";
import ReceiptPrinter from "../../components/Receipt/ReceiptPrinter";

const CreditSalesTable = () => {
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === "admin";

  // Dynamic tenant-specific profile configurations passed down to ReceiptPrinter
  const businessData = {
    businessName: user?.businessName || "Frozen Bites Hotel",
    city: user?.city || "Nakuru",
    phone: user?.businessPhone || user?.phone || "+254 700 000000",
  };

  const [creditsData, setCreditsData] = useState([]);
  const [creditPage, setCreditPage] = useState(1);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Controls the on-screen modern print preview panel overlay
  const [showPreview, setShowPreview] = useState(false);
  const [activePrintSale, setActivePrintSale] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
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

  const groupCreditsByCustomerAndDate = (data) => {
    const groups = {};

    data.forEach((sale) => {
      const dateStr = new Date(sale.createdAt).toLocaleDateString("en-KE");
      const customerKey = sale.customerName
        ? sale.customerName.trim().toLowerCase()
        : "walking-client";

      const groupKey = `${customerKey}-${dateStr}`;
      
      // Store full product documents if available, fallback to basic text shape
      const itemNode = {
        productName: sale.productId?.name || sale.productName || "Unknown Item",
        quantitySold: Number(sale.quantitySold || 1),
        unitPrice: Number(sale.unitPrice || sale.productId?.price || 0),
        totalPrice: Number(sale.totalAmount || 0),
      };

      const itemName = sale.productId?.name || "Unknown Item";
      const initialMethod = sale.paymentMethod || "Credit";
      const saleTotal = Number(sale.totalAmount || 0);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...sale,
          itemsList: [itemName],
          rawItemsArray: [itemNode], // Keeps structural values for receipt rows formatting
          quantitySold: Number(sale.quantitySold || 1),
          totalAmount: saleTotal,
          paymentHistory: Array.isArray(sale.paymentHistory) ? [...sale.paymentHistory] : [],
          methodsList: [initialMethod],
          allIds: [sale._id],
        };
      } else {
        if (!groups[groupKey].itemsList.includes(itemName)) {
          groups[groupKey].itemsList.push(itemName);
          groups[groupKey].rawItemsArray.push(itemNode);
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
      const validPayments = group.paymentHistory.filter((p) => p !== null && p !== undefined);
      let totalPaidFromHistory = 0;
      validPayments.forEach((payment) => {
        const amt = typeof payment === "object" ? Number(payment.amount || 0) : Number(payment || 0);
        totalPaidFromHistory += amt;
      });

      group.aggregatedPaid = validPayments.length > 0 ? Math.max(0, totalPaidFromHistory) : 0;
      group.remainingBalance = Math.max(0, group.totalAmount - group.aggregatedPaid);
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
            Are you sure you want to delete records for 
            <span className="mx-1 font-bold">{credit.customerName || "this client"}?</span>
          </span>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => toast.dismiss(t.id)}>Cancel</button>
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
    return (
      (credit.customerName && credit.customerName.toLowerCase().includes(searchLower)) ||
      (credit.customerPhone && credit.customerPhone.toLowerCase().includes(searchLower))
    );
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
    const totalAllowedBalance = Math.max(0, Number(selectedCredit.remainingBalance || 0));

    if (typedAmount > totalAllowedBalance) {
      toast.error("Payment amount cannot exceed the total remaining customer balance!");
      setIsSubmitting(false);
      return;
    }

    let remainingPayment = typedAmount;
    let serverReceiptNo = null;

    try {
      const token = localStorage.getItem("token");
      const rawClientDebts = creditsData.filter(
        (credit) => selectedCredit.allIds.includes(credit._id)
      );
      rawClientDebts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (const debt of rawClientDebts) {
        if (remainingPayment <= 0) break;

        const currentDebtPaid = Array.isArray(debt.paymentHistory)
          ? debt.paymentHistory.reduce((acc, curr) => acc + (curr.amount || 0), 0)
          : 0;
        const debtBalance = Number(debt.totalAmount || 0) - currentDebtPaid;
        const paymentForThisRecord = Math.min(remainingPayment, debtBalance);

        if (paymentForThisRecord <= 0) continue;

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
        if (!response.ok) throw new Error(resData.message || "Failed during processing cascade loop.");
        if (resData.receiptNo) serverReceiptNo = resData.receiptNo;

        remainingPayment -= paymentForThisRecord;
      }

      toast.success("Payment processed successfully!");

      // 2. Build a mock object that perfectly conforms to ReceiptPrinter's key assumptions
      // We alter the naming fields to label it explicitly as a "Repayment Action" statement
      const mockSalePayload = {
        _id: serverReceiptNo || `PAY-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
        paymentMethod: paymentMethod,
        totalAmount: typedAmount, // Reflects the exact localized partial segment cleared right now
        items: selectedCredit.rawItemsArray.map(i => ({
          productName: `[DEBT] ${i.productName}`, // Clear structural marker for accountability
          quantitySold: i.quantitySold,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      };

      setActivePrintSale(mockSalePayload);
      setShowPreview(true);

      // Reset application states
      setSearchQuery("");
      setSelectedCredit(null);
      setPaymentAmount("");
      await fetchCredits();

    } catch (error) {
      console.error("Repayment error:", error);
      toast.error(error.message || "An error occurred while splitting the payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setActivePrintSale(null);
  };

  return (
    <>
      <div className="credit-wrapper">
        <div className="credit-content">
          <h1 className="text-2xl font-bold uppercase mb-[20px]">Credit Sales</h1>
          <div className="credit-content-wrapper flex justify-between gap-[20px]">
            {/* Sidebar menu block */}
            <div className="credit-content-wrapper-menu">
              <div className="credit-content-menu">
                <ul>
                  <li className="menu-item flex items-center gap-[10px]">
                    <span><Icon icon="material-symbols:dashboard" width="24" height="24" /></span>
                    <a href="/dashboard">Dashboard</a>
                  </li>
                  <li className="menu-item flex items-center gap-[10px]">
                    <span><Icon icon="dashicons:products" width="20" height="20" /></span>
                    <a href="/products">Products</a>
                  </li>
                  <li className="menu-item flex items-center gap-[10px]">
                    <span><Icon icon="lsicon:management-stockout-filled" width="24" height="24" /></span>
                    <a href="/stock">Stock</a>
                  </li>
                  <li className="menu-item flex items-center gap-[10px]">
                    <span><Icon icon="carbon:sales-ops" width="24" height="24" /></span>
                    <a href="/sales">Sales</a>
                  </li>
                  <li className="menu-item active flex items-center gap-[10px]">
                    <span><CoinsIcon height="24" width="24" /></span>
                    <a href="/credit">Credit</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Data View Section */}
            <div className="credit-content-wrapper-info flex-1 min-w-0 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Icon icon="lucide:search" width="18" height="18" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search customer by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 font-medium"
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Book of Debts Ledger</h3>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {activeDebtsCount || 0} Active Customers
                  </span>
                </div>

                <table className="w-full table-auto text-left text-xs text-gray-700 whitespace-nowrap">
                  <thead className="bg-gray-100 text-[10px] uppercase text-gray-600 border-b">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Ordered</th>
                      <th className="py-3 px-4 text-center">Total Qty</th>
                      <th className="py-3 px-4 text-right">Total (KSh)</th>
                      <th className="py-3 px-4 text-right">Paid (KSh)</th>
                      <th className="py-3 px-4 text-right">Balance (KSh)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedCredits.length > 0 ? (
                      paginatedCredits.map((credit) => {
                        const total = Number(credit.totalAmount || 0);
                        const balance = Math.max(0, Number(credit.remainingBalance || 0));
                        const amountPaid = Number(credit.aggregatedPaid || 0);

                        return (
                          <tr key={credit._id} className={`hover:bg-gray-50 ${balance > 0 ? "bg-red-50/30" : "bg-emerald-50/20"}`}>
                            <td className="py-3 px-4 font-medium">
                              {new Date(credit.createdAt).toLocaleDateString("en-KE")}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-900 capitalize">{credit.customerName || "Walking Client"}</p>
                              <p className="text-gray-500 text-[11px]">{credit.customerPhone || "N/A"}</p>
                            </td>
                            <td className="py-3 px-4 capitalize font-semibold text-emerald-700 max-w-xs truncate">
                              {credit.itemsList.join(", ")}
                            </td>
                            <td className="py-3 px-4 text-center">{credit.quantitySold} pcs</td>
                            <td className="py-3 px-4 text-right font-semibold">{total.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">{amountPaid.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-red-600">{balance > 0 ? balance.toLocaleString() : "Cleared"}</td>
                            <td className="py-3 px-4 text-center">
                              {balance > 0 ? (
                                <button onClick={() => handleOpenPaymentModal(credit)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow">
                                  Pay Partial
                                </button>
                              ) : (
                                <div className="flex justify-center gap-1.5 items-center">
                                  <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded">Cleared</span>
                                  <button onClick={() => confirmDelete(credit)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded text-[11px] shadow flex items-center gap-0.5">
                                    <Icon icon="lucide:trash-2" width="12" height="12" /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-400 font-medium">No credit matches found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Repayment Cash/M-Pesa Collector Modal */}
      {selectedCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 uppercase tracking-wide">Record Debt Payment</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount (KSh) *</label>
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Method *</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm">
                  <option value="Cash">Cash</option>
                  <option value="M-pesa">M-pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedCredit(null)} className="flex-1 border text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold shadow">
                  {isSubmitting ? "Processing..." : "Submit & Preview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-Screen Print Preview Modal wrapping your existing ReceiptPrinter component */}
      {showPreview && activePrintSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden max-h-[95vh]">
            
            {/* Context Header Informing the merchant what they are viewing */}
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center print:hidden">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Icon icon="lucide:eye" width="16" height="16" className="text-emerald-600" />
                Live Voucher Document Preview
              </span>
              <button onClick={handleClosePreview} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-200">
                <Icon icon="lucide:x" width="18" height="18" />
              </button>
            </div>

            {/* Scrollable Container Window holding your native layout node cleanly */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 print:bg-white print:p-0">
              <ReceiptPrinter 
                sale={activePrintSale} 
                businessData={businessData} 
                onClose={handleClosePreview} 
              />
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default CreditSalesTable;