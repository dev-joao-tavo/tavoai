import React from "react";
import "./WhatsAppLogin.css"; // Import the CSS file

const WhatsAppLogin = ({ code, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Código de Login</h2>
        <p>Use este código para fazer login no WhatsApp:</p>
        <div className="whatsapp-code">{code}</div>
        <button className="close-button" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
};

export default WhatsAppLogin;
