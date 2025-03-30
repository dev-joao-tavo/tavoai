import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Header from "./Header";
import "./Dashboard.css";
import * as constants from '../utils/constants';
import { FaEllipsisV } from 'react-icons/fa';

const Dashboard = () => {
  // Consolidated state
  const [state, setState] = useState({
    boards: [],
    selectedBoard: null,
    cards: constants.statuses.reduce((acc, status) => ({ ...acc, [status]: [] }), {}),
    contacts: [],
    isLoading: false,
    dailyCount: 0,
    agendaMessages: {},
    funnelMessages: {},
    newCardTitle: "",
    newCardDescription: "",
    importFile: null,
    importStatus: null,
    isImporting: false,
    showContactPopup: false,
    currentStatusForPopup: null,
    showOptionsMenu: null
  });

  const navigate = useNavigate();

  // Memoized values
  const filteredStatuses = useMemo(() => {
    if (!state.selectedBoard) return [];
    return state.selectedBoard.board_type === "funnel" 
      ? constants.statuses.slice(0, 31) 
      : constants.statuses.slice(31);
  }, [state.selectedBoard]);

  // API functions
  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const token = localStorage.getItem("token");
      
      const [boardsRes, contactsRes, messagesRes] = await Promise.all([
        axios.get(`${constants.API_BASE_URL}/boards`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${constants.API_BASE_URL}/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${constants.API_BASE_URL}/api/get-messages`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setState(prev => ({
        ...prev,
        boards: boardsRes.data.boards,
        selectedBoard: boardsRes.data.boards[0] || null,
        contacts: contactsRes.data.contacts,
        agendaMessages: messagesRes.data.agenda || {},
        funnelMessages: messagesRes.data.funnel || {},
        isLoading: false
      }));

      if (boardsRes.data.boards[0]?.id) {
        fetchCards(boardsRes.data.boards[0].id);
      }
    } catch (error) {
      console.error("Initialization error:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchCards = useCallback(async (boardId) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await axios.get(`${constants.API_BASE_URL}/boards/${boardId}/cards`);
      
      const groupedCards = constants.statuses.reduce((acc, status) => {
        acc[status] = response.data.cards.filter(card => card.status === status);
        return acc;
      }, {});

      setState(prev => ({ ...prev, cards: groupedCards, isLoading: false }));
    } catch (error) {
      console.error("Error fetching cards:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Event handlers
  const handleBoardChange = useCallback((boardId) => {
    const selectedBoard = state.boards.find(board => board.id === boardId) || null;
    setState(prev => ({
      ...prev,
      selectedBoard,
      currentStatusForPopup: null
    }));
    if (selectedBoard?.id) fetchCards(selectedBoard.id);
  }, [state.boards, fetchCards]);

  const deleteCard = useCallback(async (cardId) => {
    try {
      await axios.delete(`${constants.API_BASE_URL}/removeCardandContact`, {
        data: { card_id: cardId },
      });
      setState(prev => ({
        ...prev,
        cards: Object.entries(prev.cards).reduce((acc, [status, cards]) => {
          acc[status] = cards.filter(card => card.id !== cardId);
          return acc;
        }, {})
      }));
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  }, []);

  const updateCardStatus = useCallback(async (cardId, newStatus) => {
    setState(prev => {
      const updatedCards = { ...prev.cards };
      let movedCard = null;

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

      return { ...prev, cards: updatedCards };
    });

    const boardType = constants.agendaStatuses.includes(newStatus) 
      ? "agenda" 
      : "funnel";
    const otherBoardId = state.boards.find(board => board.board_type === boardType)?.id;

    if (otherBoardId) {
      try {
        await axios.patch(`${constants.API_BASE_URL}/cards/${cardId}`, {
          status: newStatus,
          board_id: otherBoardId,
        });
      } catch (error) {
        console.error("Error updating card status:", error);
      }
    }
  }, [state.boards]);

  const handleAddCard = useCallback(async (e, status) => {
    e.preventDefault();
    if (!state.selectedBoard) {
      alert("Please select a board first.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${constants.API_BASE_URL}/addCardandContact`,
        {
          phone_number: state.newCardDescription,
          contact_name: state.newCardTitle,
          board_id: state.selectedBoard.id,
          status: status, // Use the passed status
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      setState(prev => ({
        ...prev,
        cards: {
          ...prev.cards,
          [status]: [...prev.cards[status], response.data.card]
        },
        newCardTitle: "",
        newCardDescription: ""
      }));
  
      const contactsRes = await axios.get(`${constants.API_BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setState(prev => ({ ...prev, contacts: contactsRes.data.contacts }));
    } catch (error) {
      console.error("Error adding card:", error);
      alert(error.response?.data?.error || "An unexpected error occurred");
    }
  }, [state.selectedBoard, state.newCardTitle, state.newCardDescription]);  

  const handleSendFromMenu = useCallback(async (status, e) => {
    e.preventDefault();
    
    if (state.cards[status].length === 0) {
      alert("Não há cartões nesta coluna para enviar mensagens!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split('T')[0];

      const countResponse = await axios.get(
        `${constants.API_BASE_URL}/message-history/daily-count?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const sentToday = countResponse.data.count || 0;
      const dailyLimit = countResponse.data.limit || 200;
      const remaining = Math.max(0, dailyLimit - sentToday);
      const cardsToSend = state.cards[status].length;

      if (cardsToSend > remaining) {
        alert(`Limite diário excedido!\nVocê já enviou ${sentToday} mensagens hoje.\nLimite diário: ${dailyLimit} mensagens\nTentando enviar: ${cardsToSend}\nVocê pode enviar no máximo ${remaining} mensagens hoje.`);
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));
      const messages = state.selectedBoard?.board_type === "agenda"
        ? state.agendaMessages[status]
        : state.funnelMessages[status];

      if (!messages) {
        throw new Error("No messages found for this status");
      }

      await axios.post(
        `${constants.API_BASE_URL}/sendMessage`,
        {
          status,
          ...messages,
          boardId: state.selectedBoard.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Mensagens enviadas com sucesso para ${status}!`);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Erro ao enviar mensagens: ${error.response?.data?.error || error.message}`);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.cards, state.selectedBoard, state.agendaMessages, state.funnelMessages]);

  const handleOptionsClick = useCallback((status, e) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      currentStatusForPopup: status,
      showOptionsMenu: prev.showOptionsMenu === status ? null : status,
      showContactPopup: false
    }));
  }, []);

  const handleAddContactClick = useCallback((status, e) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      currentStatusForPopup: status, // This will be the column's status
      showContactPopup: true,
      showOptionsMenu: false
    }));
  }, []);

  const handleImportContacts = useCallback(async (e) => {
    e.preventDefault();
    if (!state.importFile || !state.selectedBoard) {
      alert("Please select a file and a board first");
      return;
    }

    setState(prev => ({ ...prev, isImporting: true, importStatus: "Processing..." }));

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('csv_file', state.importFile);
      formData.append('board_id', state.selectedBoard.id);
      formData.append('status', state.selectedBoard.board_type === "funnel" ? "day-1" : "monday");

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

      setState(prev => ({
        ...prev,
        importStatus: `Success: ${response.data.success_count} contacts imported, ${response.data.error_count} errors`,
        importFile: null
      }));
      
      fetchCards(state.selectedBoard.id);
      const contactsRes = await axios.get(`${constants.API_BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setState(prev => ({ ...prev, contacts: contactsRes.data.contacts }));
    } catch (error) {
      console.error("Import failed:", error);
      setState(prev => ({
        ...prev,
        importStatus: `Error: ${error.response?.data?.error || error.message}`
      }));
    } finally {
      setState(prev => ({ ...prev, isImporting: false }));
    }
  }, [state.importFile, state.selectedBoard, fetchCards]);

  const formatPhone = (value) => {
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);

    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 3) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    setState(prev => ({ ...prev, newCardDescription: formatPhone(e.target.value) }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is inside any options menu or contact popup
      const isInsidePopup = e.target.closest('.options-menu, .contact-popup');
      
      if (!isInsidePopup) {
        setState(prev => ({ ...prev, showOptionsMenu: null, showContactPopup: false }));
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  

  return (
    <div className="dashboard-container">
      <Header handleLogout={handleLogout} />
  
      <div className="title-container">
        <h1>Tavo.AI</h1>
        <h2>Seu assistente inteligente</h2>
      </div>
  
      <div className="board-selector">
        <label>Selecione o quadro: </label>
        <div className="toggle-buttons">
          {state.boards.map((board) => (
            <button
              key={board.id}
              className={`toggle-button ${state.selectedBoard?.id === board.id ? "active" : ""}`}
              onClick={() => handleBoardChange(board.id)}
            >
              {board.board_type === "funnel" ? "Funil" : board.board_type === "agenda" ? "Semanal" : board.board_type}
            </button>
          ))}
        </div>
      </div>
     
      <div className="daily-limit-info">
      {state.dailyCount}/200 mensagens hoje
      </div>

      {state.isLoading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div className="dashboard">
          {filteredStatuses.map((status) => {
            const savedMessages = state.selectedBoard?.board_type === 'agenda' 
              ? state.agendaMessages[status] 
              : state.funnelMessages[status];
  
            return (
              <div key={status} className="dashboard-column">
                <div className="column-header">
                  <div className="dashboard-title-container">
                    <h2 className="dashboard-title">
                      {constants.statusTranslation[status] || status.toUpperCase()}
                      <span className="card-counter"> ({state.cards[status].length})</span>
                    </h2>
                  </div>
                  <div className="menu-container">
                    <button 
                      className="options-button"
                      onClick={(e) => handleOptionsClick(status, e)}
                    >
                      <FaEllipsisV />
                    </button>
                    
                    {state.showOptionsMenu === status && (
                      <div className="options-menu">
                        <button 
                          className="menu-item"
                          onClick={(e) => handleSendFromMenu(status, e)}
                          disabled={!savedMessages || state.isLoading || (200 - state.dailyCount) < state.cards[status].length}
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
                    
                    {state.showContactPopup && state.currentStatusForPopup === status && (
                      <div className="contact-popup">
                        <div className="popup-header">
                          <h3>Adicionar Contato</h3>
                          <button 
                            className="close-button"
                            onClick={() => setState(prev => ({ ...prev, showContactPopup: false }))}
                            aria-label="Fechar"
                          >
                            &times;
                          </button>
                        </div>
                        
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (state.selectedBoard) {
                            // Use the current status from the popup (column status) instead of board-based default
                            const newCardStatus = state.currentStatusForPopup;
                            handleAddCard(e, newCardStatus); // Pass the status to handleAddCard
                          }
                        }}> 
                          <div className="form-group">
                            <label htmlFor="contact-name">Nome do contato</label>
                            <input
                              id="contact-name"
                              type="text"
                              value={state.newCardTitle}
                              onChange={(e) => setState(prev => ({ ...prev, newCardTitle: e.target.value }))}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="contact-phone">Telefone</label>
                            <input
                              id="contact-phone"
                              type="text"
                              value={state.newCardDescription}
                              onChange={handlePhoneChange}
                              required
                            />
                          </div>

                          <button type="submit" className="button button-green full-width">
                            Adicionar
                          </button>
                        </form>

                        <div className="import-section">
                          <h4>Importar Contatos</h4>
                          <form onSubmit={handleImportContacts}>
                          <div className="file-input-wrapper">
                          <label 
  className="file-input-label"
  data-file={state.importFile ? state.importFile.name : ''}
>
  Selecionar arquivo CSV
  <input
    type="file"
    accept=".csv"
    onChange={(e) => {
      const file = e.target.files[0];
      setState(prev => ({ 
        ...prev, 
        importFile: file 
      }));
      // Update label's data-file attribute through state
    }}
    required
    style={{ display: 'none' }}
  />
</label>
</div>



                            <button 
                              type="submit" 
                              className="button button-blue full-width"
                              disabled={state.isImporting}
                            >
                              {state.isImporting ? "Importando..." : "Importar CSV"}
                            </button>
                          </form>
                          {state.importStatus && (
                            <div className={`import-status ${state.importStatus.includes("Error") ? "error" : "success"}`}>
                              {state.importStatus}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
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
                  {(200 - state.dailyCount) < state.cards[status].length && (
                    <div className="limit-warning">
                      Limite excedido! Remova alguns contatos dessa coluna ou espere até amanhã.
                    </div>
                  )}
                </div>
                <br />
  
                <div className="dashboard-cards">
                  {state.cards[status].map((card) => (
                    <Card
                      key={card.id}
                      card={card}
                      contacts={state.contacts}
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