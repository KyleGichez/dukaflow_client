import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import "../styles/SalesPage.css";
import API_URL from "../../api";

const SalesPage = () => {
  const initialState = {
    date: new Date().toISOString().split("T")[0],
    productId: "",
    productName: "",
    quantitySold: "",
    paymentMethod: "",
  };

  const [formData, setFormData] = useState(initialState);
  const [products, setProducts] = useState([]);
  const [dbSales, setDbSales] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Cleanup (important)
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal]);

  // 1. Fetch Products and Sales on load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  
    // 1. Fetch Products
    fetch(`${API_URL}/api/products`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        // Ensure data is an array before setting state
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Product fetch error:", err);
        setProducts([]); // Fallback to empty array
      });
  
    // 2. Fetch Sales
    fetch(`${API_URL}/api/sales`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Error");
        return res.json();
      })
      .then((data) => {
        // If the backend returns an error object {message: "..."}, 
        // this check prevents dbSales from becoming that object.
        setDbSales(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Sales fetch error:", err);
        setDbSales([]); // Fallback to empty array to prevent .filter() crash
      });
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    };

    const payload = {
      productId: formData.productId,
      quantitySold: Number(formData.quantitySold),
      paymentMethod: formData.paymentMethod,
      date: formData.date,
    };

    fetch(`${API_URL}/api/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return Promise.reject(data);
        return data;
      })
      .then((data) => {
        toast.success("Sale recorded!");
        setFormData(initialState);
        setShowModal(false);
        setDbSales((prev) => [data, ...prev]);

        // Refresh products WITH TOKEN
        fetch(`${API_URL}/api/products`, { headers })
          .then((res) => res.json())
          .then((data) => setProducts(Array.isArray(data) ? data : []));
      })
      .catch(err => toast.error(err.message));
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/api/sales/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setDbSales(dbSales.filter((sale) => sale._id !== id));
        toast.success("Deleted successfully");
        
        // Refresh products WITH TOKEN
        fetch(`${API_URL}/api/products`, { 
          headers: { "Authorization": `Bearer ${token}` } 
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
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                  <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="/staff">Staff</a>
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
                    filteredSales.map((sale, index) => (
                      <tr key={sale._id} className="border-b">
                        <td className="py-2 px-3">{index + 1}</td>
                        <td className="py-2 px-3">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 capitalize">
                          {sale.productId?.name || "Deleted Product"}
                        </td>
                        <td className="py-2 px-3">
                          {sale.quantitySold} {sale.productId?.units}
                        </td>
                        <td className="py2 px-3">
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
                        <td className="py-2 px-2">
                          <div className="sale-delete-btn">
                            <button
                              type="button"
                              className="delete-btn flex items-center gap-[5px]"
                              onClick={() => confirmDelete(sale._id)}
                            >
                              <span>
                                <Icon
                                  icon="material-symbols:delete"
                                  width="20"
                                  height="20"
                                />
                              </span>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-2 px-3 text-gray-500"
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
    </div>
  );
};

export default SalesPage;
