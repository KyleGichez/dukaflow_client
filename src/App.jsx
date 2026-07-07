import "./App.css";
import { useState, useEffect } from "react";
import Navbar from "./assets/components/NavBar/Navbar";
import Footer from "./assets/components/Footer/Footer";
import { Routes, Route } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./assets/pages/auth/LoginPage";
import AdminDashboard from "./assets/pages/admin/Dashboard";
import Business from "./assets/pages/admin/Business";
import Users from "./assets/pages/admin/Users";
import Invites from "./assets/pages/admin/Invites";
import Subscription from "./assets/pages/admin/Subscription";
import Integration from "./assets/pages/admin/Integration";
import DashboardPage from "./assets/pages/dashboard/DashboardPage";
import ProductPage from "./assets/pages/products/ProductPage";
import StockPage from "./assets/pages/stock/StockPage";
import SalesPage from "./assets/pages/sales/SalesPage";
import ReportsPage from "./assets/pages/reports/ReportsPage";
import CreditSalesPage from "./assets/pages/credit/CreditSalesPage";
import StaffPage from "./assets/pages/staff/StaffPage";
import InvoicesPage from "./assets/pages/invoices/InvoicePage";
import InvoiceDetails from "./assets/pages/invoices/InvoiceDetails";
import SettingsPage from "./assets/pages/settings/SettingsPage";
import SubscriptionPage from "./assets/pages/subscription/SubscriptionPage";
import ProtectedRoute from "./assets/components/ProtectedRoutes/ProtectedRoute";
import MobileMenu from "./assets/components/Mobilemenu/MobileMenu";
import NewInvoicePage from "./assets/components/Invoice/NewInvoicePage";
import UseIdleTimeout from "./assets/components/Hooks/UseIdleTimeout";
import SessionWarningModal from "./assets/components/Modals/SessionWarningModal";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Guard statement for Electron's internal production file system execution
    if (window.location.protocol === "file:") {
      console.log("Skipping Service Worker registration inside Electron production bundle.");
      return;
    }
  
    // Unified single registration loop with a 3-second delay initialization
    if ("serviceWorker" in navigator) {
      const timer = setTimeout(() => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("✅ DukaFlow PWA Ready:", reg.scope))
          .catch((err) => {
            if (err.name !== "InvalidStateError") {
              console.error("SW Registration Error:", err);
            }
          });
      }, 3000);
  
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const loadTheme = () => {
      const savedUser = JSON.parse(localStorage.getItem("user"));
      if (savedUser) {
        // Look for the specific user theme first, then fallback to their DB preference
        const userTheme =
          localStorage.getItem(`theme_${savedUser.id}`) ||
          savedUser.themePreference ||
          "light";
        document.documentElement.setAttribute("data-theme", userTheme);
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    };

    loadTheme();
    window.addEventListener("userChanged", loadTheme);
    return () => window.removeEventListener("userChanged", loadTheme);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

  const { showWarning, resetTimers } = UseIdleTimeout({
    onLogout: logout,
  });

  return (
    <>
      {showWarning && (
        <SessionWarningModal onStayLoggedIn={resetTimers} onLogout={logout} />
      )}
      <Toaster position="top-center" reverseOrder={false} />
      <Navbar />
      <MobileMenu />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/businesses"
          element={
            <ProtectedRoute>
              <Business />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/invites"
          element={
            <ProtectedRoute>
              <Invites />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/subscription"
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/integration"
          element={
            <ProtectedRoute>
              <Integration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <SalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credit"
          element={
            <ProtectedRoute>
              <CreditSalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice/new"
          element={
            <ProtectedRoute>
              <NewInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
