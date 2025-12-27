// src/utils/AudioManager.js - 音频管理器
class AudioManager {
  constructor() {
    this.sounds = {};
    this.backgroundMusic = null;
    this.isMuted = false;
    this.initAudio();
  }

  initAudio() {
    // 预加载所有音效
    this.loadSounds();
  }

  loadSounds() {
    const soundFiles = {
      // 背景音乐
      bgMusic: '/sounds/background-music.mp3',
      
      // 点击音效
      click: '/sounds/click.mp3',
      bet: '/sounds/bet.mp3',
      
      // 倒计时音效
      countdown: '/sounds/countdown.mp3',
      
      // 游戏音效
      raceStart: '/sounds/race-start.mp3',
      racing: '/sounds/racing.mp3',
      
      // 结果音效
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      fireworks: '/sounds/fireworks.mp3'
    };

    // 预加载音频文件
    Object.keys(soundFiles).forEach(key => {
      const audio = new Audio(soundFiles[key]);
      audio.preload = 'auto';
      this.sounds[key] = audio;
    });

    // 设置背景音乐循环
    if (this.sounds.bgMusic) {
      this.sounds.bgMusic.loop = true;
      this.sounds.bgMusic.volume = 0.3;
    }
  }

  // 播放音效
  playSound(soundName, options = {}) {
    if (this.isMuted) return;
    
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`音效 ${soundName} 不存在`);
      return;
    }

    try {
      sound.currentTime = 0;
      sound.volume = options.volume || 1;
      
      // 处理自动播放策略
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('音频播放被阻止:', error);
          // 可以在这里显示用户交互提示
        });
      }
    } catch (error) {
      console.error('播放音效失败:', error);
    }
  }

  // 播放背景音乐
  playBackgroundMusic() {
    if (this.isMuted) return;
    
    this.playSound('bgMusic');
  }

  // 停止背景音乐
  stopBackgroundMusic() {
    if (this.sounds.bgMusic) {
      this.sounds.bgMusic.pause();
      this.sounds.bgMusic.currentTime = 0;
    }
  }

  // 静音切换
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stopAllSounds();
    }
    
    return this.isMuted;
  }

  // 停止所有音效
  stopAllSounds() {
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  // 播放倒计时音效序列
  playCountdownSequence(callback) {
    let count = 3;
    const countdownInterval = setInterval(() => {
      this.playSound('countdown', { volume: 0.8 });
      count--;
      
      if (count <= 0) {
        clearInterval(countdownInterval);
        this.playSound('raceStart');
        callback && callback();
      }
    }, 1000);
  }
}

// 创建全局实例
export const audioManager = new AudioManager();
export default audioManager;
