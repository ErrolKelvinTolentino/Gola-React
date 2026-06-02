import React, { useState } from 'react';
import { Target, CheckSquare, Timer, BarChart3, Settings, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import golaLogo from '../../assets/gola-logo.png';

const ICON_MAP = {
  Today: <CheckSquare size={22} />,
  Goals: <Target size={22} />,
  Focus: <Timer size={22} />,
  Calendar: <Calendar size={22} />,
  Review: <BarChart3 size={22} />,
  Settings: <Settings size={22} />
};

function Sidebar({ navItems, activePage, onChangePage }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleNavClick = (item) => {
    onChangePage(item);
    setIsMobileNavOpen(false);
  };

  // Separate Settings to pin at bottom
  const mainNavItems = navItems.filter(item => item !== 'Settings');
  const hasSettings = navItems.includes('Settings');

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      {/* ── Brand row ─────────────────────────────────────────── */}
      <div 
        className="brand" 
        style={{ 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '16px 8px' : '16px 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={golaLogo}
            alt="Gola logo"
            className="brand-logo"
            style={{ width: '32px', height: '50px', flexShrink: 0 }}
          />
          {!isCollapsed && <strong className="brand-name">GOLA</strong>}
        </div>

        <button
          type="button"
          className="ghost-btn sidebar-collapse-btn"
          onClick={() => setIsCollapsed(prev => !prev)}
          style={{ 
            padding: '6px', 
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '0',
            minHeight: '0',
            width: '32px',
            height: '32px'
          }}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Mobile hamburger — hidden on desktop via CSS */}
        <button
          type="button"
          className="ghost-btn mobile-nav-toggle"
          onClick={() => setIsMobileNavOpen(prev => !prev)}
          aria-expanded={isMobileNavOpen}
          aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'}
          style={{ padding: '7px 10px', borderRadius: '10px', display: 'none' }}
        >
          <span className={`hamburger-icon ${isMobileNavOpen ? 'open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* ── Nav drawer ────────────────────────────────────────── */}
      <div 
        className={`mobile-nav-drawer ${isMobileNavOpen ? 'mobile-nav-open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 80px)'
        }}
      >
        <nav style={{ flex: 1 }}>
          {mainNavItems.map((item) => (
            <button
              key={item}
              type="button"
              className={activePage === item ? 'nav-item active' : 'nav-item'}
              onClick={() => handleNavClick(item)}
              title={isCollapsed ? item : undefined}
              aria-current={activePage === item ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: isCollapsed ? '12px 0' : '12px 16px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: '10px',
                marginBottom: '2px'
              }}
            >
              <div className="nav-icon" style={{ flexShrink: 0 }}>
                {ICON_MAP[item] || <Target size={22} />}
              </div>
              {!isCollapsed && <span className="nav-label">{item}</span>}
            </button>
          ))}
        </nav>

        {/* Settings pinned to bottom */}
        {hasSettings && (
          <div style={{ 
            paddingTop: '12px', 
            borderTop: '1px solid var(--line)',
            marginTop: 'auto'
          }}>
            <button
              type="button"
              className={activePage === 'Settings' ? 'nav-item active' : 'nav-item'}
              onClick={() => handleNavClick('Settings')}
              title={isCollapsed ? 'Settings' : undefined}
              aria-current={activePage === 'Settings' ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: isCollapsed ? '12px 0' : '12px 16px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: '10px'
              }}
            >
              <div className="nav-icon" style={{ flexShrink: 0 }}>
                <Settings size={22} />
              </div>
              {!isCollapsed && <span className="nav-label">Settings</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;