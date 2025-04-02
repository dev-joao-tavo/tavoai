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

const Card = ({ card, contacts = [], updateCardStatus, deleteCard, updateCardNotes, refreshContacts, refreshCards }) => {
  // Find contact first
  const contact = useMemo(() => {
    return Array.isArray(contacts) 
      ? contacts.find((c) => Number(c?.ID) === Number(card?.contact_ID)) 
      : null;
  }, [contacts, card?.contact_ID]);

  // State declarations with safe defaults
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState("");
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showNotesSaved, setShowNotesSaved] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const currentStatus = useMemo(
    () => getStatusConfig(card, contact, statusConfig),
    [card, contact]
  );

  // Initialize state when contact changes
  useEffect(() => {
    if (contact) {
      setNotes(contact.each_contact_notes || contact.notes || "");
      setContactName(contact.contact_name || contact.name || "");
      setContactPhone(unformatPhoneNumber(contact.phone_number || ""));
    } else {
      // Reset if no contact found
      setNotes("");
      setContactName("");
      setContactPhone("");
    }
  }, [contact]);

  const handleSaveNotes = useCallback(async () => {
    if (!contact) return;

    setIsSavingNotes(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      await axios.put(
        `${constants.API_BASE_URL}/contacts/${contact.ID}`,
        { each_contact_notes: notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowNotesSaved(true);
      setTimeout(() => setShowNotesSaved(false), 2000);

      // Refresh contacts to ensure consistency
      if (refreshContacts) {
        const contactsRes = await axios.get(`${constants.API_BASE_URL}/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        refreshContacts(contactsRes.data.contacts);
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
  }, [notes, contact, refreshContacts]);

  const handleSaveContact = useCallback(async () => {
    if (!contact) return;
  
    setIsSavingContact(true);
    try {
      const token = localStorage.getItem("token");
      
      // 1. Update the contact via API
      await axios.put(
        `${constants.API_BASE_URL}/contacts/${contact.ID}`,
        {
          contact_name: contactName,
          phone_number: contactPhone
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // 2. Fetch fresh contacts list
      const contactsRes = await axios.get(`${constants.API_BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // 3. Update parent state with fresh contacts
      if (refreshContacts) {
        refreshContacts(contactsRes.data.contacts);
      }
  
      setIsEditingContact(false);
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact. Please try again.");
      // Revert to original values
      setContactName(contact.contact_name || contact.name || "");
      setContactPhone(unformatPhoneNumber(contact.phone_number || ""));
    } finally {
      setIsSavingContact(false);
    }
  }, [contact, contactName, contactPhone, refreshContacts]);

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

  // Don't render if no contact found
  if (!contact) {
    return (
      <div className="card error">
        <div className="card-header">
          <h3 className="card-title">Contact not found</h3>
        </div>
        <div className="card-content">
          <p>This card references a contact that doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" aria-live="polite">
      {/* Card header */}
      <div className="card-header">
        <h3 className="card-title">
          {isEditingContact ? contactName : contact.contact_name || contact.name}
        </h3>
        
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
                placeholder="Contact name"
                disabled={isSavingContact}
              />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, '');
                  if (input.length <= 11) setContactPhone(input);
                }}
                className="contact-edit-input"
                placeholder="(XX) 9 9999-9999"
                disabled={isSavingContact}
              />
              <button 
                onClick={handleSaveContact}
                className="save-contact-button"
                disabled={isSavingContact}
              >
                {isSavingContact ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <FiSave />
                )}
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
                {formatPhoneNumber(contact.phone_number) || "No phone"}
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
        {contact.last_message_contact && (
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
            <button className="notes-toggle">
              {isNotesVisible ? '−' : '+'}
            </button>
          </div>
          
          {isNotesVisible && (
            <div className="notes-content">
              <textarea
                className="notes-textarea"
                value={notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
              />
              <div className="notes-actions">
              <button 
              onClick={handleSaveNotes}
              disabled={isSavingNotes || notes === (contact.each_contact_notes || contact?.notes || "")}
              className="save-notes-button"
            >
              {isSavingNotes ? (
                <div className="loading-spinner small"></div>
              ) : (
                <>
                  <FiSave size={14} />
                  <span>Save</span>
                </>
              )}
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
      notes: PropTypes.string,
    })
  ).isRequired,
  updateCardStatus: PropTypes.func.isRequired,
  deleteCard: PropTypes.func.isRequired,
  updateCardNotes: PropTypes.func.isRequired,
  refreshContacts: PropTypes.func,
  refreshCards: PropTypes.func,
};

export default Card;