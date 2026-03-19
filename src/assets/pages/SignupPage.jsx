import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import API_URL from "../../api";
import "../styles/SignupPage.css";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    CompanyName: "",
    FName: "",
    LName: "",
    Email: "",
    Phone: "",
    Password: "",
    City: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const kenyanTowns = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Kehancha",
    "Ruiru",
    "Kikuyu",
    "Kangundo-Tala",
    "Malindi",
    "Naivasha",
    "Kitui",
    "Machakos",
    "Thika",
    "Athiriver",
    "Karuri",
    "Nyeri",
    "Kilifi",
    "Garissa",
    "Voi",
    "Mumias",
    "Bomet",
    "Iten",
    "Narok",
  ].sort();

  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/signup`, formData);

      if (res.status === 201) {
        toast.success("Account created successfully! Please login.", {
          style: {
            background: "#16a34a",
            color: "#fff",
          },
        });
        navigate("/login");
      }
    } catch (err) {
      console.error("Signup failed:", err.response?.data || err.message);
      const errorMessage =
        err.response?.data?.message ||
        "Error! Something went on during signup.";

      toast.error(errorMessage, {
        style: {
          background: "#dc2626", // Red-600
          color: "#fff",
          fontWeight: "500",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#dc2626",
        },
      });
    }
  };

  return (
    <div className="signuppage-wrapper">
      <div className="signuppage-content">
        <form onSubmit={handleSubmit} method="" className="signup-form">
          <legend className="mb-2">Register Your Business:</legend>
          <fieldset>
          <div className="form-input">
                <label htmlFor="CompanyName">Business Name</label>
                <input
                  type="text"
                  name="CompanyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  required
                />
              </div>
            <div className="flex gap-[10px]">
              <div className="form-input">
                <label htmlFor="FName">First Name</label>
                <input
                  type="text"
                  name="FName"
                  value={formData.FName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="form-input">
                <label htmlFor="LName">Last Name</label>
                <input
                  type="text"
                  name="LName"
                  value={formData.LName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            <div className="flex gap-[10px]">
              <div className="form-input">
                <label htmlFor="Email">Email Address</label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div className="form-input">
                <label htmlFor="Phone">Phone</label>
                <input
                  type="tel"
                  name="Phone"
                  value={formData.Phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>
            <div className="flex gap-[10px]">
              <div className="form-input">
                <label htmlFor="Password">Password</label>
                <div
                  className="password-input-wrapper"
                  style={{ position: "relative" }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    name="Password"
                    value={formData.Password}
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
              <div className="form-input">
                <label htmlFor="City">Town / City</label>
                <select
                  name="City"
                  value={formData.City}
                  onChange={handleChange}
                  className="w-full py-3 border rounded" // Add your specific CSS classes here
                  required
                >
                  <option value="" disabled>
                    -- Select your town --
                  </option>
                  {kenyanTowns.map((town) => (
                    <option key={town} value={town}>
                      {town}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="submit-btn-wrapper">
              <button type="submit" className="submit-btn">
                Submit
              </button>
            </div>
          </fieldset>
        </form>
        <div className="account-login text-right my-2">
          <a href="/login">Already have an account ? Login</a>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
