import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import api from "../../../api/axios";
import { toast } from "react-hot-toast"; // Ensure toast is imported

const Business = () => {
  const initialFormState = {
    businessName: "",
    email: "",
    phone: "",
    city: "",
    subscription: "basic",
    status: "active",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [businesses, setBusinesses] = useState([]); // Focus on business data
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTown, setSelectedTown] = useState("");
  const [users, setUsers] = useState([]);

  const kenyanTowns = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Kehancha",
    "Ruiru",
    "Kikuyu",
    "Kangundo-Tala",
    "Malindi",
    "Naivasha",
    "Kitui",
    "Machakos",
    "Thika",
    "Athi-river",
    "Karuri",
    "Nyeri",
    "Kilifi",
    "Garissa",
    "Voi",
    "Mumias",
    "Bomet",
    "Iten",
    "Narok",
  ].sort();

  // ✅ Extract unique cities from the fetched businesses
  const availableCities = [
    ...new Set(businesses.map((biz) => biz.city).filter(Boolean)),
  ].sort();

  // ✅ Fetch dedicated business data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both businesses (admins) and all users
        const [bizRes, usersRes] = await Promise.all([
          api.get("admin/businesses"),
          api.get("admin/users"),
        ]);

        // Filter businesses to show only admins
        const adminOnly = bizRes.data.filter(
          (user) => user.businessId && user.role === "admin"
        );

        setBusinesses(adminOnly);
        setUsers(usersRes.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, []);

  // ✅ Search and Filter Logic
  const filteredBusinesses = businesses.filter((biz) => {
    // 1. Access the nested business name
    const bName = biz.businessId?.businessName || "";
    
    // 2. Access the owner's email and phone (since they are in ownerId now)
    const bEmail = biz.businessId?.ownerId?.email || "";
    const bPhone = biz.businessId?.ownerId?.phone || "";
  
    const matchesSearch =
      bName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bPhone).includes(searchTerm);
  
    const matchesTown = selectedTown ? biz.city === selectedTown : true;
  
    return matchesSearch && matchesTown;
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const res = await api.put(`admin/businesses/${editId}`, formData);
        setBusinesses(businesses.map((b) => (b._id === editId ? res.data : b)));
        toast.success("Business updated!");
      } else {
        const res = await api.post("admin/newbusiness", formData);
        setBusinesses([...businesses, res.data]);
        toast.success("New Business registered!");
      }
      setShowModal(false);
      setFormData(initialFormState);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  return (
    <div className="invites-wrapper">
      <div className="invites-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">
          All Businesses
        </h1>

        <div className="invites-content-wrapper flex gap-[20px]">
          <div className="invites-content-wrapper-menu">
            <div className="invites-content-menu">
              <ul>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:dashboard"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="users">Users</a>
                </li>
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon
                      icon="material-symbols:add-business-rounded"
                      width="24"
                      height="24"
                    />
                  </span>
                  <a href="businesses">Businesses</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="ri:heart-add-fill" width="24" height="24" />
                  </span>
                  <a href="subscription">Subscription</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="carbon:sales-ops" width="24" height="24" />
                  </span>
                  <a href="invites">Invites</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="invites-content-wrapper-info">
            <div className="invites-content-info">
              <div className="invites-sent-table mb-[20px] px-2 py-3">
                {/* 🔍 Toolbar */}
                <div className="flex justify-between mb-[20px]">
                  <div className="flex flex-wrap gap-2 mb-2 mr-2">
                    <input
                      type="text"
                      placeholder="Search business, email..."
                      className="border px-3 py-2 rounded w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="filter-role border px-3 py-2 rounded" // Updated class name for clarity
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                    >
                      <option value="">All Locations</option>
                      {availableCities.map((city) => {
                        const count = businesses.filter(
                          (b) => b.city === city
                        ).length;
                        return (
                          <option key={city} value={city}>
                            {city} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                {/* 📊 Business Table */}
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Business</th>
                      <th className="py-2 px-3">Admin</th>
                      <th className="py-2 px-3">Contact</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Users</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-center">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No businesses found.
                        </td>
                      </tr>
                    ) : (
                      filteredBusinesses.map((biz, index) => (
                        <tr key={biz._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">{index + 1}</td>
                          <td className="py-3 px-3 font-medium capitalize">
                            {biz.businessId?.businessName ||
                              "No Business Linked"}
                          </td>
                          <td className="py-2 px-2">
                            {biz.fname} {biz.lname}
                          </td>
                          <td className="py-3 px-3">
                            <div className="">{biz.phone}</div>
                            <div className="text-sm">{biz.email}</div>
                          </td>
                          <td className="py-3 px-3">{biz.city}</td>
                          <td className="py-3 px-3">
                            {
                              users.filter(
                                (u) =>
                                  u.businessId?._id?.toString() ===
                                    biz.businessId?._id?.toString() ||
                                  u.businessId === biz.businessId?._id
                              ).length
                            }
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                biz.isActive ? "bg-green-200" : "bg-red-200"
                              }`}
                            >
                              {biz.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            {new Date(biz.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📝 Modal for Add/Edit */}
      {showModal && (
        <div
          className="fixed bg-black/80 min-h-screen z-10 w-screen flex justify-center items-center top-0 left-0"
          onClick={() => {
            setShowModal(false);
          }}
        >
          <div
            className="modal-wrapper px-[25px] py-[20px] max-w-[650px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <h2 className="text-xl font-bold mb-4 flex justify-between uppercase">
                {isEditing ? "Edit Business" : "Add Business"}
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
              </h2>
              <form
                onSubmit={handleSubmit}
                className="mb-[20px] form-modal space-y-4"
              >
                <legend>
                  {isEditing
                    ? "Edit Current Business"
                    : "Register New Business"}
                </legend>
                <div className="flex">
                  <div className="form-input">
                    <label htmlFor="businessName"></label>
                    <input
                      name="businessName"
                      placeholder="Enter business name"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    />
                  </div>
                  <div className="form-input">
                    <label htmlFor="email"></label>
                    <input
                      name="email"
                      type="email"
                      placeholder="Enter business email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    />
                  </div>
                </div>
                <div className="flex">
                  <div className="form-input">
                    <label htmlFor="phone"></label>
                    <input
                      name="phone"
                      placeholder="Enter business phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    />
                  </div>
                  <div className="form-input">
                    <label htmlFor="city"></label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full border p-3 rounded"
                      required
                    >
                      <option value="">Select Town</option>
                      {kenyanTowns.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
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
  );
};

export default Business;
