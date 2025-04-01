import React, { useState, useEffect } from "react";
import "./Settings.css";
import Header from "../components/Header.jsx";
import axios from "axios";
import WhatsAppLogin from "../components/WhatsAppLogin";
import * as constants from '../utils/constants';

const Settings = () => {
  // State for Profile Section
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // WhatsApp State
  const [whatsappStatus, setWhatsappStatus] = useState("-");
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);

  // Loading States
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Messages State
  const [messagesError, setMessagesError] = useState(null);
  const [messagesSuccess, setMessagesSuccess] = useState(false);
  const [agendaMessages, setAgendaMessages] = useState(
    constants.agendaStatuses.reduce((acc, status) => {
      acc[status] = { message1: '', message2: '', message3: '' };
      return acc;
    }, {})
  );
  
  const [funnelMessages, setFunnelMessages] = useState(
    constants.funnelStatuses.reduce((acc, status) => {
      acc[status] = { message1: '', message2: '', message3: '' };
      return acc;
    }, {})
  );

  // Profile Update State
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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
      setWhatsappStatus(response.data.is_logged_in ? "Connected" : "Disconnected");
    } catch (error) {
      console.error("Error checking WhatsApp login:", error);
      setWhatsappStatus("Error: please try again");
    } finally {
      setIsChecking(false);
    }
  };
    
  const handleWhatsAppLogin = async () => {
    setIsLoading(true);
    setShowModal(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLogin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWhatsAppCode(response.data.code);
    } catch (error) {
      console.error("Error logging into WhatsApp:", error);
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

        const [profileResponse, messagesResponse] = await Promise.all([
          axios.get(`${constants.API_BASE_URL}/api/get-profile`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${constants.API_BASE_URL}/api/get-messages`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setName(profileResponse.data.username || "");
        setEmail(profileResponse.data.email || "");
        setPhone(profileResponse.data.phone || "");

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

        setAgendaMessages(processMessages(messagesResponse.data.agenda, constants.agendaStatuses));
        setFunnelMessages(processMessages(messagesResponse.data.funnel, constants.funnelStatuses));

      } catch (error) {
        console.error("Error fetching initial data:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
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

  const handleMessageChange = (section, status, field, value) => {
    if (section === "agenda") {
      setAgendaMessages(prev => ({
        ...prev,
        [status]: { ...prev[status], [field]: value },
      }));
    } else if (section === "funnel") {
      setFunnelMessages(prev => ({
        ...prev,
        [status]: { ...prev[status], [field]: value },
      }));
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error('No token found');

      const data = {
        new_phone: profileData.phone,
        new_password: profileData.password,
        new_email: profileData.email,
        new_username: profileData.name
      };

      await axios.post(`${constants.API_BASE_URL}/api/update-profile`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    if (password && password !== confirmPassword) {
      setUpdateError("Passwords do not match");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      await updateProfile({
        name,
        email,
        phone,
        password: password || undefined
      });
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
          {(isProfileLoading || isMessagesLoading) && (
            <div className="loading-overlay">
              <div className="loading-circle large"></div>
              <p className="loading-text">Loading data...</p>
            </div>
          )}

          {/* Profile Section */}
          <div className="section">
            <h2 className="section-title">
              <i className="fas fa-user"></i> Profile Settings
            </h2>
            
            <div className="input-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
              />
            </div>
            
            <div className="input-group">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your WhatsApp number"
              />
            </div>
            
            <div className="input-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            
            {password && (
              <div className="input-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
            )}
            
            {updateError && <div className="error-message">{updateError}</div>}
            {updateSuccess && <div className="success-message">Profile updated successfully!</div>}
            
            <button 
              className="btn btn-primary" 
              onClick={handleSaveProfile}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="loading-circle small"></div>
                  Updating...
                </>
              ) : 'Update Profile'}
            </button>
          </div>

          {/* WhatsApp Connection Section */}
          <div className="section">
            <h2 className="section-title">
              <i className="fab fa-whatsapp"></i> WhatsApp Connection
            </h2>
            
            <div className="status-card">
              <div className="status-header">
                <div className="status-icon"></div>
                <span className="status-name">Connection Status</span>
                <span className={`badge ${
                  whatsappStatus === "Connected" ? "badge-primary" : ""
                }`}>
                  {whatsappStatus === "Connected" ? "Connected" : 
                   whatsappStatus === "Disconnected" ? "Disconnected" : 
                   whatsappStatus}
                </span>
              </div>
              
              {(isLoading || isChecking) ? (
                <div className="loading-container">
                  <div className="loading-circle"></div>
                  <p className="loading-text">
                    {isLoading ? "Connecting..." : "Checking connection..."}
                  </p>
                </div>
              ) : (
                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleWhatsAppLogin}>
                    Connect WhatsApp
                  </button>
                  <button className="btn btn-outline" onClick={handleWhatsAppIsLoggedInCheck}>
                    Check Status
                  </button>
                </div>
              )}
            </div>
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

          {/* Messages Section */}
          <div className="section">
            <h2 className="section-title">
              <i className="fas fa-comment-alt"></i> Message Templates
            </h2>
            
            {messagesError && <div className="error-message">{messagesError}</div>}
            {messagesSuccess && <div className="success-message">Messages updated successfully!</div>}
            
            <div className="messages-container">
              <h3>AGENDA STATUS MESSAGES</h3>
              <div className="status-grid">
                {constants.agendaStatuses.map((status) => (
                  <div key={status} className="status-card">
                    <div className="status-header">
                      <div className="status-icon"></div>
                      <span className="status-name">
                        {constants.statusTranslation[status] || status}
                      </span>
                    </div>
                    
                    <div className="message-list">
                      {[1, 2, 3].map((num) => (
                        <div key={`agenda-${status}-${num}`} className="message-item">
                          <div className="message-content">
                            <div className="message-title">Message {num}</div>
                            <textarea
                              className="message-text"
                              value={agendaMessages[status][`message${num}`] || ''}
                              onChange={(e) => 
                                handleMessageChange("agenda", status, `message${num}`, e.target.value)
                              }
                              placeholder={`Enter message ${num}...`}
                              rows="3"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="messages-container" style={{ marginTop: '2rem' }}>
              <h3>FUNNEL STATUS MESSAGES</h3>
              <div className="status-grid">
                {constants.funnelStatuses.map((status) => (
                  <div key={status} className="status-card">
                    <div className="status-header">
                      <div className="status-icon"></div>
                      <span className="status-name">
                        {constants.statusTranslation[status] || status}
                      </span>
                    </div>
                    
                    <div className="message-list">
                      {[1, 2, 3].map((num) => (
                        <div key={`funnel-${status}-${num}`} className="message-item">
                          <div className="message-content">
                            <div className="message-title">Message {num}</div>
                            <textarea
                              className="message-text"
                              value={funnelMessages[status][`message${num}`] || ''}
                              onChange={(e) => 
                                handleMessageChange("funnel", status, `message${num}`, e.target.value)
                              }
                              placeholder={`Enter message ${num}...`}
                              rows="3"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={handleSaveMessages}
              disabled={isUpdating}
              style={{ marginTop: '2rem' }}
            >
              {isUpdating ? (
                <>
                  <div className="loading-circle small"></div>
                  Saving Messages...
                </>
              ) : 'Save All Messages'}
            </button>
          </div>

          <button onClick={handleLogout} className="btn logout-button">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;