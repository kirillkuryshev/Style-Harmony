import { api } from '../api';
import React, { useState, useEffect } from 'react';

export default function Checkout(props) {
  const [formData, setFormData] = useState({
    fullName: '',
    street: '',
    house: '',
    entrance: '',
    floor: '',
    apartment: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { profile: userData } = await api('/me');
        setFormData({
          fullName: userData.fullName || '',
          street: userData.street || '',
          house: userData.house || '',
          entrance: userData.entrance || '',
          floor: userData.floor || '',
          apartment: userData.apartment || '',
          phone: userData.phone || ''
        });
      } catch (error) { setSubmitError(error.message); }
    };
    fetchUserData();
  }, []);

  const handleOrderConfirmation = async () => {
    const errors = {};

    if (!formData.fullName) errors.fullName = 'Full name is required';
    if (!formData.street) errors.street = 'Street is required';
    if (!formData.house) errors.house = 'House is required';
    if (!formData.phone) errors.phone = 'Phone is required';
    if (!paymentMethod) errors.paymentMethod = 'Payment method is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      await api('/orders', { method: 'POST', body: JSON.stringify({
        items: props.orders.map(order => ({ id: order.item.id, quantity: order.quantity })),
        customerInfo: formData,
        paymentMethod,
      }) });
      props.onOrderConfirmed();
    } catch (error) {
      setSubmitError(error.message);
    }
  };

  const totalAmount = props.orders.reduce((acc, order) => acc + order.item.price * order.quantity, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div className="checkout-container">
      <button className="checkout-back-button" onClick={props.onBack}>Back</button>
      <h1>Checkout</h1>
      <div className="checkout-items">
        <h1>Your order</h1>
        {props.orders.map((order) => (
          <div key={order.item.id} className="checkout-item">
            <img className="checkout-item-img" src={"./img/" + order.item.img} alt={order.item.title} />
            <div className="checkout-item-details">
              <h2>{order.item.title}</h2>
              <p>{order.item.price} x {order.quantity}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="customer-info">
        <h2>Delivery details</h2>
        <form>
          <div className={`form-group ${formErrors.fullName ? 'error' : ''}`}>
            <label>Full name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.street ? 'error' : ''}`}>
            <label>Street</label>
            <input type="text" name="street" value={formData.street} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.house ? 'error' : ''}`}>
            <label>House</label>
            <input type="text" name="house" value={formData.house} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.entrance ? 'error' : ''}`}>
            <label>Entrance</label>
            <input type="text" name="entrance" value={formData.entrance} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.floor ? 'error' : ''}`}>
            <label>Floor</label>
            <input type="text" name="floor" value={formData.floor} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.apartment ? 'error' : ''}`}>
            <label>Apartment</label>
            <input type="text" name="apartment" value={formData.apartment} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.phone ? 'error' : ''}`}>
            <label>Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          <div className={`form-group ${formErrors.paymentMethod ? 'error' : ''}`}>
            <label>Payment method</label>
            <select name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">Select a payment method</option>
              <option value="Card on delivery">Card on delivery</option>
              <option value="Cash on delivery">Cash on delivery</option>
            </select>
          </div>
          {Object.keys(formErrors).length > 0 && (
            <p className="form-error">Please fill in the required fields</p>
          )}
        </form>
      </div>
      <div className="checkout-summary">
        <h2>Total: {totalAmount} RUB</h2>
        {submitError && <p role="alert">{submitError}</p>}
        <button className="checkout-confirm-button" onClick={handleOrderConfirmation}>Place order</button>
      </div>
    </div>
  );
}
