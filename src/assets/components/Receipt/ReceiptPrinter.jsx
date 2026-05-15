import React from 'react';
import "../../styles/ReceiptPrinter.css";

const ReceiptPrinter = ({ sale, businessData, onClose }) => {
  if (!sale) return null;

  // 1. Get the current logged-in user's phone number as a fallback
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const userPhone = loggedInUser?.phone || loggedInUser?.telephone;

  // 2. Extract Business Name and City based on your actual console log structure
  const businessName = businessData?.businessName || "Frozen Bites Hotel";
  const city = businessData?.city || "Nakuru";
  
  // 3. Fallback path chain for phone number
  const phone = businessData?.phone || userPhone || "No Phone Contact";

  // Data normalization for products array
  const receiptItems = sale.products && Array.isArray(sale.products) 
    ? sale.products 
    : [
        {
          name: sale.productId?.name || sale.productName || "Item Sold",
          quantity: sale.quantitySold || 1,
          price: sale.unitPrice || sale.productId?.price || 0,
          total: sale.totalPrice || 0
        }
      ];

  const totalAmount = sale.totalAmount || sale.totalPrice || 
    receiptItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  const paymentMethod = sale.paymentMethod || "Cash";
  const receiptId = sale._id ? sale._id.toString().slice(-6).toUpperCase() : "TEMP";
  const saleTimestamp = sale.createdAt || sale.date || Date.now();
  const dateString = new Date(saleTimestamp).toLocaleString('en-KE', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  return (
    <div 
      id="receipt-print-area" 
      className="p-4 bg-white border border-gray-300 max-w-[320px] mx-auto font-mono shadow-md print:shadow-none print:border-none print:p-0"
    >
      {/* Header Updated with Exact Keys */}
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
            const currentPrice = item.price || item.productId?.price || 0;
            const lineTotal = item.total || (item.quantity * currentPrice);
            
            return (
              <tr key={index}>
                <td className="py-1 truncate max-w-[40mm]">
                  {item.productId?.name || item.name}
                </td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">
                  {lineTotal.toFixed(2)}
                </td>
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