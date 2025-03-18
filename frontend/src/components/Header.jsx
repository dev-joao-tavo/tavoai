
import React, { useState } from "react";
import axios from "axios";
import WhatsAppLogin from "./WhatsAppLogin"; // Import the modal
const API_BASE_URL = "https://api.tavoai.com";

const Header = ({ handleLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);

  const handleWhatsAppLogin = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/whatsAppLogin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setWhatsAppCode(response.data.code);
    } catch (error) {
      console.error("Error on logging in your WhatsApp: ", error);
      alert("Failed to login!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="header-container">
      <button onClick={() => window.location.href = "/dashboard"} className="header-button">Dashboard</button>
      <button onClick={() => window.open("https://pay.infinitepay.io/tavoai/Ri0x-1HOAcj6R35-19,90", "_blank")} className="header-button">Assinatura</button>
      <button onClick={handleWhatsAppLogin} className="header-button" disabled={isLoading}>
        {isLoading ? "Carregando..." : "WhatsApp Login"}
      </button>
      <button onClick={handleLogout} className="header-button">Logout</button>

      {/* Show modal if code exists */}
      {whatsAppCode && <WhatsAppLogin code={whatsAppCode} onClose={() => setWhatsAppCode(null)} />}
    </div>
  );
};

export default Header;
