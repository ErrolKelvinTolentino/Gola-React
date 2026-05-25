import React from 'react';
import { CheckSquare, Target, Timer, CalendarDays, BarChart3, Settings } from 'lucide-react';

const ICONS = {
  Today: CheckSquare,
  Goals: Target,
  Focus: Timer,
  Calendar: CalendarDays,
  Review: BarChart3,
  Settings: Settings
};

function MobileBottomNav({ activePage, setActivePage }) {
  const items = ['Today', 'Goals', 'Focus', 'Calendar', 'Review', 'Settings'];

  return (
    <nav className="mobile-bottom-nav">
      {items.map((page) => {
        const Icon = ICONS[page] || Settings;
        return (
          <button
            key={page}
            type="button"
            className={activePage === page ? 'active' : ''}
            onClick={() => setActivePage(page)}
          >
            <Icon />
            <span>{page}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
