import React, { useState } from "react";
import "./Header.css"; // We'll create this CSS file next

const Header = () => {
  const [isOpen, setIsOpen] = useState(true); // Sidebar starts open by default

  // Toggle sidebar (for mobile)
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Hamburger Button (only visible on small screens) */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="sidebar-button"
        >
          Dashboard
        </button>
        <button
          onClick={() => (window.location.href = "/settings")}
          className="sidebar-button"
        >
          Configurações
        </button>
        <button
          onClick={() => (window.location.href = "/history")}
          className="sidebar-button"
        >
          Histórico
        </button>
        {/* Uncomment if needed
        <button
          onClick={() => window.open("https://pay.infinitepay.io/tavoai/Ri0x-1HOAcj6R35-19,90", "_blank")}
          className="sidebar-button"
        >
          Assinatura
        </button>
        <button onClick={handleLogout} className="sidebar-button">
          Logout
        </button>
        */}
      </div>
    </>
  );
};

export default Header;