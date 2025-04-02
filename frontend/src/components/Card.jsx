import { useState, useMemo, useCallback, useEffect } from "react";
import { FiEdit2, FiSave, FiPhone, FiCheck } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';
import axios from "axios";
import * as constants from '../utils/constants';
import PropTypes from 'prop-types';
import { statusConfig } from "./statusConfig";
import { getStatusConfig, formatLastMessageDate } from "./cardUtils";
import "./Card.css";

// Phone number formatting utilities
const formatPhoneNumber = (phone) => {
  if (!phone) return "No phone";
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{1})(\d{4})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]} ${match[3]}-${match[4]}` : phone;
};

const unformatPhoneNumber = (formatted) => {
  return formatted.replace(/\D/g, '');
};

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

const Card = ({ card, contacts, updateCardStatus, deleteCard, updateCardNotes, refreshContacts, refreshCards }) => {
  // Memoized contact lookup
  const contact = useMemo(
    () => contacts.find((c) => Number(c.ID) === Number(card.contact_ID)),
    [contacts, card.contact_ID]
  );

  // State declarations
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState(contact?.each_contact_notes || "");
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showNotesSaved, setShowNotesSaved] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactName, setContactName] = useState(contact?.contact_name || contact?.name || "");
  const [contactPhone, setContactPhone] = useState(unformatPhoneNumber(contact?.phone_number || ""));

  // Refresh data when contact changes
  useEffect(() => {
    if (contact) {
      setNotes(contact.each_contact_notes || "");
      setContactName(contact.contact_name || contact?.name || "");
      setContactPhone(unformatPhoneNumber(contact.phone_number || ""));
    }
  }, [contact]);

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
    if (!contact) return;
  
    const currentNotes = contact?.each_contact_notes || contact?.notes || "";
    if (notes === currentNotes) return;
  
    setIsSavingNotes(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found. User might not be authenticated.");
        alert("You are not authenticated. Please log in again.");
        return;
      }
  
      await axios.put(
        `${constants.API_BASE_URL}/contacts/${contact.ID}`,
        { each_contact_notes: notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // Only show confirmation after successful save
      setShowNotesSaved(true);
      setTimeout(() => setShowNotesSaved(false), 2000);
  
      // Refresh data to ensure consistency
      if (refreshContacts) refreshContacts();
      if (refreshCards) refreshCards();
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes. Please try again.");
      // Revert to the last saved notes if save fails
      setNotes(currentNotes);
    } finally {
      setIsSavingNotes(false);
    }
  }, [notes, contact, refreshContacts, refreshCards]);
  


  const handleSaveContact = useCallback(async () => {
    if (!contact) return;
  
    setIsSavingContact(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${constants.API_BASE_URL}/contacts/${contact.ID}`,
        {
          contact_name: contactName,
          phone_number: contactPhone // Save as raw numbers
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      if (refreshContacts) refreshContacts();
      if (refreshCards) refreshCards();
      
      setIsEditingContact(false);
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact. Please check the details and try again.");
    } finally {
      setIsSavingContact(false);
    }
  }, [contact, contactName, contactPhone, refreshContacts, refreshCards]);

  return (
    <div className="card" aria-live="polite">
      {/* Card header */}
      <div className="card-header">
        <h3 className="card-title">{contact.contact_name}</h3>
        
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
          placeholder={card.title}
          aria-label="Contact name"
        />
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => {
            // Auto-format while typing
            const input = e.target.value.replace(/\D/g, '');
            if (input.length <= 11) {
              setContactPhone(input);
            }
          }}
          className="contact-edit-input"
          placeholder="(XX) 9 9999-9999"
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
          onClick={() => setIsEditingContact(false)}
          className="close-contact-button"
          disabled={isSavingContact}
        >                
          <FiX />
        </button> 
      </div>
    ) : (
      <>
        <span className="phone-number">
          <FiPhone className="phone-icon" />
          {formatPhoneNumber(contact?.phone_number) || "No phone"}  
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

 {/* Notes section with save confirmation */}
 <div className="notes-section">
    <div className="notes-header" onClick={toggleNotesVisibility}>
      <span className="notes-label">NOTES</span>
      <button className="notes-toggle" aria-label={isNotesVisible ? "Hide notes" : "Show notes"}>
        {isNotesVisible ? '−' : '+'}
      </button>
    </div>
    
    {isNotesVisible && (
      <div className="notes-content">
      <textarea
          className="notes-textarea"
          value={notes || ""}  // Ensure it handles null/undefined
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes here..."
          aria-label="Card notes"
        />
      <div className="notes-actions">
      <button 
  className="save-notes-button"
  onClick={handleSaveNotes}
  disabled={
    notes === (contact?.each_contact_notes || contact?.notes || "") || 
    isSavingNotes
  }
>
  {isSavingNotes ? 'Saving...' : <><FiSave /> Save</>}
</button>
        {showNotesSaved && (
          <span className="notes-saved-confirmation">
            <FiCheck /> Saved!
          </span>
        )}
      </div>
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
  }).isRequired,
  contacts: PropTypes.arrayOf(
    PropTypes.shape({
      ID: PropTypes.number.isRequired,
      contact_name: PropTypes.string,
      name: PropTypes.string,
      phone_number: PropTypes.string,
      last_message_contact: PropTypes.string,
      each_contact_notes: PropTypes.string,
    })
  ).isRequired,
  updateCardStatus: PropTypes.func.isRequired,
  deleteCard: PropTypes.func.isRequired,
  updateCardNotes: PropTypes.func.isRequired,
  refreshContacts: PropTypes.func,
  refreshCards: PropTypes.func,
};

export default Card;