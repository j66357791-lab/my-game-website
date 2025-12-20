// src/components/Particles.js
import React, { useEffect, useRef } from 'react';
import './Particles.css';

const Particles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    // 设置画布大小
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 粒子类
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1; // 大小在 1-4 之间
        this.speedX = Math.random() * 0.5 - 0.25; // 水平速度 -0.25 到 0.25
        this.speedY = Math.random() * 0.5 - 0.25; // 垂直速度
        this.opacity = Math.random() * 0.5 + 0.2; // 透明度 0.2-0.7
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // 如果粒子移出屏幕，从另一边重新进入
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 初始化粒子
    const init = () => {
      particles = [];
      const numberOfParticles = (canvas.width * canvas.height) / 15000; // 根据屏幕大小动态调整粒子数量
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    // 清理
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas"></canvas>;
};

export default Particles;
