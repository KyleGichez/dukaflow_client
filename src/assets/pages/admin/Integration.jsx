import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, Smartphone, FileText, Loader2, Save, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";

const IntegrationSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("mpesa");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Multi-tenant business management states
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  // Unified settings state matching backend payload contracts
  const [settings, setSettings] = useState({
    mpesaConfig: {
      mpesa_short_code: "",
      mpesa_consumer_key: "",
      mpesa_consumer_secret: "",
      mpesa_pass_key: "",
    },
    etimsConfig: {
      etims_taxpayer_pin: "",
      etims_api_key: "",
      etims_branch_code: "",
    },
  });

  // Initial Load: Fetch all businesses the user has access to manage
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Fetch matching shop selections
        const bizRes = await api.get("/admin/businesses");
        const bizList = bizRes.data || [];
        setBusinesses(bizList);

        if (bizList.length > 0) {
          // Default to the first business in the array list
          setSelectedBusinessId(bizList[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading administration parameters:", error);
        toast.error("Failed to load business management profile details.");
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Context Watcher: Fetch specific credentials whenever the selected shop changes
  useEffect(() => {
    if (!selectedBusinessId) return;

    const fetchSpecificSettings = async () => {
      try {
        setLoading(true);
        // Call your dedicated single business integrations route engine
        const res = await api.get(`/admin/business/integrations?businessId=${selectedBusinessId}`);
        
        // Populate form data fallback options safely
        setSettings({
          mpesaConfig: res.data.mpesaConfig || {
            mpesa_short_code: "",
            mpesa_consumer_key: "",
            mpesa_consumer_secret: "",
            mpesa_pass_key: "",
          },
          etimsConfig: res.data.etimsConfig || {
            etims_taxpayer_pin: "",
            etims_api_key: "",
            etims_branch_code: "",
          },
        });
      } catch (error) {
        console.error("Error loading specific workspace configurations:", error);
        toast.error("Failed to recall existing keys for this selected branch.");
      } finally {
        setLoading(false);
      }
    };

    fetchSpecificSettings();
  }, [selectedBusinessId]);

  // Handle generic nested structural inputs cleanly
  const handleInputChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Submit consolidated update streams back to local POS database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBusinessId) {
      toast.error("Please select a valid target business location.");
      return;
    }

    setSaving(true);
    const saveToastId = toast.loading("Saving integration keys permanently...");

    try {
      // Axios clean structure payload directly mapping target settings and identifiers
      await api.put("/admin/business/integrations", {
        targetBusinessId: selectedBusinessId,
        ...settings,
      });

      toast.success("Integration profiles updated securely!", {
        id: saveToastId,
      });
    } catch (error) {
      console.error("Error saving integration profile mutations:", error);
      toast.error(error.response?.data?.message || "Could not write modifications.", {
        id: saveToastId,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-2">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-500">
          Retrieving system cryptographic parameters...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[120px] mb-[30px]">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        
        {/* Header Section */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
          <ShieldCheck className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
              Gateway Integrations
            </h1>
            <p className="text-xs text-gray-500">
              Configure unique Safaricom Lipa Na M-Pesa API hooks and KRA eTIMS invoice signatures across active storefront modules.
            </p>
          </div>
        </div>

        {/* 🏢 MULTI-TENANT SHOP SELECTOR DROPDOWN */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200/60 max-w-xl">
          <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase mb-2">
            <Store className="w-4 h-4 text-gray-500" />
            <span>Target Business Workspace Location</span>
          </label>
          <div className="relative">
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full bg-white border border-gray-300 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 focus:outline-none appearance-none cursor-pointer text-gray-800"
            >
              {businesses.length === 0 ? (
                <option className="text-xs" value="">No managed business units registered</option>
              ) : (
                businesses.map((biz) => (
                  <option className="text-xs" key={biz.id} value={biz.id}>
                    {biz.name || biz.businessName} ({biz.city || "Branch Location"})
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              ▼
            </div>
          </div>
        </div>

        {/* Configuration Selection Workspace Tabs */}
        <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("mpesa")}
            className={`flex items-center justify-center space-x-2 flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === "mpesa"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Lipa Na M-Pesa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("etims")}
            className={`flex items-center justify-center space-x-2 flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === "etims"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>KRA eTIMS</span>
          </button>
        </div>

        {/* Loading overlay for hot-swapping specific store parameters */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <p className="text-xs text-gray-400">Loading configurations matrix...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lipa Na M-Pesa Config View */}
            {activeTab === "mpesa" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                  <h3 className="text-xs font-bold text-green-800 uppercase mb-1">
                    Daraja API credentials
                  </h3>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Provide credentials generated on your Safaricom Daraja Developer portal. This enables instant customer STK validation directly from your retail POS checkout actions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Paybill / Till Number (Shortcode)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 174379 or Store Till"
                      value={settings.mpesaConfig.mpesa_short_code || ""}
                      onChange={(e) =>
                        handleInputChange("mpesaConfig", "mpesa_short_code", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Passkey (Online Password Seed)
                    </label>
                    <input
                      type="password"
                      placeholder="bfb279f9aa97c11a43a22..."
                      value={settings.mpesaConfig.mpesa_pass_key || ""}
                      onChange={(e) =>
                        handleInputChange("mpesaConfig", "mpesa_pass_key", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none tracking-widest"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      placeholder="Your Daraja App App Consumer Key string"
                      value={settings.mpesaConfig.mpesa_consumer_key || ""}
                      onChange={(e) =>
                        handleInputChange("mpesaConfig", "mpesa_consumer_key", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      placeholder="Your Daraja App App Consumer Secret token"
                      value={settings.mpesaConfig.mpesa_consumer_secret || ""}
                      onChange={(e) =>
                        handleInputChange("mpesaConfig", "mpesa_consumer_secret", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none tracking-widest"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* KRA eTIMS Config View */}
            {activeTab === "etims" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <h3 className="text-xs font-bold text-blue-800 uppercase mb-1">
                    KRA Fiscalization Setup
                  </h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Configure your retail workspace with the KRA corporate registry guidelines. Sales invoices created will sync live values natively to KRA servers for automated VAT tracking.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Taxpayer KRA PIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. P051XXXXXXZ"
                      value={settings.etimsConfig.etims_taxpayer_pin || ""}
                      onChange={(e) =>
                        handleInputChange("etimsConfig", "etims_taxpayer_pin", e.target.value.toUpperCase())
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      eTIMS Branch Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 00 (Headquarters) or 01"
                      value={settings.etimsConfig.etims_branch_code || ""}
                      onChange={(e) =>
                        handleInputChange("etimsConfig", "etims_branch_code", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      eTIMS VSC/API Serial Key
                    </label>
                    <input
                      type="password"
                      placeholder="Your secure KRA virtual serial device transmission string"
                      value={settings.etimsConfig.etims_api_key || ""}
                      onChange={(e) =>
                        handleInputChange("etimsConfig", "etims_api_key", e.target.value)
                      }
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none tracking-wider"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Form Actions */}
            <div className="flex gap-[20px] pt-4 border-t border-gray-100 justify-end">
              <button
                type="button"
                className="cursor-pointer bg-gray-500 hover:bg-gray-600 px-4 py-2.5 text-sm font-bold text-white rounded-lg transition-all"
                onClick={() => navigate("/admin/dashboard")}
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={saving || !selectedBusinessId}
                className={`flex items-center space-x-2 px-5 py-2.5 cursor-pointer text-sm font-bold text-white rounded-lg transition-all shadow-sm ${
                  activeTab === "mpesa"
                    ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default IntegrationSettings;