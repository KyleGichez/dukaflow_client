import React from "react";
import { useState, useEffect } from "react";
import api from "../../../src/api/axios";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import "../styles/StaffPage.css";

const StaffPage = () => {
  const initialFormState = {
    FName: "",
    LName: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newStaff, setNewStaff] = useState({
    FName: "",
    LName: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier", // Default role
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // ✅ 1. Fetch Staff
  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaffList(res.data);
    } catch (err) {
      console.error("Fetch Error:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // ✅ 2. Add Staff Logic
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/staff", newStaff);
      console.log("DEBUG: Add Success:", response.data);

      setShowModal(false);
      setNewStaff(initialFormState);
      fetchStaff(); // Refresh table
      toast.success("Staff member added successfully!");
    } catch (err) {
      console.error("Failed to add staff:", err.response?.data);
      const errorMsg = err.response?.data?.message || "Failed to add staff";
      toast.error(errorMsg);
    }
  };

  // ✅ 3. Delete Staff Logic
  const handleDeleteStaff = async (id, name) => {
    console.log(`Deleting Staff ID: ${id}`);
    try {
      await api.delete(`/staff/${id}`);
      setStaffList(staffList.filter((member) => member._id !== id));
      toast.success(`${name} removed successfully.`);
    } catch (err) {
      console.error("Delete Failed:", err.response?.data || err.message);
      alert("Could not remove staff. Check console.");
    }
  };

  const confirmDelete = (id, name) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-gray-800">
            Remove <span className="text-red-600">{name}</span> from staff?
          </span>
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-200 rounded"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => {
                toast.dismiss(t.id);
                handleDeleteStaff(id, name);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: 6000, position: "top-center" }
    );
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="staff-wrapper">
      <div className="staff-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Staff</h1>
        <div className="staff-content-wrapper flex gap-[20px]">
          <div className="staff-content-wrapper-menu">
            <div className="staff-content-menu">
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
                {isAdmin && (
                  <>
                    <li className="menu-item active flex items-center gap-[10px]">
                      <span>
                        <Icon icon="fa:users" width="24" height="24" />
                      </span>
                      <a href="/staff">Staff</a>
                    </li>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span>
                        {" "}
                        <Icon icon="ri:heart-add-fill" width="24" height="24" />
                      </span>
                      <a href="/subscription">Subscription</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="staff-content-table">
            <div className="staff-table mb-[20px]">
              <div className="staff-btn-wrapper mb-[10px]">
                <button
                  type="button"
                  className="add-staff-btn flex items-center gap-[5px]"
                  onClick={() => {
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
                          Add Staff
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
                          onSubmit={handleAddStaff}
                          className="mb-[20px] form-modal"
                        >
                          <legend>Add New Staff</legend>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Enter first name"
                                required
                                value={newStaff.FName}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    FName: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Enter last name"
                                required
                                value={newStaff.LName}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    LName: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">
                                Email Address
                              </label>
                              <input
                                type="email"
                                className="w-full border p-2 rounded"
                                placeholder="Enter email address"
                                required
                                value={newStaff.email}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    email: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                className="w-full border p-2 rounded"
                                placeholder="Enter phone number"
                                required
                                value={newStaff.phone}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    phone: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">
                                Login Password
                              </label>
                              <div
                                className="password-input-wrapper"
                                style={{ position: "relative" }}
                              >
                                <input
                                  type={showPassword ? "text" : "password"}
                                  className="w-full border p-2 rounded"
                                  placeholder="Enter password"
                                  required
                                  style={{
                                    width: "100%",
                                    paddingRight: "40px",
                                  }} // Space for the button
                                  value={newStaff.password}
                                  onChange={(e) =>
                                    setNewStaff({
                                      ...newStaff,
                                      password: e.target.value,
                                    })
                                  }
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
                            <div className="form-input mb-6">
                              <label className="block text-sm font-medium mb-1">
                                Role
                              </label>
                              <select
                                className="w-full border py-3 px-3 rounded"
                                value={newStaff.role}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    role: e.target.value,
                                  })
                                }
                              >
                                <option value="cashier">
                                  Cashier (Sales Only)
                                </option>
                                <option value="manager">
                                  Manager (Inventory + Sales)
                                </option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              type="submit"
                              className="modal-add-btn cursor-pointer px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-900"
                              onClick={handleAddStaff}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowModal(false)}
                              className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-900 font-semibold rounded"
                            >
                              Cancel
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
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">Password</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length > 0 ? (
                    staffList.map((member, index) => (
                      <tr
                        key={member._id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-2 px-3">{index + 1}</td>
                        <td className="py-2 px-3 capitalize">
                          {member.FName} {member.LName}
                        </td>
                        <td className="py-2 px-3">{member.Email}</td>
                        <td className="py-2 px-3">{member.Phone}</td>
                        <td className="py-2 px-3">{member.PlainPassword}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-1 rounded capitalize role-${member.role}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            className="bg-red-600 px-3 py-2 text-white flex items-center rounded hover:font-bold"
                            onClick={() =>
                              confirmDelete(member._id, member.FName)
                            }
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
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-4 text-gray-400"
                      >
                        No staff found.
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

export default StaffPage;
