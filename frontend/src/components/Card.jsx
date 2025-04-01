import { useState, useMemo, useCallback } from "react";
import { FiEdit2, FiSave, FiPhone } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';

import axios from "axios";
import * as constants from '../utils/constants';
import PropTypes from 'prop-types';

import { statusConfig } from "./statusConfig";
import { 
  getStatusConfig, 
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

const Card = ({ card, contacts, updateCardStatus, deleteCard, updateCardNotes }) => {
  // Memoized contact lookup (moved to top)
  const contact = useMemo(
    () => contacts.find((c) => Number(c.ID) === Number(card.contact_ID)),
    [contacts, card.contact_ID]
  );

  // State declarations
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState(card.notes || "");
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactName, setContactName] = useState(contact?.name || "");
  const [contactPhone, setContactPhone] = useState(contact?.phone_number || "");

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

  const toggleNotesVisibility = useCallback(() => {
    setIsNotesVisible((prev) => !prev);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (notes === (card.notes || "")) return;
  
    setIsSavingNotes(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${constants.API_BASE_URL}/cards/${card.id}/notes`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      updateCardNotes(card.id, notes);
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
  }, [notes, card.id, card.notes, updateCardNotes]);
  
  const handleSaveContact = useCallback(async () => {
    if (!contact) return;
  
    setIsSavingContact(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${constants.API_BASE_URL}/contacts/${contact.ID}`,
        {
          name: contactName,
          phone_number: contactPhone
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      setIsEditingContact(false);
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact. Please check the details and try again.");
    } finally {
      setIsSavingContact(false);
    }
  }, [contact, contactName, contactPhone]);

  return (
    <div className="card" aria-live="polite">
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
          {isEditingContact ? (
            <div className="contact-edit-form">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="contact-edit-input"
                placeholder= {card.title}
                aria-label="Contact name"
              />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="contact-edit-input"
                placeholder="Phone number"
                aria-label="Phone number"
              />
              <button 
                onClick={handleSaveContact}
                className="save-contact-button"
                disabled={isSavingContact}
              >                
                {isSavingContact ? 'Saving...' : <FiSave />}
              </button>      
              <button 
                onClick={() => setIsEditingContact(false)}  // Note: false should be lowercase
                className="close-contact-button"
                disabled={isSavingContact}
              >                
                <FiX /> {/* You might want to add an icon like a close (X) icon */}
              </button> 
            </div>
          ) : (
            <>
              <span className="phone-number">
                <FiPhone className="phone-icon" />
                {contact?.phone_number || "No phone"}
                <button 
                  onClick={() => setIsEditingContact(true)}
                  className="edit-contact-button"
                  aria-label="Edit contact"
                >
                  <FiEdit2 size={14} />
                </button>
              </span>
            </>
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

        {/* Collapsible notes section */}
        <div className="notes-section">
          <div className="notes-header" onClick={toggleNotesVisibility}>
            <span className="notes-label">NOTES</span>
            <button 
              className="notes-toggle" 
              aria-label={isNotesVisible ? "Hide notes" : "Show notes"}
            >
              {isNotesVisible ? '−' : '+'}
            </button>
          </div>
          
          {isNotesVisible && (
            <div className="notes-content">
              <textarea
                className="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                aria-label="Card notes"
              />
              <button 
                className="save-notes-button"
                onClick={handleSaveNotes}
                disabled={notes === (card.notes || "") || isSavingNotes}
              >
                {isSavingNotes ? 'Saving...' : <><FiSave /> Save</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Card.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    contact_ID: PropTypes.number.isRequired,
    notes: PropTypes.string,
  }).isRequired,
  contacts: PropTypes.arrayOf(
    PropTypes.shape({
      ID: PropTypes.number.isRequired,
      name: PropTypes.string,
      phone_number: PropTypes.string,
      last_message_contact: PropTypes.string,
    })
  ).isRequired,
  updateCardStatus: PropTypes.func.isRequired,
  deleteCard: PropTypes.func.isRequired,
  updateCardNotes: PropTypes.func.isRequired,
};

export default Card;