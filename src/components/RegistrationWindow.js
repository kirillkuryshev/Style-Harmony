import React, { useState } from 'react';
import { api } from '../api';

export default function RegistrationWindow({ onBack, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const register = async () => {
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      onSuccess();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth-window shop-cart">
      <h2>Create an account</h2>
      <div className="auth-input"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="auth-input"><label>Password (at least 8 characters)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert">{error}</p>}
      <button className="registration-registration-button" onClick={register}>Create account</button>
      <button className="registration-login-button" onClick={onBack}>Back</button>
    </div>
  );
}
