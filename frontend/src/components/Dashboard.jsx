import React, { useEffect, useState } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";

const API_BASE_URL = "https://api.tavoai.com";
const statuses = [
  "1º dia", "2º dia", "3º dia", "4º dia", "5º dia", "6º dia", "7º dia",
  "8º dia", "9º dia", "10º dia", "11º dia", "12º dia", "13º dia", "14º dia",
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo", "Agenda"
];

const funnelStatuses = [
  "1º dia", "2º dia", "3º dia", "4º dia", "5º dia", "6º dia", "7º dia",
  "8º dia", "9º dia", "10º dia", "11º dia", "12º dia", "13º dia", "14º dia"
];

const agendaStatuses = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo", "Agenda"
];

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  console.log(`>>>> ${selectedBoardType}`);
  const [selectedBoardType, setSelectedBoardType] = useState(null); 
  console.log(`>>>.....> ${selectedBoardType}`);
  const [cards, setCards] = useState(
    statuses.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {})
  );
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [columnMessages, setColumnMessages] = useState(
    statuses.reduce((acc, status) => {
      acc[status] = { message1: "", message2: "", message3: "" };
      return acc;
    }, {})
  );
  
  const getStatusesForBoard = (boardType) => {
    if (boardType === "funnel") {
      return funnelStatuses;
    } else if (boardType === "agenda") {
      return agendaStatuses;
    }
    return []; // Default to all statuses if no type is specified
  };
  const filteredStatuses = getStatusesForBoard(selectedBoardType);

  useEffect(() => {
    fetchBoards();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchCards(selectedBoard);
    }
  }, [selectedBoard]);

  const handleBoardChange = (e) => {
    const boardId = e.target.value;
    const selectedBoard = boards.find((board) => board.id === boardId);
    setSelectedBoard(boardId);
    console.log(`>>>.....))))> ${selectedBoardType}`);   
    setSelectedBoardType(selectedBoard); // Update the selected board type
    console.log(`>>&&&>.....> ${selectedBoardType}`);
  };
  
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
      const response = await axios.get(`${API_BASE_URL}/boards`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.data.boards.length > 0) {
        setBoards(response.data.boards);
        setSelectedBoard(response.data.boards[0].id); // Select the first board by default
        setSelectedBoardType(response.data.boards[0].board_type); // Set the board type of the first board
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
      
      // Create an empty object based on statuses to ensure all are present
      const groupedCards = statuses.reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {});
  
      response.data.cards.forEach((card) => {
        if (groupedCards.hasOwnProperty(card.status)) {
          groupedCards[card.status].push(card);
        } else {
          console.warn(`Unexpected status: ${card.status}`); // Handle unknown statuses
        }
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
      console.error("Error adding card:", error);
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

      const response = await axios.post(
        `${API_BASE_URL}/sendMessage`,
        {
          status,
          ...columnMessages[status],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Message sent:", response.data);
      alert(`Message sent for ${status} column successfully! Response: ${response.data}`);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Failed to send message for ${status} column.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppLogin = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_BASE_URL}/whatsAppLogin`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(`Use this code to login on your WhatsApp phone! Response: ${response.data}`);
    } catch (error) {
      console.error("Error on logging in your WhatsApp: ", error);
      alert(`Failed to login!`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear authentication token
    window.location.href = "/login"; // Redirect to login page
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
      <div className="header-container">
        <button onClick={() => window.location.href = "/dashboard"} className="header-button">Dashboard</button>
        <button onClick={() => window.open("https://pay.infinitepay.io/tavoai/Ri0x-1HOAcj6R35-19,90", "_blank")} className="header-button"> Assinatura </button>
        <button onClick={handleWhatsAppLogin} className="header-button">WhatsApp login</button>
        <button onClick={handleLogout} className="header-button">Logout</button>
      </div>

      <div className="title-container">
        <h1>Tavo AI</h1>
        <h2>Seu assistente inteligente: {selectedBoardType}</h2>
      </div>

      {/* Add a dropdown to switch between boards */}
      <div className="board-selector">
        <label htmlFor="board-select">Select Board: </label>
        <select id="board-select" value={selectedBoard || ""} onChange={handleBoardChange}>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.board_type}
            </option>
          ))}
        </select>
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
        <div className="loading-spinner"></div>
      ) : (
        <div className="dashboard">
          {filteredStatuses.map((status) => (
            <div key={status} className="dashboard-column">
              <h2 className="dashboard-title">
                {status.toUpperCase()}
              </h2>

              <div className="message-inputs">
                {["message1", "message2", "message3"].map((messageKey, index) => (
                  <div key={messageKey}>
                    <input
                      type="text"
                      placeholder={`${index + 1}ª mensagem`}
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