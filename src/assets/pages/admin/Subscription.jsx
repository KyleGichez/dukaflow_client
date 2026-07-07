import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import api from "../../../api/axios";
import { toast } from "react-hot-toast";
import "../../styles/Subscription.css";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HeartPlus,
  CoinsIcon,
  ShieldCheck,
  Store
} from "lucide-react";

const Subscription = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTown, setSelectedTown] = useState("");

  // Wrapped in useCallback so it can be invoked safely from inside active event trigger cycles
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("admin/subscription");
      setSubscriptions(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load active licensing records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Search and Filter Logic
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const bName = sub.businessId?.businessName || "";
    const bEmail = sub.businessId?.ownerId?.email || "";
    const bPhone = sub.businessId?.ownerId?.phone || "";
    const bCity = sub.businessId?.ownerId?.city || "";

    const matchesSearch =
      bName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bPhone).includes(searchTerm);

    const matchesTown = selectedTown ? bCity === selectedTown : true;
    return matchesSearch && matchesTown;
  });

  const availableCities = [
    ...new Set(
      subscriptions.map((sub) => sub.businessId?.ownerId?.city).filter(Boolean)
    ),
  ];

  const handleActivateLifetime = async (businessId) => {
    if (!businessId) {
      return toast.error("Cannot activate access: Missing workspace relationship mapping key.");
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await api.put(
        `admin/lifetimeaccess/${businessId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        toast.success("Lifetime access provisioned successfully!");
        // Triggers instant local redraw without causing severe layout flicker from a full hard reload
        await fetchSubscriptions();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "An error occurred";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-wrapper">
      <div className="subscription-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">All Subscriptions</h1>
        <div className="subscription-content-wrapper flex gap-[20px]">
          {/* NAVIGATION SIDEBAR */}
          <div className="subscription-content-wrapper-menu">
            <div className="subscription-content-menu">
              <ul>
                <li onClick={() => navigate("/admin/dashboard")} className="menu-item flex items-center gap-[10px]">
                  <LayoutDashboard width="24" height="24" />
                  Dashboard
                </li>
                <li onClick={() => navigate("/admin/users")} className="menu-item flex items-center gap-[10px]">
                  <Users width="24" height="24" />
                  Users
                </li>
                <li onClick={() => navigate("/admin/businesses")} className="menu-item flex items-center gap-[10px]">
                  <Store width="24" height="24" />
                  Businesses
                </li>
                <li onClick={() => navigate("/admin/subscription")} className="menu-item active flex items-center gap-[10px]">
                  <CoinsIcon width="24" height="24" />
                  Subscription
                </li>
                <li onClick={() => navigate("/admin/invites")} className="menu-item flex items-center gap-[10px]">
                  <HeartPlus width="24" height="24" />
                  Invites
                </li>
                <li onClick={() => navigate("/admin/integration")} className="menu-item flex items-center gap-[10px]">
                  <ShieldCheck width="24" height="24" />
                  Integration
                </li>
              </ul>
            </div>
          </div>

          {/* ACTIVE MANAGEMENT CONTENT AREA */}
          <div className="subscription-content-wrapper-info">
            <div className="subscription-content-info">
              <div className="subscription-table mb-[20px] px-2 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="mb-[15px]">
                  <div className="flex flex-wrap gap-2 mb-2 mr-2">
                    <input
                      type="text"
                      placeholder="Search business, email..."
                      className="border px-3 py-2 rounded-lg text-sm w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="filter-role border px-3 py-2 rounded-lg text-sm bg-white"
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

                <table className="table-auto w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-100 uppercase">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Business</th>
                      <th className="py-3 px-3">Contact Entity</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Subscription</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Expiry Date</th>
                      <th className="py-3 px-3 text-center">Action Bar</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium text-gray-700">
                    {loading && subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-400">
                          Syncing with ledger instances...
                        </td>
                      </tr>
                    ) : filteredSubscriptions.length > 0 ? (
                      filteredSubscriptions.map((sub, index) => {
                        const isLifetimePlan = sub.plan === "lifetime" || sub.businessId?.subscriptionPlan === "lifetime";
                        
                        return (
                          <tr key={sub._id || index} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                            <td className="py-4 px-3 text-gray-400 font-mono">{index + 1}</td>
                            <td className="py-4 px-3 uppercase font-bold text-gray-900 tracking-tight">
                              {sub.businessId?.businessName || "No Business Linked"}
                            </td>
                            <td className="py-4 px-3">
                              <div className="font-semibold text-gray-800">{sub.businessId?.ownerId?.phone || "N/A"}</div>
                              <div className="text-[11px] text-gray-400 font-normal">{sub.businessId?.ownerId?.email}</div>
                            </td>
                            <td className="py-4 px-3 capitalize text-gray-600">
                              {sub.businessId?.ownerId?.city || "N/A"}
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isLifetimePlan ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {sub.plan || "No subscription attached"}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                sub.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-4 px-3 font-mono font-semibold text-gray-600">
                              {isLifetimePlan ? (
                                <span className="text-purple-600 font-bold tracking-wide uppercase text-[10px] bg-purple-50 px-1.5 py-0.5 rounded">
                                  Never Expires
                                </span>
                              ) : sub.expiryDate ? (
                                new Date(sub.expiryDate).toLocaleDateString()
                              ) : sub.trialEndDate ? (
                                new Date(sub.trialEndDate).toLocaleDateString()
                              ) : (
                                <span className="text-gray-400 font-normal italic">Unspecified</span>
                              )}
                            </td>
                            <td className="py-4 px-3 text-center">
                              <button
                                className={`text-xs font-bold tracking-tight px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                                  isLifetimePlan
                                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-sm"
                                }`}
                                disabled={isLifetimePlan}
                                onClick={() => handleActivateLifetime(sub.businessId?._id)}
                              >
                                {isLifetimePlan ? "Lifetime Active" : "Activate Lifetime Access"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-gray-400 font-medium bg-gray-50/50">
                          No workspace instances found matching "{searchTerm}"
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