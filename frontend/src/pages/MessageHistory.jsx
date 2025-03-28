import { useState, useEffect } from 'react';
import './MessageHistory.css';
import Header from "../components/Header.jsx";
import axios from "../api/api";
import * as constants from '../utils/constants';

const MessageHistory = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeRecipientTab, setActiveRecipientTab] = useState('successful');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    perPage: 10
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  const token = localStorage.getItem('token');  // Get the token from local storage or context

  const fetchMessageHistory = async (page = 1, perPage = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page,
        per_page: perPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate })
      });

      const response = await axios.get(
        `${constants.API_BASE_URL}/message-history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const data = await response.data; // Adjust based on your actual response structure
      
      setMessages(data.data);
      setPagination({
        page: data.pagination.page,
        totalPages: data.pagination.total_pages,
        perPage: data.pagination.per_page
      });
    } catch (error) {
      console.error('Error fetching message history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageDetails = async (id) => {
    try {
      setActiveRecipientTab('successful'); // Reset tab when opening new message

      const params = new URLSearchParams({ id });

      const response = await axios.get(
        `${constants.API_BASE_URL}/message-history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.data; // Adjust based on your actual response structure
      setSelectedMessage(data);
    } catch (error) {
      console.error('Error fetching message details:', error);
    }
  };

  useEffect(() => {
    fetchMessageHistory(1);
  }, [filters, pagination.perPage]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      fetchMessageHistory(1, pagination.perPage);
      return newFilters;
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="message-history-container">
        <Header />
        <div className="loading">Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div className="message-history-container">
      <Header />
      <h1>Histórico de Mensagens</h1>

      {/* Filter Controls */}
      <div className="filters">
        <select 
          name="status" 
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">Todos status</option>
          <option value="success">Sucesso</option>
          <option value="failed">Falhas</option>
        </select>

        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          placeholder="Data inicial"
        />

        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          placeholder="Data final"
        />

        <button onClick={() => fetchMessageHistory(1)}>
          Aplicar Filtros
        </button>
      </div>

      {/* Message List */}
      <div className="message-list">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className="message-card"
            onClick={() => fetchMessageDetails(message.id)}
          >
            <div className="message-header">
              <h3>{message.message_content.length > 50 
                ? `${message.message_content.substring(0, 50)}...` 
                : message.message_content}</h3>
              <span className="message-date">{formatDate(message.sent_at)}</span>
            </div>

            <div className="message-stats">
              <div className="stat-item">
                <span className="stat-label">Enviadas:</span>
                <span className="stat-value success">{message.success_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Erros:</span>
                <span className="stat-value error">{message.failure_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{message.total_recipients}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => fetchMessageHistory(i + 1)}
              className={pagination.page === i + 1 ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="message-detail-modal">
          <div className="modal-content">
            <button 
              className="close-button"
              onClick={() => setSelectedMessage(null)}
            >
              &times;
            </button>

            <h2>Detalhes da Mensagem</h2>
            <p className="message-content">{selectedMessage.message_content}</p>

            <div className="sent-info">
              <span>Enviado em: {formatDate(selectedMessage.sent_at)}</span>
              {selectedMessage.completed_at && (
                <span>Concluído em: {formatDate(selectedMessage.completed_at)}</span>
              )}
              <span>Canal: {selectedMessage.channel}</span>
            </div>

            <div className="stats-summary">
              <div className="stat-box success">
                <span className="stat-number">{selectedMessage.success_count}</span>
                <span className="stat-label">Sucessos</span>
                <span className="stat-percent">
                  {Math.round((selectedMessage.success_count / selectedMessage.total_recipients) * 100)}%
                </span>
              </div>
              <div className="stat-box error">
                <span className="stat-number">{selectedMessage.stats.failure_count}</span>
                <span className="stat-label">Falhas</span>
              </div>
            </div>

            <h3>Destinatários ({selectedMessage.stats.total_recipients})</h3>

            <div className="recipient-tabs">
              <button 
                className={activeRecipientTab === 'successful' ? 'active' : ''}
                onClick={() => setActiveRecipientTab('successful')}
              >
                Sucesso ({selectedMessage.recipients.successful.length})
              </button>
              <button 
                className={activeRecipientTab === 'failed' ? 'active' : ''}
                onClick={() => setActiveRecipientTab('failed')}
              >
                Falhas ({selectedMessage.recipients.failed.length})
              </button>
            </div>

            <div className="recipients-list">
              {activeRecipientTab === 'successful' ? (
                selectedMessage.recipients.successful.map((recipient) => (
                  <div key={recipient.id} className="recipient sent">
                    <span className="recipient-name">{recipient.name || 'Sem nome'}</span>
                    <span className="recipient-phone">{recipient.phone}</span>
                    <span className="status-badge sent">Enviado</span>
                  </div>
                ))
              ) : (
                selectedMessage.recipients.failed.map((recipient) => (
                  <div key={recipient.id} className="recipient failed">
                    <span className="recipient-name">{recipient.name || 'Sem nome'}</span>
                    <span className="recipient-phone">{recipient.phone}</span>
                    <span className="status-badge failed">Falha</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageHistory;