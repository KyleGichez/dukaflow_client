import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import axios from "axios"; // Ensure axios is imported
import "../../styles/Navbar.css";
import api from "../../../api/axios";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // 1. Combined User & Business Loader
  useEffect(() => {
    const loadData = async () => {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return;

      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      try {
        const token = localStorage.getItem("token");
        // Fetch the combined business + subscription data
        const response = await api.get("myprofile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBusiness(response.data);
      } catch (error) {
        console.error("Failed to sync profile:", error);
      }
    };

    loadData();
    window.addEventListener("userChanged", loadData);
    return () => window.removeEventListener("userChanged", loadData);
  }, []);

  // 2. Close Dropdown logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(".user-dropdown-container")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const calculateDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setBusiness(null);
    setShowDropdown(false);
    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

  // 3. Logic for Subscription Display
  const isTrial = business?.subscription?.plan === "trial";
  const expiryDate = isTrial
    ? business?.subscription?.trialEndDate
    : business?.subscription?.endDate;

  const daysRemaining = calculateDaysLeft(expiryDate);

  // Progress bar logic (assuming 30-day billing cycle)
  const progressPercentage = Math.max(
    0,
    Math.min((daysRemaining / 30) * 100, 100)
  );
  const isCritical = daysRemaining <= 3;

  return (
    <div className="navbar-wrapper w-full fixed top-0 z-[1000]">
      <div className="navbar-content flex justify-between items-center px-6 py-3">
        <div className="navbar-logo cursor-pointer">
          <h1 className="text-3xl font-bold uppercase">
            <Link to="/">
              duka<span className="span text-[var(--primary-color)]">flow</span>
            </Link>
          </h1>
        </div>

        <div className="navbar-login-signup">
          {user ? (
            <div className="user-dropdown-container relative">
              <button
                type="button"
                className="navbar-signup-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <User size={20} />
                <span className="capitalize font-medium">{user.fname}</span>
                <span
                  className={`text-[10px] transition-transform ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {showDropdown && (
                <div className="dropdown-menu absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border overflow-hidden bg-white z-[1001]">
                  {/* PROFILE HEADER */}
                  <div className="p-5 border-b bg-gray-50/50 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-sm"
                      style={{ backgroundColor: "var(--primary-color)" }}
                    >
                      {user.fname?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate mb-1 capitalize">
                        {user.fname} {user.lname}
                      </p>
                      <p className="text-xs truncate mb-1">{user.email}</p>
                      <p
                        className="text-xs font-semibold text-blue-600 truncate mb-1 capitalize"
                        style={{ color: "var(--primary-color)" }}
                      >
                        {business?.businessName ||
                          user?.businessName ||
                          "Loading Business..."}
                      </p>
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase mb-2"
                        style={{
                          backgroundColor: "var(--primary-color)",
                          color: "white",
                          opacity: 0.9,
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* SUBSCRIPTION SECTION */}
                  {user?.role !== "superadmin" && business && (
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {isTrial ? "Trial Period" : "Active Plan"}
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: isCritical
                              ? "#EF4444"
                              : "var(--primary-color)",
                          }}
                        >
                          {daysRemaining} Days Left
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full transition-all duration-700 ease-out"
                          style={{
                            width: `${progressPercentage}%`,
                            backgroundColor: isCritical
                              ? "#EF4444"
                              : "var(--primary-color)",
                          }}
                        ></div>
                      </div>

                      {isCritical && (
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            navigate("/subscription");
                          }}
                          className="mt-3 w-full py-2 text-[10px] font-bold bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition"
                        >
                          RENEW SUBSCRIPTION
                        </button>
                      )}
                    </div>
                  )}

                  {/* NAV LINKS */}
                  <div className="p-2">
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 w-full p-3 text-sm rounded-lg hover:bg-gray-100 transition text-gray-700"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full p-3 text-sm rounded-lg text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="navbar-signup-btn px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
