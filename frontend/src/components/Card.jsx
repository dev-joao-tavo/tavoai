import { useState, useMemo, useCallback } from "react";
import { statusConfig } from "./statusConfig";
import { 
  getStatusConfig, 
  isMessageFromToday, 
  formatLastMessageDate 
} from "./cardUtils";
import "./Card.css";

// Constants for dropdown options
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: `day-${i + 1}`,
  label: `${i + 1}º dia`,
}));

const WEEKDAY_OPTIONS = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const Card = ({ card, contacts, updateCardStatus, deleteCard }) => {
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoized contact lookup
  const contact = useMemo(
    () => contacts.find((c) => Number(c.ID) === Number(card.contact_ID)),
    [contacts, card.contact_ID]
  );

  // Memoized status calculation
  const currentStatus = useMemo(
    () => getStatusConfig(card, contact, statusConfig),
    [card, contact]
  );

  // Handlers with useCallback
  const handleDelete = useCallback(() => {
    if (!isDeleting) {
      setIsDeleting(true);
      deleteCard(card.id);
    }
  }, [isDeleting, deleteCard, card.id]);

  const handleStatusChange = useCallback(
    (event) => {
      const newStatus = event.target.value;
      setSelectedStatus(newStatus);
      updateCardStatus(card.id, newStatus);
    },
    [card.id, updateCardStatus]
  );

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
          {isDeleting ? (
            <span className="deleting-spinner">...</span>
          ) : (
            <svg className="delete-icon" viewBox="0 0 24 24">
              <path 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          )}
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

        {/* Status and dropdown */}
        <div className="status-container">
          <div className="status-message">
            <span className={`card-status-badge ${currentStatus.color}`}>
              {currentStatus.icon}
              <span className="status-label">{currentStatus.label}</span>
            </span>
          </div>

          <div className="dropdown-container">
            <select
              className="status-dropdown"
              value={selectedStatus}
              onChange={handleStatusChange}
              aria-label="Alterar status do card"
            >
              {DAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}

              {WEEKDAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
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