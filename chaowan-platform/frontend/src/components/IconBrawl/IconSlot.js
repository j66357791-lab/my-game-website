// frontend/src/components/IconBrawl/IconSlot.js
import React from 'react';
import './IconSlot.css';

const IconSlot = ({ index, game, result, onReveal }) => {
  const getIconDisplay = () => {
    if (game?.status === 'revealing' && game.result_icons?.[index]) {
      return game.result_icons[index];
    }
    if (game?.status === 'finished' && result?.result_icons?.[index]) {
      return result.result_icons[index];
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
