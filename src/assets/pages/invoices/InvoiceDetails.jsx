import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import "../../styles/invoiceDetails.css";

const InvoiceViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal and Form States for Testing Payments
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  // 🛠️ Standardized initial choice to match backend exactly
  const [paymentMethod, setPaymentMethod] = useState("M-pesa Paybill");
  const [paymentRef, setPaymentRef] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoiceData = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data);

      // Fetch accompanying payments history ledger
      const paymentsRes = await api.get(`/invoices/${id}/payments`);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      console.error("Error reading invoice transaction state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setValidationError("Please enter a valid payment amount.");
      return;
    }

    if (Number(paymentAmount) > invoice.balance) {
      setValidationError(
        `Amount exceeds outstanding balance of KES ${invoice.balance.toLocaleString()}`
      );
      return;
    }

    // 🛠️ Audit Validation Rule: Block non-cash methods missing a reference tag
    if (paymentMethod !== "Cash" && !paymentRef.trim()) {
      setValidationError(
        `A transaction reference code/ID is required for ${paymentMethod} settlements.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Hitting the backend endpoint: exports.addInvoicePayment
      await api.patch(`/invoices/${id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        // Default to safe text token for pure drawer cash tracking
        reference:
          paymentMethod === "Cash"
            ? "CASH-DRAWER"
            : paymentRef.trim().toUpperCase(),
      });

      // Clear form inputs & refresh page data metrics
      setPaymentAmount("");
      setPaymentRef("");
      setValidationError("");
      setIsModalOpen(false);
      await fetchInvoiceData();
    } catch (err) {
      console.error("Payment registration testing crashed:", err);
      setValidationError("Failed to record transaction payment link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-center font-medium text-gray-500">
        Loading Transaction Ledger...
      </div>
    );
  if (!invoice)
    return (
      <div className="p-6 text-center text-red-500 font-medium">
        Invoice record not found.
      </div>
    );

  return (
    <div className="mt-[100px] max-w-3xl mx-auto p-8 bg-white shadow-md my-6 rounded-lg border border-gray-200 invoice-container relative">
      {/* Navigation & Utilities Controls */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={() => navigate("/invoice")}
          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 font-medium text-sm"
        >
          &larr; Back to Invoice Registry
        </button>

        <div className="flex gap-2">
          {/* 🎯 TEST PAYMENT BUTTON (Hidden when invoice is fully paid) */}
          {invoice.balance > 0 && (
            <button
              onClick={() => {
                setValidationError("");
                setIsModalOpen(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition-all font-medium text-sm flex items-center gap-1"
            >
              💰 Pay
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-900 transition-all font-medium text-sm flex items-center gap-2"
          >
            &#128424;&#65039; Print
          </button>
        </div>
      </div>

      {/* Invoice Meta Headers */}
      <div className="border-b pb-6 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            INVOICE REPORT
          </h1>
          <p className="text-sm text-gray-600 font-mono mt-0.5">
            #{invoice.invoiceNumber}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Issued:{" "}
            {invoice.createdAt
              ? new Date(
                  invoice.createdAt.endsWith("Z")
                    ? invoice.createdAt
                    : `${invoice.createdAt}Z`
                ).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour12: true,
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A"}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
              invoice.status === "PAID"
                ? "bg-green-100 text-green-800"
                : invoice.status === "PARTIAL"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {invoice.status}
          </span>
          <p className="text-sm text-gray-700 font-medium mt-3">
            Due:{" "}
            <span className="text-gray-900 font-semibold">
              {invoice.dueDate && invoice.dueDate !== "Immediate Settlement"
                ? new Date(invoice.dueDate).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                : "Immediate Settlement"}
            </span>
          </p>
        </div>
      </div>

      {/* Business & Client Profiles Metadata Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Billed To (Customer)
          </h3>
          {invoice.customerName?.trim() || invoice.customer?.name ? (
            <>
              <p className="font-semibold text-gray-900">
                {invoice.customerName || invoice.customer?.name}
              </p>
              {(invoice.customerPhone || invoice.customer?.phone) && (
                <p className="text-gray-600 font-mono text-xs mt-1">
                  &#128222; {invoice.customerPhone || invoice.customer?.phone}
                </p>
              )}
              {(invoice.customerEmail || invoice.customer?.email) && (
                <p className="text-gray-500 text-xs mt-0.5">
                  &#9993;&#65039;{" "}
                  {invoice.customerEmail || invoice.customer?.email}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic">Walk-in Retail Customer</p>
          )}
        </div>
        <div className="flex justify-between bg-gray-50 p-4 rounded-md border border-gray-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Pay Via M-pesa Paybill
            </h3>
            <>
              <p className="font-semibold text-xs text-gray-500 mb-[5px]">
                Business No: 4051509
              </p>
              <p className="font-semibold text-xs text-gray-500">
                Account No: {invoice.invoiceNumber}
              </p>
            </>
          </div>
          {/* <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Pay Via Bank Transfer
            </h3>
            <>
              <p className="font-semibold text-xs text-gray-500 mb-[5px]">
                Paybill: 247247
              </p>
              <p className="font-semibold text-xs text-gray-500">
                Account: {invoice.invoiceNumber}
              </p>
            </>
          </div> */}
        </div>
        <div></div>
      </div>

      {/* Line Items Table Breakdown */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider">
              <th className="p-3">Product Specifications</th>
              <th className="p-3 text-right">Unit Cost</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-b hover:bg-gray-50/50 text-sm text-gray-600 transition-colors"
                >
                  <td className="p-3 font-medium text-gray-800">
                    {item.productName ||
                      item.name ||
                      (item.productId && item.productId.name) ||
                      "Unknown Item"}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {Number(item.price || item.unitPrice || 0).toLocaleString()}{" "}
                    KES
                  </td>
                  <td className="p-3 text-center font-mono text-gray-900">
                    {item.quantity || item.quantitySold || 0}
                  </td>
                  <td className="p-3 text-right font-semibold text-gray-900 font-mono">
                    {Number(
                      item.total ||
                        item.totalPrice ||
                        item.price * item.quantity ||
                        0
                    ).toLocaleString()}{" "}
                    KES
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="p-4 text-center text-gray-400 italic text-sm"
                >
                  No products attached to this order receipt record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Matrix Summary Block */}
      <div className="w-full md:w-1/2 ml-auto border-t border-gray-200 pt-4 space-y-2.5 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Gross Aggregate Total:</span>
          <span className="font-semibold text-gray-900 font-mono">
            {Number(invoice.totalAmount).toLocaleString()} KES
          </span>
        </div>
        <div className="flex justify-between items-center text-green-600">
          <span>Amount Paid / Deposited:</span>
          <span className="font-medium font-mono">
            - {Number(invoice.amountPaid).toLocaleString()} KES
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-2.5 text-base font-bold text-gray-900">
          <span>Outstanding Debt Balance:</span>
          <span
            className={`font-mono ${
              invoice.balance > 0 ? "text-red-600" : "text-green-700"
            }`}
          >
            {Number(invoice.balance).toLocaleString()} KES
          </span>
        </div>
      </div>

      {/* Payment Collection History Log */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Payment Collection History
        </h3>
        {payments && payments.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-semibold uppercase">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Payment Method</th>
                  <th className="p-2.5">Reference Code</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pmt) => (
                  <tr
                    key={pmt.id}
                    className="border-b border-gray-100 text-gray-700"
                  >
                    <td className="p-2.5 font-mono">
                      {(() => {
                        const dateObj = new Date(
                          pmt.paymentDate?.endsWith("Z")
                            ? pmt.paymentDate
                            : `${pmt.paymentDate}Z`
                        );
                        return (
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-medium">
                              {dateObj.toLocaleDateString("en-KE", {
                                dateStyle: "short",
                              })}
                            </span>
                            <span className="text-xs text-gray-500 uppercase tracking-tight mt-0.5">
                              {dateObj.toLocaleTimeString("en-KE", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium text-[10px] ${
                          pmt.method === "M-pesa" ||
                          pmt.method === "M-pesa Paybill"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : pmt.method === "Cash"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {pmt.method}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-gray-900 font-medium">
                      {pmt.reference || "CASH-DRAWER"}
                    </td>
                    <td className="p-2.5 text-right font-bold font-mono text-gray-900">
                      {Number(pmt.amount).toLocaleString()} KES
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded border border-dashed">
            No successful payment installations recorded for this credit
            allocation yet.
          </p>
        )}
      </div>

      {/* 🛠️ ENHANCED RECONCILIATION POPUP MODAL CONTROL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1">
              🛠️ Simulate Customer Repayment
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Amount to Remit (KES) (Max: {invoice.balance.toLocaleString()}
                  )
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full p-2 border rounded font-mono text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setPaymentRef("");
                    setValidationError("");
                  }}
                  className="w-full p-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
                >
                  <option value="M-pesa Paybill">M-pesa Paybill</option>
                  <option value="Bank Transfer">
                    Bank Transfer (EFT/RTGS)
                  </option>
                  <option value="Cheque">Commercial Cheque</option>
                  <option value="Cash">Cash (Physical Till)</option>
                </select>
              </div>

              {/* 🛠️ Dynamic Reference Tracker: Hidden cleanly when Cash is selected */}
              {paymentMethod !== "Cash" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {paymentMethod === "M-pesa Paybill"
                      ? "M-pesa Code (10 characters)"
                      : "Transaction Ref / Cheque No."}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder={
                      paymentMethod === "M-pesa Paybill"
                        ? "e.g. SJD48FHK92"
                        : "e.g. CHQ-005612"
                    }
                    className="w-full p-2 border rounded font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              )}

              {/* 🛠️ Local validation feedback banner */}
              {validationError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200 font-medium">
                  ❌ {validationError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Commit Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceViewPage;
