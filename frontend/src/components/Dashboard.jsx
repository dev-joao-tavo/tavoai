import React, { useEffect, useState } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Header from "./Header"; // Adjust path if necessary
import "./Dashboard.css";
import * as constants from '../utils/constants';


const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedBoardType, setSelectedBoardType] = useState(null); 
  const [cards, setCards] = useState(
    constants.statuses.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {})
  );
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [whatsAppCode, setWhatsAppCode] = useState(null);
  const [agendaMessages, setAgendaMessages] = useState({});
  const [funnelMessages, setFunnelMessages] = useState({});
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [columnMessages, setColumnMessages] = useState(
    constants.statuses.reduce((acc, status) => {
      acc[status] = { message1: "", message2: "", message3: "" };
      return acc;
    }, {})
  );  
  
  const getStatusesForBoard = (boardType) => {
    if (boardType === "funnel") {
      return constants.statuses.slice(0, 31); // First 31 statuses for "funnel"
    } else if (boardType === "agenda") {
      return constants.statuses.slice(31); // Remaining statuses for "agenda"
    }
    return constants.statuses; // Default to all statuses
  };
  const filteredStatuses = getStatusesForBoard(selectedBoardType);
  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${constants.API_BASE_URL}/api/get-messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgendaMessages(response.data.agenda || {});
      setFunnelMessages(response.data.funnel || {});
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };
  

  useEffect(() => {
    fetchBoards();
    fetchContacts();
    fetchMessages();

    
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
      const response = await axios.get(`${constants.API_BASE_URL}/boards`, {
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
      const response = await axios.get(`${constants.API_BASE_URL}/boards/${boardId}/cards`);
      
      // Create an empty object based on statuses to ensure all are present
      const groupedCards = constants.statuses.reduce((acc, status) => {
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
      const response = await axios.get(`${constants.API_BASE_URL}/contacts`,
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
            `${constants.API_BASE_URL}/addCardandContact`,
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
      await axios.delete(`${constants.API_BASE_URL}/removeCardandContact`, {
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
    if (constants.agendaStatuses.includes(status)) return "agenda";
    if (constants.funnelStatuses.includes(status)) return "funnel";
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
      await axios.patch(`${constants.API_BASE_URL}/cards/${cardId}`, {
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
      const messages = selectedBoard?.board_type === 'agenda' 
        ? agendaMessages[status] 
        : funnelMessages[status];
  
      if (!messages) {
        throw new Error("No messages found for this status");
      }
  
      await axios.post(
        `${constants.API_BASE_URL}/sendMessage`,
        {
          status,
          ...messages,
          boardId: selectedBoard.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(`Mensagens enviadas com sucesso para ${status}!`);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Erro ao enviar mensagens: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppLogin = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${constants.API_BASE_URL}/whatsAppLogin`, {
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
  
      {/* Board selector */}
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
  
      {/* Contact form */}
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
          {filteredStatuses.map((status) => {
            const savedMessages = selectedBoard?.board_type === 'agenda' 
              ? agendaMessages[status] 
              : funnelMessages[status];
  
            return (
              <div key={status} className="dashboard-column">
                {/* RESTORED COLUMN TITLE WITH COUNTER */}
                <h2 className="dashboard-title">
                  {constants.statusTranslation[status] || status.toUpperCase()}
                  <span className="card-counter"> ({cards[status].length})</span>
                </h2>
  
                {/* Saved messages display */}
                <div className="saved-messages">
                  {savedMessages ? (
                    <>
                      <div className="message">
                        <strong>1ª mensagem:</strong> {savedMessages.message1 || "Não definida"}
                      </div>
                      <div className="message">
                        <strong>2ª mensagem:</strong> {savedMessages.message2 || "Não definida"}
                      </div>
                      <div className="message">
                        <strong>3ª mensagem:</strong> {savedMessages.message3 || "Não definida"}
                      </div>
                    </>
                  ) : (
                    <div className="message">Mensagens não carregadas</div>
                  )}
                </div>
  
                {/* Send message button */}
                <form onSubmit={(e) => sendMessageForEachColumn(e, status)}>
                  <button 
                    type="submit" 
                    className="button button-green"
                    disabled={!savedMessages || isLoading}
                  >
                    {isLoading ? "Enviando..." : "Enviar mensagem"}
                  </button>
                </form>
                <br />
  
                {/* Cards list */}
                <div className="dashboard-cards">
                  {cards[status].map((card) => (
                    <Card
                      key={card.id}
                      card={card}
                      contacts={contacts}
                      updateCardStatus={updateCardStatus}
                      deleteCard={deleteCard}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;