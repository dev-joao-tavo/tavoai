// src/hooks/useAuth.js
import { useState } from "react";

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("token");
    console.log("Initial isLoggedIn:", !!token); // Debugging
    return !!token;
  });

  const login = (token) => {
    localStorage.setItem("token", token); // Save token to localStorage
    console.log("Token saved. Setting isLoggedIn to true."); // Debugging
    setIsLoggedIn(true); // Update state synchronously
  };

  const logout = () => {
    localStorage.removeItem("token"); // Remove token from localStorage
    console.log("Token removed. Setting isLoggedIn to false."); // Debugging
    setIsLoggedIn(false); // Update state synchronously
  };

  return { isLoggedIn, login, logout };
};

export default useAuth;