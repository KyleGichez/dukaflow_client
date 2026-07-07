import React from "react";
import { useMemo, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import "../../styles/StockPage.css";
import API_URL from "../../../api";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  LayoutDashboard,
  Package,
  Database,
  ShoppingCart,
  BarChart3,
  Users,
  HeartPlus,
  CoinsIcon,
  Plus, Pencil, Trash
} from "lucide-react";

const StockPage = () => {
  const initialFormState = {
    product: "",
    category: "",
    name: "",
    quantityAdded: "",
    units: "",
    price: "",
    buyingPrice: "",
  };

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const unitOptions = ["pieces", "kgs", "bags", "packets", "meters", "litres"];

  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [stockItems, setStockItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [...new Set(stockItems.map((s) => s.category))];

  const LOW_STOCK_THRESHOLD = 20;

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      // 1. Matches Category
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      // 2. Matches Search Term (Case-insensitive check on the name)
      const matchesSearch = (item.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [stockItems, selectedCategory, searchTerm]);

  const ITEMS_PER_PAGE = 10;

  const sortedItems = [...filteredItems].sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // ✅ Fetch stock items properly
  useEffect(() => {
    // Get your token from wherever you store it (localStorage is common)
    const token = localStorage.getItem("token");

    fetch(`${API_URL}/api/stock`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ⬅️ Add this!
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch stock");
        }
        return res.json();
      })
      .then((data) => {
        // Ensure data is an array before setting state
        if (Array.isArray(data)) {
          setStockItems(data);
        } else {
          setStockItems([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setStockItems([]); // Reset to empty array on error to prevent .map crash
      });
  }, []);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      category: formData.category,
      name: formData.name,
      quantityAdded: Number(formData.quantityAdded),
      units: formData.units,
      price: Number(formData.price),
      buyingPrice: Number(formData.buyingPrice),
    };

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${API_URL}/api/stock/${editId}`
      : `${API_URL}/api/stock`;

    const token = localStorage.getItem("token");

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => Promise.reject(err));
        }
        return res.json();
      })
      .then((data) => {
        if (isEditing) {
          setStockItems(
            stockItems.map((stockItem) =>
              stockItem._id === editId ? data : stockItem
            )
          );
          toast.success("Stock updated successfully!", {
            style: {
              background: "#16a34a",
              color: "#fff",
            },
          });
        } else {
          setStockItems([...stockItems, data]);
          toast.success("Stock saved successfully!", {
            style: {
              background: "#16a34a",
              color: "#fff",
            },
          });
        }

        setFormData(initialFormState);
        setIsEditing(false);
        setEditId(null);
        setShowModal(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message || "Operation failed", {
          style: {
            background: "#dc2626",
            color: "#fff",
          },
        });
      });
  };

  const handleEdit = (stockItem) => {
    // Format the date string for the HTML input
    const formattedDate = stockItem.date
      ? new Date(stockItem.date).toISOString().split("T")[0]
      : "";
    setFormData({
      date: formattedDate,
      name: stockItem.name,
      category: stockItem.category,
      quantityAdded: stockItem.quantityAdded,
      units: stockItem.units,
      price: stockItem.price,
      buyingPrice: stockItem.buying_price || stockItem.buyingPrice || "",
      product: stockItem.product || "",
    });

    setEditId(stockItem._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    const token = localStorage.getItem("token");

    fetch(`${API_URL}/api/stock/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ⬅️ Add this!
      },
    })
      .then((res) => res.json())
      .then(() => {
        setStockItems(stockItems.filter((stockItem) => stockItem._id !== id));
        toast.success("Stock deleted successfully!", {
          style: {
            background: "#16a34a",
            color: "#fff",
          },
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete stock", {
          style: {
            background: "#dc2626",
            color: "#fff",
          },
        });
      });
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
    <div className="stock-wrapper">
      <div className="stock-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">Stock</h1>
        <div className="stock-content-wrapper flex gap-[20px]">
          <div className="stock-content-wrapper-menu">
            <div className="stock-content-menu">
              <ul>
                <li
                  onClick={() => navigate("/dashboard")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <LayoutDashboard width="24" height="24" />
                  </span>
                  Dashboard
                </li>
                <li
                  onClick={() => navigate("/products")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Package width="24" height="24" />
                  </span>
                  Products
                </li>
                <li
                  onClick={() => navigate("/stock")}
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <span>
                    <Database width="24" height="24" />
                  </span>
                  Stock
                </li>
                <li
                  onClick={() => navigate("/sales")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <ShoppingCart width="24" height="24" />
                  </span>
                  Sales
                </li>
                <li
                  onClick={() => navigate("/credit")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <CoinsIcon height="24" width="24" />
                  </span>
                  Credit
                </li>
                <li
                  onClick={() => navigate("/invoice")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <span>
                    <Receipt height="24" width="24" />
                  </span>
                  Invoices
                </li>
                {isAdmin && (
                  <>
                    <li
                      onClick={() => navigate("/summary")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <BarChart3 width="24" height="24" />
                      </span>
                      Reports
                    </li>
                    <li
                      onClick={() => navigate("/staff")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <Users width="24" height="24" />
                      </span>
                      Staff
                    </li>
                    <li
                      onClick={() => navigate("/subscription")}
                      className="menu-item flex items-center gap-[10px]"
                    >
                      <span>
                        <HeartPlus width="24" height="24" />
                      </span>
                      Subscription
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="stock-content-table flex-1 min-w-0">
            <div className="stock-table">
              <div className="stock-btn-wrapper mb-[10px] w-full relative">
                <div className="inventory-controls mb-5 flex flex-wrap gap-4 items-center justify-start w-full pr-[80px] sm:pr-0 sm:flex-row sm:justify-between">
                  <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto min-w-[140px]">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Icon
                          icon="material-symbols:search"
                          width="20"
                          height="20"
                        />
                      </span>
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-[250px]"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="capitalize p-2 border rounded-lg bg-white shadow-sm outline-none cursor-pointer max-w-[150px] sm:max-w-none text-sm sm:text-base"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* Clear Button */}
                    {(searchTerm !== "" || selectedCategory !== "All") && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("All");
                        }}
                        className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Icon
                          icon="material-symbols:close-rounded"
                          width="18"
                          height="18"
                        />
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="add-stock-btn flex items-center gap-[5px] absolute top-0 right-0 sm:static shrink-0"
                    onClick={() => {
                      setIsEditing(false);
                      setEditId(null);
                      setFormData(initialFormState);
                      setShowModal(true);
                    }}
                  >
                    <span>
                      <Plus width="20" height="20" />
                    </span>
                    Add
                  </button>
                </div>
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
                        {isEditing ? "Edit Stock" : "Add Stock"}
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
                        <legend>
                          {isEditing ? "Edit Current Stock" : "Add New Stock"}
                        </legend>
                        <div className="flex">
                          <div className="form-input">
                            <label htmlFor="category">Stock Category</label>
                            <input
                              type="text"
                              name="category"
                              placeholder="Enter or select category"
                              value={formData.category}
                              onChange={handleChange}
                              list="category-options"
                              required
                            />
                            <datalist id="category-options">
                              {categories.map((cat, index) => (
                                <option key={index} value={cat} />
                              ))}
                            </datalist>
                          </div>
                          <div className="form-input">
                            <label htmlFor="name">Product Name</label>
                            <input
                              type="text"
                              name="name"
                              placeholder="Enter or select product"
                              value={formData.name}
                              onChange={handleChange}
                              list="product-options"
                              required
                              /* This makes the field uneditable when isEditing is true */
                              readOnly={isEditing}
                              /* Optional: add a class to grey it out visually */
                              className={
                                isEditing
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : ""
                              }
                            />
                            <datalist id="product-options">
                              {[...new Set(stockItems.map((s) => s.name))].map(
                                (name, index) => (
                                  <option key={index} value={name} />
                                )
                              )}
                            </datalist>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="form-input">
                            <label htmlFor="quantityAdded">
                              Total Quantity
                            </label>
                            <input
                              type="number"
                              name="quantityAdded"
                              value={formData.quantityAdded}
                              onChange={handleChange}
                              placeholder="Enter Total Quantity"
                              required
                            />
                          </div>
                          <div className="form-input">
                            <label htmlFor="buyingPrice">Buying Price</label>
                            <input
                              type="number"
                              name="buyingPrice"
                              placeholder="Enter buying price(Ksh)"
                              value={formData.buyingPrice}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex">
                        <div className="form-input">
                            <label htmlFor="price">Selling Price</label>
                            <input
                              type="number"
                              name="price"
                              placeholder="Enter selling price(Ksh)"
                              value={formData.price}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="form-input">
                            <label htmlFor="units">Metric Units</label>
                            <select
                              className="py-3 px-2 border rounded"
                              name="units"
                              value={formData.units}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select unit</option>
                              {unitOptions.map((unit, index) => (
                                <option key={index} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="modal-buttons-wrapper flex gap-[20px] justify-end">
                          <button
                            className="modal-add-btn py-2 px-3 w-[75px] cursor-pointer"
                            type="submit"
                            disabled={isSubmitting}
                          >
                            {isEditing ? "Save" : "Add"}
                            {isSubmitting ? "Processing..." : ""}
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
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Total Quantity</th>
                      <th className="py-2 px-3">Buying Price</th>
                      <th className="py-2 px-3">Selling Price</th>
                      <th className="py-2 px-3">Date Added</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedItems.length > 0 ? (
                      paginatedItems.map((stockItem, index) => (
                        <tr
                          key={stockItem._id}
                          className={
                            stockItem.quantityAdded < LOW_STOCK_THRESHOLD
                              ? "bg-red-100"
                              : ""
                          }
                        >
                          <th className="py-2 px-2" scope="row">
                            {startIndex + index + 1}
                          </th>

                          <td className="py-2 px-2 font-semibold uppercase text-xs text-gray-700">
                            {stockItem.category}
                          </td>
                          <td className="py-2 px-2 capitalize">
                            {stockItem.name}
                          </td>
                          <td className="py-2 px-2">
                            {/* If totalStockAfter exists, show it; otherwise show quantityAdded */}
                            {stockItem.totalStockAfter !== undefined
                              ? stockItem.totalStockAfter.toLocaleString()
                              : stockItem.quantityAdded.toLocaleString()}{" "}
                            {stockItem.units}
                            {stockItem.quantityAdded < LOW_STOCK_THRESHOLD && (
                              <span className="text-left ml-2 text-red-600 font-semibold">
                                ⚠ low stock
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono uppercase">
                            Ksh {stockItem.buyingPrice?.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 font-mono uppercase">
                            Ksh {stockItem.price?.toLocaleString()}
                          </td>
                          <td className="py-2 px-2">
                            {stockItem.date
                              ? (() => {
                                  const d = new Date(stockItem.date);

                                  if (isNaN(d.getTime())) return "Invalid date";

                                  return (
                                    <>
                                      <p className="">
                                        {d.toLocaleDateString()}
                                      </p>
                                      <p className="font-semibold text-xs text-gray-600">
                                        {d.toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </>
                                  );
                                })()
                              : "N/A"}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-[5px]">
                              <button
                                type="button"
                                className="edit-btn flex items-center gap-[5px]"
                                onClick={() => handleEdit(stockItem)}
                              >
                                <span>
                                  <Pencil width="10" height="10" />
                                </span>
                              </button>
                              <button
                                type="button"
                                className="delete-btn flex items-center gap-[5px]"
                                onClick={() => confirmDelete(stockItem._id)}
                              >
                                <span>
                                  <Trash width="10" height="10" />
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      /* Empty State / No Results Found */
                      <tr>
                        <td colSpan="7" className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Icon
                              icon="material-symbols:search-off-rounded"
                              width="60"
                              height="60"
                              className="mb-4 opacity-20"
                            />
                            <p className="text-xl font-bold text-gray-700">
                              No results found
                            </p>
                            <p className="text-gray-500 mt-1">
                              We couldn't find any matches for ""
                              <strong>{searchTerm}</strong>
                              {selectedCategory !== "All" &&
                                ` in ${selectedCategory}`}
                            </p>
                            <button
                              onClick={() => {
                                setSearchTerm("");
                                setSelectedCategory("All");
                              }}
                              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {filteredItems.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center mt-5 flex-wrap gap-3">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} -
                    {Math.min(endIndex, filteredItems.length)} of{" "}
                    {filteredItems.length} items
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-md border transition ${
                        currentPage === 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-md transition ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "bg-white border hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-md border transition ${
                        currentPage === totalPages
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
