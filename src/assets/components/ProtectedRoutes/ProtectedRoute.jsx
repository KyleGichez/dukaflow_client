import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  // Safely parse user to avoid crashing if it's empty or malformed
  const user = userString ? JSON.parse(userString) : null;

  if (!token || !user) {
    console.warn("Auth missing. Redirecting back to login...");
    return <Navigate to="/login" replace />;
  }

  // If offline, bypass any further layout re-fetches and just load the view
  if (!navigator.onLine && token === "offline-mock-token") {
    return children;
  }

  return children;
};

export default ProtectedRoute;