import React from 'react';
import { FaTrashAlt } from 'react-icons/fa';

export default function Order(props) {
  return (
    <div className="item">
      <img src={"./img/" + props.item.img} alt={props.item.title} />
      <div>
        <h2>{props.item.title}</h2>
        <p>{props.item.price} x {props.quantity}</p>
      </div>
      <FaTrashAlt className="delete-icon" onClick={() => props.onDelete(props.item.id)} />
    </div>
  );
}
