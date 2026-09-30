import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useHistory } from 'react-router-dom';
import { FaArrowLeft, FaChevronDown, FaChevronUp, FaBoxOpen, FaTruck, FaBan } from 'react-icons/fa';


const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const fetchOrders = async () => {
      try { setOrders(await api('/orders')); }
      catch (e) { setError(e.message); }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const handleBackClick = () => {
    history.push('/');
  };

  const handleToggleExpand = (index) => {
    setExpandedOrderIndex(index === expandedOrderIndex ? null : index);
  };

  const getStatusIcon = (status) => {
    if (!status) return <FaBoxOpen />;
    switch (status.toLowerCase()) {
      case 'delivered':
        return <FaTruck style={{ color: 'green' }} />;
      case 'shipping':
        return <FaTruck style={{ color: 'orange' }} />;
      case 'created':
        return <FaBoxOpen style={{ color: 'orange' }} />;
      case 'cancelled':
        return <FaBan style={{ color: 'red' }} />;
      default:
        return <FaBoxOpen />;
    }
  };

  return (
    <div className="order-history-container">
      <button className="order-history-back-button" onClick={handleBackClick}>
        <FaArrowLeft /> Back
      </button>
      <h1>Order history</h1>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        orders.length > 0 ? (
          <ul className="order-list">
            {orders.map((order, index) => (
              <li key={order.id} className="order-item">
                <div className="order-header">
                  <h2>Order from {new Date(order.timestamp).toLocaleDateString('en-US')}</h2>
                  <div className="order-status-icon">{getStatusIcon(order.status)}</div>
                </div>
                <p className="order-status">Status: {order.status}</p>
                <p>Total: {order.totalAmount} RUB</p>
                <button className="order-details-button" onClick={() => handleToggleExpand(index)}>
                  {expandedOrderIndex === index ? <FaChevronUp /> : <FaChevronDown />}
                  {expandedOrderIndex === index ? 'Hide details' : 'Show details'}
                </button>
                {expandedOrderIndex === index && (
                  <div className="order-details">
                    <p>Full name: {order.customerInfo.fullName}</p>
                    <p>Phone: {order.customerInfo.phone}</p>
                    <p>Street: {order.customerInfo.street}</p>
                    <p>House: {order.customerInfo.house}</p>
                    <p>Entrance: {order.customerInfo.entrance}</p>
                    <p>Floor: {order.customerInfo.floor}</p>
                    <p>Apartment: {order.customerInfo.apartment}</p>
                  </div>
                )}
                <h3>Items:</h3>
                <ul className="order-products">
                  {order.orders.map((item, itemIndex) => (
                    <li key={itemIndex} className="order-product-item">
                      <img src={`/img/${item.item.img}`} alt={item.item.title} className="product-image" />
                      <div className="product-details">
                        <p>{item.item.title}</p>
                        <p>{item.quantity} x {item.item.price} RUB</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>You have no orders yet.</p>
        )
      )}
    </div>
  );
};

export default OrderHistory;
