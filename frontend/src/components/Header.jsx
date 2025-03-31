import React, { useState } from "react";
import "./Header.css"; // Import the CSS file


const Header = () => {
  


  return (
    <div className="header-container">
      <button onClick={() => (window.location.href = "/dashboard")} className="header-button">
        Dashboard
      </button>
      
      <button onClick={() => (window.location.href = "/settings")} className="header-button">
        Configurações
      </button>

      <button onClick={() => (window.location.href = "/history")} className="header-button">
        Histórico
      </button>

      {/* <button
        onClick={() => window.open("https://pay.infinitepay.io/tavoai/Ri0x-1HOAcj6R35-19,90", "_blank")}
        className="header-button"
      > 
        Assinatura
      </button>
      <button onClick={handleLogout} className="header-button">
        Logout
      </button>*/}

    </div>
  );
};

export default Header;