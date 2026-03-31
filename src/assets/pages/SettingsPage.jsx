import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import API_URL from "../../api";
import "../styles/SettingsPage.css";

const SettingsPage = () => {

  const initialFormState = {
    FName: "",
    LName: "",
    currentPassword: "",
    newPassword: "",
  }
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [formData, setFormData] = useState(initialFormState);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const toggleCurrentPassword = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPassword = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token"); // Get token
      const res = await axios.put(
        `${API_URL}/api/auth/settings`, 
        formData, 
        {
          headers: { Authorization: `Bearer ${token}` } // Critical!
        }
      );
      
      // Update local storage so the Navbar changes immediately
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("userChanged")); // Refresh Navbar
      toast.success("Profile updated successfully!");

      setFormData(initialFormState);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Profile update failed!");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto settings-wrapper">
      <div className="settings-content">
        <h1 className="text-2xl font-bold uppercase mb-6">Settings</h1>
        {/* Theme Section */}
        <section className="mb-10 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Choose Theme:</h2>
          <div className="flex flex-wrap gap-4">
            {["light", "dark", "mint", "warm"].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-4 py-2 rounded capitalize border ${
                  theme === t
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : "border-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
        {/* Profile Section */}
        <form
          onSubmit={handleUpdate}
          className="space-y-4 p-4 border rounded-lg bg-white shadow-sm"
        >
          <h2 className="text-lg font-semibold">Update Profile</h2>
          <div className="form-input">
            <label htmlFor="name">First Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your first name"
              value={formData.FName}
              onChange={(e) =>
                setFormData({ ...formData, FName: e.target.value })
              }
            />
          </div>
          <div className="form-input">
            <label htmlFor="LName">Last Name</label>
            <input
              type="text"
              name="LName"
              placeholder="Enter your last name"
              value={formData.LName}
              onChange={(e) =>
                setFormData({ ...formData, LName: e.target.value })
              }
            />
          </div>
          <hr className="my-4" />
          <h2 className="text-lg font-semibold">Security (Change Password)</h2>
          <div className="form-input">
            <label htmlFor="currentPassword">Current Password</label>
            <div
              className="password-input-wrapper"
              style={{ position: "relative" }}
            >
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                style={{ width: "100%", paddingRight: "40px" }} // Space for the button
              />
              <button
                type="button"
                onClick={toggleCurrentPassword}
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
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="form-input">
            <label htmlFor="newPassword">New Password</label>
            <div
              className="password-input-wrapper"
              style={{ position: "relative" }}
            >
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                placeholder="Enter new password"
                style={{ width: "100%", paddingRight: "40px" }} // Space for the button
              />
              <button
                type="button"
                onClick={toggleNewPassword}
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
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mb-[20px]"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
