import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import "../styles/SalesPage.css";
import API_URL from "../../api";
import { db } from "../../../src/db.js";

const SalesPage = () => {
  const initialState = {
    date: new Date().toISOString().split("T")[0],
    productId: "",
    productName: "",
    quantitySold: "",
    paymentMethod: "",
  };

  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState(initialState);
  const [products, setProducts] = useState([]);
  const [dbSales, setDbSales] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Track online status

  // Monitor Online/Offline Status
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // 1. Try to get data from Dexie immediately
        const localProducts = await db.products.toArray();

        // 2. If we found products locally, show them right away
        if (localProducts.length > 0) {
          setProducts(localProducts);
          console.log("Loaded from Dexie:", localProducts.length);
        }

        // 3. If online, try to get fresh prices/stock from MongoDB
        if (navigator.onLine) {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_URL}/api/products`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const onlineData = await res.json();

          if (Array.isArray(onlineData)) {
            setProducts(onlineData);
            // Update Dexie so it's fresh for the next offline session
            await db.products.clear();
            await db.products.bulkAdd(onlineData);
          }
        }
      } catch (err) {
        console.error("Error loading products:", err);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Always show what's in Dexie immediately (Fast UI)
        const localSales = await db.sales.toArray();
        setDbSales(localSales.reverse()); // Show newest first

        // 2. If online, sync Dexie with MongoDB
        if (navigator.onLine) {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_URL}/api/sales`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const onlineSales = await res.json();

          if (Array.isArray(onlineSales)) {
            // Identify sales that are ONLY local (pending sync)
            const pendingSales = localSales.filter((s) => s.isOffline);

            // Clear the local 'sales' table and refill it with
            // Server Data + Pending Local Data
            await db.sales.clear();
            await db.sales.bulkAdd([...onlineSales, ...pendingSales]);

            // Update UI state
            setDbSales([...pendingSales, ...onlineSales]);
          }
        }
      } catch (err) {
        console.error("Load failed:", err);
      }
    };

    loadData();
  }, [isOnline]);

  const filteredSales = dbSales.filter((sale) => {
    if (!startDate && !endDate) return true; // Show all if no dates selected

    const saleDate = new Date(sale.date).setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;

    if (start && end) return saleDate >= start && saleDate <= end;
    if (start) return saleDate >= start;
    if (end) return saleDate <= end;
    return true;
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const expiry = localStorage.getItem("expiry");
    const now = new Date();

    // 1. OFFLINE SUBSCRIPTION CHECK
    if (expiry && new Date(expiry) < now) {
      return toast.error(
        "Subscription expired. Please connect to internet to renew."
      );
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const payload = {
      productId: formData.productId,
      quantitySold: Number(formData.quantitySold),
      paymentMethod: formData.paymentMethod,
      date: formData.date || new Date().toISOString(),
    };
  
    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_URL}/api/sales`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
  
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Server error");
  
        toast.success("Sale recorded online!");
  
        // --- THE MISSING STEP: Save to Dexie for Offline Access ---
        await db.sales.add({
          ...data,           // The full object from MongoDB (including _id)
          isOffline: false,  // Mark as already synced
        });
  
        // Update UI
        setDbSales((prev) => [data, ...prev]);
        setFormData(initialState);
        setShowModal(false);
  
      } catch (err) {
        toast.error(`Online sync failed: ${err.message}. Saving locally...`);
        saveToOffline(payload);
      }
    } else {
      saveToOffline(payload);
    }
  };

  // Helper function to handle Dexie storage
  const saveToOffline = async (payload) => {
    // Find product to get price for the UI
    const product = products.find((p) => p._id === payload.productId);
    
    const enrichedPayload = {
      ...payload,
      _id: `offline_${Date.now()}`, // Temporary ID
      isOffline: true,              // Crucial for your UI logic
      unitPrice: product?.price || 0,
      totalPrice: (product?.price || 0) * payload.quantitySold,
    };
  
    try {
      // Use 'sales' here to match your loadData() function
      await db.sales.add(enrichedPayload);
      
      toast.info("Saved locally. It will sync when internet returns.");
  
      // Update UI state immediately
      setDbSales((prev) => [enrichedPayload, ...prev]);
      setFormData(initialState);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save locally.");
    }
  };
  
  const handleDelete = async (id) => {
    if (!isOnline) {
      return toast.error("Internet required to add or edit products.");
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/api/sales/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setDbSales(dbSales.filter((sale) => sale._id !== id));
        toast.success("Deleted successfully");

        // Refresh products WITH TOKEN
        fetch(`${API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => setProducts(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const confirmDelete = (id) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-gray-800">
            Are you sure you want to delete this product?
          </span>

          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-300 rounded"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => {
                toast.dismiss(t.id);
                handleDelete(id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: 6000,
      }
    );
  };

  return (
    <div className="sales-wrapper">
      <div className="sales-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">
          Sales{" "}
          {isOnline ? (
            <span className="text-green-500 text-xs text-none">● Online</span>
          ) : (
            <span className="text-gray-400 text-xs">● Offline</span>
          )}
        </h1>
        <div className="sales-content-wrapper flex gap-[20px]">
          <div className="sales-content-wrapper-menu">
            <div className="sales-content-menu">
              <ul>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="dashicons:products" width="20" height="20" />
                  </span>
                  <a href="/products">Products</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="lsicon:management-stockout-filled"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/stock">Stock</a>
                </li>
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>
                  <a href="/sales">Sales</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="garden:file-spreadsheet-fill-12"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/summary">Reports</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="/staff">Staff</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="si:add-fill" width="24" height="24" />
                  </span>
                  <a href="/subscription">Subscription</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="sales-content-table">
            <div className="sales-table mb-[20px]">
              <div className="sales-btn-wrapper mb-[10px]">
                <div className="flex flex-wrap items-end gap-4 mb-3">
                  <p className="font-bold mb-3">Search:</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">
                      From Date:
                    </label>
                    <input
                      type="date"
                      className="border p-2 rounded text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">
                      To Date:
                    </label>
                    <input
                      type="date"
                      className="border p-2 rounded text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      className="flex items-center gap-1 text-sm text-red-600 font-semibold hover:text-red-800 hover:underline transition-colors pb-2"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                    >
                      <Icon icon="system-uicons:reset" width="18" height="18" />
                      Reset Filter
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="add-sales-btn flex items-center gap-[5px]"
                  onClick={() => {
                    setShowModal(true);
                  }}
                >
                  <span>
                    <Icon icon="si:add-fill" width="20" height="20" />
                  </span>
                  Add
                </button>
              </div>
              {showModal && (
                <div
                  className="fixed bg-black/80 min-h-screen z-10 w-screen flex justify-center items-center top-0 left-0"
                  onClick={() => {
                    setShowModal(false);
                  }}
                >
                  <div
                    className="modal-wrapper bg-white px-[25px] py-[20px] max-w-[650px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-content">
                      <h1 className="text-xl font-bold uppercase mb-[20px] flex justify-between">
                        Add Sale
                        <span className="cursor-pointer">
                          <Icon
                            onClick={() => {
                              setShowModal(false);
                            }}
                            icon="material-symbols:cancel"
                            width="30"
                            height="30"
                          />
                        </span>
                      </h1>
                      <form
                        onSubmit={handleSubmit}
                        method="POST"
                        className="mb-[20px] form-modal"
                      >
                        <legend>Add New Sale</legend>
                        <div className="flex gap-[5px]">
                          <div className="form-input">
                            <label htmlFor="date">Date</label>
                            <input
                              type="date"
                              name="date"
                              value={formData.date}
                              onChange={handleChange}
                              placeholder="Enter stock date"
                              required
                            />
                          </div>
                          <div className="form-input">
                            <label htmlFor="productName">Product Name</label>
                            <input
                              type="text"
                              name="productName"
                              list="product-options"
                              placeholder="Type or select product"
                              className="capitalize px-3 py-3 rounded border w-full"
                              // We use a local value to handle the text input
                              onChange={(e) => {
                                const selectedName = e.target.value;
                                // Find the product object that matches this name
                                const product = products.find(
                                  (p) => p.name === selectedName
                                );

                                setFormData({
                                  ...formData,
                                  productId: product ? product._id : "", // Set the ID for the backend
                                  productName: selectedName, // Keep the name for the input field
                                });
                              }}
                              value={formData.productName || ""}
                              required
                            />

                            <datalist id="product-options">
                              {products.map((product) => (
                                <option key={product._id} value={product.name}>
                                  Stock: {product.quantity}{" "}
                                  {product.unit || "pcs"} available
                                </option>
                              ))}
                            </datalist>

                            {/* Helpful hint below the input */}
                            {formData.productId && (
                              <span className="text-xs text-green-600 font-bold mt-1">
                                Current Stock:{" "}
                                {
                                  products.find(
                                    (p) => p._id === formData.productId
                                  )?.quantity
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-[5px]">
                          <div className="form-input">
                            <label htmlFor="quantitySold">Quantity Sold</label>
                            <input
                              type="number"
                              name="quantitySold"
                              value={formData.quantitySold}
                              onChange={handleChange}
                              placeholder="Enter quantity sold"
                              required
                            />
                          </div>
                          <div className="form-input">
                            <label htmlFor="paymentMethod">
                              Payment Method
                            </label>
                            <select
                              name="paymentMethod"
                              value={formData.paymentMethod}
                              onChange={handleChange}
                              required
                              className="px-3 py-3 rounded"
                            >
                              <option value="">Select payment method</option>
                              <option value="Cash">Cash</option>
                              <option value="M-pesa">M-pesa</option>
                              <option value="Bank-Transfer">
                                Bank Transfer
                              </option>
                            </select>
                          </div>
                        </div>
                        <div className="modal-buttons-wrapper flex gap-[20px] justify-end">
                          <button
                            className="modal-add-btn py-2 px-3 w-[75px] cursor-pointer"
                            type="submit"
                          >
                            Add
                          </button>
                          <button
                            className="modal-close-btn py-2 px-3 w-[75px] cursor-pointer"
                            type="button"
                            onClick={() => {
                              setShowModal(false);
                            }}
                          >
                            Close
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              <table className="table-auto w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Item Sold</th>
                    <th className="py-2 px-3">Quantity Sold</th>
                    <th className="py-2 px-3">Unit Price(Ksh)</th>
                    <th className="py-2 px-3">Total Price(Ksh)</th>
                    <th className="py-2 px-3">Payment Method</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale, index) => {
                      // 1. Resolve the product details locally if the backend hasn't populated them yet
                      const isProductPopulated =
                        typeof sale.productId === "object" &&
                        sale.productId !== null;

                      const productInfo =
                        typeof sale.productId === "object"
                          ? sale.productId // If it's the populated object from MongoDB
                          : products.find((p) => p._id === sale.productId); // If it's just a string ID (Offline)

                      const itemName = productInfo?.name || "Unknown Product";
                      const unitPrice =
                        sale.unitPrice || productInfo?.price || 0;
                        const totalPrice = sale.totalPrice || (unitPrice * sale.quantitySold);

                      return (
                        <tr key={sale._id || index} className="border-b">
                          <td className="py-2 px-3">{index + 1}</td>
                          <td className="py-2 px-3">
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 capitalize">
                            {sale.isOffline && (
                              <Icon
                                icon="material-symbols:cloud-off"
                                className="text-orange-500 inline mr-1"
                              />
                            )}
                            {itemName}
                          </td>
                          <td className="py-2 px-3">
                            {sale.quantitySold} {productInfo?.unit || "pcs"}
                          </td>
                          <td className="py-2 px-3">
                            Ksh {unitPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            Ksh {totalPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">{sale.paymentMethod}</td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              className="delete-btn flex items-center gap-[5px]"
                              onClick={() => confirmDelete(sale._id)}
                            >
                              <Icon icon="material-symbols:delete" width="20" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-4 text-gray-500"
                      >
                        No sales recorded.
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
  );
};

export default SalesPage;
