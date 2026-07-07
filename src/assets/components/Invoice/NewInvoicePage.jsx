import React, { useState, useEffect } from "react";
import api from "../../../api/axios";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import CoinsIcon from "@iconify-react/lucide/coins";

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // Data Lists
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Controlled Form Selections
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerCreditDetail, setCustomerCreditDetail] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);

  // Cart Management States
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  // Modal & Async UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Quick Customer Registration Modal Form States
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    creditLimit: 50000,
  });

  // Core Data Fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Pull token explicitly from local storage layout
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const token = storedUser?.token; 
  
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
  
      const [custRes, prodRes] = await Promise.all([
        api.get("/customers", config), // Pass token payload configuration block explicitly
        api.get("/products", config),
      ]);
  
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error("Initialization failure:", err);
      setError("Failed to load inventory or customer baselines.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Update credit alerts dynamically when selected customer switches
  useEffect(() => {
    if (selectedCustomerId) {
      const match = customers.find(
        (c) => String(c.id) === String(selectedCustomerId)
      );
      setCustomerCreditDetail(match || null);
    } else {
      setCustomerCreditDetail(null);
    }
  }, [selectedCustomerId, customers]);

  // Compute Financial Aggregations
  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const remainingBalance = grandTotal - Number(amountPaid);

  // Cart Handlers
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find(
      (p) => String(p.id) === String(selectedProductId)
    );
    if (!product) return;

    if (product.quantity < quantityToAdd) {
      alert(`Insufficient stock level. Available: ${product.quantity}`);
      return;
    }

    // Check if item already exists in cart to prevent duplicates
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id
    );
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty =
        updatedCart[existingIndex].quantity + Number(quantityToAdd);
      if (product.quantity < newQty) {
        alert(
          `Cannot add more. Total would exceed stock level of ${product.quantity}`
        );
        return;
      }
      updatedCart[existingIndex].quantity = newQty;
      updatedCart[existingIndex].total = newQty * product.price;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: Number(quantityToAdd),
          price: product.price,
          total: Number(quantityToAdd) * product.price,
        },
      ]);
    }

    setSelectedProductId("");
    setQuantityToAdd(1);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Async Inline Customer Registration Handler
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    try {
      const res = await api.post("/customers", newCustomer);
      // Backend should return the complete freshly generated profile entry row
      const savedCustomer = res.data;

      setCustomers([...customers, savedCustomer]);
      setSelectedCustomerId(savedCustomer.id); // Auto-select the newly registered account
      setIsModalOpen(false);
      setNewCustomer({ name: "", phone: "", email: "", creditLimit: 50000 });
    } catch (err) {
      alert(
        err.response?.data?.message || "Could not register customer profile."
      );
    }
  };

  const handleSubmitInvoice = async (e) => {
    if (e) e.preventDefault();
    
    if (cart.length === 0) {
      toast.error("Please add at least one item to the cart.");
      return;
    }
  
    const activeCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));
  
    try {
      setLoading(true);
  
      const invoicePayload = {
        invoiceNumber: `INV-${Date.now()}`,
        customerId: selectedCustomerId || null,
        customerName: activeCustomer ? activeCustomer.name : "Walk-in Customer",
        customerPhone: activeCustomer ? activeCustomer.phone : "",
        customerEmail: activeCustomer ? activeCustomer.email : "",
        totalAmount: grandTotal,
        amountPaid: Number(amountPaid),
        items: cart, 
        // 📅 FIX: Ensure if there's a balance, it passes the date string, otherwise defaults to Immediate Settlement explicitly
        dueDate: remainingBalance > 0 ? (dueDate || "Immediate Settlement") : "Immediate Settlement"
      };
  
      // 1. Send data to your Node.js backend
      const response = await api.post("/invoices", invoicePayload);
  
      // 2. If the database save is successful, trigger the redirect
      if (response.data && response.data.invoiceId) {
        toast.success("Invoice Saved Successfully!");
        
        // 🚀 Redirects the browser to view the invoice report card detail pane!
        navigate(`/invoice/${response.data.invoiceId}`);
      } else {
        toast.error("Invoice saved, but no tracking ID was returned from the server.");
      }
  
    } catch (error) {
      console.error("Submission Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Invoice processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-wrapper">
      <div className="invoice-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Invoices</h1>
        <div className="invoice-content-wrapper flex gap-[20px]">
          {/* Main Navigation Sidebar Shared Context Panel */}
          <div className="invoice-content-wrapper-menu">
            <div className="invoice-content-menu">
              <ul>
                <li
                  onClick={() => navigate("/dashboard")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>{" "}
                  Dashboard
                </li>
                <li
                  onClick={() => navigate("/products")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Icon icon="dashicons:products" width="20" height="20" />
                  </span>{" "}
                  Products
                </li>
                <li
                  onClick={() => navigate("/stock")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Icon
                      icon="lsicon:management-stockout-filled"
                      width="24"
                      height="24"
                    />
                  </span>{" "}
                  Stock
                </li>
                <li
                  onClick={() => navigate("/sales")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>{" "}
                  Sales
                </li>
                <li
                  onClick={() => navigate("/credit")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>{" "}
                  Credit
                </li>
                <li
                  onClick={() => navigate("/invoice")}
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>{" "}
                  Invoices
                </li>
                {isAdmin && (
                  <>
                    <li
                      onClick={() => navigate("/summary")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <Icon
                          icon="garden:file-spreadsheet-fill-12"
                          width="24"
                          height="24"
                        />
                      </span>{" "}
                      Reports
                    </li>
                    <li
                      onClick={() => navigate("/staff")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <Icon icon="fa:users" width="24" height="24" />
                      </span>{" "}
                      Staff
                    </li>
                    <li
                      onClick={() => navigate("/subscription")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <Icon icon="ri:heart-add-fill" width="24" height="24" />
                      </span>{" "}
                      Subscription
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Form Generation Panel Workspace Area */}
          <div className="invoice-content-table flex-1 min-w-0 bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold uppercase text-gray-800">
                New Credit Invoice
              </h2>
              <button
                type="button"
                onClick={() => navigate("/invoice")}
                className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 text-sm border px-3 py-1.5 rounded"
              >
                <Icon icon="ion:arrow-back" width="16" /> Back to List
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitInvoice} className="space-y-6">
              {/* Customer Account Profiler Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Customer / Client
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="flex-1 border p-2 rounded bg-white"
                    >
                      <option value="">
                        Walk-in Sale (No Deferred Debt Allowed)
                      </option>
                      {customers.map((c) => (
                        <option className="text-xs" key={c.id} value={c.id}>
                          {c.name} ({c.phone || "No Phone"})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-gray-800 text-white px-3 py-2 rounded font-medium hover:bg-gray-900 flex items-center gap-1 text-sm whitespace-nowrap"
                      title="Register New Customer Profile"
                    >
                      <Icon icon="fluent:person-add-24-filled" width="18" /> +
                      New
                    </button>
                  </div>
                </div>

                {customerCreditDetail && (
                  <div className="bg-slate-50 p-3 rounded border text-sm space-y-1 border-slate-200">
                    <p className="font-semibold text-gray-700 uppercase text-xs tracking-wider">
                      Account Balance Metrics
                    </p>
                    <p>
                      Current Debt:{" "}
                      <span className="font-bold text-red-600">
                        {customerCreditDetail.currentDebt} KES
                      </span>
                    </p>
                    <p>
                      Allowed Ceiling:{" "}
                      <span className="font-bold text-gray-900">
                        {customerCreditDetail.creditLimit} KES
                      </span>
                    </p>
                    <p>
                      Remaining Runway:{" "}
                      <span className="font-bold text-emerald-600">
                        {(
                          customerCreditDetail.creditLimit -
                          customerCreditDetail.currentDebt
                        ).toLocaleString()}{" "}
                        KES
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Dynamic Line-Item Builder Input Panel */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <p className="font-semibold text-sm text-gray-700">
                  Add Items to Current Ledger
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Product Name
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full border p-2 bg-white rounded"
                    >
                      <option value="">-- Choose Product From Stock --</option>
                      {products.map((p) => (
                        <option
                        className="text-xs"
                          key={p.id}
                          value={p.id}
                          disabled={p.quantity <= 0}
                        >
                          {p.name}-(
                          {p.quantity > 0
                            ? `${p.quantity} ${p.units || ""}`
                            : "OUT OF STOCK"}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantityToAdd}
                      onChange={(e) => setQuantityToAdd(e.target.value)}
                      className="w-full border p-2 bg-white rounded"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedProductId}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition h-[40px]"
                  >
                    Add Row
                  </button>
                </div>
              </div>

              {/* Live Invoice Items Data Table View Matrix */}
              <div className="w-full overflow-x-auto border rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-600">
                        Product
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-600">
                        Price
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-600">
                        Qty
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-600">
                        Total
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase text-gray-600 text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {item.price.toLocaleString()} KES
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {item.total.toLocaleString()} KES
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Icon
                              icon="material-symbols:delete-outline"
                              width="20"
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-8 text-center text-gray-400 font-medium"
                        >
                          No stock selections mapped to this invoice bill yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Transaction Balance Control Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-slate-200 border-dashed">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Grand Order Total
                  </label>
                  <div className="text-2xl font-black text-gray-900">
                    {grandTotal.toLocaleString()} KES
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Downpayment Collection
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    disabled={cart.length === 0}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full border p-2 bg-white rounded font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Deferred Debt Balance
                  </label>
                  <div
                    className={`text-2xl font-black ${
                      remainingBalance > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {remainingBalance.toLocaleString()} KES
                  </div>
                </div>
              </div>

              {/* Conditional Credit Due Date Picker */}
              {remainingBalance > 0 && (
                <div className="w-full max-w-xs p-3 bg-red-50/50 rounded-lg border border-red-200">
                  <label className="block text-sm font-semibold text-red-800 mb-1">
                    Credit Liquidation Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border p-2 rounded border-red-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
              )}

              {/* Submittal Frame Footer Action bar */}
              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full md:w-auto bg-green-600 text-white font-bold px-8 py-3 rounded-lg shadow hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition uppercase tracking-wider text-sm"
                >
                  {loading
                    ? "Writing Ledger Tranches..."
                    : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL WINDOW DIALOG FOR INLINE CUSTOMER PROFILE GENERATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <Icon
                  icon="fluent:person-add-24-filled"
                  className="text-blue-600"
                />
                Register New Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <Icon icon="material-symbols:close" width="24" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +254712345678"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@domain.com"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Initial Credit Max Ceiling (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newCustomer.creditLimit}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      creditLimit: Number(e.target.value),
                    })
                  }
                  className="w-full border p-2 rounded text-sm font-bold text-gray-700 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoicePage;
