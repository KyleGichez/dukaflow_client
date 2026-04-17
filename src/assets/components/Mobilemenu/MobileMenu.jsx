import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Database,
  ShoppingCart,
  BarChart3,
  Users,
  HeartPlus,
  Building2, 
  Send
} from "lucide-react";
import "../../styles/Navbar.css";

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


  // 1. Define all items with an optional 'adminOnly' flag
  const mainNavItems = [
    { name: "Dash", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Products", path: "/products", icon: <Package size={20} /> },
    { name: "Stock", path: "/stock", icon: <Database size={20} /> },
    { name: "Sales", path: "/sales", icon: <ShoppingCart size={20} /> },
    { name: "Reports", path: "/summary", icon: <BarChart3 size={20} /> },
    {
      name: "Staff",
      path: "/staff",
      icon: <Users size={20} />,
      adminOnly: true,
    },
    {
      name: "Subscribe",
      path: "/subscription",
      icon: <HeartPlus size={20} />,
      adminOnly: true,
    },
  ];

  // ADMIN MENU (completely separate)
  const adminNavItems = [
    {
      name: "Dash",
      path: "/admin/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    { name: "Users", path: "/admin/users", icon: <Users size={20} /> },
    { name: "Businesses", path: "/admin/businesses", icon: <Building2 size={20} /> },
    { name: "Subs", path: "/admin/subscription", icon: <HeartPlus size={20} /> },
    { name: "Invites", path: "/admin/invites", icon: <Send size={20} /> },
  ];

  const isAdminSection = location.pathname.startsWith("/admin");
  const navItems = isAdminSection ? adminNavItems : mainNavItems;

  // 2. Filter items based on the user's role
  const visibleItems = navItems.filter((item) => {
    if (isAdminSection) return true;

    if (item.adminOnly) {
      return user?.role === "admin";
    }
    return true;
  });

  return (
    <nav className="mobile-menu md:hidden fixed bottom-0 left-0 z-50 w-full h-16 border-t border-gray-200 shadow-lg">
      {/* 3. Use 'flex' and 'w-full' to ensure items distribute evenly */}
      <div className="flex h-full w-full mx-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center transition-colors ${
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
