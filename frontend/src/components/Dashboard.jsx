import React, { useEffect, useState } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Header from "./Header"; // Adjust path if necessary
import "./Dashboard.css"

const API_BASE_URL = "https://api.tavoai.com";

const statusTranslation = {
  "monday": "Segunda-feira",
  "tuesday": "Terça-feira",
  "wednesday": "Quarta-feira",
  "thursday": "Quinta-feira",
  "friday": "Sexta-feira",
  "saturday": "Sábado",
  "sunday": "Domingo",
  "schedule": "Agenda",
  "day-1": "1º dia",
  "day-2": "2º dia",
  "day-3": "3º dia",
  "day-4": "4º dia",
  "day-5": "5º dia",
  "day-6": "6º dia",
  "day-7": "7º dia",
  "day-8": "8º dia",
  "day-9": "9º dia",
  "day-10": "10º dia",
  "day-11": "11º dia",
  "day-12": "12º dia",
  "day-13": "13º dia",
  "day-14": "14º dia",
};

const agendaStatuses = [
"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "schedule"
];

const funnelStatuses = [
"day-1", "day-2", "day-3", "day-4", "day-5", "day-6", "day-7",
  "day-8", "day-9", "day-10", "day-11", "day-12", "day-13", "day-14"];

const statuses = [
  "day-1", "day-2", "day-3", "day-4", "day-5", "day-6", "day-7",
  "day-8", "day-9", "day-10", "day-11", "day-12", "day-13", "day-14",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "schedule"
];

const translatedStatuses = statuses.map(status => statusTranslation[status] || status.toUpperCase());

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedBoardType, setSelectedBoardType] = useState(null); 
  const [cards, setCards] = useState(
    statuses.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {})
  );
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);

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
      return statuses.slice(0, 14); // First 14 statuses for "funnel"
    } else if (boardType === "agenda") {
      return statuses.slice(14); // Remaining statuses for "agenda"
    }
    return statuses; // Default to all statuses
  };
  const filteredStatuses = getStatusesForBoard(selectedBoardType);

  useEffect(() => {
    fetchBoards();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedBoard?.id) {  // Ensure `id` exists
      fetchCards(selectedBoard.id);
    }
  }, [selectedBoard]);
  
  const handleBoardChange = (e) => {
    const boardId = Number(e.target.value);
    const selectedBoard = boards.find((board) => board.id === boardId) || null;
  
    if (selectedBoard) {
      setSelectedBoard(selectedBoard);
      setSelectedBoardType(selectedBoard.board_type);
    } else {
      setSelectedBoard(null);
      setSelectedBoardType(null);
    }
  };

  const formatPhone = (value) => {
    // Remove all non-numeric characters
    let cleaned = value.replace(/\D/g, "");

    // Limit to 11 digits
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11);
    }

    // Apply formatting (31) 9 9999-9999
    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 3) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
  };

  const handlePhoneChange = (e) => {
    setNewCardDescription(formatPhone(e.target.value));
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
        setSelectedBoard(response.data.boards[0]); // Store the full board object
        setSelectedBoardType(response.data.boards[0].board_type);
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
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/contacts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      setContacts(response.data.contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const addCard = async (boardId, title, description, status = "monday") => {
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
            [status]: [...(prevCards[status] || []), newCard],
        }));

        // Fetch updated contacts to ensure newly added ones appear immediately
        fetchContacts();
    } catch (error) {
        console.error("Error adding card:", error);
        if (error.response && error.response.data.error) {
            alert(error.response.data.error); // Display the error message to the user
        } else {
            alert("An unexpected error occurred. Please try again.");
        }
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

  const getBoardTypeFromStatus = (status) => {
    if (agendaStatuses.includes(status)) return "agenda";
    if (funnelStatuses.includes(status)) return "funnel";
    return null;
  };
  
  const getBoardIdFromStatus = (status, boards) => {
    const boardType = getBoardTypeFromStatus(status);
    const board = boards.find((board) => board.board_type === boardType);

    return board ? board.id : null;
  };
  
  const updateCardStatus = async (cardId, newStatus) => {
    setCards((prevCards) => {
      const updatedCards = { ...prevCards };
      let movedCard = null;
  
      // Find and remove the card from its current status
      Object.keys(updatedCards).forEach((key) => {
        const index = updatedCards[key].findIndex((card) => card.id === cardId);
        if (index !== -1) {
          [movedCard] = updatedCards[key].splice(index, 1);
        }
      });
  
      if (movedCard) {
        movedCard.status = newStatus;
        updatedCards[newStatus] = [...(updatedCards[newStatus] || []), movedCard];
      }
  
      return updatedCards;
    });
  
    // Get the board ID for the new status
    const otherBoardId = getBoardIdFromStatus(newStatus, boards);
    if (!otherBoardId) {
      console.error("No valid board found for the given status.");
      return;
    }
  
    try {
      await axios.patch(`${API_BASE_URL}/cards/${cardId}`, {
        status: newStatus,
        board_id: otherBoardId,
      });
    } catch (error) {
      console.error("Error updating card status:", error);
    }
  };
  
  
  const sendMessageForEachColumn = async (e, status) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      console.log(selectedBoard.id)
      const response = await axios.post(
        `${API_BASE_URL}/sendMessage`,
        {
          status,
          ...columnMessages[status],
          boardId: selectedBoard.id, // Assign it to a key
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Message sent:", response.data);
      alert(`Suas mensagens estão sendo enviadas!`);
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

      const response = await axios.get(`${API_BASE_URL}/whatsAppLogin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Store the code in state
      setWhatsAppCode(response.data.code);
    } catch (error) {
      console.error("Error on logging in your WhatsApp: ", error);
      alert("Failed to login!");
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
      let newCardStatus = "";
      if (selectedBoard.board_type === "funnel") {
        newCardStatus = "day-1";
      }
      
      if (selectedBoard.board_type === "agenda") {
        newCardStatus = "monday";
      }
      
      await addCard(selectedBoard.id, newCardTitle, newCardDescription,newCardStatus);
      fetchCards(selectedBoard.id); // Re-fetch cards for the selected board
      setNewCardTitle("");
      setNewCardDescription("");
    } else {
      alert("Please select a board first.");
    }
  };


  return (
    <div className="dashboard-container">
      {/* Header Component */}
      <Header handleLogout={handleLogout} />
  
      <div className="title-container">
        <h1>Tavo.AI</h1>
        <h2>Seu assistente inteligente</h2>
      </div>
  
      {/* Add a dropdown to switch between boards */}
      <div className="board-selector">
        <label>Selecione o quadro: </label>
        <div className="toggle-buttons">
          {boards.map((board) => (
            <button
              key={board.id}
              className={`toggle-button ${selectedBoard?.id === board.id ? "active" : ""}`}
              onClick={() => handleBoardChange({ target: { value: board.id } })}
            >
              {board.board_type === "funnel" ? "Funil" : board.board_type === "agenda" ? "Semanal" : board.board_type}
            </button>
          ))}
        </div>
      </div>
  
      <form onSubmit={handleAddCard} className="dashboard-form">
        <input
          type="text"
          placeholder="Nome"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Número de WhatsApp"
          value={newCardDescription}
          onChange={handlePhoneChange}
          required
        />
        <button type="submit">Adicionar contato</button>
      </form>
  
      {isLoading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div className="dashboard">
          {filteredStatuses.map((status) => (
            <div key={status} className="dashboard-column">
              <h2 className="dashboard-title">
                {statusTranslation[status] || status.toUpperCase()}
                {/* Add the live card counter here */}
                <span className="card-counter"> ({cards[status].length})</span>
              </h2>
  
              <div className="message-inputs">
                {(columnMessages[status] ? ["message1", "message2", "message3"] : []).map(
                  (messageKey, index) => (
                    <div key={messageKey}>
                      <input
                        type="text"
                        placeholder={`${index + 1}ª mensagem`}
                        value={columnMessages[status]?.[messageKey] || ""}
                        onChange={(e) => handleInputChange(status, messageKey, e.target.value)}
                        className="custom-input"
                      />
                      <br />
                    </div>
                  )
                )}
              </div>
              <form onSubmit={(e) => sendMessageForEachColumn(e, status)}>
                <button type="submit" className="button button-green">
                  Enviar mensagem
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