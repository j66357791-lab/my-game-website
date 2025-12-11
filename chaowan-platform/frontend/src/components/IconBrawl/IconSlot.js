// frontend/src/components/IconBrawl/IconSlot.js
import React from 'react';
import './IconSlot.css';

const IconSlot = ({ index, icon, game, result, onReveal }) => {
  const getIconDisplay = () => {
    if (icon) {
      return icon;
    }
    return '?';
  };

  const iconMap = {
    'heart': '❤️',
    'burger': '🍔',
    'chest': '🎁',
    'cola': '🥤',
    'car': '🚗',
    'fridge': '🧊'
  };

  return (
    <div 
      className="icon-slot" 
      data-index={index}
    >
      <div className="icon-content">
        {iconMap[getIconDisplay()] || getIconDisplay()}
      </div>
    </div>
  );
};

export default IconSlot;
