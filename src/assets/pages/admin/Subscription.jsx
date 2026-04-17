import React from "react";
import { Icon } from "@iconify/react";
import "../../styles/Subscription.css";

const Subscription = () => {
  function getTodaysDate() {
    return new Date().toLocaleDateString();
  }

  return (
    <div className="subscription-wrapper">
      <div className="subscription-content">
        <h1 className="text-2xl uppercase font-bold mb-[20px]">
          All Subscriptions
        </h1>
        <div className="subscription-content-wrapper flex gap-[20px]">
          <div className="subscription-content-wrapper-menu">
            <div className="subscription-content-menu">
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
                <li className="menu-item flex items-center gap-[10px]">
                  <span>
                    <Icon icon="material-symbols:add-business-rounded" width="24" height="24" />
                  </span>
                  <a href="businesses">Businesses</a>
                </li>
                <li className="menu-item active flex items-center gap-[10px]">
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
          <div className="subscription-content-wrapper-info">
            <div className="subscription-content-info">
              <div className="subscription-table mb-[20px] px-2 py-3">
                <div className="flex justify-end mb-[10px]">
                  <button
                    type="button"
                    className="add-product-btn flex items-center gap-[5px]"
                    onClick={() => {
                      setShowModal(true);
                    }}
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
                      <th className="py-2 px-3">Business</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Subscription</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className="py-2 px-3">1</th>
                      <td className="py-2 px-3">John's Tech Shop</td>
                      <td className="py-2 px-3">johndoe@gmail.com</td>
                      <td className="py-2 px-3">0725898762</td>
                      <td className="py-2 px-3">Monthly</td>
                      <td className="py-2 px-3"> Active</td>
                      <td className="py-2 px-3"> 5/25/2026</td>
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

export default Subscription;
