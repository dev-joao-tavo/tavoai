import { useState } from "react";
import "./Card.css"

const Card = ({ card, contacts, openConversation, updateCardStatus, deleteCard }) => {
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isClicked, setIsClicked] = useState(false); // State to track if the button is clicked

  const handleClick = () => {
    if (!isClicked) {
      setIsClicked(true); // Disable the button
      deleteCard(card.id); // Trigger the delete function
    }
  };
  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    updateCardStatus(card.id, newStatus);
  };

  // Find the contact related to this card
  const contact = contacts.find((contact) => Number(contact.ID) === Number(card.contact_ID));
  
  const formatLastMessageDate = (dateString) => {
    const date = new Date(dateString.replace(" ", "T"));
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      month: "long",
      day: "2-digit",
    }).format(date);
  };

  return (
    <div className="dashboard-card bg-white p-4 rounded-lg shadow-md mb-4 relative">
      {/* Close Button ("X") */}
      <button
        onClick={handleClick}
        className="close-button absolute top-2 right-2 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-500 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
        disabled={isClicked} // Disable the button after the first click
      >
        &#10005; {/* "X" character */}
      </button>
  
      {/* Card Header */}
      <div className="card-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
  
        {/* Dropdown Menu */}
        <select
          className="dashboard-dropdown p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 text-sm text-gray-700"
          value={selectedStatus}
          onChange={handleStatusChange}
        >
          {/* Days 1-14 */}
          {Array.from({ length: 14 }, (_, i) => (
            <option key={`day-${i + 1}`} value={`day-${i + 1}`}>
              {i + 1}º dia
            </option>
          ))}
  
          {/* Weekdays */}
          {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day, i) => (
            <option key={day} value={day.toLowerCase()}>
              {day}
            </option>
          ))}
  
          {/* Additional Option */}
          <option value="schedule">Agenda</option>
        </select>
      </div>
  
      {/* Contact Information */}
      <div className="space-y-2">
        <p className="dashboard-contact-info text-sm text-gray-600">
          {contact ? `Contato: ${contact.phone_number}` : "Contato não encontrado"}
        </p>
  
        <p
          className={`dashboard-contact-info text-sm ${
            contact?.last_message_contact ? "text-gray-600" : "text-red-500"
          }`}
        >
          {contact?.last_message_contact
            ? ` • Última mensagem: ${formatLastMessageDate(contact.last_message_contact)}`
            : " • Última mensagem: Não disponível"}
        </p>
      </div>
    </div>
  );
};

export default Card;
