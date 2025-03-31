import React, { useState } from "react";
import { FaHome, FaCog, FaHistory } from "react-icons/fa";

import "./Header.css"; // Reuse your existing CSS or update it for the sidebar

const Header = () => {
  const [isOpen, setIsOpen] = useState(true); // Starts open by default

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button (hidden on desktop) */}
      <button className="header-toggle" onClick={toggleSidebar}>
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar-styled Header */}
      <div className={`header-container ${isOpen ? "open" : ""}`}>

        <button onClick={() => (window.location.href = "/dashboard")} className="header-button">
          <FaHome /> Dashboard
        </button>
        <button
          onClick={() => (window.location.href = "/settings")}
          className="header-button"
        >
          Configurações
        </button>
        <button
          onClick={() => (window.location.href = "/history")}
          className="header-button"
        >
          Histórico
        </button>
        {/* Uncomment if needed:
        <button
          onClick={() => window.open("https://pay.infinitepay.io/tavoai/Ri0x-1HOAcj6R35-19,90", "_blank")}
          className="header-button"
        >
          Assinatura
        </button>
        <button onClick={handleLogout} className="header-button">
          Logout
        </button>
        */}
      </div>
    </>
  );
};

export default Header;