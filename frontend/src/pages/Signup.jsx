import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Login.css"; // Reuse Login.css

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !phone) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'Signup successful!');
        navigate('/login'); // Redirect to login page
      } else {
        setError(data.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (value) => {
    // Remove all non-numeric characters
    let cleaned = value.replace(/\D/g, "");

    // Limit to 11 digits
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11);
    }

    // Apply formatting (31) 9 9999-9999
    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 3) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
  };

  const handleChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };


  return (
    <div className="login-container"> {/* Reuse login-container */}
      <h2>Sign Up</h2>
      {error && <p className="error-message">{error}</p>}
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
            onChange={handleChange}
            placeholder="(31) 9 9999-9999"
            required
          />
        </div>
        
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>

      <button className="signup-button" onClick={() => navigate('/login')}>
        Already have an account? Login
      </button>
    </div>
  );
};

export default Signup;
