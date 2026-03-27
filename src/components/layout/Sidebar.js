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

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="brand" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={golaLogo} 
            alt="Gola logo" 
            className="brand-logo"
            style={{ marginBottom: '6px' }}
          />
          <strong className="brand-name">GOLA</strong>
        </div>
        
        <button 
          type="button"
          className="ghost-btn sidebar-collapse-btn" 
          onClick={handleToggleSidebar}
          style={{ padding: '6px', borderRadius: '8px', marginBottom: '6px' }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
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
      </div>

      <nav style={{ flex: 1, marginTop: '16px' }}>
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={activePage === item ? 'nav-item active' : 'nav-item'}
            onClick={() => onChangePage(item)}
            title={isCollapsed ? item : ''}
            aria-current={activePage === item ? 'page' : undefined}
          >
            <div className="nav-icon">
              {ICON_MAP[item]}
            </div>
            <span className="nav-label">{item}</span>
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }}>
         {/* Footer area is intentionally clear because collapse trigger moved to brand header */}
      </div>

    </aside>
  );
}

export default Sidebar;
