import React, { useState } from "react";
import axios from "axios";
import api from "../../../api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import API_URL from "../../../api";
import "../../styles/LoginPage.css";

const LoginPage = () => {  
  const [credentials, setCredentials] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate(); 

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // --- OFFLINE MODE ---
    if (!navigator.onLine) {
      console.log("Offline detected...");
      if (window.electronAPI) {
        try {
          const response = await window.electronAPI.attemptOfflineLogin(
            credentials
          );

          if (response.success) {
            console.log("Logged in offline successfully!", response.user);

            // Mock local storage tokens/profiles just like online mode
            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));

            // [FIX]: Extract and save the cached business metadata from Electron to localStorage
            // so that Navbar can render the subscription bar while offline.
            if (response.business) {
              localStorage.setItem(
                "business_profile",
                JSON.stringify(response.business)
              );
            } else if (response.user?.business) {
              // Fallback if your desktop database embeds business parameters inside the user object
              localStorage.setItem(
                "business_profile",
                JSON.stringify(response.user.business)
              );
            }

            // Trigger state updates across the app
            window.dispatchEvent(new Event("userChanged"));

            // Role-based routing
            const userRole = response.user?.role;
            if (userRole === "superadmin") {
              navigate("/admin/dashboard");
            } else {
              navigate("/dashboard");
            }
          } else {
            toast.error(response.message || "Offline login failed.");
          }
        } catch (err) {
          console.error("Offline login execution error:", err);
          toast.error("An error occurred during offline login.");
        } finally {
          setIsSubmitting(false);
        }
      } else {
        toast.error("Offline login is only available on the Desktop app.");
        setIsSubmitting(false);
      }
      return;
    }

    // --- ONLINE MODE ---
    try {
      // 🛠️ FIX: Change 'axios.post' to your configured local 'api.post' instance
      const response = await api.post(
        "/auth/login", // If your api client has a baseURL set to localhost:5000, just use this!
        credentials
      );

      console.log("Logged in online structural payload:", response.data);

      const data = response.data;

      if (data.token) {
        localStorage.setItem("token", data.token);
      } else {
        throw new Error(
          "Security verification token missing from server engine payload."
        );
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));

        // Inject a fallback business profile structure if the backend doesn't provide one
        // This stops your Navbar/Sidebar layout components from throwing a null pointer crash and forcing a logout
        const businessMetadata = data.business || {
          id: data.user.businessId || 1,
          businessName: data.user.businessName || "DukaFlow Retailer",
          subscriptionPlan:
            data.user.role === "superadmin" ? "lifetime" : "trial",
        };

        localStorage.setItem(
          "business_profile",
          JSON.stringify(businessMetadata)
        );

        // Persist to Electron cache for offline sync records
        if (window.electronAPI) {
          await window.electronAPI.cacheOfflineCredentials({
            phone: credentials.phone,
            password: credentials.password,
            user: data.user,
            business: businessMetadata,
          });
        }
      }

      // Execute routing based on role mappings safely
      const userRole = data.user?.role;
      if (userRole === "superadmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }

      // 2. Defer the event dispatch slightly to give the layout time to bind listeners
      setTimeout(() => {
        window.dispatchEvent(new Event("userChanged"));
      }, 50);
    } catch (err) {
      console.error("Online Login Error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Login failed."
      );
    } finally {
      setIsSubmitting(false);
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
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={credentials.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              <div className="form-input">
                <label htmlFor="password">Password</label>
                <div
                  className="password-input-wrapper"
                  style={{ position: "relative" }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    style={{ width: "100%", paddingRight: "40px" }}
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
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </fieldset>
        </form>
        <div className="account-signup flex justify-between items-center my-2">
          <span>
            <input type="checkbox"></input> Remember me?
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
