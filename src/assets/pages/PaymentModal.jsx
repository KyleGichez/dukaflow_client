import React, { useState } from 'react';
import axios from 'axios';

const PaymentModal = ({ plan, amount, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('254'); // Default Kenyan format
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://dukaflow-server.onrender.com/api/payments/stk-push', 
        { phone: phoneNumber, amount, plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("STK Push Sent! Check your phone.");
      onClose();
    } catch (err) {
      alert("Payment failed: " + err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Pay for {plan} Plan</h2>
        <p className="text-gray-600 mb-4">Amount: <strong>Ksh {amount.toLocaleString()}</strong></p>
        
        <label className="block text-sm font-medium mb-1">M-Pesa Phone Number</label>
        <input 
          type="text" 
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="2547XXXXXXXX"
          className="w-full border p-2 rounded mb-4"
        />

        <div className="flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-200 py-2 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded font-bold"
          >
            {loading ? "Sending..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;