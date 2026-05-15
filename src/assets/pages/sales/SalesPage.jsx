import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import PrintIcon from "@iconify-react/material-symbols/print";
import toast from "react-hot-toast";
import "../../styles/SalesPage.css";
import API_URL from "../../../api";
import ReceiptPrinter from "../../components/Receipt/ReceiptPrinter";
import { db } from "../../../db.js";

const SalesPage = () => {
  const initialState = {
    date: new Date().toISOString().split("T")[0],
    productId: "",
    productName: "",
    quantitySold: "",
    paymentMethod: "",
  };

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const [formData, setFormData] = useState(initialState);
  const [products, setProducts] = useState([]);
  const [dbSales, setDbSales] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [businessData, setBusinessData] = useState(null);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState(null);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal]);

  // 1. Fetch Products and Sales on load
  useEffect(() => {

    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    fetch(`${API_URL}/api/admin/business`, { headers })
    .then((res) => {
      if (!res.ok) throw new Error("Could not fetch business details");
      return res.json();
    })
    .then((data) => {
      console.log("MY BUSINESS DATA:", data);
      setBusinessData(data);
    })
    .catch((err) => console.error("Business info fetch error:", err));

    // Fetch Products
    fetch(`${API_URL}/api/products`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Product fetch error:", err);
        setProducts([]);
      });

    // Fetch Sales
    fetch(`${API_URL}/api/sales`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Error");
        return res.json();
      })
      .then((data) => {
        setDbSales(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Sales fetch error:", err);
        setDbSales([]);
      });
  }, []);

  // Enhanced Filter to include search bar queries and Date selections
  const filteredSales = dbSales.filter((sale) => {
    const productName = sale.productId?.name || "Deleted Product";
    const matchesSearch = productName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (!startDate && !endDate) return matchesSearch;

    const saleDate = new Date(sale.date).setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;

    if (start && end)
      return matchesSearch && saleDate >= start && saleDate <= end;
    if (start) return matchesSearch && saleDate >= start;
    if (end) return matchesSearch && saleDate <= end;
    return matchesSearch;
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Offline Fallback function utilizing Dexie instance
  const saveToOffline = async (payload) => {
    try {
      if (!db || !db.sales) {
        throw new Error("IndexedDB table configurations missing.");
      }

      // Enforce unique temporary schema parameters for presentation mapping
      const offlineSale = {
        ...payload,
        _id: `offline-${Date.now()}`,
        productId: products.find((p) => p._id === payload.productId) || {
          name: formData.productName,
        },
        unitPrice:
          products.find((p) => p._id === payload.productId)?.price || 0,
        totalPrice:
          (products.find((p) => p._id === payload.productId)?.price || 0) *
          payload.quantitySold,
        createdAt: new Date().toISOString(),
      };

      await db.sales.add(offlineSale);
      toast.success("Saved offline locally! Will sync when reconnected.");
      setDbSales((prev) => [offlineSale, ...prev]);
      setFormData(initialState);
      setShowModal(false);
    } catch (err) {
      console.error("Dexie offline write failed:", err);
      toast.error("Failed to cache sale records on local device storage.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const expiry = localStorage.getItem("expiry");
    const now = new Date();

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
      isOffline: !navigator.onLine,
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
        setFormData(initialState);
        setShowModal(false);
        setDbSales((prev) => [data, ...prev]);

        const prodRes = await fetch(`${API_URL}/api/products`, { headers });
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      } catch (err) {
        toast.error(`${err.message}`, {
          style: {
            background: "#dc2626",
            color: "#fff",
          },
        });
        saveToOffline(payload);
      }
    } else {
      saveToOffline(payload);
    }
  };

  const handleDelete = async (id) => {
    // Check if item is an unsynced offline asset
    if (typeof id === "string" && id.startsWith("offline-")) {
      try {
        await db.sales.delete(id);
        setDbSales(dbSales.filter((sale) => sale._id !== id));
        return toast.success("Local offline record removed");
      } catch (err) {
        return toast.error("Could not delete local item.");
      }
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
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Sales</h1>
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
                {isAdmin && (
                  <>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span>
                        <Icon icon="fa:users" width="24" height="24" />
                      </span>
                      <a href="/staff">Staff</a>
                    </li>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span>
                        <Icon icon="ri:heart-add-fill" width="24" height="24" />
                      </span>
                      <a href="/subscription">Subscription</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="sales-content-table">
            <div className="sales-table mb-[20px]">
              <div className="sales-btn-wrapper mb-[10px]">
                <div className="flex flex-wrap items-end gap-4 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">
                      Search Item:
                    </label>
                    <input
                      type="text"
                      placeholder="Search items..."
                      className="border p-2 rounded text-sm min-w-[180px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
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
                  {(startDate || endDate || searchTerm) && (
                    <button
                      className="flex items-center gap-1 text-sm text-red-600 font-semibold hover:text-red-800 hover:underline transition-colors pb-2"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setSearchTerm("");
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
                  onClick={() => setShowModal(true)}
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
                  onClick={() => setShowModal(false)}
                >
                  <div
                    className="modal-wrapper bg-white px-[25px] py-[20px] max-w-[650px] w-full mx-4 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-content">
                      <h1 className="text-xl font-bold uppercase mb-[20px] flex justify-between items-center">
                        Add Sale
                        <span
                          className="cursor-pointer"
                          onClick={() => setShowModal(false)}
                        >
                          <Icon
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
                        <div className="flex flex-col md:flex-row gap-[15px] mb-4">
                          <div className="form-input flex-1">
                            <label
                              className="block mb-1 font-semibold"
                              htmlFor="date"
                            >
                              Date
                            </label>
                            <input
                              type="date"
                              name="date"
                              className="border p-2 rounded w-full"
                              value={formData.date}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="form-input flex-1">
                            <label
                              className="block mb-1 font-semibold"
                              htmlFor="productName"
                            >
                              Product Name
                            </label>
                            <input
                              type="text"
                              name="productName"
                              list="product-options"
                              placeholder="Type or select product"
                              className="capitalize px-3 py-2 rounded border w-full"
                              onChange={(e) => {
                                const selectedName = e.target.value;
                                const product = products.find(
                                  (p) => p.name === selectedName
                                );
                                setFormData({
                                  ...formData,
                                  productId: product ? product._id : "",
                                  productName: selectedName,
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
                            {formData.productId && (
                              <span className="text-xs text-green-600 font-bold mt-1 block">
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
                        <div className="flex flex-col md:flex-row gap-[15px] mb-6">
                          <div className="form-input flex-1">
                            <label
                              className="block mb-1 font-semibold"
                              htmlFor="quantitySold"
                            >
                              Quantity Sold
                            </label>
                            <input
                              type="number"
                              name="quantitySold"
                              className="border p-2 rounded w-full"
                              value={formData.quantitySold}
                              onChange={handleChange}
                              placeholder="Enter quantity sold"
                              required
                            />
                          </div>
                          <div className="form-input flex-1">
                            <label
                              className="block mb-1 font-semibold"
                              htmlFor="paymentMethod"
                            >
                              Payment Method
                            </label>
                            <select
                              name="paymentMethod"
                              value={formData.paymentMethod}
                              onChange={handleChange}
                              required
                              className="px-3 py-2 rounded border w-full"
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
                            className="modal-add-btn py-2 px-4 bg-blue-600 text-white rounded cursor-pointer"
                            type="submit"
                          >
                            Add
                          </button>
                          <button
                            className="modal-close-btn py-2 px-4 bg-gray-200 rounded cursor-pointer"
                            type="button"
                            onClick={() => setShowModal(false)}
                          >
                            Close
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              <table className="table-auto w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
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
                    filteredSales.map((sale, index) => (
                      <tr key={sale._id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">
                          {index + 1}
                          {sale._id?.toString().startsWith("offline-") && (
                            <span
                              className="ml-1 text-[10px] bg-amber-500 text-white px-1 rounded"
                              title="Unsynced local transaction"
                            >
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 capitalize">
                          {sale.productId?.name || "Deleted Product"}
                        </td>
                        <td className="py-2 px-3">
                          {sale.quantitySold}{" "}
                          {sale.productId?.units || sale.productId?.unit || ""}
                        </td>
                        <td className="py-2 px-3">
                          Ksh{" "}
                          {(
                            sale.unitPrice ||
                            sale.productId?.price ||
                            0
                          ).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          Ksh {(sale.totalPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">{sale.paymentMethod}</td>
                        <td className="py-2 px-2 text-center">
                          <div className="sale-delete-btn flex justify-center gap-2">
                            <button
                              type="button"
                              className="edit-btn p-1 text-blue-600 hover:text-blue-800"
                              onClick={() => setSelectedSaleForPrint(sale)}
                              title="Print Receipt"
                            >
                              <PrintIcon width="20" height="20" />
                            </button>
                            <button
                              type="button"
                              className="delete-btn p-1 text-red-600 hover:text-red-800"
                              onClick={() => confirmDelete(sale._id)}
                              title="Delete Entry"
                            >
                              <Icon
                                icon="material-symbols:delete"
                                width="20"
                                height="20"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-4 text-gray-500"
                      >
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Visible Overlay Modal for Receipt Preview */}
      {selectedSaleForPrint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl relative max-w-sm w-full max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
              onClick={() => setSelectedSaleForPrint(null)}
            >
              ✕
            </button>

            {/* The Actual Receipt Component */}
            <ReceiptPrinter
              sale={selectedSaleForPrint}
              businessData={businessData}
              onClose={() => setSelectedSaleForPrint(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
