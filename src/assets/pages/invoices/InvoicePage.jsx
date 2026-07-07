import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import "../../styles/InvoicePage.css";
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
  Plus
} from "lucide-react";

const InvoicesPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All"); // Default to "All"
  const [deletingId, setDeletingId] = useState(null);

  // 🔢 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/invoices", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setInvoices(res.data);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // 🔄 Reset page pointer whenever search terms or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, paymentFilter]);

  // 🛠️ Multi-criteria Filter Process
  const filtered = invoices.filter((inv) => {
    // 1. Text Search (Invoice Number or Customer Name)
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase());

    // 2. Status Filter
    let matchesStatus = true;
    if (paymentFilter !== "All") {
      matchesStatus = inv.status?.toUpperCase() === paymentFilter.toUpperCase();
    }

    // 3. Date Range Filter (FIXED TIME-STRIP LOGIC)
    let matchesDate = true;
    if (inv.createdAt) {
      // 💡 Split at 'T' or a space to extract ONLY the 'YYYY-MM-DD' part of the record
      const invoiceDateStr = inv.createdAt.includes("T")
        ? inv.createdAt.split("T")[0]
        : inv.createdAt.split(" ")[0];

      // Compare clean string boundaries safely
      if (startDate && invoiceDateStr < startDate) {
        matchesDate = false;
      }
      if (endDate && invoiceDateStr > endDate) {
        matchesDate = false;
      }
    } else if (startDate || endDate) {
      // Hide records that have no date properties if a date boundary filter is active
      matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // 🔢 Pagination Slicing Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PAID":
        return "green";
      case "PARTIAL":
        return "orange";
      case "UNPAID":
      case "PENDING":
        return "red";
      default:
        return "gray";
    }
  };

  const handleDelete = async (e, targetId) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this invoice? This will wipe out all associated items and payments."
    );

    if (!confirmDelete) return;

    setDeletingId(targetId);

    try {
      const response = await api.delete(`/invoices/${targetId}`);

      if (
        response.status === 200 ||
        response.status === 204 ||
        response.data.success
      ) {
        alert("Invoice deleted successfully!");
        setInvoices((prev) => prev.filter((inv) => inv.id !== targetId));
      } else {
        alert("Deletion failed to finalize on the server.");
      }
    } catch (error) {
      console.error("Error connecting to server:", error);
      const errorMsg =
        error.response?.data?.message || "Could not reach server.";
      alert(`Network error: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="invoice-wrapper">
        <div className="invoice-content">
          <h1 className="text-2xl font-bold uppercase mb-[20px]">Invoices</h1>
          <div className="invoice-content-wrapper flex gap-[20px]">
            {/* Sidebar Navigation */}
            <div className="invoice-content-wrapper-menu">
              <div className="invoice-content-menu">
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
                    className="menu-item active flex items-center gap-[10px]"
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

            {/* Main Table Ledger */}
            <div className="invoice-content-table flex-1 min-w-0">
              <div className="invoice-table mb-[20px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold uppercase">
                    Invoices Ledger
                  </h2>
                  <button
                    onClick={() => navigate("/invoice/new")}
                    className="add-btn text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-2 transition shadow"
                  >
                    <Plus width="20" height="20" />
                    New Invoice
                  </button>
                </div>

                <div className="search-invoice">
                  <input
                    type="text"
                    placeholder="Search invoice or customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="invoice-search"
                  />

                  {/* Filters Bar */}
                  <div className="filter-range flex items-center gap-4 flex-wrap mb-[20px] bg-white px-3 py-4 rounded shadow-sm">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-500 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-500 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-500 mb-1">
                        Status
                      </label>
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="border rounded px-2 py-1 text-sm bg-white min-w-[120px]"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        {/* <option value="Unpaid">Unpaid</option> */}
                      </select>
                    </div>

                    <div className="reset-btn self-end">
                      {(startDate || endDate || paymentFilter !== "All") && (
                        <button
                          className="flex items-center gap-1 text-sm bg-gray-100 border rounded px-3 py-1.5 text-gray-700 font-semibold hover:bg-red-50 hover:text-red-700 transition"
                          onClick={() => {
                            setStartDate("");
                            setEndDate("");
                            setPaymentFilter("All");
                          }}
                        >
                          <Icon
                            icon="system-uicons:reset"
                            width="18"
                            height="18"
                          />
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div className="w-full overflow-x-auto">
                  {loading ? (
                    <p className="p-4 text-gray-500">Loading invoices...</p>
                  ) : currentItems.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">
                      No invoices matched your filter criteria.
                    </p>
                  ) : (
                    <>
                      <table className="table-auto w-full min-w-auto text-left">
                        <thead>
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Invoice</th>
                            <th className="py-2 px-3">Customer</th>
                            <th className="py-2 px-3">Total(Ksh)</th>
                            <th className="py-2 px-3">Paid</th>
                            <th className="py-2 px-3">Balance</th>
                            <th className="py-2 px-3">Status</th>
                            {/* <th className="py-2 px-3 text-center">Action</th> */}
                          </tr>
                        </thead>

                        <tbody className="text-sm">
                          {currentItems.map((inv, index) => (
                            <tr
                              key={inv.id}
                              onClick={() => navigate(`/invoice/${inv.id}`)}
                              style={{ cursor: "pointer" }}
                              className="hover:bg-gray-50 border-b border-gray-100 transition-colors"
                            >
                              {/* Maintain overall ledger index context despite page cuts */}
                              <td className="py-2 px-3">
                                {indexOfFirstItem + index + 1}
                              </td>
                              <td className="py-2 px-3 text-xs">
                                <p className="font-semibold text-gray-700">
                                  {inv.createdAt
                                    ? new Date(
                                        inv.createdAt.endsWith("Z")
                                          ? inv.createdAt
                                          : `${inv.createdAt}Z`
                                      ).toLocaleDateString("en-KE", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                                <p className="text-emerald-600 font-semibold mt-0.5">
                                  {inv.createdAt
                                    ? new Date(
                                        inv.createdAt.endsWith("Z")
                                          ? inv.createdAt
                                          : `${inv.createdAt}Z`
                                      ).toLocaleTimeString("en-KE", {
                                        hour12: true,
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-gray-800 text-xs">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2 px-3 capitalize text-sm">
                                {inv.customerName || "Walk-in"}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                KSH{" "}
                                {Number(inv.totalAmount || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-emerald-600 font-mono">
                                KSH{" "}
                                {Number(inv.amountPaid || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-red-600 font-mono">
                                KSH {Number(inv.balance || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border shadow-sm`}
                                  style={{
                                    color: getStatusColor(inv.status),
                                    backgroundColor: `${getStatusColor(
                                      inv.status
                                    )}15`, // Appends 15 hex for an elegant ~8% light transparency background
                                    borderColor: `${getStatusColor(
                                      inv.status
                                    )}40`, // Appends 40 hex for a subtle matching border outline
                                  }}
                                >
                                  {inv.status || "UNPAID"}
                                </span>
                              </td>
                              {/* <td className="py-2 px-3 text-center">
                                <button
                                  onClick={(e) => handleDelete(e, inv.id)}
                                  disabled={deletingId !== null}
                                  className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === inv.id ? "⏳" : "🗑️"}
                                </button>
                              </td> */}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* 🔢 Pagination Control Component Footer */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 bg-white p-3 rounded border border-gray-100">
                          <p className="text-sm text-gray-600">
                            Showing{" "}
                            <span className="font-semibold">
                              {indexOfFirstItem + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold">
                              {indexOfLastItem > filtered.length
                                ? filtered.length
                                : indexOfLastItem}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold">
                              {filtered.length}
                            </span>{" "}
                            entries
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(prev - 1, 1))
                              }
                              disabled={currentPage === 1}
                              className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition font-medium"
                            >
                              Previous
                            </button>

                            {[...Array(totalPages)].map((_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 py-1 text-sm rounded transition font-medium ${
                                  currentPage === i + 1
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}

                            <button
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(prev + 1, totalPages)
                                )
                              }
                              disabled={currentPage === totalPages}
                              className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition font-medium"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoicesPage;
