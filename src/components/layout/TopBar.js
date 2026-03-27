import { useEffect, useRef, useState } from 'react';

function initialsFromName(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function TopBar({ date, activePage, user, onOpenProfile, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <small>Workspace</small>
        <h2>{activePage}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="top-bar-date">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setOpen((value) => !value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'var(--panel)',
              minHeight: '38px'
            }}
            aria-expanded={open}
            aria-label="Open profile menu"
          >
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))'
              }}
            >
              {initialsFromName(user?.name)}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{user?.name || 'Profile'}</span>
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '210px',
                borderRadius: '14px',
                border: '1px solid var(--line)',
                background: 'var(--panel-strong)',
                boxShadow: '0 16px 30px rgba(15, 23, 42, 0.15)',
                padding: '8px',
                display: 'grid',
                gap: '6px',
                zIndex: 30,
                animation: 'elegantFadeIn 0.16s ease'
              }}
            >
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setOpen(false);
                  onOpenProfile?.();
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
              >
                Profile
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings?.();
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
              >
                Settings
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
                style={{ justifyContent: 'flex-start', padding: '8px 10px', color: '#e11d48' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
