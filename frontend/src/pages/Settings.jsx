import React, { useState } from "react";
import "./Settings.css";
import Header from "../components/Header.jsx"; // Adjust path if necessary

const Settings = () => {
  // State for Profile Section
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // State for WhatsApp Connection
  const [whatsappStatus, setWhatsappStatus] = useState("Disconnected");

  // State for Messages Section
  const agendaStatuses = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "schedule"
  ];
  const funnelStatuses = [
    "day-1", "day-2", "day-3", "day-4", "day-5", "day-6", "day-7",
    "day-8", "day-9", "day-10", "day-11", "day-12", "day-13", "day-14"
  ];

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
      console.log(result.message); // "Profile updated successfully"
    } catch (error) {
      console.error(error.message);
    }
  };

  // Connect WhatsApp Handler
  const handleConnectWhatsApp = () => {
    setWhatsappStatus("Connected");
    console.log("WhatsApp Connected");
    alert("WhatsApp connected!");
  };

  // Save Messages Handler
  const handleSaveMessages = () => {
    console.log("Agenda Messages:", agendaMessages);
    console.log("Funnel Messages:", funnelMessages);
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
        <h2>Profile</h2>
        <div className="input-group">
        <label htmlFor="name">Name</label>
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
          <label htmlFor="phone_number">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a new password"
          />
        </div>
        <button className="button" onClick={handleSaveProfile}>Save Profile</button>
        </div>

      {/* WhatsApp Connection Section */}
      <div className="section">
        <h2>WhatsApp Connection</h2>
        <div className="status">
          <span>Status:</span> <span>{whatsappStatus}</span>
        </div>
        <button className="button" onClick={handleConnectWhatsApp}>Connect/Reconnect WhatsApp</button>
      </div>

      {/* Messages Section */}
      <div className="section">
        <h2>Messages</h2>
        <div className="messages-section">
          {/* Agenda Statuses */}
          <h3>Agenda Statuses</h3>
          {agendaStatuses.map((status) => (
            <div key={status} className="input-group">
              <label htmlFor="status">{status}</label>
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
          <h3>Funnel Statuses</h3>
          {funnelStatuses.map((status) => (
            <div key={status} className="input-group">
              <label htmlFor="status">{status}</label>
              <input
                type="text"
                value={funnelMessages[status].message1}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message1", e.target.value)
                }
                placeholder="Message 1"
              />
              <input
                type="text"
                value={funnelMessages[status].message2}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message2", e.target.value)
                }
                placeholder="Message 2"
              />
              <input
                type="text"
                value={funnelMessages[status].message3}
                onChange={(e) =>
                  handleMessageChange("funnel", status, "message3", e.target.value)
                }
                placeholder="Message 3"
              />
            </div>
          ))}
        </div>
        <button className="button" onClick={handleSaveMessages}>Save Messages</button>
      </div>
    </div>
  );
};

export default Settings;