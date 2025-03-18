import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Settings.css"; 

const API_BASE_URL = "https://api.tavoai.com";

const SettingsPage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Handle message change
  const handleMessageChange = (id, newMessage) => {
    setMessages((prevMessages) =>
      prevMessages.map((message) =>
        message.id === id ? { ...message, message: newMessage } : message
      )
    );
  };

  // Handle save
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/messages`, messages, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Messages saved successfully!");
    } catch (error) {
      console.error("Error saving messages: ", error);
      alert("Failed to save messages!");
    }
  };

  if (isLoading) {
    return <p>Loading messages...</p>;
  }

  return (
    <div className="settings-page">
      <h1>Edit Messages</h1>
      {messages.map((message) => (
        <div key={message.id} className="message-group">
          <h3>{message.status}</h3>
          <textarea
            value={message.message}
            onChange={(e) => handleMessageChange(message.id, e.target.value)}
            rows={3}
          />
        </div>
      ))}
      <button onClick={handleSave} className="save-button">
        Save Changes
      </button>
    </div>
  );
};

export default SettingsPage;