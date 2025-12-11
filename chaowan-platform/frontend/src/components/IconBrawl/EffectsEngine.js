// frontend/src/components/IconBrawl/EffectsEngine.js
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import './EffectsEngine.css';

const EffectsEngine = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const audioRef = useRef({});

  useImperativeHandle(ref, () => ({
    playCardReveal: (index, icon) => {
      const slot = document.querySelector(`.icon-slot[data-index="${index}"]`);
      if (slot) {
        slot.classList.add('revealing');
        setTimeout(() => {
          slot.classList.remove('revealing');
          slot.classList.add('revealed');
        }, 600);
      }
    },

    showCurrencyAnimation: (amount) => {
      const currency = document.createElement('div');
      currency.className = `currency-animation ${amount > 0 ? 'gain' : 'loss'}`;
      currency.textContent = `${amount > 0 ? '+' : ''}${amount}`;
      document.body.appendChild(currency);
      
      setTimeout(() => currency.remove(), 2000);
    },

    showToast: (message, type = 'info') => {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 100);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    playSound: (type) => {
      const audio = new Audio();
      switch (type) {
        case 'countdown-warning':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
          break;
        case 'win':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
          break;
        case 'lose':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
          break;
        default:
          return;
      }
      audio.play().catch(() => {});
    },

    createParticles: (type, x, y) => {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}`;
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
      }
    }
  }));

  return <div ref={containerRef} className="effects-container" />;
});

export default EffectsEngine;
