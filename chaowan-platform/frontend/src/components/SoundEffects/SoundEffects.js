// src/components/SoundEffects/SoundEffects.js
import React, { useEffect, useState } from 'react';
import { audioManager } from '../../utils/AudioManager';
import './SoundEffects.css';

const SoundEffects = ({ 
  playClick, 
  playBet, 
  playCountdown, 
  playWin, 
  playLose,
  playBackground 
}) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // 组件挂载时播放背景音乐
    if (playBackground) {
      // 延迟播放，避免浏览器自动播放限制
      setTimeout(() => {
        audioManager.playBackgroundMusic();
      }, 1000);
    }

    return () => {
      audioManager.stopBackgroundMusic();
    };
  }, [playBackground]);

  useEffect(() => {
    if (playClick) {
      audioManager.playSound('click');
    }
  }, [playClick]);

  useEffect(() => {
    if (playBet) {
      audioManager.playSound('bet');
    }
  }, [playBet]);

  useEffect(() => {
    if (playCountdown) {
      audioManager.playCountdownSequence();
    }
  }, [playCountdown]);

  useEffect(() => {
    if (playWin) {
      audioManager.playSound('win');
      setTimeout(() => {
        audioManager.playSound('fireworks');
      }, 500);
    }
  }, [playWin]);

  useEffect(() => {
    if (playLose) {
      audioManager.playSound('lose');
    }
  }, [playLose]);

  const handleToggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="sound-controls">
      <button 
        className="mute-button"
        onClick={handleToggleMute}
        title={isMuted ? '开启音效' : '关闭音效'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default SoundEffects;
