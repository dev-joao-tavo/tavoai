import React, { useState } from "react";
import "./Settings.css";
import Header from "../components/Header.jsx"; // Adjust path if necessary
import axios from "axios";
import WhatsAppLogin from "../components/WhatsAppLogin"; // Import the modal
import * as constants from '../utils/constants';

const Settings = () => {
  // State for Profile Section
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  const [whatsappStatus, setWhatsappStatus] = useState("-");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);

  const handleWhatsAppIsLoggedInCheck = async() => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLoginCheck`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(response.data.is_logged_in === true){
        setWhatsappStatus("Connected");
      }
      if(response.data.is_logged_in === false){
        setWhatsappStatus("Disconnected");
      }

    } catch (error) {
      console.error("Error on logging in your WhatsApp: ", error);
      setWhatsappStatus("Error: please try again");
      alert("Error: ", error);

      
    } finally {
      setIsChecking(false);
    }
  }

  const handleWhatsAppLogin = async () => {
    setIsLoading(true);
    setShowModal(true); // Show the modal as soon as the button is clicked

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLogin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setWhatsAppCode(response.data.code); // Set the code when available

    } catch (error) {
      console.error("Error on logging in your WhatsApp: ", error);
      alert("Error: ", error);
      
    } finally {
      setIsLoading(false);
    }
  };


  // State for Messages Section
  const agendaStatuses = constants.agendaStatuses;
  const funnelStatuses = constants.funnelStatuses;
  

  const [agendaMessages, setAgendaMessages] = useState(
    agendaStatuses.reduce((acc, status) => {
      acc[status] = { message1: "", message2: "", message3: "" };
      return acc;
    }, {})
  );

  const [funnelMessages, setFunnelMessages] = useState(
    funnelStatuses.reduce((acc, status) => {
      acc[status] = { message1: "", message2: "", message3: "" };
      return acc;
    }, {})
  );

  const updateProfile = async (userId, profileData) => {
    const token = localStorage.getItem("token"); // Assuming you store the token in localStorage
    const response = await fetch(`/api/users/profile/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update profile");
    }
  
    return response.json();
  };
  
  // Example usage
  const handleSaveProfile = async () => {
    try {
      const profileData = {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        password: "newpassword123",
      };
      
      const result = await updateProfile("", profileData);
    } catch (error) {
      console.error(error.message);
    }
  };



  // Save Messages Handler
  const handleSaveMessages = () => {
    alert("Messages saved!");
  };

  // Handle Message Input Change
  const handleMessageChange = (section, status, field, value) => {
    if (section === "agenda") {
      setAgendaMessages((prev) => ({
        ...prev,
        [status]: { ...prev[status], [field]: value },
      }));
    } else if (section === "funnel") {
      setFunnelMessages((prev) => ({
        ...prev,
        [status]: { ...prev[status], [field]: value },
      }));
    }
  };

  return (
    <div className="settings-page">
      {/* Header Component */}
      <Header/>
  
      {/* Profile Section */}
      <div className="section">
        <br/>
        <div className="input-group">
        <label htmlFor="name">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <div className="input-group">
          <label htmlFor="phone_number">Número do WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a new password"
          />
        </div>
        <button className="button" onClick={handleSaveProfile}>Atualizar perfil</button>
        </div>

{/* WhatsApp Connection Section */}
<div className="section">
  <h2>Conexão com o WhatsApp</h2>
  <div className="status">
    <span>Status:</span> 
    <span style={{ display: 'inline-block', marginLeft: '8px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: whatsappStatus === "Connected" ? 'green' : whatsappStatus === "Disconnected" ? 'red' : 'gray' }}></span>
    <span style={{ marginLeft: '8px' }}>
      {whatsappStatus === "Connected" ? "Conectado" : 
       whatsappStatus === "Disconnected" ? "Desconectado" : 
       whatsappStatus}
    </span>
  </div>
  
  {(isLoading || isChecking) ? (
    <div className="loading-container">
      <div className="loading-circle"></div>
      <p className="loading-text">{isLoading ? "Conectando..." : "Verificando conexão..."}</p>
    </div>
  ) : (
    <div className="button-group">
      <button className="button" onClick={handleWhatsAppLogin}>
        Conectar
      </button>
      <button className="button" onClick={handleWhatsAppIsLoggedInCheck}>
        Checar conexão
      </button>
    </div>
  )}
</div>


      {/* Show modal if showModal is true */}
      {showModal && (
        <WhatsAppLogin
          code={whatsAppCode} // Pass the code (null initially)
          onClose={() => {
            setShowModal(false); // Close the modal
            setWhatsAppCode(null); // Reset the code
          }}
        />
      )}

      {/* Messages Section */}
      <div className="section">
        <h2>Suas mensagens</h2>
        <div className="messages-section">
          {/* Agenda Statuses */}
          <h3>AGENDA</h3>
          {agendaStatuses.map((status) => (
            <div key={status} className="input-group">
              <label htmlFor="status">{constants.statusTranslation[status] || status.toUpperCase()}              </label>
              <input
                type="text"
                value={agendaMessages[status].message1}
                onChange={(e) =>
                  handleMessageChange("agenda", status, "message1", e.target.value)
                }
                placeholder="Message 1"
              />
              <input
                type="text"
                value={agendaMessages[status].message2}
                onChange={(e) =>
                  handleMessageChange("agenda", status, "message2", e.target.value)
                }
                placeholder="Message 2"
              />
              <input
                type="text"
                value={agendaMessages[status].message3}
                onChange={(e) =>
                  handleMessageChange("agenda", status, "message3", e.target.value)
                }
                placeholder="Message 3"
              />
            </div>
          ))}

          {/* Funnel Statuses */}
          <h3>FUNIL</h3>
          {funnelStatuses.map((status) => (
            <div key={status} className="input-group">
              <label htmlFor="status">{constants.statusTranslation[status] || status.toUpperCase()}</label>
              <input
                type="text"
                value={funnelMessages[status].message1}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message1", e.target.value)
                }
                placeholder="Mensagem 1"
              />
              <input
                type="text"
                value={funnelMessages[status].message2}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message2", e.target.value)
                }
                placeholder="Mensagem 2"
              />
              <input
                type="text"
                value={funnelMessages[status].message3}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message3", e.target.value)
                }
                placeholder="Mensagem 3"
              />
            </div>
          ))}
        </div>
        <button className="button" onClick={handleSaveMessages}>Atualizar mensagens</button>
      </div>
    </div>
  );
};

export default Settings;