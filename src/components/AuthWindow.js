import React, { useState } from 'react';
import { api } from '../api';
import RegistrationWindow from './RegistrationWindow';

export default function AuthWindow({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [register, setRegister] = useState(false);

  if (register) return <RegistrationWindow onBack={() => setRegister(false)} onSuccess={onSuccess} />;

  const login = async () => {
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onSuccess();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth-window shop-cart">
      <h2>Sign in</h2>
      <div className="auth-window-inner">
        <div className="auth-input"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="auth-input"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} /></div>
        {error && <p role="alert">{error}</p>}
        <button className="auth-login-button" onClick={login}>Sign in</button>
        <div className="auth-options"><p>New here?</p><button className="auth-registration-button" onClick={() => setRegister(true)}>Create an account</button></div>
      </div>
    </div>
  );
}
