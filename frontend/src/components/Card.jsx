import { useState } from "react";
import "./Card.css"; // Ensure this import is correct

const Card = ({ card, contacts, updateCardStatus, deleteCard }) => {
  const [selectedStatus, setSelectedStatus] = useState(card.status);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (!isClicked) {
      setIsClicked(true);
      deleteCard(card.id);
    }
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    updateCardStatus(card.id, newStatus);
  };

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
    <div className="dashboard-card bg-white p-6 rounded-lg shadow-lg mb-6 relative">
      <button
        onClick={handleClick}
        className="close-button"
        disabled={isClicked}
      >
        &#10005;
      </button>

      <div className="card-header flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>

        <select
          className="dashboard-dropdown p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white"
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

      <div className="space-y-3">
        <p className="dashboard-contact-info text-sm text-gray-700">
          {contact ? (
            <>
              <span className="font-medium">Contato:</span> {contact.phone_number}
            </>
          ) : (
            <span className="text-red-500">Contato não encontrado</span>
          )}
        </p>

        <p
          className={`dashboard-contact-info text-sm ${
            contact?.last_message_contact ? "text-gray-700" : "text-red-500"
          }`}
        >
          {contact?.last_message_contact ? (
            <span className="smaller-text"> {/* Wrap both elements in a span */}
              <span className="font-medium">Última mensagem:</span>{" "}
              {formatLastMessageDate(contact.last_message_contact)}
            </span>
          ) : (
            "Última mensagem: Não disponível"
          )}
        </p>
      </div>
    </div>
  );
};

export default Card;