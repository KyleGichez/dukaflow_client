import React from "react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import api from "../../../api/axios";
import toast from "react-hot-toast";
import "../../styles/AdminDashboard.css";

const AdminDashboard = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const [userName, setUserName] = useState("User");
  const [stats, setStats] = useState();
  const [recentUsers, setRecentUsers] = useState([]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserName(userData.fname || "User");
    }
  });
  
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserName(userData.fname || "User");
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // This calls the controller function you shared
        const res = await api.get("admin/dashboard");

        // Destructure based on your backend res.json structure
        setStats(res.data.stats);
        setRecentUsers(res.data.recentUsers);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        toast.error("Failed to load real-time analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Reuse the same endpoint from your Users component
        const res = await api.get("admin/users");
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading)
  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">Admin Dashboard</h1>
        <h2 className="mb-[20px] flex gap-2">
          Welcome back, <div className="skeleton h-6 w-24 rounded"></div>
        </h2>
        
        <div className="admin-dashboard-content-wrapper flex gap-[20px]">
          {/* Sidebar Skeleton */}
          <div className="admin-dashboard-content-wrapper-menu">
            <div className="admin-dashboard-content-menu">
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-center gap-[10px] p-2">
                    <div className="skeleton h-6 w-6 rounded-full"></div>
                    <div className="skeleton h-4 w-20 rounded"></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="admin-dashboard-content-wrapper-info">
            <div className="admin-dashboard-content-top mb-[20px]">
              {/* Stats Grid Skeleton */}
              <div className="grid grid-cols-4 gap-6 mb-[20px] mr-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="users-stat-card bg-white p-4 rounded-lg shadow-sm">
                    <div className="skeleton h-3 w-3/4 mb-3 rounded"></div>
                    <div className="skeleton h-8 w-1/2 rounded"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-dashboard-content-bottom">
              <div className="admin-dashboard-recent-activity py-2 rounded">
                <h3 className="font-bold uppercase py-3">Recent Activity</h3>
                <div className="new-users-table mb-[20px] px-3 py-3 bg-white rounded-lg">
                  <h4 className="font-bold py-2 uppercase">New Users</h4>
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Business</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((i) => (
                        <tr key={i} className="border-b">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="py-4 px-3">
                              <div className="skeleton h-4 w-full rounded"></div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">
          Admin Dashboard
        </h1>
        <h2 className="mb-[20px]">
          Welcome back, <strong className="capitalize">{userName}</strong>
        </h2>
        <div className="admin-dashboard-content-wrapper flex gap-[20px]">
          <div className="admin-dashboard-content-wrapper-menu">
            <div className="admin-dashboard-content-menu">
              <ul>
                <li className="menu-item active flex items-center gap-[10px]">
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
          <div className="admin-dashboard-content-wrapper-info">
            <div className="admin-dashboard-content-top mb-[20px]">
              <div className="grid grid-cols-4 gap-6 mb-[20px] mr-2">
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Total Businesses</h2>
                  <p className="py-[10px]">
                    {stats?.businesses?.total || 0} Businesses
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Active Businesses</h2>
                  <p className="py-[10px]">
                    {stats?.businesses?.active || 0} Businesses
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Total Users</h2>
                  <p className="py-[10px]">{stats?.users?.total || 0} Users</p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Active Users</h2>
                  <p className="py-[10px]">{stats?.users?.active || 0} Users</p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Total Subs</h2>
                  <p className="py-[10px]">
                    {stats?.subscriptions?.total || 0} Subscriptions
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Active Subs</h2>
                  <p className="py-[10px]">
                    {stats?.subscriptions?.active || 0} Subscriptions
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Trial Subs</h2>
                  <p className="py-[10px]">
                    {stats?.subscriptions?.trial || 0} Subscriptions
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Monthly Subs</h2>
                  <p className="py-[10px]">
                    {stats?.subscriptions?.monthly || 0} Subscriptions
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Yearly Subs</h2>
                  <p className="py-[10px]">
                    {stats?.subscriptions?.yearly || 0} Subscriptions
                  </p>
                </div>
                <div className="users-stat-card">
                  <h2 className="font-bold uppercase">Date Today</h2>
                  <p className="py-[10px]">{getTodaysDate()}</p>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-content-bottom">
              <div className="admin-dashboard-recent-activity py-2 rounded">
                <h3 className="font-bold uppercase py-3">Recent Activity</h3>
                <div className="new-users-table mb-[20px] px-3 py-3">
                  <h4 className="font-bold py-2 uppercase">New Users</h4>
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Business</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.slice(0, 5).map((u, index) => (
                          <tr key={u._id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3"> {index + 1}</td>
                            <td className="py-2 px-3 capitalize">
                              {u.fname} {u.lname}
                            </td>
                            <td className="py-2 px-3">
                              {u.businessId?.businessName ||
                                "No Linked Business"}
                            </td>
                            <td className="py-2 px-3 capitalize">{u.phone}</td>
                            <td className="py-2 px-3 capitalize">{u.role}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  u.isActive ? "bg-green-200" : "bg-red-200"
                                }`}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="mt-4 text-right">
                    <a
                      href="users"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View All Users →
                    </a>
                  </div>
                </div>
                <div className="invites-sent-table mb-[20px] px-3 py-3">
                  <h4 className="font-bold py-2 uppercase">Pending Invites</h4>
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th className="py-2 px-3">1</th>
                        <td className="py-2 px-3">{getTodaysDate()}</td>
                        <td className="py-2 px-3">stacym97@gmail.com</td>
                        <td className="py-2 px-3">Admin</td>
                        <td className="py-2 px-3"> Pending</td>
                        <td className="py-2 px-3 capitalize">2 hrs</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-4 text-right">
                    <a
                      href="invites"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View All Invites →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
