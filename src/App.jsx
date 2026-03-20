import "./App.css";
import { useState } from "react"; // 1. Added useState
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
import PaymentModal from "./assets/pages/PaymentModal";

function App() {
  // 3. Global State for Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({ name: "Monthly", amount: 1000 });

  // Function to trigger the modal from any child component
  const openPayment = (planName, price) => {
    setSelectedPlan({ name: planName, amount: price });
    setIsPayModalOpen(true);
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        {/* 4. Pass openPayment to Navbar so you can have a "Renew" button there */}
        <Navbar onOpenPayment={() => openPayment("Monthly", 1000)} />
        <MobileMenu />
        
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* 5. Pass openPayment to Dashboard if you want "Upgrade" cards there */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage onOpenPayment={openPayment} />
            </ProtectedRoute>
          }/>
          
          <Route path="/products" element={<ProtectedRoute><ProductPage /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
        </Routes>

        {/* 6. The Modal is placed outside Routes so it can overlay any page */}
        {isPayModalOpen && (
          <PaymentModal 
            plan={selectedPlan.name} 
            amount={selectedPlan.amount} 
            onClose={() => setIsPayModalOpen(false)} 
          />
        )}
        
        <Footer />
      </Router>
    </>
  );
}

export default App;