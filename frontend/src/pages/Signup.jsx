import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./Login.css";
import { ToastContainer } from 'react-toastify';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    toast.dismiss();

    // Validate fields
    if (!email || !password || !confirmPassword || !phone) {
      toast.error('Por favor, preencha todos os campos.', {
        position: "top-center",
        autoClose: 5000,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Erro: suas senhas devem ser iguais.', {
        position: "top-center",
        autoClose: 5000,
      });
      return;
    }

    // Validate phone number (digits only)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
      toast.error('Número de telefone inválido. Deve ter 10 ou 11 dígitos.', {
        position: "top-center",
        autoClose: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          phone: cleanedPhone // Send unformatted number
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Cadastro realizado com sucesso!', {
          position: "top-center",
          autoClose: 3000,
          onClose: () => navigate('/login') // Redirect after toast closes
        });
      } else {
        throw new Error(data.message || 'Erro no cadastro. Tente novamente.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Erro ao conectar com o servidor.', {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (value) => {
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);

    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 3) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  return (
    <div className="login-container">
      <ToastContainer /> {/* Add this near your root component */}
      <h2>Crie sua conta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email"
            required
          />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            required
          />
        </div>
        <div className="form-group">
          <label>Confirme sua senha:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme sua senha"
            required
          />
        </div>
        <div className="form-group">
          <label>Número de WhatsApp:</label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(31) 9 9999-9999"
            required
          />
        </div>
        
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      <button className="signup-button" onClick={() => navigate('/login')}>
        Já tem uma conta? Clique aqui
      </button>
    </div>
  );
};

export default Signup;