import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      console.log("Navbar found user:", userData); // Check your console!
      setUser(userData);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="navbar-wrapper w-full fixed">
      <div className="navbar-content flex justify-between items-center">
        <div className="navbar-logo cursor-pointer">
          <h1 className="text-3xl font-bold uppercase">
            <a href="/">
              duka<span className="span">flow</span>
            </a>
          </h1>
        </div>
        <div className="navbar-login-signup">
          {user ? (
            <div
              className="user-dropdown-container"
              style={{ position: "relative" }}
            >
              <button
                type="button"
                className="navbar-signup-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                Hello, {user.FName} ▼
              </button>

              {showDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: "0",
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "10px",
                    zIndex: 1000,
                  }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "red",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="navbar-signup-btn">
              <a href="/signup">Signup</a> / <a href="/login">Login</a>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
