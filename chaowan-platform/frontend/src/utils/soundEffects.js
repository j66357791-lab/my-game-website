// src/utils/soundEffects.js - 可爱嘟嘟音效库

// 预加载音效
const soundEffects = {
  // 按钮点击音效 - 可爱的泡泡声
  click: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-plastic-bubble-click-1124.mp3'),
  
  // 输入框聚焦音效 - 轻柔的嘟嘟声
  focus: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3'),
  
  // 成功音效 - 欢快的嘟嘟声
  success: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'),
  
  // 切换音效 - 有趣的嘟嘟声
  switch: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3'),
  
  // 错误音效 - 低沉的嘟嘟声
  error: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3')
};

// 设置音效音量（调低避免刺耳）
Object.values(soundEffects).forEach(audio => {
  audio.volume = 0.25; // 降低音量到25%
  audio.preload = 'auto';
});

// 播放音效的函数
export const playSound = (soundName) => {
  if (soundEffects[soundName]) {
    try {
      // 克隆音频以避免播放冲突
      const soundClone = soundEffects[soundName].cloneNode();
      soundClone.volume = 0.25;
      soundClone.play().catch(e => {
        // 静默处理自动播放限制错误
        if (e.name !== 'NotAllowedError') {
          console.log('音效播放失败:', e);
        }
      });
    } catch (e) {
      console.log('音效播放异常:', e);
    }
  }
};

// 为元素添加音效（兼容性更好的方式）
export const addSoundToElement = (element, soundName, eventType = 'click') => {
  if (!element || !soundEffects[soundName]) return;
  
  const handler = () => {
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