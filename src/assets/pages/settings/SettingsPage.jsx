import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import API_URL from "../../../api";
import { useNavigate } from "react-router-dom";
import "../../styles/SettingsPage.css";

const SettingsPage = () => {
  const initialFormState = {
    fname: "",
    lname: "",
    currentPassword: "",
    newPassword: "",
  };

  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [formData, setFormData] = useState(initialFormState);
  const themeKey = `theme_${user?.id}`;
  const [theme, setTheme] = useState(
    localStorage.getItem(themeKey) || user?.themePreference || "light"
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem(themeKey, newTheme);
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

      // Combine form data with the selected theme
      const updateData = {
        ...formData,
        themePreference: theme,
      };

      const res = await axios.put(`${API_URL}/api/settings`, updateData, {
        headers: { Authorization: `Bearer ${token}` }, // Critical!
      });

      // Update local storage so the Navbar changes immediately
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem(
        `theme_${res.data.user.id}`,
        res.data.user.themePreference
      );

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
        <div className="flex justify-betweeen items-center gap-[60px]">
          <h1 className="text-2xl font-bold uppercase mb-6">Settings</h1>
        </div>
        {/* Theme Section */}
        <section className="choose-theme mb-10 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Choose Theme:</h2>
          <div className="flex justify-between flex-wrap">
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
            <button
            onClick={() => navigate("/dashboard")}
            disabled={loading}
            className=" py-2 px-3 bg-gray-600 rounded border text-gray-800 hover:text-gray-700 font-medium transition-colors cursor-pointer"
          >
            Go Back
          </button>
          </div>
        </section>
        {/* Profile Section */}
        <form
          onSubmit={handleUpdate}
          className="update-settings space-y-4 p-4 border rounded-lg bg-white shadow-sm"
        >
          <h2 className="text-lg font-semibold">Update Profile</h2>
          <div className="form-input">
            <label htmlFor="fname">First Name</label>
            <input
              type="text"
              name="fname"
              placeholder="Enter your first name"
              value={formData.fname}
              onChange={(e) =>
                setFormData({ ...formData, fname: e.target.value })
              }
            />
          </div>
          <div className="form-input">
            <label htmlFor="lname">Last Name</label>
            <input
              type="text"
              name="lname"
              placeholder="Enter your last name"
              value={formData.lname}
              onChange={(e) =>
                setFormData({ ...formData, lname: e.target.value })
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
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mb-[20px] cursor-pointer"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
