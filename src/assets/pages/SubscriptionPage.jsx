import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const Subscription = ({ onClose }) => {
  // 1. New State for Plan Selection
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [phoneNumber, setPhoneNumber] = useState("254");
  const [loading, setLoading] = useState(false);

  // Define pricing logic
  const price = selectedPlan === "monthly" ? 1500 : 18000;

  const handlePayment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://dukaflow-server.onrender.com/api/payments/stk-push",
        { phone: phoneNumber, amount: price, plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        "STK Push Sent! Check your phone to enter your M-Pesa PIN."
      );
      onClose();
    } catch (err) {
      toast.error(
        "Payment failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
        {/* Header with M-Pesa Green Branding */}
        <div className="bg-[#49aa47] p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1 rounded-full">
              <svg
                className="w-6 h-6"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M30 70L45 30L60 70H52L45 50L38 70H30Z"
                  fill="#49aa47"
                />
                <circle cx="70" cy="35" r="10" fill="#e31a22" />
              </svg>
            </div>
            <span className="font-extrabold tracking-tight text-lg">
              Lipa Na M-PESA
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* 2. Plan Selection UI */}
          <div className="mb-6">
            <h2 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-3 text-center">
              Select Your Plan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                  selectedPlan === "monthly"
                    ? "border-[#49aa47] bg-green-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="text-sm font-bold">Monthly</span>
                <span className="text-lg font-mono font-black text-gray-800">
                  1,500
                </span>
              </button>
              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center relative ${
                  selectedPlan === "yearly"
                    ? "border-[#49aa47] bg-green-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="absolute -top-2 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-bold">
                  Best Value
                </span>
                <span className="text-sm font-bold">Yearly</span>
                <span className="text-lg font-mono font-black text-gray-800">
                  18,000
                </span>
              </button>
            </div>
          </div>
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Total Amount:</span>
              <span className="text-xl font-mono font-bold text-[#49aa47]">
                Ksh {price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              M-Pesa Phone Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="2547XXXXXXXX"
                className="w-full border-2 border-gray-200 focus:border-[#49aa47] outline-none p-3 rounded-xl pl-12 transition-all font-mono text-lg"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-3 py-4 
                bg-[#49aa47] hover:bg-[#3d8e3b] text-white font-bold rounded-xl 
                transition-all transform active:scale-95 shadow-md
                ${loading ? "opacity-70 cursor-not-allowed" : ""}
              `}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Waiting for PIN...</span>
                </>
              ) : (
                <span className="text-lg">Pay with M-Pesa</span>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Cancel Payment
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 uppercase tracking-tighter">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Secure Payment Gateway
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
