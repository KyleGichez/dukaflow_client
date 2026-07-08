import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
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
import toast from "react-hot-toast";
import api from "../../../api/axios";
import "../../styles/ProductPage.css";

const ProductPage = () => {
  const initialFormState = {
    name: "",
    category: "",
    quantity: "",
    buyingPrice: "",
    price: "",
    units: "",
  };

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const unitOptions = ["pieces", "kgs", "bags", "packets", "meters", "litres"];
  const ITEMS_PER_PAGE = 10;
  const LOW_STOCK_THRESHOLD = 20;

  const navigate = useNavigate();
  const location = useLocation();

  // Component States
  const [formData, setFormData] = useState(initialFormState);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse URL queries
  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const filterType = queryParams.get("filter");
  const categoryFilter = queryParams.get("category");

  // Fetch initial products
  useEffect(() => {
    setIsLoading(true);
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error("Session expired. Please login again.");
        } else {
          toast.error("Failed to load products.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Sync Categories uniquely using useMemo
  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  // Master Filter Logic
  const allFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategoryDropdown =
        selectedCategory === "All" || p.category === selectedCategory;

      let matchesURL = true;
      if (filterType === "low-stock") {
        matchesURL = p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD;
      } else if (categoryFilter?.toLowerCase() === "unconfirmed") {
        matchesURL =
          !p.category ||
          p.category.toLowerCase() === "unconfirmed" ||
          p.category.trim() === "";
      }

      return matchesSearch && matchesCategoryDropdown && matchesURL;
    });
  }, [products, searchTerm, selectedCategory, filterType, categoryFilter]);

  // Pagination Calculations
  const totalPages =
    Math.ceil(allFilteredProducts.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = allFilteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 safely when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, filterType, categoryFilter]);

  // Prevent background scroll when modal is active
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
    if (isSubmitting) return;

    setIsSubmitting(true);
    const request = isEditing
      ? api.put(`/products/${editId}`, formData)
      : api.post("/products", formData);

    request
      .then((res) => {
        if (isEditing) {
          setProducts(
            products.map((p) => (p._id || p.id === editId ? res.data : p))
          );
          toast.success("Product updated successfully!");
        } else {
          setProducts([...products, res.data]);
          toast.success("Product saved successfully!");
        }
        setFormData(initialFormState);
        setIsEditing(false);
        setEditId(null);
        setShowModal(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Operation failed";
        toast.error(msg);
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category || "",
      quantity: product.quantity,
      buyingPrice: product.buying_price || product.buyingPrice || "",
      price: product.price,
      units: product.units,
    });
    setEditId(product._id || product.id); // <-- Fix here
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    api
      .delete(`/products/${id}`)
      .then(() => {
        // Fix filtering logic here to handle fallback fields
        setProducts(
          products.filter((product) => (product._id || product.id) !== id)
        );
        toast.success("Product deleted successfully!");

        if (paginatedProducts.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete product");
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
              className="px-3 py-1 bg-gray-300 rounded text-sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
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
      { duration: 6000 }
    );
  };

  return (
    <div className="product-wrapper">
      <div className="product-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Products</h1>
        <div className="product-content-wrapper flex gap-[20px]">
          {/* Sidebar Menu */}
          <div className="product-content-wrapper-menu">
            <div className="product-content-menu">
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
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <span>
                    <Package width="24" height="24" />
                  </span>
                  Products
                </li>
                <li
                  onClick={() => navigate("/stock")}
                  className="menu-item flex items-center gap-[10px]"
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

          {/* Table Container */}
          <div className="product-content-table flex-1 min-w-0">
            <div className="product-table mb-[20px]">
              <div className="product-btn-wrapper mb-[10px]">
                <div className="flex flex-col justify-between items-end sm:flex-row sm:items-center sm:justify-between mb-5 gap-4 w-full">
                  <div className="inventory-controls flex flex-wrap gap-4 items-center w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex flex-wrap sm:flex-nowrap gap-4 items-center w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
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
                    </div>
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
                    className="add-product-btn flex items-center gap-[5px] sm:ml-auto"
                    onClick={() => {
                      setIsEditing(false);
                      setEditId(null);
                      setFormData(initialFormState);
                      setShowModal(true);
                    }}
                  >
                    <Plus width="20" height="20" />
                    Add
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="w-full overflow-x-auto">
                {isLoading ? (
                  <div className="py-20 text-center text-gray-500 font-medium">
                    Loading inventory items...
                  </div>
                ) : (
                  <table className="table-auto w-full min-w-auto text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Total Quantity</th>
                        <th className="py-2 px-3">Buying Price</th>
                        <th className="py-2 px-3">Selling Price</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {paginatedProducts.length > 0 ? (
                        paginatedProducts.map((product, index) => (
                          <tr
                            key={product._id || product.id}
                            className={
                              product.quantity < LOW_STOCK_THRESHOLD
                                ? "bg-red-100"
                                : ""
                            }
                          >
                            <th className="py-2 px-2" scope="row">
                              {startIndex + index + 1}
                            </th>
                            <td className="py-3 px-2 uppercase font-semibold text-xs text-gray-700">
                              {product.name}
                            </td>
                            <td className="py-3 px-2 capitalize">
                              {product.category || "unconfirmed"}
                            </td>
                            <td className="py-3 px-2">
                              {product.quantity?.toLocaleString()}{" "}
                              {product.units}
                              {product.quantity < LOW_STOCK_THRESHOLD && (
                                <span className="text-left ml-2 text-red-600 font-semibold">
                                  ⚠ low stock
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 font-mono uppercase">
                              Ksh {product.buyingPrice?.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 font-mono uppercase">
                              Ksh {product.price?.toLocaleString()}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-[5px] justify-center">
                                <button
                                  type="button"
                                  className="edit-btn flex items-center gap-[5px]"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Pencil width="10" height="10" />
                                </button>
                                <button
                                  type="button"
                                  className="delete-btn flex items-center gap-[5px]"
                                  onClick={() =>
                                    confirmDelete(product._id || product.id)
                                  }
                                >
                                  <Trash width="10" height="10" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-20 text-center">
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
                )}
              </div>

              {/* Pagination controls */}
              {!isLoading && allFilteredProducts.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center mt-5 flex-wrap gap-3">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} -{" "}
                    {Math.min(endIndex, allFilteredProducts.length)} of{" "}
                    {allFilteredProducts.length} items
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
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

      {/* Add / Edit Modal Overlay */}
      {showModal && (
        <div
          className="fixed bg-black/80 min-h-screen z-10 w-screen flex justify-center items-center top-0 left-0"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-wrapper bg-white px-[25px] py-[20px] w-full max-w-[650px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <h1 className="text-xl font-bold uppercase mb-[20px] flex justify-between items-center">
                {isEditing ? "Edit Product" : "Add Product"}
                <span
                  className="cursor-pointer"
                  onClick={() => setShowModal(false)}
                >
                  <Icon icon="material-symbols:cancel" width="30" height="30" />
                </span>
              </h1>
              <form onSubmit={handleSubmit} className="mb-[20px] form-modal">
                <legend className="text-sm text-gray-500 mb-4">
                  {isEditing ? "Edit Current Product" : "Add New Product"}
                </legend>
                <div className="flex">
                  <div className="form-input">
                    <label className="text-sm font-semibold" htmlFor="name">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="border p-2 rounded"
                    />
                  </div>
                  <div className="form-input">
                    <label className="text-sm font-semibold" htmlFor="category">
                      Product Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      placeholder="Enter or select category"
                      value={formData.category}
                      onChange={handleChange}
                      list="category-options"
                      required
                      className="border p-2 rounded"
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
                    <label className="text-sm font-semibold" htmlFor="quantity">
                      Total Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="Enter total quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="border p-2 rounded"
                    />
                  </div>
                  <div className="form-input">
                    <label className="text-sm font-semibold" htmlFor="buyingPrice">
                      Buying Price
                    </label>
                    <input
                      type="number"
                      name="buyingPrice"
                      placeholder="Enter buying price(Ksh)"
                      value={formData.buyingPrice}
                      onChange={handleChange}
                      required
                      className="border p-2 rounded"
                    />
                  </div>
                </div>
                <div className="flex">
                <div className="form-input">
                    <label className="text-sm font-semibold" htmlFor="price">
                      Selling Price
                    </label>
                    <input
                      type="number"
                      name="price"
                      placeholder="Enter selling price(Ksh)"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      className="border p-2 rounded"
                    />
                  </div>
                  <div className="form-input">
                    <label className="text-sm font-semibold" htmlFor="units">
                      Metric Units
                    </label>
                    <select
                      className="py-3 px-2 border rounded bg-white w-auto"
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
                    className="modal-add-btn py-2 px-4 bg-blue-600 text-white rounded disabled:bg-blue-400"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : isEditing
                      ? "Save"
                      : "Add"}
                  </button>
                  <button
                    className="modal-close-btn py-2 px-4 bg-gray-200 rounded"
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
    </div>
  );
};

export default ProductPage;
