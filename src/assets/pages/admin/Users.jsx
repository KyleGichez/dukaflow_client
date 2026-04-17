import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import "../../styles/Users.css";
import api from "../../../api/axios";

const Users = () => {
  const initialFormState = {
    businessName: "",
    fname: "",
    lname: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    city: "",
    subscription: "",
    status: "",
    role: "",
  };

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [editBusinessId, setEditBusinessId] = useState(null);

  // ✅ Correctly get unique business names using optional chaining
  const businesses = [
    ...new Set(users.map((u) => u.businessId?.businessName).filter(Boolean)),
  ];

  // ✅ Extract unique business OBJECTS from the users list
  const businessMap = users.reduce((acc, u) => {
    if (u.businessId && u.businessId.businessName) {
      acc[u.businessId._id] = {
        _id: u.businessId._id,
        businessName: u.businessId.businessName,
        city: u.city || "",
      };
    }
    return acc;
  }, {});

  const businessList = Object.values(businessMap);

  const roles = [...new Set(users.map((u) => u.role).filter(Boolean))];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      `${user.fname} ${user.lname}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(user.phone || "").includes(searchTerm); // ✅ Safely convert to string

    // ✅ Use optional chaining here to prevent the crash
    const matchesBusiness = selectedBusiness
      ? user.businessId?.businessName === selectedBusiness
      : true;

    const matchesRole = selectedRole ? user.role === selectedRole : true;

    return matchesSearch && matchesBusiness && matchesRole;
  });

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

  // ✅ Prevent scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("admin/users");
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let res;

      if (isEditing) {
        const dataToSubmit = { ...formData };

        // Remove password if it's empty so the backend doesn't change it
        if (!dataToSubmit.password || dataToSubmit.password.trim() === "") {
          delete dataToSubmit.password;
        }

        res = await api.put(`admin/users/${editId}`, dataToSubmit);

        // Update local state
        setUsers(
          users.map((u) =>
            u._id === editId
              ? {
                  ...res.data,
                  businessId: {
                    ...u.businessId,
                    businessName: formData.businessName,
                  },
                }
              : u
          )
        );
        toast.success("User & Business updated!");
      } else {
        // Logic for creating a NEW business/user
        res = await api.post("admin/business", formData);

        const newUser = {
          ...res.data,
          businessId: { businessName: formData.businessName },
          isActive: true,
        };

        setUsers((prevUsers) => [...prevUsers, newUser]);
        toast.success("User & Business created successfully!");
      }

      setFormData(initialFormState);
      setIsEditing(false);
      setEditId(null);
      setShowModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      fname: user.fname,
      lname: user.lname,
      email: user.email,
      phone: user.phone,
      password: "",
      businessName: user.businessId?.businessName || user.businessName || "",
      role: user.role,
      status: user.status,
      city: user.city || "",
    });

    setEditId(user._id);
    setEditBusinessId(user.businessId?._id || null);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);

      setUsers(users.filter((u) => u._id !== id));
      toast.success("User and all associated business data deleted!");
    } catch (err) {
      toast.error("Failed to delete user and data");
    }
  };

  const confirmDelete = (id) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-gray-800">
            Are you sure you want to delete this user?
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
    <div className="users-wrapper">
      <div className="users-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">All Users</h1>
        <div className="users-content-wrapper flex gap-[20px]">
          <div className="users-content-wrapper-menu">
            <div className="users-content-menu">
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
                <li className="menu-item active flex items-center gap-[10px]">
                  <span>
                    <Icon icon="fa:users" width="24" height="24" />
                  </span>
                  <a href="users">Users</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
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
          <div className="users-content-wrapper-info">
            <div className="users-content-info">
              <div className="new-users-table mb-[20px] px-2 py-3">
                <div className="flex justify-between mb-[10px]">
                  <div className="flex flex-wrap gap-1 mb-2 mr-2">
                    {/* 🔍 Search */}
                    <input
                      type="text"
                      placeholder="Search name, email or phone..."
                      className="search-business border px-3 py-2 rounded w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* 🏢 Filter by Business */}
                    <select
                      className="filter-business border px-3 py-2 rounded"
                      value={selectedBusiness}
                      onChange={(e) => setSelectedBusiness(e.target.value)}
                    >
                      <option value="">All Businesses</option>
                      {businesses.map((biz, index) => (
                        <option key={index} value={biz}>
                          {biz}
                        </option>
                      ))}
                    </select>

                    {/* 👤 Filter by Role */}
                    <select
                      className="filter-role border px-3 py-2 rounded"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      {roles.map((role, index) => (
                        <option key={index} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>

                    {/* ❌ Clear Filters */}
                    {(searchTerm || selectedBusiness || selectedRole) && (
                      <button
                        className="bg-gray-200 px-3 py-2 rounded"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedBusiness("");
                          setSelectedRole("");
                        }}
                      >
                        Clear
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
                        className="modal-wrapper px-[25px] py-[20px] max-w-[650px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="modal-content">
                          <h1 className="text-xl font-bold uppercase mb-[20px] flex justify-between">
                            {isEditing ? "Edit User" : "Add User"}
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
                            className="mb-[20px] form-modal"
                          >
                            <legend>
                              {isEditing
                                ? "Edit Current User"
                                : "Register New User"}
                            </legend>
                            <div className="flex">
                              <div className="form-input">
                                <label htmlFor="fname">First Name</label>
                                <input
                                  type="text"
                                  name="fname"
                                  placeholder="Enter first name"
                                  value={formData.fname}
                                  onChange={handleChange}
                                  required
                                />
                              </div>
                              <div className="form-input">
                                <label htmlFor="lname">Last Name</label>
                                <input
                                  type="text"
                                  name="lname"
                                  placeholder="Enter last name"
                                  value={formData.lname}
                                  onChange={handleChange}
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex">
                              <div className="form-input">
                                <label htmlFor="email">Email</label>
                                <input
                                  type="email"
                                  name="email"
                                  placeholder="Enter email address"
                                  value={formData.email}
                                  onChange={handleChange}
                                  required
                                />
                              </div>
                              <div className="form-input">
                                <label htmlFor="phone">Phone</label>
                                <input
                                  type="tel"
                                  name="phone"
                                  placeholder="Enter phone number"
                                  value={formData.phone}
                                  onChange={handleChange}
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex">
                              <div className="form-input">
                                <label htmlFor="businessName">Business</label>
                                <input
                                  type="text"
                                  name="businessName"
                                  list="business-options"
                                  placeholder="Type or select business"
                                  className="capitalize px-3 py-3 rounded border w-full"
                                  value={formData.businessName || ""}
                                  onChange={(e) => {
                                    const selectedName = e.target.value;
                                    // Find the business object if it exists in your list
                                    const business = businesses.find(
                                      (b) => b.businessName === selectedName
                                    );

                                    setFormData({
                                      ...formData,
                                      businessId: business ? business._id : "", // ID for backend
                                      businessName: selectedName, // Display name
                                      city: business
                                        ? business.city
                                        : formData.city, // Auto-fill city if found
                                    });
                                  }}
                                  required
                                />

                                <datalist id="business-options">
                                  {/* Assuming you have a 'businesses' array from your API */}
                                  {businessList.map((b, index) => (
                                    <option
                                      key={b._id || index}
                                      value={b.businessName}
                                      className="capitalize"
                                    >
                                      {b.city
                                        ? `${b.city} Branch`
                                        : "Registered Business"}
                                    </option>
                                  ))}
                                </datalist>

                                {/* Optional: Helpful hint for selected business */}
                                {formData.businessId && (
                                  <span
                                    className="text-xs font-bold mt-1"
                                    style={{ color: "var(--primary-color)" }}
                                  >
                                    Selected ID: {formData.businessId}
                                  </span>
                                )}
                              </div>
                              <div className="form-input mb-6">
                                <label
                                  htmlFor="role"
                                  className="block text-sm font-medium mb-1"
                                >
                                  Role
                                </label>
                                <select
                                  name="role"
                                  className="w-full border py-3 px-3 rounded"
                                  value={formData.role}
                                  onChange={(e) => {
                                    setFormData({...formData, role: e.target.value});
                                    setIsStaff(e.target.value !== 'admin');
                                  }}
                                  required
                                >
                                  <option value="" disabled>
                                    -- Select Role --
                                  </option>
                                  <option value="admin">
                                    Admin (Business Owner)
                                  </option>
                                  <option value="cashier">
                                    Cashier (Sales Only)
                                  </option>
                                  <option value="manager">
                                    Manager (Inventory + Sales)
                                  </option>
                                </select>
                                {/* {!isStaff && (
                                  <>
                                    <input
                                      name="businessName"
                                      placeholder="Business Name"
                                    />
                                    <input name="city" placeholder="City" />
                                  </>
                                )} */}
                              </div>
                            </div>
                            <div className="flex">
                              <div className="form-input">
                                <label htmlFor="city">Town / City</label>
                                <select
                                  name="city"
                                  value={formData.city}
                                  onChange={handleChange}
                                  className="w-full py-3 border rounded" // Add your specific CSS classes here
                                  required
                                >
                                  <option value="" disabled>
                                    -- Select your town --
                                  </option>
                                  {kenyanTowns.map((town) => (
                                    <option key={town} value={town}>
                                      {town}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-input">
                                <label htmlFor="password">Password</label>
                                <div
                                  className="password-input-wrapper"
                                  style={{ position: "relative" }}
                                >
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    style={{
                                      width: "100%",
                                      paddingRight: "40px",
                                    }} // Space for the button
                                  />
                                  <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    style={{
                                      position: "absolute",
                                      right: "10px",
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {showPassword ? "Hide" : "Show"}
                                  </button>
                                </div>
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
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      {/* <th className="py-2 px-3">Email</th> */}
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Business</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <tr key={user._id}>
                          <td className="py-2 px-3">{index + 1}</td>
                          <td className="py-2 px-3 capitalize">
                            {user.fname} {user.lname}
                          </td>
                          {/* <td className="py-2 px-3">{user.email}</td> */}
                          <td className="py-2 px-3">{user.phone}</td>
                          <td className="py-2 px-3">
                            {user.businessId?.businessName ||
                              "No Business Linked"}
                          </td>
                          <td className="py-2 px-3 capitalize">{user.role}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                user.isActive ? "bg-green-200" : "bg-red-200"
                              }`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="py-3 px-2">
                            <div className="action-btn flex gap-[5px]">
                              <button
                                type="button"
                                className="edit-btn flex items-center gap-[5px]"
                                onClick={() => handleEdit(user)}
                              >
                                <Icon
                                  icon="tabler:edit"
                                  width="20"
                                  height="20"
                                />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="delete-btn flex items-center gap-[5px]"
                                onClick={() => confirmDelete(user._id)}
                              >
                                <Icon
                                  icon="material-symbols:delete"
                                  width="20"
                                  height="20"
                                />
                                Delete
                              </button>
                            </div>
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
    </div>
  );
};

export default Users;
