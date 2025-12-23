// frontend/src/components/IconBrawl/ThemeSelector.js
import React from 'react';
import './ThemeSelector.css';

const ThemeSelector = ({ currentTheme, onChange }) => {
  const themes = [
    { id: 'classic', name: '经典', icon: '🎨' },
    { id: 'dark', name: '暗黑', icon: '🌙' },
    { id: 'ocean', name: '海洋', icon: '🌊' }
  ];

  return (
    <div className="theme-selector">
      {themes.map(theme => (
        <button
          key={theme.id}
          className={`theme-btn ${currentTheme === theme.id ? 'active' : ''}`}
          onClick={() => onChange(theme.id)}
          title={theme.name}
        >
          {theme.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
