import React from "react";
import "../../styles/Invites.css";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HeartPlus,
  CoinsIcon,
  ShieldCheck,
  Store,
} from "lucide-react";

const Invites = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  const navigate = useNavigate();

  return (
    <div className="invites-wrapper">
      <div className="invites-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">All Invites</h1>
        <div className="invites-content-wrapper flex gap-[20px]">
          <div className="invites-content-wrapper-menu">
            <div className="invites-content-menu">
              <ul>
                <li
                  onClick={() => navigate("/admin/dashboard")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <LayoutDashboard width="24" height="24" />
                  Dashboard
                </li>
                <li
                  onClick={() => navigate("/admin/users")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <Users width="24" height="24" />
                  Users
                </li>
                <li
                  onClick={() => navigate("/admin/businesses")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <Store width="24" height="24" />
                  Businesses
                </li>
                <li
                  onClick={() => navigate("/admin/subscription")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <CoinsIcon width="24" height="24" />
                  Subscription
                </li>
                <li
                  onClick={() => navigate("/admin/invites")}
                  className="menu-item active flex items-center gap-[10px]"
                >
                  <HeartPlus width="24" height="24" />
                  Invites
                </li>
                <li
                  onClick={() => navigate("/admin/integration")}
                  className="menu-item flex items-center gap-[10px]"
                >
                  <ShieldCheck width="24" height="24" />
                  Integration
                </li>
              </ul>
            </div>
          </div>
          <div className="invites-content-wrapper-info">
            <div className="invites-content-info">
              <div className="invites-sent-table mb-[20px] px-2 py-3">
                <div className="flex justify-end mb-[10px]">
                  <button
                    type="button"
                    className="add-product-btn flex items-center gap-[5px]"
                  >
                    <span>
                      <Icon icon="si:add-fill" width="20" height="20" />
                    </span>
                    Add
                  </button>
                </div>
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Business</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className="py-2 px-3">1</th>
                      <td className="py-2 px-3">{getTodaysDate()}</td>
                      <td className="py-2 px-3">Vicky's Mini Mart</td>
                      <td className="py-2 px-3">stacym@gmail.com</td>
                      <td className="py-2 px-3">Admin</td>
                      <td className="py-2 px-3">Pending</td>
                      <td className="py-2 px-3"> 2 Hrs </td>
                      <td className="py-3 px-2">
                        <div className="action-btn flex flex-col gap-[5px]">
                          <button
                            type="button"
                            className="delete-btn flex items-center gap-[5px]"
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

export default Invites;
