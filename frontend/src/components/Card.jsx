import { useState } from "react";

const Card = ({ card, contacts, openConversation, updateCardStatus, deleteCard }) => {
  const [selectedStatus, setSelectedStatus] = useState(card.status);

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    updateCardStatus(card.id, newStatus);
  };

  // Find the contact related to this card
  const contact = contacts.find((contact) => Number(contact.ID) === Number(card.contact_ID));

  return (
    <div className="dashboard-card bg-white p-4 rounded-lg shadow-md mb-4">
      {/* Card Header */}
      <div className="card-header flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>

        {/* Dropdown Menu */}
        <select
          className="dashboard-dropdown p-1 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
          value={selectedStatus}
          onChange={handleStatusChange}
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Contact Information */}
      <p className="dashboard-contact-info text-sm text-gray-600 mb-2">
        {contact ? `Phone number: ${contact.phone_number}` : "No contact found"}
      </p>

      {/* Card Description */}
      <p className="text-sm text-gray-700 mb-4">{card.description}</p>

      {/* Buttons */}
      <div className="flex gap-2">
        
        <button
          onClick={() => deleteCard(card.id)}
          className="button button-red"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default Card;