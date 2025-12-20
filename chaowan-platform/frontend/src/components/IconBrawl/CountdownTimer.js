// frontend/src/components/IconBrawl/CountdownTimer.js
import React, { useEffect, useState } from 'react';
import './CountdownTimer.css';

const CountdownTimer = ({ timeLeft, gameStatus, onTimeWarning }) => {
  const [displayTime, setDisplayTime] = useState(timeLeft);

  useEffect(() => {
    setDisplayTime(timeLeft);
    
    if (timeLeft <= 10 && timeLeft > 5) {
      onTimeWarning?.('countdown-warning');
    } else if (timeLeft <= 5 && timeLeft > 0) {
      onTimeWarning?.('countdown-urgent');
    }
  }, [timeLeft, onTimeWarning]);

  const getTimeClass = () => {
    if (displayTime <= 3) return 'urgent';
    if (displayTime <= 10) return 'warning';
    return '';
  };

  return (
    <span className={`countdown-timer ${getTimeClass()}`}>
      {gameStatus === 'betting' ? `${displayTime.toFixed(1)}s` : '--'}
    </span>
  );
};

export default CountdownTimer;
