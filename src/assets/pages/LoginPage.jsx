import React, { useState } from "react";
import axios from "axios";
import api from "../../../src/api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import API_URL from "../../api";
import "../styles/LoginPage.css";

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ Phone: "", Password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. Use the 'api' instance instead of raw axios
      const res = await api.post("/auth/login", credentials);

      if (res.status === 200) {
        // 2. Store the token and user details
        // This includes the ownerId and role we added to the backend!
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success(`Welcome back, ${res.data.user.FName}!`, {
          style: {
            background: "#16a34a",
            color: "#fff",
          },
          duration: 3000,
        });

        // SAVE THE EXPIRY DATE FOR OFFLINE CHECKS
        if (user.trialEndDate) {
          localStorage.setItem("expiry", user.trialEndDate);
        } else if (user.subscription?.endDate) {
          localStorage.setItem("expiry", user.subscription.endDate);
        }

        // 3. Navigation Logic
        // If your Navbar depends on localStorage and doesn't use Context,
        // navigate first, THEN reload to ensure the new user state is picked up.
        navigate("/dashboard");

        // Optional: Only use this if your Navbar doesn't update automatically
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (err) {
      console.error("Login Error:", err);

      // 4. Enhanced Error Feedback
      const errorMessage =
        err.response?.data?.message || "Invalid Phone or Password";

      toast.error(errorMessage, {
        style: {
          background: "#dc2626",
          color: "#fff",
          fontWeight: "500",
        },
      });
    }
  };

  return (
    <div className="loginpage-wrapper">
      <div className="loginpage-content">
        <form onSubmit={handleLogin} className="login-form">
          <legend className="mb-2">Login Form:</legend>
          <fieldset>
            <div className="flex flex-col gap-[10px]">
              <div className="form-input">
                <label htmlFor="Phone">Phone</label>
                <input
                  type="tel"
                  name="Phone"
                  value={credentials.Phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              <div className="form-input">
                <label htmlFor="Password">Password</label>
                <div
                  className="password-input-wrapper"
                  style={{ position: "relative" }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    name="Password"
                    value={credentials.Password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    style={{ width: "100%", paddingRight: "40px" }} // Space for the button
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <div className="submit-btn-wrapper">
              <button type="submit" className="submit-btn">
                Submit
              </button>
            </div>
          </fieldset>
        </form>
        <div className="account-signup flex justify-between items-center my-2">
          <span>
            <input type="checkbox"></input> Remember me ?
          </span>
          <a href="/signup">Don't have an account yet ? Signup</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
