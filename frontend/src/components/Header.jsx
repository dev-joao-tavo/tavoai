import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../api/api";
import * as constants from '../utils/constants';
import "./Header.css";

const Header = ({ 
  boards = [], 
  selectedBoard, 
  onBoardChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [todaysCount, setTodaysCount] = useState(`-`);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const fetchTodaysMessages = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `${constants.API_BASE_URL}/message-history?start_date=${today}&status=success`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const count = response.data.data?.reduce((total, message) => total + (message.success_count || 0), 0) || 0;
      setTodaysCount(count);
    } catch (error) {
      console.error('Error fetching today\'s messages:', error);
    }
  };

  useEffect(() => {
    fetchTodaysMessages();
    
    // Refresh count every hour
    const interval = setInterval(fetchTodaysMessages, 3600000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button 
        className="header-toggle"
        onClick={toggleSidebar}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <div className={`header-container ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h1>Tavo.AI</h1>
          <h2>Seu assistente inteligente</h2>
        </div>

        <div className="sidebar-board-selector">
          {boards.map((board) => (
            <button
              key={board.id}
              className={`sidebar-board-button ${
                selectedBoard?.id === board.id ? "active" : ""
              }`}
              onClick={() => onBoardChange(board.id)}
            >
              {board.board_type === "funnel" 
                ? "Funil" 
                : board.board_type === "agenda" 
                ? "Semanal" 
                : board.board_type}
            </button>
          ))}
        </div>

        <div className="sidebar-navigation">
          <button
            onClick={() => navigate("/dashboard")}
            className={`header-button ${
              location.pathname === "/dashboard" ? "active" : ""
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/settings")}
            className={`header-button ${
              location.pathname === "/settings" ? "active" : ""
            }`}
          >
            Configurações
          </button>
          <button
            onClick={() => navigate("/history")}
            className={`header-button ${
              location.pathname === "/history" ? "active" : ""
            }`}
          >
            Histórico
          </button>
        </div>

        <div className="sidebar-daily-limit">
          <div className="counter-content">
            <span className="counter-label">Enviadas hoje</span>
            <span className="counter-value">{todaysCount}</span>
          </div>
          <div className="limit-text">Limite: 200 mensagens</div>
        </div>
      </div>
    </>
  );
};

export default Header;