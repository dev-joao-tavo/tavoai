import React, { useState, useEffect } from "react";
import "./Settings.css";
import Header from "../components/Header.jsx";
import axios from "axios";
import WhatsAppLogin from "../components/WhatsAppLogin";
import * as constants from '../utils/constants';

// State for Messages Section
const agendaStatuses = constants.agendaStatuses;
const funnelStatuses = constants.funnelStatuses;

const Settings = () => {
  // State for Profile Section
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [whatsappStatus, setWhatsappStatus] = useState("-");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);

  const [messagesError, setMessagesError] = useState(null);
  const [messagesSuccess, setMessagesSuccess] = useState(false);
  // Then initialize messages state using the statuses
  const [agendaMessages, setAgendaMessages] = useState(
    agendaStatuses.reduce((acc, status) => {
      acc[status] = { message1: '', message2: '', message3: '' };
      return acc;
    }, {})
  );
  
  const [funnelMessages, setFunnelMessages] = useState(
    funnelStatuses.reduce((acc, status) => {
      acc[status] = { message1: '', message2: '', message3: '' };
      return acc;
    }, {})
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/history";
    };
    
    const handleWhatsAppIsLoggedInCheck = async () => {
      setIsChecking(true);
      try {
        const token = localStorage.getItem("token");
    
        const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLoginCheck`, {
          headers: { Authorization: `Bearer ${token}` },
        });
    
        if (response.data.is_logged_in) {
          setWhatsappStatus("Connected");
        } else {
          setWhatsappStatus("Disconnected");
        }
      } catch (error) {
        console.error("Erro ao verificar o login do WhatsApp:", error);
    
        if (error.response) {
          alert(`Erro do servidor: ${error.response.data.message || "Ocorreu um erro inesperado."}`);
        } else {
          alert("Erro ao conectar-se ao servidor. Tente novamente.");
        }
    
        setWhatsappStatus("Error: please try again");
      } finally {
        setIsChecking(false);
      }
    };
    
    const handleWhatsAppLogin = async () => {
      setIsLoading(true);
      setShowModal(true); // Show the modal as soon as the button is clicked
    
      try {
        const token = localStorage.getItem("token");
    
        const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLogin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
    
        setWhatsAppCode(response.data.code); // Set the code when available
      } catch (error) {
        console.error("Erro ao fazer login no WhatsApp:", error);
    
        if (error.response) {
          alert(`Erro do servidor: ${error.response.data.message || "Ocorreu um erro inesperado."}`);
        } else {
          alert("Erro ao conectar-se ao servidor. Tente novamente.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      // Fetch data in parallel
      const [profileResponse, messagesResponse] = await Promise.all([
        axios.get(`${constants.API_BASE_URL}/api/get-profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${constants.API_BASE_URL}/api/get-messages`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Update profile state
      setName(profileResponse.data.username || "");
      setEmail(profileResponse.data.email || "");
      setPhone(profileResponse.data.phone || "");

      // Process messages - extract only message1, message2, message3
      const processMessages = (messagesObj, validStatuses) => {
        return validStatuses.reduce((acc, status) => {
          const serverMessages = messagesObj[status] || {};
          acc[status] = {
            message1: serverMessages.message1 || '',
            message2: serverMessages.message2 || '',
            message3: serverMessages.message3 || ''
          };
          return acc;
        }, {});
      };

      setAgendaMessages(processMessages(messagesResponse.data.agenda, agendaStatuses));
      setFunnelMessages(processMessages(messagesResponse.data.funnel, funnelStatuses));

    } catch (error) {
      console.error("Error fetching initial data:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        // Optionally redirect to login
      }
    } finally {
      setIsProfileLoading(false);
      setIsMessagesLoading(false);
    }
  };

  fetchInitialData();
}, []);

const handleSaveMessages = async () => {
  setIsUpdating(true);
  setMessagesError(null);
  setMessagesSuccess(false);
  
  try {
    const token = localStorage.getItem("token");
    await axios.post(`${constants.API_BASE_URL}/api/update-messages`, {
      agenda: agendaMessages,
      funnel: funnelMessages
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessagesSuccess(true);
    setTimeout(() => setMessagesSuccess(false), 3000);
  } catch (error) {
    setMessagesError(error.response?.data?.message || "Failed to save messages");
  } finally {
    setIsUpdating(false);
  }
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
// State for loading and feedback
const [isUpdating, setIsUpdating] = useState(false);
const [updateError, setUpdateError] = useState(null);
const [updateSuccess, setUpdateSuccess] = useState(false);

// Function to update the profile
const updateProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error('No token found');
    }

    // Data to be sent in the request
    const data = {
      new_phone: profileData.phone,
      new_password: profileData.password,
      new_email: profileData.email,
      new_username: profileData.name
    };

    // Send the update request to the backend
    const response = await axios.post(`${constants.API_BASE_URL}/api/update-profile`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Handle save profile with loading states
const handleSaveProfile = async () => {
  if (password && password !== confirmPassword) {
    setUpdateError("Passwords do not match");
    return;
  }

  setIsUpdating(true);
  setUpdateError(null);
  setUpdateSuccess(false);
  
  try {
    const profileData = {
      name,
      email,
      phone,
      password: password || undefined // Only send password if it's changed
    };
    
    await updateProfile(profileData);
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  } catch (error) {
    setUpdateError(error.response?.data?.message || error.message || 'Failed to update profile');
  } finally {
    setIsUpdating(false);
  }
};
return (
 <div className="app-container">
      <Header />
      <main className="main-content">
        <div className="settings-page">
          {/* Loading overlay */}
          {(isProfileLoading || isMessagesLoading) && (
            <div className="loading-overlay">
              <div className="loading-circle large"></div>
              <p className="loading-text">Carregando dados...</p>
            </div>
          )}
    {/* Profile Section */}
    <div className="section">
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
      <div className="input-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your new password"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <div className="error-message">Passwords do not match</div>
        )}
      </div>
      
      {updateError && <div className="error-message">{updateError}</div>}
      {updateSuccess && <div className="success-message">Perfil atualizado com sucesso!</div>}
      
      <button 
        className="button" 
        onClick={handleSaveProfile}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <>
            <div className="loading-circle small"></div>
            Atualizando...
          </>
        ) : 'Atualizar perfil'}
      </button>
    </div>

    <div className="divider"></div>

    {/* WhatsApp Connection Section */}
    <div className="section">
      <h2>Conexão com o WhatsApp</h2>
      <div className="status">
        <span>Status:</span> 
        <span style={{ 
          display: 'inline-block', 
          marginLeft: '8px', 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: whatsappStatus === "Connected" ? 'green' : whatsappStatus === "Disconnected" ? 'red' : 'gray' 
        }}></span>
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

    {/* WhatsApp Login Modal */}
    {showModal && (
      <WhatsAppLogin
        code={whatsAppCode}
        onClose={() => {
          setShowModal(false);
          setWhatsAppCode(null);
        }}
      />
    )}

    <div className="divider"></div>

    {/* Messages Section */}
     
  {/* Messages Section */}
  <div className="section">
    <h2>Suas mensagens</h2>
    {messagesError && <div className="error-message">{messagesError}</div>}
    {messagesSuccess && <div className="success-message">Mensagens atualizadas com sucesso!</div>}
    
    <div className="messages-section">
      <h3>AGENDA</h3>
      {agendaStatuses.map((status) => (
        <div key={status} className="status-messages">
          <label>{constants.statusTranslation[status] || status.toUpperCase()}</label>
          {[1, 2, 3].map((num) => (
            <input
              key={`agenda-${status}-${num}`}
              type="text"
              value={agendaMessages[status][`message${num}`] || ''}
              onChange={(e) => 
                handleMessageChange("agenda", status, `message${num}`, e.target.value)
              }
              placeholder={`Mensagem ${num}`}
            />
          ))}
        </div>
      ))}

      <h3>FUNIL</h3>
      {funnelStatuses.map((status) => (
        <div key={status} className="status-messages">
          <label>{constants.statusTranslation[status] || status.toUpperCase()}</label>
          {[1, 2, 3].map((num) => (
            <input
              key={`funnel-${status}-${num}`}
              type="text"
              value={funnelMessages[status][`message${num}`] || ''}
              onChange={(e) => 
                handleMessageChange("funnel", status, `message${num}`, e.target.value)
              }
              placeholder={`Mensagem ${num}`}
            />
          ))}
        </div>
      ))}
    </div>
      <button 
        className="button" 
        onClick={handleSaveMessages}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <>
            <div className="loading-circle small"></div>
            Atualizando...
          </>
        ) : 'Atualizar mensagens'}
      </button>
  </div>
  <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;