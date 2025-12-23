// frontend/src/components/IconBrawl/IconSlot.js
import React from 'react';
import './IconSlot.css';

const IconSlot = ({ index, icon, game, result, onReveal }) => {
  const getIconDisplay = () => {
    // 🔧 如果icon为null，显示问号；否则显示图标
    if (icon === null || icon === undefined) {
      return '?';
    }
    return icon;
  };

  const iconMap = {
    'heart': '❤️',
    'burger': '🍔',
    'chest': '🎁',
    'cola': '🥤',
    'car': '🚗',
    'fridge': '🧊'
  };

  // 🔧 判断是否为问号状态
  const isQuestionMark = icon === null || icon === undefined;

  return (
    <div 
      className={`icon-slot ${isQuestionMark ? 'question-mark' : 'revealed'}`}
      data-index={index}
    >
      <div className="icon-content">
        {iconMap[getIconDisplay()] || getIconDisplay()}
      </div>
    </div>
  );
};

export default IconSlot;
