import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // If there is no token, redirect them to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If a token exists, render the children (the Dashboard)
  return children;
};

export default ProtectedRoute;