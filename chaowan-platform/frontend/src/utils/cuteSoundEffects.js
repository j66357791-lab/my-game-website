// src/utils/cuteSoundEffects.js - 完整可爱音效系统

class CuteSoundEffects {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.hasUserInteracted = false;
    this.initUserInteraction();
  }
  
  // 初始化用户交互检测
  initUserInteraction() {
    const initSound = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        this.initialize();
      }
    };
    
    ['click', 'touchstart', 'keydown', 'mousedown'].forEach(event => {
      document.addEventListener(event, initSound, { once: true });
    });
  }
  
  // 初始化音频上下文
  initialize() {
    if (this.isInitialized || !window.AudioContext) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
      console.log('🎵 可爱音效系统已初始化');
    } catch (error) {
      console.log('无法初始化音效系统:', error);
    }
  }
  
  // 播放音效的通用方法
  playSound(frequency, duration, type = 'sine', volume = 0.2) {
    if (!this.isInitialized || !this.audioContext) {
      this.tryFallbackSound();
      return;
    }
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      // 可爱音效特性：轻柔的包络
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
      
    } catch (error) {
      console.log('播放音效失败:', error);
    }
  }
  
  // 备选方案：使用简单的声音
  tryFallbackSound() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      oscillator.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch (error) {
      // 静默失败
    }
  }
  
  // ===== 具体音效方法 =====
  
  // 1. 按钮点击音效（可爱的"噗"声）
  playButtonClick() {
    this.playSound(800, 0.1, 'sine', 0.15);
  }
  
  // 2. 成功音效（欢快的铃声）
  playSuccess() {
    this.playSound(1046.5, 0.2, 'sine', 0.18); // C6
    setTimeout(() => {
      this.playSound(1318.5, 0.3, 'sine', 0.15); // E6
    }, 150);
  }
  
  // 3. 错误音效（可爱的下滑音）
  playError() {
    this.playSound(600, 0.3, 'sine', 0.15);
    setTimeout(() => {
      this.playSound(400, 0.2, 'sine', 0.1);
    }, 100);
  }
  
  // 4. 切换音效（俏皮的"叮咚"）
  playSwitch() {
    this.playSound(523.25, 0.15, 'sine', 0.15); // C5
    setTimeout(() => {
      this.playSound(659.25, 0.2, 'sine', 0.12); // E5
    }, 120);
  }
  
  // 5. 聚焦音效（轻柔的"叮"）
  playFocus() {
    this.playSound(784, 0.08, 'sine', 0.1);
  }
  
  // 6. 弹出音效（泡泡声）
  playPopup() {
    this.playSound(392, 0.25, 'sine', 0.12);
    setTimeout(() => {
      this.playSound(523.25, 0.15, 'sine', 0.08);
    }, 50);
  }
  
  // 7. 获得奖励音效（开心的上升音阶）
  playReward() {
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5, D5, E5, F5, G5
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playSound(note, 0.1, 'sine', 0.1);
      }, index * 80);
    });
  }
}

// 创建单例实例
const cuteSounds = new CuteSoundEffects();

// 导出方法
export const playSound = (soundName) => {
  if (!cuteSounds.hasUserInteracted) {
    cuteSounds.initUserInteraction();
    return;
  }
  
  switch(soundName) {
    case 'click':
      cuteSounds.playButtonClick();
      break;
    case 'success':
      cuteSounds.playSuccess();
      break;
    case 'error':
      cuteSounds.playError();
      break;
    case 'switch':
      cuteSounds.playSwitch();
      break;
    case 'focus':
      cuteSounds.playFocus();
      break;
    case 'popup':
      cuteSounds.playPopup();
      break;
    case 'reward':
      cuteSounds.playReward();
      break;
    default:
      cuteSounds.playButtonClick();
  }
};

// 为元素添加音效的便捷方法
export const addSoundToElement = (element, soundName, eventType = 'click') => {
  if (!element) return;
  
  const handler = () => {
    playSound(soundName);
    
    // 添加视觉反馈类
    if (eventType === 'click') {
      element.classList.add('sound-feedback-click');
      setTimeout(() => element.classList.remove('sound-feedback-click'), 300);
    } else if (eventType === 'focus') {
      element.classList.add('sound-feedback-focus');
      setTimeout(() => element.classList.remove('sound-feedback-focus'), 200);
    }
  };
  
  element.addEventListener(eventType, handler);
  
  return () => element.removeEventListener(eventType, handler);
};