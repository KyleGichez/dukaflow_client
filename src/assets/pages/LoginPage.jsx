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
      const res = await api.post("/auth/login", credentials);

      const user = res.data.user;
  
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
  
      window.dispatchEvent(new Event("userChanged"));
  
      navigate("/dashboard");
  
    } catch (err) {
      console.error("Login Error:", err);
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
