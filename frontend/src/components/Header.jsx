import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

const Header = ({ 
  boards = [], 
  selectedBoard, 
  onBoardChange, 
  dailyCount = 0 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
          {dailyCount}/200 mensagens hoje
        </div>
      </div>
    </>
  );
};

export default Header;