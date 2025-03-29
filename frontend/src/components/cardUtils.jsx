export const isMessageFromToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
export const getStatusConfig = (card, contact, statusConfig) => {
if (card.sending_message_status === 'NEVER_SENT') {
    return statusConfig.NEVER_SENT;
}

if (card.sending_message_status === 'SENT') {
    const lastMessageDate = contact?.last_message_contact;
    return isMessageFromToday(lastMessageDate) 
    ? statusConfig.SENT 
    : statusConfig.default;
}

return statusConfig[card.sending_message_status] || statusConfig.default;
};

export const formatLastMessageDate = (dateString) => {
if (!dateString || isNaN(new Date(dateString).getTime())) {
    return "Nenhuma mensagem";
}

const date = new Date(dateString);
const today = new Date();

if (date.toDateString() === today.toDateString()) {
    return `Enviada hoje às ${date.toLocaleTimeString("pt-BR", { 
    hour: "2-digit", 
    minute: "2-digit" 
    })}`;
}

return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
}).format(date);
};