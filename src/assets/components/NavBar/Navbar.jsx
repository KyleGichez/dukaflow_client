import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // 1. Combined User Loader & Event Listener
  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem("user");
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    loadUser();
    window.addEventListener("userChanged", loadUser);
    return () => window.removeEventListener("userChanged", loadUser);
  }, []);

  // 2. Close Dropdown when clicking outside
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
    const diff = new Date(expiryDate) - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowDropdown(false);
    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

  // 3. Safe Subscription Math
  const daysRemaining = user
    ? calculateDaysLeft(user.trialEndDate || user.subscription?.endDate)
    : 0;
  // Cap percentage between 0 and 100 to prevent bar overflow
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
              duka<span className="span">flow</span>
            </Link>
          </h1>
        </div>

        <div className="navbar-login-signup">
          {user ? (
            <div className="user-dropdown-container relative">
              <button
                type="button"
                className="navbar-signup-btn flex items-center gap-2"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <User size={20} />
                <span className="capitalize">{user.FName}</span>
                <span
                  className={`transition-transform ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {showDropdown && (
                <div className="dropdown-menu absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 bg-white text-left">
                  {/* USER PROFILE HEADER */}
                  <div className="p-5 border-b bg-gray-50/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-sm">
                      {user.FName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-color)] truncate capitalize">
                        {user.FName} {user.LName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.Email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* SUBSCRIPTION PROGRESS BAR */}
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {user.subscription?.status === "active"
                          ? "Active Subscription"
                          : "Trial Period"}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isCritical
                            ? "text-red-500"
                            : "text-[var(--primary-color)]"
                        }`}
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
                        className="mt-3 w-full py-1.5 text-[10px] font-bold bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition"
                      >
                        RENEW NOW
                      </button>
                    )}
                  </div>

                  {/* NAVIGATION LINKS */}
                  <div className="p-2">
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 w-full p-3 text-sm rounded-lg hover:bg-gray-100 transition text-[var(--text-color)]"
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
            <button type="button" className="navbar-signup-btn">
              <Link to="/signup">Signup</Link> / <Link to="/login">Login</Link>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
