import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Database,
  ShoppingCart,
  BarChart3,
  Users,
  Coins,
} from "lucide-react";

const MobileMenu = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }
  }, [location]);

  if (!user) return null;

  const navItems = [
    { name: "Dash", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Products", path: "/products", icon: <Package size={20} /> },
    { name: "Stock", path: "/stock", icon: <Database size={20} /> },
    { name: "Sales", path: "/sales", icon: <ShoppingCart size={20} /> },
    { name: "Reports", path: "/summary", icon: <BarChart3 size={20} /> },

    // Admin only
    {
      name: "Staff",
      path: "/staff",
      icon: <Users size={20} />,
      roles: ["admin"],
    },
    {
      name: "Pricing",
      path: "/subscription",
      icon: <Coins size={20} />,
      roles: ["admin"],
    },
  ];

  // Filter menu based on role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 shadow-lg">
      <div
        className="grid h-full mx-auto"
        style={{
          gridTemplateColumns: `repeat(${filteredNavItems.length}, minmax(0, 1fr))`,
        }}
      >
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center transition-colors ${
                isActive ? "text-blue-600 font-bold" : "text-gray-500"
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1 uppercase tracking-tight">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileMenu;
