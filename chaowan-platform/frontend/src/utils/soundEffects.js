// src/utils/soundEffects.js - 修复版（使用base64短音效）
// 使用极短的base64编码音效，无需外部请求

// 创建极短的音频blob（嘟嘟声）
const createBeepSound = (frequency = 800, duration = 0.1) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// 音效映射
export const playSound = (soundName) => {
  // 防止在非用户交互时播放（浏览器限制）
  try {
    switch(soundName) {
      case 'click':
        // 高频率短嘟嘟声
        createBeepSound(1000, 0.05);
        break;
      case 'focus':
        // 中频率中等嘟嘟声
        createBeepSound(600, 0.08);
        break;
      case 'success':
        // 上升音调
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case 'switch':
        // 两个短音
        createBeepSound(400, 0.05);
        setTimeout(() => createBeepSound(600, 0.05), 80);
        break;
      case 'error':
        // 低音
        createBeepSound(300, 0.15);
        break;
      default:
        createBeepSound(800, 0.1);
    }
  } catch (error) {
    console.log('音效播放被阻止（需用户交互后触发）');
  }
};

// 为元素添加音效
export const addSoundToElement = (element, soundName, eventType = 'click') => {
  if (!element) return;
  
  const handler = () => {
    // 确保有用户交互后播放
    playSound(soundName);
    
    // 添加CSS类触发动画
    if (eventType === 'click') {
      element.classList.add('click-sound');
      setTimeout(() => element.classList.remove('click-sound'), 400);
    } else if (eventType === 'focus') {
      element.classList.add('focus-sound');
      setTimeout(() => element.classList.remove('focus-sound'), 300);
    }
  };
  
  element.addEventListener(eventType, handler);
  
  // 返回清理函数
  return () => element.removeEventListener(eventType, handler);
};