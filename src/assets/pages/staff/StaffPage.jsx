import React from "react";
import { useState, useEffect } from "react";
import api from "../../../api/axios";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import CoinsIcon from "@iconify-react/lucide/coins";
import "../../styles/StaffPage.css";

const StaffPage = () => {
  const initialFormState = {
    fname: "",
    lname: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false); // Controls the Role Edit Modal
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tracks the specific staff member currently being edited in the modal
  const [selectedStaff, setSelectedStaff] = useState(null); 

  const [newStaff, setNewStaff] = useState({
    FName: "",
    LName: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier",
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

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

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post("/staff", newStaff);
      setShowModal(false);
      setNewStaff(initialFormState);
      fetchStaff(); 
      toast.success("Staff member added successfully!");
    } catch (err) {
      console.error("Failed to add staff:", err.response?.data);
      const errorMsg = err.response?.data?.message || "Failed to add staff";
      toast.error(errorMsg);
    }
  };

  const openRoleModal = (staff) => {
    setSelectedStaff({ ...staff });
    setShowRoleModal(true);
  };

  const handleRoleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setIsSubmitting(true);
      await api.put(`/staff/${selectedStaff._id}`, {
        role: selectedStaff.role,
      });

      toast.success(`${selectedStaff.fname}'s role updated successfully`);
      setShowRoleModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
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

  useEffect(() => {
    document.body.style.overflow = (showModal || showRoleModal) ? "hidden" : "auto";
  }, [showModal, showRoleModal]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="staff-wrapper">
      <div className="staff-content">
        <h1 className="text-2xl font-bold uppercase mb-[20px]">Staff</h1>
        <div className="staff-content-wrapper flex gap-[20px]">
          {/* Sidebar Menu */}
          <div className="staff-content-wrapper-menu">
            <div className="staff-content-menu">
              <ul>
                <li className="menu-item flex items-center gap-[10px]">
                  <span><Icon icon="material-symbols:dashboard" width="24" height="24" /></span>
                  <a href="/dashboard">Dashboard</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span><Icon icon="dashicons:products" width="20" height="20" /></span>
                  <a href="/products">Products</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span><Icon icon="lsicon:management-stockout-filled" width="24" height="24" /></span>
                  <a href="/stock">Stock</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span><Icon icon="carbon:sales-ops" width="24" height="24" /></span>
                  <a href="/sales">Sales</a>
                </li>
                <li className="menu-item flex items-center gap-[10px]">
                  <span><CoinsIcon height="24" width="24" /></span>
                  <a href="/credit">Credit</a>
                </li>
                {isAdmin && (
                  <>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span><Icon icon="garden:file-spreadsheet-fill-12" width="24" height="24" /></span>
                      <a href="/summary">Reports</a>
                    </li>
                    <li className="menu-item active flex items-center gap-[10px]">
                      <span><Icon icon="fa:users" width="24" height="24" /></span>
                      <a href="/staff">Staff</a>
                    </li>
                    <li className="menu-item flex items-center gap-[10px]">
                      <span><Icon icon="ri:heart-add-fill" width="24" height="24" /></span>
                      <a href="/subscription">Subscription</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Table Area */}
          <div className="staff-content-table flex-1 min-w-0">
            <div className="staff-table mb-[20px]">
              <div className="staff-btn-wrapper mb-[10px]">
                <button
                  type="button"
                  className="add-staff-btn flex items-center gap-[5px]"
                  onClick={() => {
                    setFormData(initialFormState);
                    setShowModal(true);
                  }}
                >
                  <span><Icon icon="si:add-fill" width="20" height="20" /></span>
                  Add
                </button>

                {/* --- ADD STAFF MODAL --- */}
                {showModal && (
                  <div
                    className="fixed bg-black/80 min-h-screen z-10 w-screen flex justify-center items-center top-0 left-0"
                    onClick={() => setShowModal(false)}
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
                              onClick={() => setShowModal(false)}
                              icon="material-symbols:cancel"
                              width="30"
                              height="30"
                            />
                          </span>
                        </h1>
                        <form onSubmit={handleAddStaff} className="mb-[20px] form-modal">
                          <legend>Add New Staff</legend>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">First Name</label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Enter first name"
                                required
                                value={newStaff.fname}
                                onChange={(e) => setNewStaff({ ...newStaff, fname: e.target.value })}
                              />
                            </div>
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">Last Name</label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Enter last name"
                                required
                                value={newStaff.lname}
                                onChange={(e) => setNewStaff({ ...newStaff, lname: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">Email Address</label>
                              <input
                                type="email"
                                className="w-full border p-2 rounded"
                                placeholder="Enter email address"
                                required
                                value={newStaff.email}
                                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                              />
                            </div>
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">Phone Number</label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Enter phone number"
                                required
                                value={newStaff.phone}
                                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex">
                            <div className="form-input">
                              <label className="block text-sm font-medium mb-1">Login Password</label>
                              <div className="password-input-wrapper" style={{ position: "relative" }}>
                                <input
                                  type={showPassword ? "text" : "password"}
                                  className="w-full border p-2 rounded"
                                  placeholder="Enter password"
                                  required
                                  style={{ width: "100%", paddingRight: "40px" }}
                                  value={newStaff.password}
                                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                                />
                                <button
                                  type="button"
                                  onClick={togglePasswordVisibility}
                                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}
                                >
                                  {showPassword ? "Hide" : "Show"}
                                </button>
                              </div>
                            </div>
                            <div className="form-input mb-6">
                              <label className="block text-sm font-medium mb-1">Role</label>
                              <select
                                className="w-full border py-3 px-3 rounded"
                                value={newStaff.role}
                                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                              >
                                <option value="cashier">Cashier (Point of Sale Only)</option>
                                <option value="manager">Manager (Inventory & Sales)</option>
                                <option value="admin">Admin (Full System Access)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              type="submit"
                              className="modal-add-btn cursor-pointer px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-900"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Saving..." : "Save"}
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

                {/* --- EDIT ROLE MODAL --- */}
                {showRoleModal && selectedStaff && (
                  <div
                    className="fixed bg-black/80 min-h-screen z-20 w-screen flex justify-center items-center top-0 left-0"
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedStaff(null);
                    }}
                  >
                    <div
                      className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl mx-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 uppercase">
                          Change User Role
                        </h3>
                        <span className="cursor-pointer" onClick={() => { setShowRoleModal(false); setSelectedStaff(null); }}>
                          <Icon icon="material-symbols:cancel" width="28" height="28" className="text-gray-500 hover:text-gray-700" />
                        </span>
                      </div>
                      
                      <div className="mb-4 text-sm bg-gray-50 p-3 rounded border border-gray-100">
                        <p className="text-gray-600">Staff Member: <span className="font-bold text-gray-800 uppercase">{selectedStaff.fname} {selectedStaff.lname}</span></p>
                        <p className="text-gray-600">Email: <span className="font-semibold text-gray-800">{selectedStaff.email}</span></p>
                        <p className="text-gray-600">Phone: <span className="font-semibold capitalize text-gray-800">{selectedStaff.phone}</span></p>
                      </div>

                      <form onSubmit={handleRoleUpdateSubmit}>
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select New Assignment Role
                          </label>
                          <select
                            className="w-full border border-gray-300 p-2.5 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 capitalize"
                            value={selectedStaff.role}
                            onChange={(e) => setSelectedStaff({ ...selectedStaff, role: e.target.value })}
                          >
                            <option value="admin">Admin (Full System Access)</option>
                            <option value="manager">Manager (Inventory & Sales)</option>
                            <option value="cashier">Cashier (Point of Sale Only)</option>
                          </select>
                        </div>

                        <div className="flex justify-end gap-2.5">
                          <button
                            type="button"
                            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
                            onClick={() => {
                              setShowRoleModal(false);
                              setSelectedStaff(null);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Updating..." : "Update Role"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full table-auto text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Contact</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Created At</th>
                      <th className="py-2 px-3">Total Sales(Ksh)</th>
                      <th className="py-2 px-3">Items Sold</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.length > 0 ? (
                      staffList.map((member, index) => (
                        <tr key={member._id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{index + 1}</td>
                          <td className="py-2 px-3 uppercase text-gray-700 text-sm font-semibold">
                            {member.fname} {member.lname}
                          </td>
                          <td className="py-2 px-3">
                            {member.email}
                            <p className="text-gray-500">{member.phone}</p>
                          </td>
                          <td className="py-2 px-3 capitalize">
                            {member.role}
                          </td>
                          <td className="py-2 px-3">
                            <p>{new Date(member.createdAt).toLocaleDateString("en-KE")}</p>
                            <p className="text-xs font-semibold text-gray-500">
                              {new Date(member.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-sm text-gray-700">
                            KSH {(member.totalSales || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-semibold text-sm text-gray-600">
                            {(member.itemsSold || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-semibold">
                            <span className={`px-2 py-1 rounded text-xs ${member.isActive ? "bg-green-200" : "bg-red-200"}`}>
                              {member.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Open Role Edit Modal Button */}
                              <button
                                type="button"
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 text-white flex items-center rounded transition-all shadow-sm"
                                title="Change Staff Role"
                                onClick={() => openRoleModal(member)}
                              >
                                <span>
                                  <Icon icon="fluent:person-edit-24-filled" width="20" height="20" />
                                </span>
                              </button>

                              <button
                                type="button"
                                className="bg-red-600 px-3 py-2 text-white flex items-center rounded hover:font-bold"
                                title="Delete staff member"
                                onClick={() => confirmDelete(member._id, member.fname)}
                              >
                                <span>
                                  <Icon icon="material-symbols:delete" width="20" height="20" />
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-gray-400">
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
    </div>
  );
};

export default StaffPage;