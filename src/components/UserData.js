import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { api } from '../api';

const fields = [
  ['fullName', 'Full name'], ['phone', 'Phone'], ['street', 'Street'],
  ['house', 'House'], ['entrance', 'Entrance'], ['floor', 'Floor'], ['apartment', 'Apartment'],
];

export default function UserData() {
  const history = useHistory();
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/me').then(data => setFormData(data.profile)).catch(e => setMessage(e.message));
  }, []);

  const save = async () => {
    try {
      await api('/me', { method: 'PUT', body: JSON.stringify(formData) });
      setMessage('Profile saved');
    } catch (e) { setMessage(e.message); }
  };

  return (
    <div className="user-data-container">
      <button className="user-data-back-button" onClick={() => history.push('/')}><FaArrowLeft /> Back</button>
      <h2>My profile</h2>
      {fields.map(([name, label]) => (
        <div className="form-group" key={name}>
          <label htmlFor={name}>{label}</label>
          <input id={name} type="text" value={formData[name] || ''} onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
        </div>
      ))}
      <button className="save-button" onClick={save}>Save</button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
