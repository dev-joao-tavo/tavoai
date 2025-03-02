// src/utils/api.js

export const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem("token");
  
    // Add token to the request headers if it exists
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  
    const response = await fetch(url, options);
  
    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized (e.g., token expired)
        console.log("Unauthorized request. Logging out.");
        localStorage.removeItem("token"); // Remove invalid token
        // Optionally trigger logout from the state
      }
      throw new Error("Failed to fetch data");
    }
  
    return response.json();
  };
  