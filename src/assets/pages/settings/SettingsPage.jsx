import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import API_URL from "../../../api";
import { useNavigate } from "react-router-dom";
import "../../styles/SettingsPage.css";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  // Pre-fill form state with existing user/business details from local storage
  const initialFormState = {
    fname: user?.fname || "",
    lname: user?.lname || "",
    email: user?.email || "",
    phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    // Store Configuration Fields
    businessName: user?.businessName || "",
    storeLocation: user?.storeLocation || "",
    poBox: user?.poBox || "",
    receiptDescription: user?.receiptDescription || "",
    taxPin: user?.taxPin || "", // Useful for professional Kenyan context / eTIMS
    lowStockThreshold: user?.lowStockThreshold || 5,
  };

  const [formData, setFormData] = useState(initialFormState);
  const themeKey = `theme_${user?.id}`;
  const [theme, setTheme] = useState(
    localStorage.getItem(themeKey) || user?.themePreference || "light"
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync theme changes locally and via global HTML root selector element attribute
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Combine form data with the selected theme preference string
      const updateData = {
        ...formData,
        themePreference: theme,
      };

      const res = await axios.put(`${API_URL}/api/settings`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update structural states and cache so components react instantly
      const updatedUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem(
        `theme_${updatedUser.id}`,
        updatedUser.themePreference
      );
      setUser(updatedUser);

      window.dispatchEvent(new Event("userChanged")); // Refresh Navbar layouts
      toast.success("Settings updated successfully!");

      // Clear structural fields, preserving persistent configurations
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update settings!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 mx-auto settings-wrapper">
      <div className="settings-content">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold uppercase">Settings</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors cursor-pointer text-sm"
          >
            Go Back
          </button>
        </div>

        {/* Theme Section */}
        <section className="choose-theme mb-6 p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Choose Theme:</h2>
          <div className="flex gap-2 flex-wrap">
            {["light", "dark", "mint", "warm"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleThemeChange(t)}
                className={`px-4 py-2 rounded capitalize border cursor-pointer transition ${
                  theme === t
                    ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Combined Settings Form */}
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Profile Section */}
          <div className="update-settings p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">
              Update Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="fname">
                  First Name
                </label>
                <input
                  type="text"
                  name="fname"
                  placeholder="Enter your first name"
                  value={formData.fname}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="lname">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lname"
                  placeholder="Enter your last name"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          </div>

          {/* Store & Receipt Configuration Section */}
          <div className="store-settings p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">
              Store Configuration (Receipt Header)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-input flex flex-col">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="businessName"
                >
                  Business / Store Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  placeholder="e.g. DukaFlow Electronics"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="storeLocation"
                >
                  Physical Location
                </label>
                <input
                  type="text"
                  name="storeLocation"
                  placeholder="e.g. Oginga Odinga Street, Eldoret"
                  value={formData.storeLocation}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="poBox">
                  P.O. Box Address
                </label>
                <input
                  type="text"
                  name="poBox"
                  placeholder="e.g. P.O. Box 1234-30100, Eldoret"
                  value={formData.poBox}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="taxPin">
                  KRA PIN / Tax Identifier
                </label>
                <input
                  type="text"
                  name="taxPin"
                  placeholder="e.g. A00XXXXXXXX"
                  value={formData.taxPin}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full uppercase"
                />
              </div>
              <div className="form-input flex flex-col">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="lowStockThreshold"
                >
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  min="0"
                  placeholder="e.g. 5"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="form-input flex flex-col md:col-span-2">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="receiptDescription"
                >
                  Receipt Header Description
                </label>
                <textarea
                  name="receiptDescription"
                  placeholder="e.g. Dealers in Electronics & Electricals Supplies."
                  value={formData.receiptDescription}
                  onChange={handleInputChange}
                  rows="2"
                  className="border p-2 rounded w-full resize-y text-sm"
                />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="security-settings p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">
              Security (Change Password)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-input flex flex-col">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="currentPassword"
                >
                  Current Password
                </label>
                <div className="relative w-full">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                    className="border p-2 rounded w-full pr-12"
                  />
                  <button
                    type="button"
                    onClick={toggleCurrentPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-xs text-blue-600 font-medium"
                  >
                    {showCurrentPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="form-input flex flex-col">
                <label
                  className="text-sm font-medium mb-1"
                  htmlFor="newPassword"
                >
                  New Password
                </label>
                <div className="relative w-full">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    className="border p-2 rounded w-full pr-12"
                  />
                  <button
                    type="button"
                    onClick={toggleNewPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-xs text-blue-600 font-medium"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Row */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded shadow-md transition-colors disabled:bg-blue-400 cursor-pointer w-full sm:w-auto"
            >
              {loading ? "Saving Changes..." : "Save All Configurations"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
