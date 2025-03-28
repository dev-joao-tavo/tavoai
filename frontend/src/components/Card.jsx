import { useState } from "react";
import "./Card.css";

const Card = ({ card, contacts, updateCardStatus, deleteCard }) => {
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status configuration
  const statusConfig = {
    SENDING: {
      label: "Enviando",
      color: "status-sending",
      icon: (
        <svg className="status-icon" viewBox="0 0 24 24">
          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )
    },
    SENT: {
      label: "Enviado",
      color: "status-ok",
      icon: (
        <svg className="status-icon" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    },
    NEVER_SENT: {
      label: "Não Enviado",
      color: "status-default",
      icon: (
        <svg className="status-icon" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    },
    ERROR: {
      label: "Erro",
      color: "status-error",
      icon: (
        <svg className="status-icon" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )
    },
    default: {
      label: "Pendente",
      color: "status-default",
      icon: (
        <svg className="status-icon" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const contact = contacts.find((contact) => Number(contact.ID) === Number(card.contact_ID));

  const isMessageFromToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getStatusConfig = () => {
    // Handle NEVER_SENT explicitly
    if (card.sending_message_status === 'NEVER_SENT') {
      return statusConfig.NEVER_SENT;
    }

    // Handle SENT status with date check
    if (card.sending_message_status === 'SENT') {
      const lastMessageDate = contact?.last_message_contact;
      return isMessageFromToday(lastMessageDate) 
        ? statusConfig.SENT 
        : statusConfig.default;
    }

    // Handle other known statuses
    if (card.sending_message_status && statusConfig[card.sending_message_status]) {
      return statusConfig[card.sending_message_status];
    }

    // Default fallback
    return statusConfig.default;
  };

  const currentStatus = getStatusConfig();

  
  const handleDelete = () => {
    if (!isDeleting) {
      setIsDeleting(true);
      deleteCard(card.id);
    }
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    updateCardStatus(card.id, newStatus);
  };

  const formatLastMessageDate = (dateString) => {
    if (!dateString) return "Nenhuma mensagem";
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return `Enviada hoje às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <div className="card">
      {/* Card header */}
      <div className="card-header">
        <h3 className="card-title">{card.title}</h3>
        
        <button
          onClick={handleDelete}
          className={`delete-button ${isDeleting ? "deleting" : ""}`}
          disabled={isDeleting}
          aria-label="Remover card"
        >
          <svg className="delete-icon" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div className="card-content">
        {/* Contact info */}
        <div className="contact-info">
          {contact ? (
            <span className="phone-number">
              <svg className="phone-icon" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {contact.phone_number}
            </span>
          ) : (
            <span className="contact-error">
              <svg className="error-icon" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Contato não encontrado
            </span>
          )}
        </div>
    
        {/* Last message */}
        {contact?.last_message_contact && (
          <span className="last-message">
            {formatLastMessageDate(contact.last_message_contact)}
          </span>
        )}

        {/* Status and message info */}
        <div className="status-container">
          <div className="status-message">
            {/* Status badge */}
            <span className={`status-badge ${currentStatus.color}`}>
              {currentStatus.icon}
              <span className="status-label">{currentStatus.label}</span>
            </span>
            

          </div>

          {/* Status dropdown */}
          <div className="dropdown-container">
            <select
              className="status-dropdown"
              value={selectedStatus}
              onChange={handleStatusChange}
            >
              {Array.from({ length: 14 }, (_, i) => (
                <option key={`day-${i + 1}`} value={`day-${i + 1}`}>
                  {i + 1}º dia
                </option>
              ))}

              {[
                { pt: "Segunda", en: "Monday" },
                { pt: "Terça", en: "Tuesday" },
                { pt: "Quarta", en: "Wednesday" },
                { pt: "Quinta", en: "Thursday" },
                { pt: "Sexta", en: "Friday" },
                { pt: "Sábado", en: "Saturday" },
                { pt: "Domingo", en: "Sunday" }
              ].map(({ pt, en }) => (
                <option key={pt} value={en.toLowerCase()}>
                  {pt}
                </option>
              ))}

              <option value="schedule">Agenda</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;