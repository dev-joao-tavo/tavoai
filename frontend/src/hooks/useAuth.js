// src/hooks/useAuth.js
import { useState } from "react";

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("token");
    return !!token;
  });

  const login = (token) => {
    localStorage.setItem("token", token); // Save token to localStorage
    setIsLoggedIn(true); // Update state synchronously
  };

  const logout = () => {
    localStorage.removeItem("token"); // Remove token from localStorage
    setIsLoggedIn(false); // Update state synchronously
  };

  return { isLoggedIn, login, logout };
};

export default useAuth;