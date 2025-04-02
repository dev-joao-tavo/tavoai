import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "../api/api";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Header from "./Header";
import "./Dashboard.css";
import * as constants from '../utils/constants';
import { FaEllipsisV } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useLocation } from "react-router-dom";


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
  const location = useLocation();

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
    
    // Validate inputs first
    if (!state.selectedBoard) {
      toast.error("Por favor selecione um quadro primeiro.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
  
    if (!state.newCardTitle.trim()) {
      toast.error("Por favor insira um nome para o contato.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
  
    if (!state.newCardDescription.trim()) {
      toast.error("Por favor insira um número de telefone.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
  
    const loadingToast = toast.loading("Adicionando contato...", {
      position: "top-right"
    });
  
    try {
      const token = localStorage.getItem("token");
      const phoneNumber = state.newCardDescription.replace(/\D/g, ''); // Clean phone number
      
      // Validate phone number format
      if (phoneNumber.length < 10 || phoneNumber.length > 11) {
        throw new Error("Número de telefone inválido. Deve ter 10 ou 11 dígitos.");
      }
  
      const response = await axios.post(
        `${constants.API_BASE_URL}/addCardandContact`,
        {
          phone_number: phoneNumber,
          contact_name: state.newCardTitle.trim(),
          board_id: state.selectedBoard.id,
          status: status,
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // 10 second timeout
        }
      );
  
      // Update state optimistically
      setState(prev => ({
        ...prev,
        cards: {
          ...prev.cards,
          [status]: [...prev.cards[status], response.data.card]
        },
        newCardTitle: "",
        newCardDescription: "",
        showContactPopup: false // Close popup on success
      }));
  
      // Refresh contacts in background
      try {
        const contactsRes = await axios.get(`${constants.API_BASE_URL}/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setState(prev => ({ ...prev, contacts: contactsRes.data.contacts }));
      } catch (contactsError) {
        console.error("Error refreshing contacts:", contactsError);
        // Non-critical error, just log it
      }
  
      toast.update(loadingToast, {
        render: "✅ Contato adicionado com sucesso!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
  
    } catch (error) {
      console.error("Error adding card:", error);
      
      let errorMessage = "Erro desconhecido ao adicionar contato";
      if (error.message.includes("Número de telefone inválido")) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === "ECONNABORTED") {
        errorMessage = "Tempo limite excedido. Tente novamente.";
      }
  
      toast.update(loadingToast, {
        render: (
          <div>
            <div>{errorMessage}</div>
          </div>
        ),
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
  
    } finally {
      // Any cleanup if needed
    }
  }, [state.selectedBoard, state.newCardTitle, state.newCardDescription]);

  // 4. Replace all alerts with toast notifications:
  const handleSendFromMenu = useCallback(async (status, e) => {
    e.preventDefault();
  
    // Early validation
    if (state.cards[status].length === 0) {
      toast.error("Não há cartões nesta coluna para enviar mensagens!", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split('T')[0];
      
      // Show loading state immediately
      const loadingToast = toast.loading("Verificando limite diário...", {
        position: "top-right"
      });
  
      // 1. Check daily limits
      const { data: { count: sentToday = 0, limit: dailyLimit = 200 } } = await axios.get(
        `${constants.API_BASE_URL}/message-history/daily-count?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      const remaining = Math.max(0, dailyLimit - sentToday);
      const cardsToSend = state.cards[status].length;
  
      if (cardsToSend > remaining) {
        toast.update(loadingToast, {
          render: (
            <div>
              <strong>Limite diário excedido!</strong>
              <div style={{marginTop: '8px'}}>
                • Enviadas hoje: {sentToday}<br/>
                • Limite diário: {dailyLimit}<br/>
                • Tentando enviar: {cardsToSend}<br/>
                • Disponível: {remaining}
              </div>
            </div>
          ),
          type: "error",
          isLoading: false,
          autoClose: 10000,
        });
        return;
      }
  
      // 2. Prepare messages
      setState(prev => ({ ...prev, isLoading: true }));
      const messages = state.selectedBoard?.board_type === "agenda"
        ? state.agendaMessages[status]
        : state.funnelMessages[status];
  
      if (!messages?.message1) {
        toast.update(loadingToast, {
          render: "Nenhuma mensagem configurada para este status!",
          type: "error",
          isLoading: false,
          autoClose: 3000,
        });
        return;
      }
  
      // 3. Start sending
      toast.update(loadingToast, {
        render: `Iniciando envio de ${cardsToSend} mensagens...`,
        autoClose: false,
      });
  
      const response = await axios.post(
        `${constants.API_BASE_URL}/sendMessage`,
        {
          status,
          ...messages,
          boardId: state.selectedBoard.id,
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 second timeout
        }
      );
  
      // 4. Success handling
      toast.update(loadingToast, {
        render: `✅ ${cardsToSend} mensagens em processamento!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
  
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // 5. Enhanced error handling
      let errorMessage = "Erro desconhecido";
      let showRetry = true;
  
      if (error.response) {
        errorMessage = error.response.data.message || 
                     error.response.data.error || 
                     "Erro no servidor";
        showRetry = error.response.status !== 403; // Don't retry forbidden errors
      } else if (error.code === "ECONNABORTED") {
        errorMessage = "Tempo limite excedido";
      } else if (error.request) {
        errorMessage = "Sem conexão com o servidor";
      }
  
      toast.error(
        <div>
          <div>{errorMessage}</div>
          {showRetry && (
            <button 
              onClick={() => handleSendFromMenu(status, e)}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>,
        {
          position: "top-center",
          autoClose: false,
          closeOnClick: false,
        }
      );
  
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
  
  const handleDownloadSample = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Numero,Nome\n" +
      "31987654321,João Silva\n" +
      "31988776655,Maria Souza";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const refreshContacts = useCallback((newContacts) => {
    setState(prev => ({
      ...prev,
      contacts: newContacts
    }));
  }, []);
  
  const handleImportContacts = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!state.importFile) {
      setState(prev => ({ ...prev, 
        importStatus: "Error: Por favor selecione um arquivo CSV"
      }));
      return;
    }

    if (!state.selectedBoard) {
      setState(prev => ({ ...prev,
        importStatus: "Error: Nenhum quadro selecionado"
      }));
      return;
    }

    if (!state.currentStatusForPopup) {
      setState(prev => ({ ...prev,
        importStatus: "Error: Nenhuma coluna selecionada"
      }));
      return;
    }

    setState(prev => ({ ...prev, 
      isImporting: true, 
      importStatus: "Processando..." 
    }));

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('csv_file', state.importFile);
      formData.append('board_id', state.selectedBoard.id);
      formData.append('status', state.currentStatusForPopup); // Use the column's status

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
        importStatus: `Sucesso: ${response.data.success_count} contatos importados` +
                     (response.data.error_count > 0 ? 
                      `, ${response.data.error_count} erros` : ""),
        importFile: null
      }));
      
      // Refresh data
      await Promise.all([
        fetchCards(state.selectedBoard.id),
        axios.get(`${constants.API_BASE_URL}/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setState(prev => ({ ...prev, contacts: res.data.contacts }))
        })
      ]);

    } catch (error) {
      console.error("Erro na importação:", error);
      setState(prev => ({
        ...prev,
        importStatus: `Erro: ${error.response?.data?.error || error.message || "Falha na importação"}`
      }));
    } finally {
      setState(prev => ({ ...prev, isImporting: false }));
    }
  }, [state.importFile, state.selectedBoard, state.currentStatusForPopup, fetchCards]);


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
    <div className="app-container">
<ToastContainer 
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  theme="light"
/>
  
      <Header 
        boards={state.boards}
        selectedBoard={state.selectedBoard}
        onBoardChange={handleBoardChange}
        dailyCount={state.dailyCount}
      />
      
      <main className="main-content">
        <div className="dashboard-container">
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
                              disabled={!savedMessages || state.isLoading || (250 - state.dailyCount) < state.cards[status].length}
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

       {/* Simple link for downloading the sample CSV */}
       <a
        href="#"
        onClick={handleDownloadSample}
        style={{
          display: "block",
          marginTop: "10px",
          color: "#007bff",
          textDecoration: "none",
        }}
      >
        Baixar arquivo exemplo
      </a>

     <button type="submit" className="button button-green full-width">
       Adicionar
     </button>
   </form>

   <div className="import-section">
  <h4>Importar Contatos</h4>
  <form onSubmit={handleImportContacts}>
    <div className="file-input-wrapper">
      <label className="file-input-label">
        {state.importFile ? state.importFile.name : "Selecionar arquivo CSV"}
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files[0];
            setState((prev) => ({
              ...prev,
              importFile: file,
            }));
          }}
          style={{ display: "none" }}
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
                    <div>
                      <button
                        onClick={() => navigate("/settings")}
                        className={`header-button ${
                          location.pathname === "/settings" ? "active" : ""
                        }`}
                      ></button>
                    </div>
                  )}
                </div>
  
                <div className="daily-limit-info">
                      {(200 - state.dailyCount) < state.cards[status].length && (
                        <div className="limit-warning">
                          Limite excedido! Remova alguns contatos dessa coluna ou espere até amanhã.
                        </div>
                      )}
                    </div>
                    
                    <div className="dashboard-cards">
                      {state.cards[status].map((card) => (
                    <Card
                key={card.id}
                card={card}
                contacts={state.contacts}
                updateCardStatus={updateCardStatus}
                deleteCard={deleteCard}
                refreshContacts={refreshContacts} // Make sure this is passed
/>
                      ))} 
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
export default Dashboard;