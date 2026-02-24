import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
      // 2. Pass 'credentials' here (not formData)
      const res = await axios.post("http://localhost:5000/api/auth/login", credentials);
      
      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        toast.success("Login successful!", {
          style: {
            background: "#16a34a",
            color: "#fff",
            duration:5000,
          },
        });
        
        // Navigate normally
        navigate("/dashboard");
        
        // If you MUST refresh to update a legacy Navbar:
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Full Login Error:", err);
    
      // Extract the message or fallback to a default
      const errorMessage = err.response?.data?.message || "Invalid Email or Password";

      toast.error(errorMessage, {
        style: {
          background: "#dc2626", // Red-600
          color: "#fff",
          fontWeight: "500",
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#dc2626',
        },
      });
    }
  }

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
