import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import api from "../../../api/axios";
import { toast } from "react-hot-toast";
import "../../styles/Subscription.css";

const Subscription = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTown, setSelectedTown] = useState("");

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        // Replace with your actual admin subscriptions endpoint
        const res = await api.get("admin/subscription");
        setSubscriptions(res.data);
      } catch (err) {
        toast.error("Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  // ✅ Search and Filter Logic
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // 1. Extract values safely from the nested structure
    const bName = sub.businessId?.businessName || "";
    const bEmail = sub.businessId?.ownerId?.email || "";
    const bPhone = sub.businessId?.ownerId?.phone || "";
    const bCity = sub.businessId?.ownerId?.city || "";

    // 2. Check if the search term matches Name, Email, or Phone
    const matchesSearch =
      bName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bPhone).includes(searchTerm);

    // 3. Check if the location matches the dropdown
    const matchesTown = selectedTown ? bCity === selectedTown : true;

    return matchesSearch && matchesTown;
  });

  const availableCities = [
    ...new Set(
      subscriptions.map((sub) => sub.businessId?.ownerId?.city).filter(Boolean)
    ),
  ];

  const handleActivateLifetime = async (businessId) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      // Axios config options must go in the 3rd argument for PUT requests.
      // The 2nd argument is the request body (empty object {} since we pass ID in URL)
      const res = await api.put(
        `admin/lifetimeaccess/${businessId}`,
        {}, // Request Body
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Axios safely places response data inside res.data
      if (res.data.success) {
        toast.success("Lifetime ownership activated");

        // ✅ Quick check: Ensure you have fetchSubscriptions or a tracking refresh state here
        // since 'fetchBusinesses()' isn't declared in your code snippet
        if (typeof fetchSubscriptions === "function") {
          fetchSubscriptions();
        } else {
          // Fallback UI reload if function isn't reachable globally
          window.location.reload();
        }
      }
    } catch (error) {
      // Gracefully catch Axios error structures or fallback to native string messages
      const errorMsg =
        error.response?.data?.message || error.message || "An error occurred";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-wrapper">
      <div className="subscription-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">
          All Subscriptions
        </h1>
        <div className="subscription-content-wrapper flex gap-[20px]">
          <div className="subscription-content-wrapper-menu">
            <div className="subscription-content-menu">
              <ul>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="users">Users</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:add-business-rounded"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="businesses">Businesses</a>
                </li>
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon icon="ri:heart-add-fill" width="24" height="24" />
                  </span>
                  <a href="subscription">Subscription</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>
                  <a href="invites">Invites</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="subscription-content-wrapper-info">
            <div className="subscription-content-info">
              <div className="subscription-table mb-[20px] px-2 py-3">
                <div className="mb-[10px]">
                  <div className="flex flex-wrap gap-2 mb-2 mr-2">
                    <input
                      type="text"
                      placeholder="Search business, email..."
                      className="border px-3 py-2 rounded w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="filter-role border px-3 py-2 rounded" // Updated class name for clarity
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                    >
                      <option value="">All Locations</option>
                      {availableCities.map((city) => {
                        const count = subscriptions.filter(
                          (sub) => sub.businessId?.ownerId?.city === city
                        ).length;
                        return (
                          <option key={city} value={city}>
                            {city} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Business</th>
                      <th className="py-2 px-3">Contact</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Subscription</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No subscriptions added yet.
                        </td>
                      </tr>
                    ) : filteredSubscriptions.length > 0 ? (
                      filteredSubscriptions.map((sub, index) => (
                        <tr key={sub._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">{index + 1}</td>
                          <td className="py-3 px-3 font-medium capitalize">
                            {sub.businessId?.businessName ||
                              "No Business Linked"}
                          </td>
                          <td className="py-3 px-3">
                            <div>{sub.businessId?.ownerId?.phone || "N/A"}</div>
                            <div className="text-xs text-gray-500 ">
                              {sub.businessId?.ownerId?.email}
                            </div>
                          </td>
                          <td className="py-3 px-3 capitalize">
                            {sub.businessId?.ownerId?.city || "N/A"}
                          </td>
                          <td className="py-3 px-3 capitalize">
                            {sub.plan || "No subscription added."}
                          </td>
                          <td className="py-3 px-3 capitalize">{sub.status}</td>
                          <td className="py-3 px-3">
                            {sub.expiryDate
                              ? new Date(sub.expiryDate).toLocaleDateString()
                              : sub.trialEndDate
                              ? new Date(sub.trialEndDate).toLocaleDateString()
                              : "No Date Set"}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              className="bg-[var(--primary-color)] px-3 py-2 border-[var(--border-color)] rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              disabled={
                                sub.plan === "lifetime" ||
                                sub.businessId?.subscriptionPlan === "lifetime"
                              }
                              onClick={() =>
                                handleActivateLifetime(sub.businessId?._id)
                              }
                            >
                              {sub.plan === "lifetime" ||
                              sub.businessId?.subscriptionPlan === "lifetime"
                                ? "Lifetime Active"
                                : "Activate Lifetime"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-8 text-gray-500"
                        >
                          No businesses found matching "{searchTerm}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
