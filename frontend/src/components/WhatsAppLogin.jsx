import React, { useState, useEffect } from "react";
import "./WhatsAppLogin.css"; // Import the CSS file

const WhatsAppLogin = ({ code, onClose }) => {
  const [seconds, setSeconds] = useState(60);
  const [isExpired, setIsExpired] = useState(false); // Track if the countdown has expired

  useEffect(() => {
    if (seconds > 0) {
      const timer = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);

      return () => clearInterval(timer); // Clean up the interval on component unmount
    } else {
      setIsExpired(true); // Set expired flag when countdown reaches 0
    }
  }, [seconds]);

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Código de Login</h2>
        <p>Use este código para fazer login no WhatsApp:</p>
        <div className="whatsapp-code">{code}</div>
        <p>Tempo restante: {seconds} segundos</p>
        
        {isExpired && (
          <p className="expired-message">O tempo expirou. Por favor, feche o modal e gere um novo código.</p>
        )}

        <button className="close-button" onClick={onClose}>
          &#10005; {/* "X" character */}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppLogin;
