import React, { useState } from 'react';
import { Home, Target, CheckSquare, Calendar, Settings, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      
      <div className="brand" style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: isCollapsed ? '0' : '4px', height: 'auto', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={golaLogo} 
            alt="Gola logo" 
            className="brand-logo" 
            style={{ 
              width: isCollapsed ? '36px' : '52px', 
              height: isCollapsed ? '36px' : '52px', 
              minWidth: isCollapsed ? '36px' : '52px', 
              transition: 'all 0.3s ease' 
            }} 
          />
          {!isCollapsed && <strong style={{ animation: 'fadeIn 0.3s ease' }}>GOLA</strong>}
        </div>
        
        <button 
          className="ghost-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          style={{ padding: '6px', borderRadius: '8px' }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={activePage === item ? 'nav-item active' : 'nav-item'}
            onClick={() => onChangePage(item)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isCollapsed ? 'center' : 'flex-start', 
              gap: '16px', 
              padding: isCollapsed ? '12px 0' : '12px 16px',
              borderRadius: '12px'
            }}
            title={isCollapsed ? item : ''}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' }}>
              {ICON_MAP[item]}
            </div>
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap', fontWeight: 500, animation: 'fadeIn 0.3s ease' }}>{item}</span>}
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
