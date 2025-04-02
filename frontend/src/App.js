import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Dashboard from "./components/Dashboard";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import useAuth from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Settings from "./pages/Settings";
import MessageHistory from "./pages/MessageHistory";

function App() {
  const { isLoggedIn } = useAuth();
  
  return (
    <Router>
      {/* Global Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicRoute isLoggedIn={isLoggedIn}>
            <LandingPage />
          </PublicRoute>
        } />
        
        <Route path="/login" element={
          <PublicRoute isLoggedIn={isLoggedIn} redirectTo="/dashboard">
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/signup" element={
          <PublicRoute isLoggedIn={isLoggedIn} redirectTo="/dashboard">
            <Signup />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="/history" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <MessageHistory />
          </ProtectedRoute>
        } />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;