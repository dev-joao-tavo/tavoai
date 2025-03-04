import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const Conversation = () => {
  const { cardId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    axios
      .get(`/cards/${cardId}/messages`)
      .then((response) => {
        setMessages(response.data.messages || []);
      })
      .catch((error) => console.error("Error fetching messagesS:", error))
      .finally(() => setIsLoading(false));
  }, [cardId]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    axios
      .post(`/cards/${cardId}/send`, { message: newMessage })
      .then(() => {
        setMessages([
          ...messages,
          { id: messages.length + 1, sender: "You", message: newMessage, timestamp: new Date().toISOString() }, // Ensure each message has a unique `id`
        ]);
        setNewMessage("");
      })
      .catch((error) => console.error("Error sending message:", error))
      .finally(() => setIsLoading(false));
  };

  const onDragEnd = async (result) => {
    const { destination, source } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newMessages = Array.from(messages);
    const [removed] = newMessages.splice(source.index, 1);
    newMessages.splice(destination.index, 0, removed);

    setMessages(newMessages);

    // Persist the new order to the backend
    try {
      await axios.post(`/cards/${cardId}/reorder`, {
        order: newMessages.map((msg) => msg.id), // Ensure each message has an `id` field
      });
    } catch (error) {
      console.error("Error reordering messages:", error);
    }
  };

  return (
    <div className="conversation-page">
      <h1 className="conversation-header">WhatsApp Conversation</h1>

      {/* Messages */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="messages">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="messages-container"
            >
              {isLoading ? (
                <p className="text-gray-500 text-center">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-500 text-center">No messages yet.</p>
              ) : (
                messages.map((msg, index) => (
                  <Draggable key={msg.id} draggableId={`message-${msg.id}`} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`message ${
                          msg.sender === "You" ? "sent" : "received"
                        }`}
                      >
                        <strong>{msg.sender}:</strong> {msg.message}
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Message Input */}
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="message-input"
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="send-button"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Conversation;