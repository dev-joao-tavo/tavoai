import React, { useState, useEffect } from "react";
import "./WhatsAppLogin.css"; // Import the CSS file

const WhatsAppLogin = ({ code, onClose }) => {
  const [seconds, setSeconds] = useState(60);
  const [isExpired, setIsExpired] = useState(false); // Track if the countdown has expired

  useEffect(() => {
    let timer;
    if (code && seconds > 0) { // Start countdown only if code is available
      timer = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsExpired(true); // Set expired flag when countdown reaches 0
    }

    return () => clearInterval(timer); // Clean up the interval on component unmount or when seconds change
  }, [code, seconds]);

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Código de Login</h2>
        
        {/* Loading Message */}
        {!code && ( // Show loading circle only if code is not available
          <>
            <div className="loading-circle" key="loading-circle"></div>
            <p>Estamos buscando o seu código de login...</p>
          </>
        )}

        {/* WhatsApp Code and Countdown */}
        {code && ( // Show code and countdown only if code is available
          isExpired ? (
            <p className="expired-message">
              O tempo expirou. Por favor, feche o modal e gere um novo código.
            </p>
          ) : (
            <>
              <p>Use este código para fazer login no WhatsApp:</p>
              <div className="whatsapp-code">{code}</div>
              <p>Tempo restante: {seconds} segundos</p>
            </>
          )
        )}

        {/* Close Button ("X") */}
        <button className="close-button-wpp" onClick={onClose}>
          &#10005; {/* "X" character */}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppLogin;