import React, { useState } from 'react';
import { Home, Target, CheckSquare, Calendar, Settings, Timer, ChevronLeft } from 'lucide-react';
import golaLogo from '../../assets/gola-logo.png';

const ICON_MAP = {
  Home: <Home size={22} />,
  Goals: <Target size={22} />,
  Tasks: <CheckSquare size={22} />,
  Focus: <Timer size={22} />,
  Calendar: <Calendar size={22} />,
  Settings: <Settings size={22} />
};

function Sidebar({ navItems, activePage, onChangePage }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleToggleSidebar = () => setIsCollapsed((prev) => !prev);

  // Mobile-only: whether the nav drawer is visible
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const handleToggleMobileNav = () => setIsMobileNavOpen((prev) => !prev);

  // Close mobile nav after selecting a page
  const handleNavClick = (item) => {
    onChangePage(item);
    setIsMobileNavOpen(false);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* ── Brand row ─────────────────────────────────────────── */}
      <div className="brand" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={golaLogo}
            alt="Gola logo"
            className="brand-logo"
          />
          <strong className="brand-name">GOLA</strong>
        </div>

        {/* Desktop collapse chevron */}
        <button
          type="button"
          className="ghost-btn sidebar-collapse-btn"
          onClick={handleToggleSidebar}
          style={{ padding: '6px', borderRadius: '8px' }}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-expanded={!isCollapsed}
          aria-label="Toggle Sidebar"
        >
          <ChevronLeft
            size={20}
            style={{
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </button>

        {/* Mobile hamburger — hidden on desktop via CSS */}
        <button
          type="button"
          className="ghost-btn mobile-nav-toggle"
          onClick={handleToggleMobileNav}
          aria-expanded={isMobileNavOpen}
          aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'}
          style={{ padding: '7px 10px', borderRadius: '10px' }}
        >
          <span className={`hamburger-icon ${isMobileNavOpen ? 'open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* ── Nav drawer — always visible on desktop, toggleable on mobile ── */}
      <div className={`mobile-nav-drawer ${isMobileNavOpen ? 'mobile-nav-open' : ''}`}>
        <nav>
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={activePage === item ? 'nav-item active' : 'nav-item'}
              onClick={() => handleNavClick(item)}
              data-tooltip={item}
              aria-current={activePage === item ? 'page' : undefined}
            >
              <div className="nav-icon">{ICON_MAP[item]}</div>
              <span className="nav-label">{item}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
