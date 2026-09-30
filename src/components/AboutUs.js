import React from 'react';
import { FaArrowLeft, FaEnvelope, FaHome, FaInfoCircle, FaMapMarkerAlt, FaPhone, FaTruck } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

export default function AboutUs() {
  const history = useHistory();
  const mapUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=40.958306%2C56.989234%2C40.978306%2C57.001234&layer=mapnik&marker=56.995234%2C40.968306';
  const largerMapUrl = 'https://www.openstreetmap.org/?mlat=56.995234&mlon=40.968306#map=15/56.995234/40.968306';

  return (
    <div className="about-us">
      <button className="about-us-back-button" onClick={() => history.push('/')}><FaArrowLeft /> Back</button>
      <div className="about-us-header"><h1>About our store</h1></div>
      <p>Welcome to Style Harmony! We offer a wide range of home goods to make your home comfortable and welcoming.</p>
      <h2><FaTruck /> Delivery</h2>
      <p>Delivery usually takes 1–2 days.</p>
      <div className="contact-info">
        <h2><FaInfoCircle /> Contact information</h2>
        <p><FaPhone /> Phone: <a href="tel:+79109954567">+7 (910) 995-45-67</a></p>
        <p><FaEnvelope /> Email: <a href="mailto:styleharmony@gmail.com">styleharmony@gmail.com</a></p>
      </div>
      <div className="address-info">
        <h2><FaMapMarkerAlt /> Our address</h2>
        <p><FaHome /> 19 Pochtovaya Street, Ivanovo, 153000, Russia</p>
      </div>
      <iframe className="map-container" src={mapUrl} title="Style Harmony location" loading="lazy" />
      <a href={largerMapUrl} target="_blank" rel="noopener noreferrer">View larger map</a>
    </div>
  );
}
