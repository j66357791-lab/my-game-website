// frontend/src/components/MysteryCard/CountdownTimer.js
import React, { useEffect, useState } from 'react';

const CountdownTimer = ({ timeRemaining }) => {
  const [time, setTime] = useState(timeRemaining);

  useEffect(() => {
    setTime(timeRemaining);
  }, [timeRemaining]);

  return (
    <div className="countdown-timer">
      <span>剩余时间: {time}秒</span>
    </div>
  );
};

export default CountdownTimer;
