import React from 'react';
import { useHistory } from 'react-router-dom';
import { api } from '../api';

export default function UserProfile({ email, onLogout }) {
  const history = useHistory();
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    onLogout();
  };
  return (
    <div className="user-profile">
      <div className="user-profile-content">
        <h2>My account</h2>
        <p>Email: {email}</p>
        <button onClick={() => history.push('/user-data')}>Profile</button>
        <button onClick={() => history.push('/order-history')}>Order history</button>
        <button onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
