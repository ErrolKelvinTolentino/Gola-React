import React from 'react';
import { useTimer } from '../context/TimerContext';
import { Play, Pause, Timer } from 'lucide-react';

function GlobalTimerWidget({ activePage, setActivePage }) {
  const { timeLeft, isActive, toggleTimer, mode, workDur, shortDur, longDur } = useTimer();

  // If the user is physically on the focus page, hide the widget because the huge timer takes precedence
  if (activePage === 'Focus') return null;

  const total = mode === 'work' ? workDur * 60 : (mode === 'shortBreak' ? shortDur * 60 : longDur * 60);
  const isStarted = timeLeft < total || isActive;

  if (!isStarted) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '32px', 
        left: '290px', 
        zIndex: 100, 
        background: 'var(--panel-strong)', 
        border: `2px solid ${mode === 'work' ? 'var(--accent)' : 'var(--good)'}`, 
        padding: '12px 20px', 
        borderRadius: '99px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        animation: 'floatUpFade 0.4s ease forwards',
        cursor: 'pointer'
      }}
      onClick={(e) => {
        // Stop click from traveling if user clicks toggle specifically
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
           setActivePage('Focus');
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: mode === 'work' ? 'var(--accent)' : 'var(--good)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem' }}>
        <Timer size={18} /> {timeStr}
      </div>
      <button onClick={(e) => { e.stopPropagation(); toggleTimer(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex' }}>
        {isActive ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}

export default GlobalTimerWidget;
