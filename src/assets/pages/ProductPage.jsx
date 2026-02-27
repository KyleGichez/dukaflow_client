import React from "react";
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import "../styles/ProductPage.css";
import API_URL from "../../api";

const ProductPage = () => {
  const initialFormState = {
    name: "",
    category: "",
    quantity: "",
    price: "",
    units: "",
  };

  const unitOptions = ["pieces", "kgs", "bags", "packets", "meters", "litres"];

  const [formData, setFormData] = useState(initialFormState);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const location = useLocation();

  const categories = [...new Set(products.map((p) => p.category))];

  const LOW_STOCK_THRESHOLD = 10;

  // 1. Get query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const filterType = queryParams.get("filter");
  const categoryFilter = queryParams.get("category");

  // 2. Master Filter Logic (Combines Sidebar, Search, and Dashboard Links)
  const allFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      // A. Search Bar Filter
      const matchesSearch = p.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // B. Sidebar Category Dropdown Filter
      const matchesCategoryDropdown =
        selectedCategory === "All" || p.category === selectedCategory;

      // C. Dashboard URL Filters (with safety checks for null)
      let matchesURL = true;
      if (filterType === "low-stock") {
        matchesURL = p.quantity > 0 && p.quantity <= 5;
      }
      // Added ?. check here to prevent the crash!
      else if (categoryFilter?.toLowerCase() === "unconfirmed") {
        matchesURL =
          !p.category ||
          p.category.toLowerCase() === "unconfirmed" ||
          p.category.trim() === "";
      }

      // Result: Must satisfy ALL active conditions
      return matchesSearch && matchesCategoryDropdown && matchesURL;
    });
  }, [products, searchTerm, selectedCategory, filterType, categoryFilter]);

  // ✅ Fetch products properly
  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  // ✅ Prevent scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
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

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${API_URL}/api/products/${editId}`
      : `${API_URL}/api/products`;

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => Promise.reject(err));
        }
        return res.json();
      })
      .then((data) => {
        if (isEditing) {
          setProducts(
            products.map((product) => (product._id === editId ? data : product))
          );
          toast.success("Product updated successfully!", {
            style: {
              background: "#16a34a",
              color: "#fff",
            },
          });
        } else {
          setProducts([...products, data]);
          toast.success("Product saved successfully!", {
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

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      price: product.price,
      units: product.units,
    });

    setEditId(product._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    fetch(`${API_URL}/api/products/${id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then(() => {
        setProducts(products.filter((product) => product._id !== id));
        toast.success("Product deleted successfully!", {
          style: {
            background: "#16a34a",
            color: "#fff",
          },
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete product", {
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
    <div className="product-wrapper">  
      <div className="product-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Products</h1>
        <div className="product-content-wrapper flex gap-[20px]">
          <div className="product-content-wrapper-menu">
            <div className="product-content-menu">
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
                <li className="menu-item active flex items-center gap-[10px]">
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
                <li className="menu-item flex items-center gap-[10px]">
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
                    <Icon
                      icon="material-symbols:settings"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="/settings">Settings</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="product-content-table">
            <div className="product-table mb-[20px]">
              <div className="product-btn-wrapper mb-[10px]">
                <div className="inventory-controls mb-5 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4 items-center">
                    {/* Search Input */}
                    <div className="relative">
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
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-[250px]"
                      />
                    </div>
                    {/* Category Filter Dropdown */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="capitalize p-2 border rounded-lg bg-white shadow-sm outline-none"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Clear Button (Optional) */}
                  {(searchTerm || selectedCategory !== "All") && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("All");
                      }}
                      className="text-sm font-medium text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="add-product-btn flex items-center gap-[5px]"
                  onClick={() => {
                    setIsEditing(false); // Reset editing mode
                    setEditId(null); // Clear edit ID
                    setFormData(initialFormState); // Clear the form
                    setShowModal(true);
                  }}
                >
                  <span>
                    <Icon icon="si:add-fill" width="20" height="20" />
                  </span>
                  Add
                </button>
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
                          {isEditing ? "Edit Product" : "Add Product"}
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
                        <form onSubmit={handleSubmit} className="mb-[20px] form-modal">
                          <legend>
                            {isEditing
                              ? "Edit Current Product"
                              : "Add New Product"}
                          </legend>
                          <div className="flex">
                            <div className="form-input">
                              <label htmlFor="name">Product Name</label>
                              <input
                                type="text"
                                name="name"
                                placeholder="Enter product name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                              />
                            </div>
                            <div className="form-input">
                              <label htmlFor="category">Product Category</label>
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
                          </div>
                          <div className="flex">
                            <div className="form-input">
                              <label htmlFor="quantity">Total Quantity</label>
                              <input
                                type="number"
                                name="quantity"
                                placeholder="Enter total quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                required
                              />
                            </div>
                            <div className="form-input">
                              <label htmlFor="price">Unit Price</label>
                              <input
                                type="number"
                                name="price"
                                placeholder="Enter unit price(Ksh)"
                                value={formData.price}
                                onChange={handleChange}
                                required
                              />
                            </div>
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
                          <div className="modal-buttons-wrapper flex gap-[20px] justify-end">
                            <button
                              className="modal-add-btn py-2 px-3 w-[75px] cursor-pointer"
                              type="submit"
                            >
                              {isEditing ? "Save" : "Add"}
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
              </div>
              <table className="table-auto w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Total Quantity</th>
                    <th className="py-2 px-3">Unit Price(Ksh)</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allFilteredProducts.length > 0 ? (
                    allFilteredProducts.map((product, index) => (
                      <tr
                        key={product._id}
                        className={
                          product.quantity < LOW_STOCK_THRESHOLD
                            ? "bg-red-100"
                            : ""
                        }
                      >
                        <th className="py-2 px-2" scope="row">
                          {index + 1}
                        </th>
                        <td className="py-3 px-2 capitalize">{product.name}</td>
                        <td className="py-3 px-2 capitalize">
                          {product.category}
                        </td>
                        <td className="py-3 px-2">
                          {product.quantity?.toLocaleString()} {product.units}
                          {product.quantity < LOW_STOCK_THRESHOLD && (
                            <span className="text-left ml-2 text-red-600 font-semibold">
                              ⚠ low stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          Ksh {product.price?.toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-[5px]">
                            <button
                              type="button"
                              className="edit-btn flex items-center gap-[5px]"
                              onClick={() => handleEdit(product)}
                            >
                              <span>
                                <Icon
                                  icon="tabler:edit"
                                  width="20"
                                  height="20"
                                />
                              </span>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn flex items-center gap-[5px]"
                              onClick={() => confirmDelete(product._id)}
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
                    /* Empty State for Products Page */
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Icon
                            icon="fluent:box-search-24-regular"
                            width="60"
                            height="60"
                            className="mb-4 opacity-20"
                          />
                          <p className="text-xl font-bold text-gray-700">
                            No products found
                          </p>
                          <p className="text-gray-500 mt-1">
                            No matches for "<strong>{searchTerm}</strong>"
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
                            Clear all Filters
                          </button>
                        </div>
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

export default ProductPage;
