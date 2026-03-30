import React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; // Added Link
import { User, Settings, LogOut } from "lucide-react"; // Nice icons for the menu
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    };

    loadUser();
    window.addEventListener("userChanged", loadUser);
    return () => window.removeEventListener("userChanged", loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

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
                <User size={18} />
                <span>{user.FName}</span>
                <span className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showDropdown && (
                <div className="dropdown-menu absolute right-0 mt-2 w-64 rounded-xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {/* USER INFO HEADER */}
                  <div className="p-4 border-b bg-gray-50/50">
                    <p className="font-bold text-[var(--text-color)]">{user.FName} {user.LName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.Email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                      {user.role || 'Member'}
                    </span>
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