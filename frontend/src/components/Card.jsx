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
          <option value="day-1">1º dia</option>
          <option value="day-2">2º dia</option>
          <option value="day-3">3º dia</option>
          <option value="day-4">4º dia</option>
          <option value="day-5">5º dia</option>
          <option value="day-6">6º dia</option>
          <option value="day-7">7º dia</option>
          <option value="day-8">8º dia</option>
          <option value="day-9">9º dia</option>
          <option value="day-10">10º dia</option>
          <option value="day-11">11º dia</option>
          <option value="day-12">12º dia</option>
          <option value="day-13">13º dia</option>
          <option value="day-14">14º dia</option>
          <option value="monday">Segunda</option>
          <option value="tuesday">Terça</option>
          <option value="wednesday">Quarta</option>
          <option value="thursday">Quinta</option>
          <option value="friday">Sexta</option>
          <option value="saturday">Sábado</option>
          <option value="sunday">Domingo</option>
          <option value="schedule">Agenda</option>

        </select>
      </div>

      {/* Contact Information */}
      <p className="dashboard-contact-info text-sm text-gray-600 mb-2">
        {contact ? `Contato: ${contact.phone_number}` : "Contato não encontrado"}
      </p>
      <p
        className={`dashboard-contact-info text-sm mb-2 ${
          contact && contact.last_message_contact ? "text-gray-600" : "text-red-500"
        }`}
      >
        console.log(contact.last_message_contact);
        console.log(contact.last_message_contact);
                
        {contact && contact.last_message_contact
          ? ` • Última mensagem: ${new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              month: "long",
              day: "2-digit",
            }).format(
              new Date(new Date(contact.last_message_contact.replace(" ", "T")).getTime() - 3 * 60 * 60 * 1000)
            )}`
          : " • Última mensagem: Não disponível"}
      </p>



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