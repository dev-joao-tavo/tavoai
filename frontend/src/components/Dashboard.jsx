import React, { useEffect, useState } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Header from "./Header"; // Adjust path if necessary
import "./Dashboard.css";
import * as constants from '../utils/constants';
import { FaEllipsisV } from 'react-icons/fa';

const Dashboard = () => {
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
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
  // Add to your existing state declarations
  const [dailyCount, setDailyCount] = useState(0);
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
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [currentStatusForPopup, setCurrentStatusForPopup] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(null); // Track which column's menu is open

  // Function to handle the three-dot menu click
  const handleOptionsClick = (status, e) => {
    e.stopPropagation();
    setCurrentStatusForPopup(status);
    setShowOptionsMenu(showOptionsMenu === status ? null : status);
  };
  
// Rest of your functions remain exactly the same:
const closeAllPopups = () => {
  setShowOptionsMenu(null);
  setShowContactPopup(false);
};

useEffect(() => {
  const handleClickOutside = () => closeAllPopups();
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);

const handleSendFromMenu = (status, e) => {
  e.stopPropagation();
  sendMessageForEachColumn(e, status);
  setShowOptionsMenu(null);
};

const handleAddContactClick = (status, e) => {
  e.stopPropagation();
  const buttonRect = e.currentTarget.getBoundingClientRect();
  setPopupPosition({
    top: buttonRect.bottom + window.scrollY + 5, // 5px offset
    left: buttonRect.left + window.scrollX
  });
  setCurrentStatusForPopup(status);
  setShowContactPopup(true);
  setShowOptionsMenu(null);
};

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
  
  useEffect(() => {
    if (selectedBoard?.id) {
      const fetchDailyCount = async () => {
        try {
          const token = localStorage.getItem("token");
          const today = new Date().toISOString().split('T')[0];
          const response = await axios.get(
            `${constants.API_BASE_URL}/message-history/daily-count?date=${today}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          
          );

          setDailyCount(response.data.count || 0);
        } catch (error) {
          console.error("Error fetching daily count:", error);
        }
      };
      fetchDailyCount();
    }
  }, [selectedBoard]);

  const handleImportContacts = async (e) => {
    e.preventDefault();
    if (!importFile || !selectedBoard) {
      alert("Please select a file and a board first");
      return;
    }
  
    setIsImporting(true);
    setImportStatus("Processing...");
  
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('csv_file', importFile);
      formData.append('board_id', selectedBoard.id);
      formData.append('status', selectedBoard.board_type === "funnel" ? "day-1" : "monday");
  
      const response = await axios.post(
        `${constants.API_BASE_URL}/import-contacts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
  
      setImportStatus(`Success: ${response.data.success_count} contacts imported, ${response.data.error_count} errors`);
      if (response.data.error_count > 0) {
        console.error("Import errors:", response.data.errors);
      }
      
      // Refresh the cards and contacts after import
      fetchCards(selectedBoard.id);
      fetchContacts();
    } catch (error) {
      console.error("Import failed:", error);
      setImportStatus(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };
  
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
    
    if (cards[status].length === 0) {
      alert("Não há cartões nesta coluna para enviar mensagens!");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split('T')[0]; // Ensure correct date format
  
      // Fetch daily message count with the correct query parameter
      const countResponse = await axios.get(
        `${constants.API_BASE_URL}/message-history/daily-count?date=${today}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      const sentToday = countResponse.data.count || 0;
      const dailyLimit = countResponse.data.limit || 200; // Get from backend
      const remaining = Math.max(0, dailyLimit - sentToday);
      const cardsToSend = cards[status].length;
  
      if (cardsToSend > remaining) {
        alert(
          `Limite diário excedido!\n` +
          `Você já enviou ${sentToday} mensagens hoje.\n` +
          `Limite diário: ${dailyLimit} mensagens\n` +
          `Tentando enviar: ${cardsToSend}\n` +
          `Você pode enviar no máximo ${remaining} mensagens hoje.`
        );
        return;
      }
  
      setIsLoading(true);
      const messages =
        selectedBoard?.board_type === "agenda"
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
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      alert(`Mensagens enviadas com sucesso para ${status}!`);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Erro ao enviar mensagens: ${error.response?.data?.error || error.message}`);
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

      {/* Contact Popup */}
      {showContactPopup && (
        <div 
          className="contact-popup"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3>Adicionar Contato</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedBoard) {
              let newCardStatus = currentStatusForPopup;
              if (!newCardStatus) {
                newCardStatus = selectedBoard.board_type === "funnel" ? "day-1" : "monday";
              }
              addCard(selectedBoard.id, newCardTitle, newCardDescription, newCardStatus);
              setNewCardTitle("");
              setNewCardDescription("");
              setShowContactPopup(false);
            }
          }}>
            <input
              type="text"
              placeholder="Nome do contato"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Telefone"
              value={newCardDescription}
              onChange={handlePhoneChange}
              required
            />
            <div className="popup-buttons">
              <button type="submit" className="button button-green">
                Adicionar
              </button>
              <button 
                type="button" 
                className="button button-gray"
                onClick={() => setShowContactPopup(false)}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="import-section">
            <h4>Importar Contatos</h4>
            <form onSubmit={handleImportContacts}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                required
              />
              <button 
                type="submit" 
                className="button button-blue"
                disabled={isImporting}
              >
                {isImporting ? "Importando..." : "Importar CSV"}
              </button>
            </form>
            {importStatus && <div className="import-status">{importStatus}</div>}
          </div>
        </div>
      )}

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
<div className="column-header">
  <div className="dashboard-title-container">
    <h2 className="dashboard-title">
      {constants.statusTranslation[status] || status.toUpperCase()}
      <span className="card-counter"> ({cards[status].length})</span>
    </h2>
  </div>
 <div className="menu-container">
  <button 
    className="options-button"
    onClick={(e) => handleOptionsClick(status, e)}
  >
    <FaEllipsisV />
  </button>
  
  {showOptionsMenu === status && (
    <div 
      className="options-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        className="menu-item"
        onClick={(e) => handleSendFromMenu(status, e)}
        disabled={!savedMessages || isLoading || (200 - dailyCount) < cards[status].length}
      >
        Enviar Mensagem
      </button>
      <button 
        className="menu-item"
        onClick={(e) => handleAddContactClick(status, e)}
      >
        Adicionar Contato
      </button>
    </div>
  )}
</div>
</div>  
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
  
                <div className="daily-limit-info">
                  {dailyCount}/200 mensagens hoje
                  {(200 - dailyCount) < cards[status].length && (
                    <div className="limit-warning">
                      Limite excedido! Remova alguns contatos dessa coluna ou espere até amanhã.
                    </div>
                  )}
                </div>
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
