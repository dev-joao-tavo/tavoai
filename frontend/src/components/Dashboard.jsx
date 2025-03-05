import React, { useEffect, useState } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";

const API_BASE_URL = "https://api.tavoai.com"; 
const STATUSES = ["todo", "in-progress", "done"];

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [cards, setCards] = useState({ todo: [], "in-progress": [], done: [] });
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [columnMessages, setColumnMessages] = useState({
    todo: { message1: "", message2: "", message3: "" },
    "in-progress": { message1: "", message2: "", message3: "" },
    done: { message1: "", message2: "", message3: "" },
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchCards(selectedBoard);
    }
  }, [selectedBoard]);

  const handleInputChange = (status, field, value) => {
    setColumnMessages((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        [field]: value,
      },
    }));
  };

  const fetchBoards = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
        console.log(`Bearer ${token}`)
        const response = await axios.get(`${API_BASE_URL}/boards`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.data.boards.length > 0) {
        setBoards(response.data.boards);
        setSelectedBoard(response.data.boards[0].id); // Select the first board by default
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
    } finally {
      setIsLoading(false);
    }
  };  
  

  const fetchCards = async (boardId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/boards/${boardId}/cards`);
      const groupedCards = { todo: [], "in-progress": [], done: [] };
      response.data.cards.forEach((card) => {
        groupedCards[card.status].push(card);
      });
      setCards(groupedCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts`);
      setContacts(response.data.contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const addCard = async (boardId, title, description, status = "todo") => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/addCardandContact`,
        {
          phone_number: description,
          contact_name: title,
          board_id: boardId,  
          status: status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const newCard = response.data.card;
      setCards((prevCards) => ({
        ...prevCards,
        [status]: [...prevCards[status], newCard],
      }));
    } catch (error) {
      console.error("Error adding card::", error);
    }
  };
  
  
  const deleteCard = async (cardId) => {
    try {
      await axios.delete(`${API_BASE_URL}/removeCardandContact`, {
        data: { card_id: cardId },
      });
      setCards((prevCards) => {
        const updatedCards = { ...prevCards };
        Object.keys(updatedCards).forEach((status) => {
          updatedCards[status] = updatedCards[status].filter((card) => card.id !== cardId);
        });
        return updatedCards;
      });
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const updateCardStatus = async (cardId, newStatus) => {
    const updatedCards = { ...cards };
    let movedCard = null;

    Object.keys(updatedCards).forEach((key) => {
      const index = updatedCards[key].findIndex((card) => card.id === cardId);
      if (index !== -1) {
        [movedCard] = updatedCards[key].splice(index, 1);
      }
    });

    if (movedCard) {
      movedCard.status = newStatus;
      updatedCards[newStatus].push(movedCard);
    }

    setCards(updatedCards);

    try {
      await axios.patch(`${API_BASE_URL}/cards/${cardId}`, { status: newStatus });
    } catch (error) {
      console.error("Error updating card status:", error);
    }
  };

  const sendMessageForEachColumn = async (e, status) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(`${API_BASE_URL}/sendMessage`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }, {
        status,
        ...columnMessages[status],
      });
      console.log("Message sent:", response.data);
      alert(`Message sent for ${status} column successfully!`);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Failed to send message for ${status} column.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (selectedBoard) {
      await addCard(selectedBoard, newCardTitle, newCardDescription);
      fetchCards(selectedBoard); // Re-fetch cards for the selected board
      setNewCardTitle("");
      setNewCardDescription("");
    } else {
      alert("Please select a board first.");
    }
  };

  return (
    <div className="dashboard-container">
      <div class="title-container">
          <h1>Tavo AI</h1>
          <h2>Your Smart Assistant</h2>
      </div>

      <form onSubmit={handleAddCard} className="dashboard-form">
      <input
          type="text"
          placeholder="Name"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Phone Number"
          value={newCardDescription}
          onChange={(e) => setNewCardDescription(e.target.value)}
          required
        />
        <button type="submit">Add Card</button>
      </form>

      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div className="dashboard">
          {STATUSES.map((status) => (
            <div key={status} className="dashboard-column">
              <h2 className="dashboard-title">
                {status.replace("-", " ").toUpperCase()}
              </h2>

              <div className="message-inputs">
                {["message1", "message2", "message3"].map((messageKey, index) => (
                  <div key={messageKey}>
                    <input
                      type="text"
                      placeholder={`Message ${index + 1}`}
                      value={columnMessages[status][messageKey]}
                      onChange={(e) => handleInputChange(status, messageKey, e.target.value)}
                      className="custom-input"
                    />
                    <br />
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => sendMessageForEachColumn(e, status)}>
                <button type="submit" className="button button-green">
                  Send Message
                </button>
              </form>
              <br />

              <div className="dashboard-cards">
                {cards[status].map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    contacts={contacts}
                    openConversation={() => navigate(`/conversation/${card.id}`)}
                    updateCardStatus={updateCardStatus}
                    deleteCard={deleteCard}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;