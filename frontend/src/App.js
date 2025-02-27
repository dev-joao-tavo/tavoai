import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import KanbanBoard from "./components/KanbanBoard";
import Conversation from "./pages/Conversation";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import useAuth from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  const { isLoggedIn, logout } = useAuth();

  console.log("App re-rendered. isLoggedIn:", isLoggedIn); // Debugging

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute isLoggedIn={isLoggedIn}>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute isLoggedIn={isLoggedIn}>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PublicRoute isLoggedIn={isLoggedIn}>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <KanbanBoard onLogout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/conversation/:cardId"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Conversation />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Route */}
        <Route
          path="*"
          element={
            <Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;