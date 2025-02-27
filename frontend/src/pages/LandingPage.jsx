import React from 'react';
import { useNavigate } from 'react-router-dom';

import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="hero">
        <div className="container">
          <h1 className="brand-title">TavoAI</h1>
          <p>Simplifique suas conversas no WhatsApp com inteligência e organização.</p>
          <div className="buttons">
            <button className="cta-button" onClick={() => navigate('/login')}>Comece Agora</button>

          </div>
          <button className="login-home-page-button" onClick={() => navigate('/login')}>Login</button>

        </div>
      </header>

      <section className="features container">
        <div className="feature-grid">
          <div className="feature">
            <h3>Conversas Organizadas</h3>
            <p>Gerencie todas as suas conversas de forma centralizada.</p>
          </div>
          <div className="feature">
            <h3>Mensagens em Massa</h3>
            <p>Envie mensagens para múltiplos clientes com um clique.</p>
          </div>
          <div className="feature">
            <h3>Fluxo de Trabalho Eficiente</h3>
            <p>Economize tempo e otimize sua comunicação.</p>
          </div>
          <div className="feature">
            <h3>Integração Simplificada</h3>
            <p>Conecte-se facilmente com outras ferramentas para maior eficiência.</p>
          </div>
        </div>
      </section>


      <section className="testimonials container">
        <h2>Depoimentos</h2>
        <br/>
        <br/>
        <div className="testimonial-grid">
          <div className="testimonial">
            <p>"O TavoAI revolucionou minha comunicação com clientes!"</p>
            <span>- Ana Silva</span>
          </div>
          <div className="testimonial">
            <p>"A funcionalidade de mensagens em massa do TavoAI economiza horas de trabalho."</p>
            <span>- João Santos</span>
          </div>
        </div>
      </section>

      <section className="pricing container">
        <h2>Planos</h2>
        <div className="pricing-options">
          <div className="plan">
            <h3>Básico</h3>
            <p className="price">R$50/mês</p>
            <ul>
              <li>Até 100 conversas</li>
              <li>Mensagens em massa</li>
              <li>Suporte padrão</li>
            </ul>
            <button className="cta-button" onClick={() => navigate('/login')}>Escolher</button>
          </div>
          <div className="plan">
            <h3>Pro</h3>
            <p className="price">R$120/mês</p>
            <ul>
              <li>Conversas ilimitadas</li>
              <li>Análises avançadas</li>
              <li>Suporte prioritário</li>
            </ul>
            <button className="cta-button" onClick={() => navigate('/login')}>Escolher</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2024 TavoAI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
