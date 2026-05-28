import React from "react";
import "../../styles/ReceiptPrinter.css";

const ReceiptPrinter = ({ sale, businessData, onClose }) => {
  if (!sale) return null;

  // 1. Get the current logged-in user's phone number as a fallback
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const userPhone = loggedInUser?.phone || loggedInUser?.telephone;

  // 2. Extract Business Name and City based on actual console log structure
  const businessName = businessData?.businessName || "Frozen Bites Hotel";
  const city = businessData?.city || "Nakuru";

  // 3. Fallback path chain for phone number
  const phone = businessData?.phone || userPhone || "No Phone Contact";

  // 📈 FIXED: Look for sale.items (from the checkout basket) or sale.products (from the DB)
  const incomingItems = sale.items || sale.products;

  const receiptItems =
    incomingItems && Array.isArray(incomingItems)
      ? incomingItems.map((item) => ({
          name:
            item.productName ||
            item.productId?.name ||
            item.name ||
            "Item Sold",
          quantity: item.quantitySold || item.quantity || 1,
          price: item.unitPrice || item.price || item.productId?.price || 0,
          total: item.totalPrice || item.total || 0,
        }))
      : [
          {
            name: sale.productId?.name || sale.productName || "Item Sold",
            quantity: sale.quantitySold || 1,
            price: sale.unitPrice || sale.productId?.price || 0,
            total: sale.totalPrice || 0,
          },
        ];

  // Calculate total safely
  const totalAmount =
    sale.totalAmount ||
    sale.total ||
    sale.totalPrice ||
    receiptItems.reduce((acc, item) => acc + item.total, 0);

  const paymentMethod = sale.paymentMethod || "Cash";
  const receiptId = sale._id
    ? sale._id.toString().slice(-6).toUpperCase()
    : "TEMP";
  // Data normalization for timestamps
  const saleTimestamp = sale.createdAt || sale.date || new Date().toISOString();

  // Explicit formatting configuration to force date and time to show up cleanly
  const dateString = new Date(saleTimestamp).toLocaleString("en-KE", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // Set to false if you prefer 24-hour military format (e.g. 14:30)
  });
  return (
    <div
      id="receipt-print-area"
      className="p-4 bg-white border border-gray-300 max-w-[320px] mx-auto font-mono shadow-md print:shadow-none print:border-none print:p-0"
    >
      {/* Header Info */}
      <div className="text-center mb-2">
        <h2 className="font-bold text-sm uppercase">{businessName}</h2>
        <p className="text-[10px] font-semibold">Location: {city}</p>
        <p className="text-[10px] font-semibold">Tel: {phone}</p>
      </div>

      <div className="border-b border-dashed border-black my-1"></div>

      {/* Receipt Info */}
      <div className="text-[10px] mb-2 text-black">
        <div>Receipt: #{receiptId}</div>
        <div>Date: {dateString}</div>
      </div>

      <div className="border-b border-dashed border-black my-1"></div>

      {/* Items Table */}
      <table className="w-full text-left text-[11px] mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="pb-1">Item</th>
            <th className="text-center pb-1">Qty</th>
            <th className="text-right pb-1">Price</th>
          </tr>
        </thead>
        <tbody>
          {receiptItems.map((item, index) => {
            // If total isn't explicitly calculated, compute it dynamically
            const itemTotal = item.total || item.quantity * item.price;

            return (
              <tr key={index}>
                <td className="py-1 truncate max-w-[40mm] capitalize">
                  {item.name}
                </td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-b border-dashed border-black my-1"></div>

      {/* Totals */}
      <div className="text-[11px] font-bold text-right space-y-1">
        <div>Total: KSh {totalAmount.toFixed(2)}</div>
        <div className="text-[10px] font-normal">Payment: {paymentMethod}</div>
      </div>

      <div className="text-center mt-4 text-[9px]">
        <p>Thank you for shopping with us!</p>
        <p>Powered by DukaFlow</p>
      </div>

      {/* Action panel UI */}
      <div className="mt-4 flex gap-2 justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors"
        >
          Print Receipt
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrinter;
