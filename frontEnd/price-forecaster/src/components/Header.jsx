import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  TrendingUp, 
  Layers, 
  CloudSun, 
  ShoppingBag, 
  Lightbulb, 
  Sun, 
  Moon, 
  Leaf, 
  Radio, 
  Languages
} from 'lucide-react';

const Header = ({ 
  activeTab, 
  setActiveTab, 
  theme, 
  setTheme, 
  lang, 
  setLang, 
  backendStatus 
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'forecaster', label: 'Price Forecaster', labelSi: 'මිල පුරෝකථනය', icon: Sprout, badge: 'AI Model' },
    { id: 'compare', label: 'Crop Comparator', labelSi: 'සංසන්දනය', icon: Layers },
    { id: 'trends', label: 'Market Analytics', labelSi: 'වෙළෙඳපොළ ප්‍රවණතා', icon: TrendingUp },
    { id: 'weather', label: 'Agri-Weather Matrix', labelSi: 'කාලගුණ දත්ත', icon: CloudSun },
    { id: 'basket', label: 'Price Basket', labelSi: 'මිල ගණනය', icon: ShoppingBag },
    { id: 'insights', label: 'Market Intelligence', labelSi: 'වෙළෙඳ උපදෙස්', icon: Lightbulb }
  ];

  return (
    <header className="header-container">
      {/* Top Notification / Status Strip */}
      <div className="status-strip">
        <div className="status-item">
          <span className="live-pulse"></span>
          <span className="status-text">
            <strong>System Status:</strong> {backendStatus ? 'Backend Connected (FastAPI & Random Forest AI)' : 'Connecting to ML Service...'}
          </span>
        </div>

        <div className="status-right-group">
          <div className="status-item time-badge">
            <Radio size={13} className="text-emerald-400" />
            <span>SLST: {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <div className="status-item mongo-badge">
            <span style={{ color: '#10b981' }}>●</span>
            <span>MongoDB: Active</span>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Navigation Bar */}
      <div className="main-nav-bar">
        <div className="brand-group">
          <div className="brand-logo-icon">
            <Sprout size={28} className="text-emerald-400" />
          </div>
          <div>
            <div className="brand-title">
              AgriPrice <span className="text-emerald">Sri Lanka</span>
            </div>
            <div className="brand-subtitle">
              {lang === 'en' 
                ? 'AI-Powered Vegetable Retail Price Forecasting & Market Intelligence' 
                : 'ශ්‍රී ලංකා එළවළු සිල්ලර මිල කෘතිම බුද්ධි පුරෝකථන පද්ධතිය'}
            </div>
          </div>
        </div>

        {/* Global Controls: Language & Theme */}
        <div className="controls-group">
          {/* Language Toggle */}
          <button 
            className="ctrl-btn lang-toggle" 
            onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
            title="Switch Language / භාෂාව වෙනස් කරන්න"
          >
            <Languages size={16} />
            <span>{lang === 'en' ? 'සිංහල' : 'English'}</span>
          </button>

          {/* Theme Switcher */}
          <div className="theme-switch-group">
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Midnight Dark"
            >
              <Moon size={15} />
            </button>
            <button 
              className={`theme-btn ${theme === 'emerald' ? 'active' : ''}`}
              onClick={() => setTheme('emerald')}
              title="Forest Emerald"
            >
              <Leaf size={15} />
            </button>
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Clean Light"
            >
              <Sun size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="tab-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={17} className={isActive ? 'text-emerald' : 'text-muted'} />
              <span>{lang === 'en' ? item.label : item.labelSi}</span>
              {item.badge && <span className="tab-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <style>{`
        .header-container {
          width: 100%;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .status-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 24px;
          background: var(--bg-pill);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 12px;
          color: var(--text-secondary);
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-right-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .time-badge, .mongo-badge {
          background: var(--bg-card);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          font-family: var(--font-mono);
          font-size: 11px;
        }
        .main-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          gap: 20px;
          flex-wrap: wrap;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand-logo-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%);
          border: 1px solid rgba(52, 211, 153, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-emerald);
        }
        .brand-title {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .text-emerald {
          color: var(--text-accent);
        }
        .brand-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .controls-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ctrl-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          color: var(--text-primary);
          border: 1px solid var(--border-card);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ctrl-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--emerald-500);
          color: var(--emerald-400);
        }
        .theme-switch-group {
          display: flex;
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 3px;
          gap: 2px;
        }
        .theme-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .theme-btn:hover {
          color: var(--text-primary);
        }
        .theme-btn.active {
          background: var(--emerald-500);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
        .tab-nav-container {
          display: flex;
          gap: 6px;
          padding: 0 24px 10px 24px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tab-nav-container::-webkit-scrollbar {
          display: none;
        }
        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: var(--font-main);
        }
        .nav-tab-btn:hover {
          background: var(--bg-pill);
          color: var(--text-primary);
        }
        .nav-tab-btn.active {
          background: var(--bg-pill-active);
          border-color: var(--border-glow);
          color: var(--text-accent);
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
        }
        .tab-badge {
          font-size: 10px;
          background: var(--bg-pill-active);
          color: var(--text-accent);
          border: 1px solid var(--border-glow);
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        /* Light Theme Precision Overrides */
        [data-theme="light"] .header-container {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }
        [data-theme="light"] .status-strip {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
        }
        [data-theme="light"] .time-badge,
        [data-theme="light"] .mongo-badge {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        [data-theme="light"] .brand-logo-icon {
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%);
          border: 1px solid rgba(5, 150, 105, 0.25);
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.15);
        }
        [data-theme="light"] .ctrl-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        [data-theme="light"] .ctrl-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        [data-theme="light"] .theme-switch-group {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .theme-btn {
          color: #64748b;
        }
        [data-theme="light"] .theme-btn:hover {
          color: #0f172a;
          background: #ffffff;
        }
        [data-theme="light"] .theme-btn.active {
          background: #059669;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35);
        }
        [data-theme="light"] .nav-tab-btn {
          color: #475569;
        }
        [data-theme="light"] .nav-tab-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        [data-theme="light"] .nav-tab-btn.active {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          box-shadow: 0 1px 3px rgba(5, 150, 105, 0.08);
        }
        [data-theme="light"] .tab-badge {
          background: rgba(5, 150, 105, 0.12);
          color: #047857;
          border: 1px solid rgba(5, 150, 105, 0.25);
        }
      `}</style>
    </header>
  );
};

export default Header;
