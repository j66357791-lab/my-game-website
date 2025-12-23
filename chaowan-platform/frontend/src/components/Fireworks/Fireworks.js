import React from 'react';
import './Fireworks.css';

const Fireworks = ({ trigger, position }) => {
  if (!trigger) return null;

  return (
    <div 
      className="fireworks-container"
      style={{ left: position.x, top: position.y }}
    >
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className="firework-particle"
          style={{
            '--delay': `${i * 0.1}s`,
            '--angle': `${i * 45}deg`,
            '--color': `hsl(${i * 45}, 70%, 60%)`
          }}
        />
      ))}
    </div>
  );
};

export default Fireworks;
