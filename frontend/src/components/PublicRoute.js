// src/components/PublicRoute.js
import { Navigate } from "react-router-dom";

const PublicRoute = ({ isLoggedIn, children }) => {
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default PublicRoute;