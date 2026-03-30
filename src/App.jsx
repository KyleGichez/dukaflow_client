import "./App.css";
import { useState, useEffect } from "react";
import Navbar from "./assets/components/NavBar/Navbar";
import Footer from "./assets/components/Footer/Footer";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./assets/pages/LoginPage";
import SignupPage from "./assets/pages/SignupPage";
import DashboardPage from "./assets/pages/DashboardPage";
import ProductPage from "./assets/pages/ProductPage";
import StockPage from "./assets/pages/StockPage";
import SalesPage from "./assets/pages/SalesPage";
import ReportsPage from "./assets/pages/ReportsPage";
import ProtectedRoute from "./assets/components/ProtectedRoutes/ProtectedRoute";
import MobileMenu from "./assets/components/Mobilemenu/MobileMenu";
import StaffPage from "./assets/pages/StaffPage";
import SubscriptionPage from "./assets/pages/SubscriptionPage";
import SettingsPage from "./assets/pages/SettingsPage";


function App() {
  useEffect(() => {
    // Only run this in production/serve mode
    if ('serviceWorker' in navigator) {
      // 3-second delay ensures the Dashboard or Login page is fully "Stable"
      const timer = setTimeout(() => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('✅ DukaFlow PWA Ready:', reg.scope))
          .catch(err => {
            if (err.name !== 'InvalidStateError') {
              console.error('SW Registration Error:', err);
            }
          });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <Navbar />
        <MobileMenu />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage/>
            </ProtectedRoute>
          }/>
          <Route path="/products" element={<ProtectedRoute><ProductPage /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage/></ProtectedRoute>}/>
        </Routes>
        <Footer />
      </Router>
    </>
  );
}

export default App;