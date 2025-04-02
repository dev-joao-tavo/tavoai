import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback here
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns'; // Removed unused isSameDay
import './MessageHistory.css';
import Header from "../components/Header.jsx";
import axios from "../api/api";
import * as constants from '../utils/constants';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MessageHistory = () => {
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
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
  const [chartData, setChartData] = useState(null);
  const [timePeriod, setTimePeriod] = useState('week'); // 'week' or 'month'
  const [chartLoading, setChartLoading] = useState(true);

  const token = localStorage.getItem('token');

  // Function to fetch data for the chart
  
// Also, make sure to wrap fetchMessageStats in useCallback to prevent infinite loops
const fetchMessageStats = useCallback(async (period) => {
  try {
    setChartLoading(true);
    const endDate = new Date();
    const startDate = period === 'week' ? subDays(endDate, 7) : subDays(endDate, 30);
    
    const response = await axios.get(
      `${constants.API_BASE_URL}/message-history?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&status=success`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const messages = response.data.data || [];
    prepareChartData(messages, startDate, endDate, period);
  } catch (error) {
    console.error('Error fetching message stats:', error);
    setError('Erro ao carregar estatísticas de mensagens');
  } finally {
    setChartLoading(false);
  }
}, [token]); // Add token as dependency

  // Function to prepare chart data
  const prepareChartData = (messages, startDate, endDate, period) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const dataByDate = days.map(day => {
      const dayStr = day.toISOString().split('T')[0];
      const dayMessages = messages.filter(msg => 
        msg.sent_at && msg.sent_at.split('T')[0] === dayStr
      );
      const total = dayMessages.reduce((sum, msg) => sum + (msg.success_count || 0), 0);
      return {
        date: day,
        label: format(day, period === 'week' ? 'EEE' : 'dd MMM'),
        value: total
      };
    });

    setChartData({
      labels: dataByDate.map(d => d.label),
      datasets: [
        {
          label: 'Mensagens enviadas com sucesso',
          data: dataByDate.map(d => d.value),
          backgroundColor: '#4CAF50',
          borderColor: '#388E3C',
          borderWidth: 1
        }
      ]
    });
  };
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
      
      const data = response.data;
      setMessages(data.data || []);
      setPagination({
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.total_pages || 1,
        perPage: data.pagination?.per_page || 10
      });
    } catch (error) {
      console.error('Error fetching message history:', error);
      setError('Erro ao carregar histórico de mensagens');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageDetails = async (id) => {
    try {
      setLoadingDetails(true);
      setActiveRecipientTab('successful');

      const response = await axios.get(
        `${constants.API_BASE_URL}/message-history/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSelectedMessage(response.data);
    } catch (error) {
      console.error('Error fetching message details:', error);
      setError('Erro ao carregar detalhes da mensagem');
    } finally {
      setLoadingDetails(false);
    }
  };

    // Fix the useEffect dependency array issue
    useEffect(() => {
      fetchMessageStats(timePeriod);
      fetchMessageHistory(pagination.page, pagination.perPage);
    }, [filters, pagination.perPage, timePeriod]); // Removed fetchMessageStats from dependencies

  const countTodaysSuccessfulMessages = () => {
    const today = new Date().toISOString().split('T')[0];
    return messages.reduce((count, message) => {
      const messageDate = message.sent_at?.split('T')[0];
      return messageDate === today ? count + (message.success_count || 0) : count;
    }, 0);
  };

  const todaysCount = useMemo(countTodaysSuccessfulMessages, [messages]);

  const formatDate = (dateString) => {
    try {
      return dateString ? format(parseISO(dateString), 'dd/MM/yyyy HH:mm') : '--';
    } catch {
      return dateString;
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev, 
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchMessageHistory(1, pagination.perPage);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="message-history-container">
        <Header />
        <div className="loading">Carregando histórico...</div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  // Add this chart options constant
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Mensagens enviadas com sucesso - Última ${timePeriod === 'week' ? 'semana' : 'mês'}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Número de mensagens'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Dia'
        }
      }
    }
  };


  return (
    <div className="app-container">
      <Header 
        dailyCount={todaysCount}
      />
      
      <main className="main-content">
        <div className="message-history-container">
          {error && (
            <div className="error-banner">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="error-close"
                aria-label="Fechar mensagem de erro"
              >
                &times;
              </button>
            </div>
          )}

          
          <div className="chart-section">
            <div className="chart-period-selector">
              <button 
                className={timePeriod === 'week' ? 'active' : ''}
                onClick={() => setTimePeriod('week')}
              >
                Semanal
              </button>
              <button 
                className={timePeriod === 'month' ? 'active' : ''}
                onClick={() => setTimePeriod('month')}
              >
                Mensal
              </button>
            </div>
            
            {chartLoading ? (
              <div className="loading">Carregando gráfico...</div>
            ) : chartData ? (
              <div className="chart-container">
                <Bar options={chartOptions} data={chartData} />
              </div>
            ) : (
              <div className="empty-state">Nenhum dado disponível para o gráfico</div>
            )}
          </div>

          <form className="filters" onSubmit={handleFilterSubmit}>
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
              aria-label="Filtrar por status"
              disabled={loading}
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
              aria-label="Data inicial"
              max={filters.endDate || new Date().toISOString().split('T')[0]}
              disabled={loading}
            />

            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              aria-label="Data final"
              min={filters.startDate}
              max={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Aplicando...' : 'Aplicar Filtros'}
            </button>
          </form>

          {messages.length === 0 && !loading ? (
            <div className="empty-state">
              Nenhuma mensagem encontrada com esses filtros
            </div>
          ) : (
            <>
              <div className="message-list">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`message-card ${loading ? 'disabled' : ''}`}
                    onClick={() => !loading && fetchMessageDetails(message.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalhes da mensagem enviada em ${formatDate(message.sent_at)}`}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && fetchMessageDetails(message.id)}
                  >
                    <div className="message-header">
                      <h3>
                        {message.message_content?.length > 50 
                          ? `${message.message_content.substring(0, 50)}...` 
                          : message.message_content || 'Sem conteúdo'}
                      </h3>
                      <span className="message-date">{formatDate(message.sent_at)}</span>
                    </div>

                    <div className="message-stats">
                      <div className="stat-item">
                        <span className="stat-label">Enviadas:</span>
                        <span className="stat-value success">{message.success_count || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Erros:</span>
                        <span className="stat-value error">{message.failure_count || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{message.total_recipients || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  {pagination.page > 1 && (
                    <button 
                      onClick={() => fetchMessageHistory(pagination.page - 1)}
                      disabled={loading}
                    >
                      Anterior
                    </button>
                  )}
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchMessageHistory(pageNum)}
                        className={pagination.page === pageNum ? 'active' : ''}
                        disabled={loading}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {pagination.page < pagination.totalPages && (
                    <button 
                      onClick={() => fetchMessageHistory(pagination.page + 1)}
                      disabled={loading}
                    >
                      Próxima
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {selectedMessage && (
            <div className="message-detail-modal" role="dialog" aria-modal="true">
              <div className="modal-content">
                {loadingDetails ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <button 
                      className="close-button"
                      onClick={() => setSelectedMessage(null)}
                      aria-label="Fechar modal"
                      disabled={loadingDetails}
                    >
                      &times;
                    </button>

                    <h2>Detalhes da Mensagem</h2>
                    <p className="message-content">{selectedMessage.message_content || 'Sem conteúdo'}</p>

                    <div className="sent-info">
                      <span>Enviado em: {formatDate(selectedMessage.sent_at)}</span>
                      {selectedMessage.completed_at && (
                        <span>Concluído em: {formatDate(selectedMessage.completed_at)}</span>
                      )}
                      <span>Canal: {selectedMessage.channel || 'Desconhecido'}</span>
                    </div>

                    <div className="stats-summary">
                      <div className="stat-box success">
                        <span className="stat-number">{selectedMessage.success_count || 0}</span>
                        <span className="stat-label">Sucessos</span>
                        <span className="stat-percent">
                          {Math.round(((selectedMessage.success_count || 0) / (selectedMessage.total_recipients || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="stat-box error">
                        <span className="stat-number">{selectedMessage.failure_count || 0}</span>
                        <span className="stat-label">Falhas</span>
                      </div>
                    </div>

                    <h3>Destinatários ({selectedMessage.total_recipients || 0})</h3>

                    <div className="recipient-tabs">
                      <button 
                        className={activeRecipientTab === 'successful' ? 'active' : ''}
                        onClick={() => setActiveRecipientTab('successful')}
                        disabled={loadingDetails}
                      >
                        Sucesso ({selectedMessage.recipients?.successful?.length || 0})
                      </button>
                      <button 
                        className={activeRecipientTab === 'failed' ? 'active' : ''}
                        onClick={() => setActiveRecipientTab('failed')}
                        disabled={loadingDetails}
                      >
                        Falhas ({selectedMessage.recipients?.failed?.length || 0})
                      </button>
                    </div>

                    <div className="recipients-list">
                      {activeRecipientTab === 'successful' ? (
                        selectedMessage.recipients?.successful?.map((recipient) => (
                          <div key={recipient.id} className="recipient sent">
                            <span className="recipient-name">{recipient.name || 'Sem nome'}</span>
                            <span className="recipient-phone">{recipient.phone || 'Sem telefone'}</span>
                            <span className="status-badge sent">Enviado</span>
                            {recipient.delivered_at && (
                              <span className="delivery-time">
                                Entregue: {formatDate(recipient.delivered_at)}
                              </span>
                            )}
                          </div>
                        )) || <div>Nenhum destinatário com sucesso</div>
                      ) : (
                        selectedMessage.recipients?.failed?.map((recipient) => (
                          <div key={recipient.id} className="recipient failed">
                            <span className="recipient-name">{recipient.name || 'Sem nome'}</span>
                            <span className="recipient-phone">{recipient.phone || 'Sem telefone'}</span>
                            <span className="status-badge failed">Falha</span>
                            {recipient.error && (
                              <span className="error-detail">{recipient.error}</span>
                            )}
                          </div>
                        )) || <div>Nenhum destinatário com falha</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MessageHistory;