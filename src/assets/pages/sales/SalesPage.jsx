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
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        const flatSales = Array.isArray(data)
          ? data.map((sale) => ({
              _id: sale._id,
              date: sale.date,
              createdAt: sale.createdAt,
              paymentMethod: sale.paymentMethod,
              soldBy: sale.soldBy || null,
              productId: sale.productId,
              quantitySold: sale.quantitySold,
              totalPrice: sale.totalPrice,
            }))
          : [];

        setDbSales(flatSales);
      })
      .catch((err) => {
        console.error("Sales fetch error:", err);
        setDbSales([]);
      });
  }, []);

  const filteredSales = dbSales
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    )
    .filter((sale) => {
      const productName = sale.productId?.name || "Deleted Product";
      const matchesSearch = productName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      if (!startDate && !endDate) return matchesSearch;

      const saleDate = new Date(sale.date || sale.createdAt).setHours(
        0,
        0,
        0,
        0
      );
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

  const saveToOffline = async (payload) => {
    try {
      const offlineId = `offline-${Date.now()}`;
      const offlineSaleRecord = {
        _id: offlineId,
        ...payload,
        createdAt: new Date().toISOString(),
        soldBy: { fname: user?.fname || "Local Admin" },
      };

      // Persist locally to IndexedDB/Dexie
      if (db && db.sales) {
        await db.sales.add(offlineSaleRecord);
      }

      // Convert basket array into flat items for table render matching
      const localFlatRows = payload.items.map((item, index) => ({
        _id: `${offlineId}-${index}`,
        receiptId: offlineId,
        date: payload.date,
        createdAt: offlineSaleRecord.createdAt,
        paymentMethod: payload.paymentMethod,
        soldBy: offlineSaleRecord.soldBy,
        productId: {
          _id: item.productId,
          name: item.productName || "Unsynced Item",
        },
        quantitySold: item.quantitySold,
        totalPrice: item.totalPrice,
      }));

      setDbSales((prev) => [...localFlatRows, ...prev]);
      toast.success("Saved locally (Offline Mode)");
      setCart([]);
      setFormData(initialState);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to store local transaction");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      return toast.error(
        "Your basket cannot be empty before finishing a receipt transaction."
      );
    }

    if (!formData.paymentMethod) {
      return toast.error("Please select a payment method.");
    }

    // 1. Generate the exact timestamp instantly
    const currentTimestamp = new Date().toISOString();
    const grandTotal = getCartGrandTotal();

    // 2. Prepare receipt data locally right now
    const immediateReceiptData = {
      _id: `TEMP-${Date.now().toString().slice(-4)}`, // Temporary ID replaced when DB responds
      date: currentTimestamp,
      paymentMethod: formData.paymentMethod,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantitySold: item.quantitySold,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      total: grandTotal,
    };

    // ⚡ 3. POP THE RECEIPT IMMEDIATELY (Zero Waiting Time)
    setSelectedSaleForPrint(immediateReceiptData);

    // Clear UI inputs right away so the shop owner sees immediate feedback
    setCart([]);
    setFormData(initialState);
    setShowModal(false);

    // 4. Handle Backend sync silently in the background
    const token = localStorage.getItem("token");
    const expiry = localStorage.getItem("expiry");
    const now = new Date();

    if (expiry && new Date(expiry) < now) {
      return toast.error(
        "Subscription expired. Please connect to internet to renew."
      );
    }

    const payload = {
      items: immediateReceiptData.items,
      paymentMethod: immediateReceiptData.paymentMethod,
      date: currentTimestamp,
      totalAmount: grandTotal,
    };

    if (navigator.onLine) {
      // Fire and forget/process in background
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(`${API_URL}/api/sales`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Server error");

        // Swap out the temporary receipt ID with the official MongoDB _id silently
        if (data._id) {
          setSelectedSaleForPrint((prev) =>
            prev && prev.date === currentTimestamp
              ? { ...prev, _id: data._id }
              : prev
          );
        }

        // Build table row format for your local state array
        const addedSalesRows = payload.items.map((item, idx) => ({
          _id: data._id ? `${data._id}-${idx}` : `sale-${Date.now()}-${idx}`,
          receiptId: data._id || null,
          date: currentTimestamp,
          createdAt: currentTimestamp,
          paymentMethod: payload.paymentMethod,
          soldBy: { fname: user?.fname || "Me" },
          productId: { _id: item.productId, name: item.productName },
          quantitySold: item.quantitySold,
          totalPrice: item.totalPrice,
          rawSaleDoc: data,
        }));

        setDbSales((prev) => [...addedSalesRows, ...prev]);

        // Silently refresh products in background to balance stock counts
        fetch(`${API_URL}/api/products`, { headers })
          .then((r) => r.json())
          .then((prodData) => {
            if (Array.isArray(prodData)) setProducts(prodData);
          })
          .catch((e) => console.error("Silent stock sync error:", e));
      } catch (err) {
        console.error("Background sync failed:", err);
        toast.error("Sale kept locally. Cloud synchronization error.");
      }
    } else {
      // Offline fallback processing
      await saveToOffline(payload);
    }
  };

  // Re-route back to page 1 automatically if active filters scale down the items list
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredSales.length]);

  const handleAddToBag = (e) => {
    if (e) e.preventDefault();

    if (!formData.productId || !formData.quantitySold) {
      return toast.error("Please select a product and enter quantity");
    }

    const selectedProd = products.find((p) => p._id === formData.productId);
    if (!selectedProd) return;

    if (selectedProd.quantity < Number(formData.quantitySold)) {
      return toast.error(`Only ${selectedProd.quantity} items left in stock`);
    }

    // Check if item already exists in current pending cart
    const existingIndex = cart.findIndex(
      (item) => item.productId === formData.productId
    );
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantitySold += Number(formData.quantitySold);
      updatedCart[existingIndex].totalPrice =
        updatedCart[existingIndex].quantitySold * selectedProd.price;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          productId: formData.productId,
          productName: selectedProd.name,
          quantitySold: Number(formData.quantitySold),
          unitPrice: selectedProd.price,
          totalPrice: selectedProd.price * Number(formData.quantitySold),
          unit: selectedProd.unit || "pcs",
        },
      ]);
    }

    // Clear item selector state while preserving metadata date & options values
    setFormData({
      ...formData,
      productId: "",
      productName: "",
      quantitySold: "",
    });
    toast.success("Added to transaction list");
  };

  const handleRemoveFromBag = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getCartGrandTotal = () =>
    cart.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleDelete = async (id) => {
    // If it's a composite compound row ID, split it to extract the DB document id reference
    const primaryId = id.includes("-") ? id.split("-")[0] : id;

    if (typeof primaryId === "string" && primaryId.startsWith("offline")) {
      try {
        await db.sales.delete(primaryId);
        // Clean out all table items matching that receipt instance
        setDbSales(
          dbSales.filter(
            (sale) => sale._id !== id && sale.receiptId !== primaryId
          )
        );
        return toast.success("Local offline record removed");
      } catch (err) {
        return toast.error("Could not delete local item.");
      }
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/api/sales/${primaryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setDbSales(
          dbSales.filter(
            (sale) => sale._id !== id && sale.receiptId !== primaryId
          )
        );
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
            Are you sure you want to delete this sale transaction row?
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
                <div className="fixed inset-0 bg-black/80 z-40 flex justify-center items-center p-4">
                  <div className="bg-white px-[25px] py-[20px] max-w-[750px] cart-modal w-full rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                      <h1 className="text-xl font-bold uppercase text-gray-800 flex items-center gap-2">
                        New Customer Basket
                      </h1>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => {
                          setCart([]);
                          setShowModal(false);
                        }}
                      >
                        <Icon
                          icon="material-symbols:cancel"
                          width="28"
                          height="28"
                        />
                      </button>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                        Select Product & Quantity
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Product Item
                          </label>
                          <input
                            type="text"
                            list="modal-product-options"
                            placeholder="Search or select product..."
                            className="border p-2 rounded w-full text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.productName}
                            onChange={(e) => {
                              const match = products.find(
                                (p) => p.name === e.target.value
                              );
                              setFormData({
                                ...formData,
                                productName: e.target.value,
                                productId: match ? match._id : "",
                              });
                            }}
                          />
                          <datalist id="modal-product-options">
                            {products.map((p) => (
                              <option key={p._id} value={p.name}>
                                Stock: {p.quantity} {p.unit || "pcs"} available
                                — Ksh {p.price}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 2"
                            min="1"
                            className="border p-2 rounded w-full text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.quantitySold}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                quantitySold: e.target.value,
                              })
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1 h-[38px]"
                          onClick={handleAddToBag}
                        >
                          <Icon icon="gridicons:add" width="18" height="18" />
                          Add To Basket
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 border rounded-lg overflow-x-auto shadow-sm max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100 border-b text-gray-600 font-semibold uppercase">
                            <th className="p-2.5">Item Description</th>
                            <th className="p-2.5">Unit Price</th>
                            <th className="p-2.5">Qty</th>
                            <th className="p-2.5">Total (Ksh)</th>
                            <th className="p-2.5 text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y bg-white">
                          {cart.length > 0 ? (
                            cart.map((item, index) => (
                              <tr
                                key={index}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-2.5 capitalize font-medium text-gray-800">
                                  {item.productName}
                                </td>
                                <td className="p-2.5 text-gray-600">
                                  Ksh {item.unitPrice.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-gray-700 font-semibold">
                                  {item.quantitySold} {item.unit}
                                </td>
                                <td className="p-2.5 font-bold text-gray-900">
                                  Ksh {item.totalPrice.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                    onClick={() => handleRemoveFromBag(index)}
                                  >
                                    <Icon
                                      icon="fluent:delete-20-filled"
                                      width="16"
                                      height="16"
                                    />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan="5"
                                className="text-center py-8 text-gray-400 font-medium"
                              >
                                Your current customer invoice basket is empty.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-3 border-t">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Receipt Date
                          </label>
                          <input
                            type="date"
                            className="border p-2 rounded w-full text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.date}
                            onChange={(e) =>
                              setFormData({ ...formData, date: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Payment Method
                          </label>
                          <select
                            className="border p-2 rounded w-full text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.paymentMethod}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                paymentMethod: e.target.value,
                              })
                            }
                            required
                          >
                            <option value="">-- Select Payment --</option>
                            <option value="Credit">Credit</option>
                            <option value="Cash">Cash</option>
                            <option value="M-pesa">M-pesa</option>
                            <option value="Bank-Transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-right flex flex-col justify-center">
                          <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                            Grand Total Bill
                          </span>
                          <span className="text-xl font-black text-blue-900">
                            Ksh {getCartGrandTotal().toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm transition-colors"
                          onClick={() => {
                            setCart([]);
                            setShowModal(false);
                          }}
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          className={`py-2 px-6 rounded-lg font-bold text-sm shadow-sm transition-colors text-white ${
                            cart.length === 0
                              ? "bg-blue-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                          disabled={cart.length === 0}
                        >
                          Complete Sale
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <table className="table-auto w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Total(Ksh)</th>
                    <th className="py-2 px-3">Payment</th>
                    <th className="py-2 px-3">Sold By</th>
                    <th className="py-2 px-3">Sold At</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length > 0 ? (
                    filteredSales
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map((sale, index) => {
                        // Compute consecutive layout indexing across active sub-pages
                        const globalRowNumber =
                          (currentPage - 1) * itemsPerPage + index + 1;

                        return (
                          <tr
                            key={sale._id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-2 px-3">
                              {globalRowNumber}
                              {sale._id?.toString().startsWith("offline-") && (
                                <span
                                  className="ml-1 text-[10px] bg-amber-500 text-white px-1 rounded"
                                  title="Unsynced local transaction"
                                >
                                  Offline
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 capitalize">
                              {sale.productId?.name || "Deleted Product"}
                            </td>
                            <td className="py-2 px-3">
                              {sale.quantitySold} pcs
                            </td>
                            <td className="py-2 px-3">
                              Ksh {(sale.totalPrice || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">{sale.paymentMethod}</td>
                            <td className="py-2 px-3">
                              {sale.soldBy?.fname ?? "cashier"}
                            </td>
                            <td className="py-2 px-3">
                              <p>
                                {" "}
                                {new Date(
                                  sale.createdAt || sale.date
                                ).toLocaleDateString()}
                              </p>
                              {new Date(
                                sale.createdAt || sale.date
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="sale-delete-btn flex justify-center gap-2">
                                {/* Print action feature hook */}
                                {/* <button
                                  type="button"
                                  className="p-2 bg-blue-600 text-white rounded hover:text-blue-800"
                                  onClick={() => {
                                    const receiptData = sale.rawSaleDoc || {
                                      _id: sale.receiptId || sale._id,
                                      date: sale.date,
                                      paymentMethod: sale.paymentMethod,
                                      items: [
                                        {
                                          productId: sale.productId?._id,
                                          productName: sale.productId?.name,
                                          quantitySold: sale.quantitySold,
                                          totalPrice: sale.totalPrice,
                                        },
                                      ],
                                    };
                                    setSelectedSaleForPrint(receiptData);
                                  }}
                                  title="Print Receipt"
                                >
                                  <Icon
                                    icon="material-symbols:print"
                                    width="20"
                                    height="20"
                                  />
                                </button> */}
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
                        );
                      })
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-4 text-gray-500"
                      >
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Responsive Navigation Button Footer */}
              {filteredSales.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4">
                  {/* Layout wrapper for compact screen viewports */}
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &larr; Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(filteredSales.length / itemsPerPage)
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(filteredSales.length / itemsPerPage)
                      }
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next &rarr;
                    </button>
                  </div>

                  {/* Layout wrapper for tablet & wider desktop displays */}
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-bold">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-bold">
                          {Math.min(
                            currentPage * itemsPerPage,
                            filteredSales.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-bold">
                          {filteredSales.length}
                        </span>{" "}
                        entries
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          &larr; Prev
                        </button>

                        <span className="relative inline-flex items-center border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                          Page {currentPage} of{" "}
                          {Math.ceil(filteredSales.length / itemsPerPage)}
                        </span>

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                prev + 1,
                                Math.ceil(filteredSales.length / itemsPerPage)
                              )
                            )
                          }
                          disabled={
                            currentPage ===
                            Math.ceil(filteredSales.length / itemsPerPage)
                          }
                          className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next &rarr;
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSaleForPrint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl relative max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
              onClick={() => setSelectedSaleForPrint(null)}
            >
              ✕
            </button>

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
