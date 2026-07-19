import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const Subscription = ({ onClose }) => {
  // 1. Updated State for Plan Selection to include 'custom'
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [customAmount, setCustomAmount] = useState(1000);
  const [phoneNumber, setPhoneNumber] = useState("254");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Dynamic pricing calculation helper
  const getPrice = () => {
    if (selectedPlan === "monthly") return 2500;
    if (selectedPlan === "yearly") return 27000;
    return Number(customAmount);
  };

  const price = getPrice();

  const handlePayment = async () => {
    if (selectedPlan === "custom" && price < 1000) {
      return toast.error(
        "The minimum custom subscription allowed is Ksh 1,000"
      );
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://dukaflow-server.onrender.com/api/payments/stk-push",
        {
          phone: phoneNumber,
          amount: price,
          plan: selectedPlan,
          isSubscription: true,
          businessId: "",
        },
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
        </div>

        <div className="p-6">
          {/* Plan Selection UI */}
          <div className="mb-4">
            <h2 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-3 text-center">
              Select Your Plan
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                  selectedPlan === "monthly"
                    ? "border-[#49aa47] bg-green-50"
                    : "border-gray-100"
                }`}
              >
                <span className="text-xs font-bold">Monthly</span>
                <span className="text-sm font-black text-gray-800">2,500</span>
              </button>

              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center relative ${
                  selectedPlan === "yearly"
                    ? "border-[#49aa47] bg-green-50"
                    : "border-gray-100"
                }`}
              >
                <span className="absolute -top-2 bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded-full uppercase font-bold">
                  10% Off
                </span>
                <span className="text-xs font-bold">Yearly</span>
                <span className="text-sm font-black text-gray-800">27,000</span>
              </button>

              <button
                onClick={() => setSelectedPlan("custom")}
                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                  selectedPlan === "custom"
                    ? "border-[#49aa47] bg-green-50"
                    : "border-gray-100"
                }`}
              >
                <span className="text-xs font-bold">Custom</span>
                <span className="text-sm font-black text-gray-800">Flex</span>
              </button>
            </div>
          </div>

          {/* Conditional Custom Amount Range Input */}
          {selectedPlan === "custom" && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-blue-700">
                  Custom Amount (Min Ksh 1,000)
                </label>

                {/* ⚡ REAL-TIME PRO-RATA PREVIEW DAYS LABEL */}
                {customAmount >= 1000 ? (
                  <span className="text-xs bg-blue-600 text-white font-mono px-2 py-0.5 rounded animate-pulse">
                    ⏳ {Math.floor(Number(customAmount) / (2500 / 30))} Days
                    Access
                  </span>
                ) : (
                  <span className="text-[10px] text-red-500 font-bold">
                    Amount too low
                  </span>
                )}
              </div>

              <input
                type="number"
                min="1000"
                max="2500"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg outline-none font-mono text-base"
                placeholder="e.g. 1500"
              />

              <p className="text-[10px] text-blue-500 mt-1 italic">
                Calculated at Ksh 83 per day based on the premium package
                value.
              </p>
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
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
              M-pesa Phone Number
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
              className={`w-full flex items-center justify-center gap-3 py-4 bg-[#49aa47] hover:bg-[#3d8e3b] text-white font-bold rounded-xl transition-all transform active:scale-95 shadow-md ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Waiting for PIN...</span>
                </>
              ) : (
                <span className="text-lg">Pay with M-pesa</span>
              )}
            </button>
            <button
              onClick={() => navigate("/staff")}
              disabled={loading}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
