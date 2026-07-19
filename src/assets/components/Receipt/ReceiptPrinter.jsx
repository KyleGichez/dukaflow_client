import React from "react";
import "../../styles/ReceiptPrinter.css";

const ReceiptPrinter = ({ sale, businessData, onClose }) => {
  if (!sale) return null;

  // 1. Get the current logged-in user's data from localStorage to read active settings
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const userPhone = loggedInUser?.phone || loggedInUser?.telephone;
  const servedBy =
    `${loggedInUser?.fname || ""}`.trim() || loggedInUser?.name || "Staff";

  // 2. Prioritize user-configured store data, fall back to businessData or hardcoded strings
  const businessName =
    loggedInUser?.businessName ||
    businessData?.businessName ||
    "DukaFlow Retail";
  const location = loggedInUser?.storeLocation || businessData?.city || "Kenya";
  const poBox = loggedInUser?.poBox || "";
  const taxPin = loggedInUser?.taxPin || "";
  const phone =
    loggedInUser?.phone ||
    businessData?.phone ||
    userPhone ||
    "No Phone Contact";

  // Custom receipt footer message configured in settings
  const headerMessage =
    loggedInUser?.receiptDescription ||
    "Thank you customer for shopping with us!";

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

  const saleTimestamp = sale.createdAt || sale.date || new Date().toISOString();

  const dateString = new Date(saleTimestamp).toLocaleString("en-KE", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      id="receipt-print-area"
      className="p-4 bg-white border border-gray-300 max-w-[320px] mx-auto font-mono shadow-md print:shadow-none print:border-none print:p-0 text-black"
    >
      {/* Dynamic Header Info from Store Settings */}
      <div className="text-center mb-2">
        <h2 className="font-bold text-sm uppercase tracking-wide">
          {businessName}
        </h2>
        {/* Dynamic Custom Welcome Note */}
        <div className="text-center mt-2 text-[9px] border-t border-dotted border-gray-400 pt-2 break-words">
          <p className="font-semibold whitespace-pre-line uppercase mb-[5px]">
            {headerMessage}
          </p>
          {location && (
            <p className="text-[9px] font-semibold uppercase mb-[5px]">
              {poBox}, {location}
            </p>
          )}
          {/* {poBox && <p className="text-[10px] font-semibold">{poBox}</p>} */}
          <p className="text-[9px] font-semibold mb-[5px]">Tel: {phone}</p>
        </div>

        {/* Render KRA Tax PIN if available */}
        {/* <div>
        {taxPin && (
          <p className="text-[9px] font-bold mt-0.5 uppercase border border-black border-dotted inline-block px-1">
            PIN: {taxPin}
          </p>
        )}
        </div> */}
      </div>

      <div className="border-b border-dotted border-black my-1"></div>

      {/* Receipt Info */}
      <div className="text-[10px] mb-2 text-black">
        <div>Receipt No: #{receiptId}</div>
        <div>Date: {dateString}</div>
      </div>

      <div className="border-b border-dotted border-black my-1"></div>

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

      <div className="border-b border-dotted border-black my-1"></div>

      {/* Totals */}
      <div className="text-[11px] font-bold text-right space-y-1">
        <div className="mb-[10px]">Total: KSh {totalAmount.toFixed(2)}</div>
        <div className="font-semibold text-[10px]">
          Payment Method: {paymentMethod}
        </div>
        <div className="font-semibold text-[10px]">Served by: {servedBy}</div>
      </div>

      <div className="footer-note mt-[20px]">
        <p className="font-semibold text-gray-700 text-center text-xs">Thank you customer for shopping with us!</p>
      </div>

      {/* Action panel UI */}
      <div className="mt-4 flex gap-2 justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer"
        >
          Print Receipt
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrinter;
