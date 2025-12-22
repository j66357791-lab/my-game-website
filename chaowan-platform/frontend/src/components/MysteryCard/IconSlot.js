// frontend/src/components/MysteryCard/IconSlot.js
import React from 'react';

const IconSlot = ({ value, position }) => {
  return (
    <div className={`icon-slot ${position || ''}`}>
      {value ? (
        <div className="card-value">{value}</div>
      ) : (
        <div className="card-back">?</div>
      )}
    </div>
  );
};

export default IconSlot;
