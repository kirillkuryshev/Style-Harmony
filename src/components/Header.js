import React, { useEffect, useState } from 'react';
import { FaShoppingCart } from "react-icons/fa";
import { useHistory } from 'react-router-dom';
import { api } from '../api';
import Order from './Order';
import AuthWindow from './AuthWindow';
import UserProfile from './UserProfile';

const Header = (props) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [showAuthWindow, setShowAuthWindow] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [user, setUser] = useState(null);
  const history = useHistory();
  useEffect(() => { api('/me').then(setUser).catch(() => setUser(null)); }, []);
  
  const toggleAuthWindow = () => {
    setShowAuthWindow(!showAuthWindow);
    if (!showAuthWindow) {
      setShowUserProfile(false);
    }
  };

  const toggleUserProfile = () => {
    setShowUserProfile(!showUserProfile);
    if (!showUserProfile) {
      setShowAuthWindow(false);
    }
  };

  const handleCheckout = () => {
    if (user) {
      props.onCheckout();
    } else {
      toggleAuthWindow();
    }
  };

  const showOrders = (props) => {
    let summa = 0;
    props.orders.forEach(order => summa += Number.parseFloat(order.item.price) * order.quantity);
    return (
      <div>
        {props.orders.map(order => (
          <Order 
            onDelete={props.onDelete} 
            key={order.item.id} 
            item={order.item} 
            quantity={order.quantity}
          />
        ))}
        <p className='summa'>Total: {new Intl.NumberFormat('en-US').format(summa)} RUB</p>
        {user ? (
          <button className='checkout-button' onClick={handleCheckout}>Checkout</button>
        ) : (
          <p>Sign in to place an order</p>
        )}
      </div>
    );
  };

  const showNothing = () => {
    return (
      <div className='empty'>
        <h2>Your cart is empty</h2>
      </div>
    );
  };

  const goToAboutPage = () => {
    history.push('/about');
  };

  return (
    <header className='header-container'>
      <div className="header-top">
        <span className='logo'>Style Harmony</span>
        <div className="nav-container">
          <FaShoppingCart 
            onClick={() => setCartOpen(!cartOpen)} 
            className={`shop-cart-button ${cartOpen ? 'active' : ''}`}
            style={{ color: cartOpen ? '#c9302c' : '#fff' }} 
          />
          <ul className='nav'>
            <li onClick={goToAboutPage}>About</li>
            <li onClick={() => user ? toggleUserProfile() : toggleAuthWindow()}>Account</li>
          </ul>
        </div>
      </div>

      <div className='presentation'></div>

      {cartOpen && (
        <div className='shop-cart'> 

          {props.orders.length > 0 ? showOrders(props) : showNothing()}

        </div>
      )}

      {showAuthWindow && <AuthWindow onSuccess={() => { api('/me').then(setUser); setShowAuthWindow(false); }} />}
      
      {showUserProfile && user && <UserProfile email={user.email} onLogout={() => { setUser(null); setShowUserProfile(false); }} />}
    </header>
  );
};

export default Header;
