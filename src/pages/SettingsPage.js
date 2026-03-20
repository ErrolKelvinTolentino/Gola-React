import React from 'react';

function SettingsPage({ theme, setTheme, settings, toggleSetting }) {
  
  const settingMeta = {
    notifications: {
      title: 'Global Push Notifications',
      desc: 'Receive browser-level alerts when tasks are due or goals expire.'
    },
    focusMode: {
      title: 'Zen / Focus Layout',
      desc: 'Hides peripheral metrics and sidebars to enforce deep, distraction-free concentration.'
    },
    compactCalendar: {
      title: 'Compact Heatmap Mode',
      desc: 'Compresses the global calendar grid into minimalist heat-dots instead of rendering textual task labels.'
    }
  };

  return (
    <section className="page page-enter">
      <div className="section-head" style={{ marginBottom: '24px' }}>
        <h1>Configuration</h1>
        <p className="lead" style={{ margin: 0 }}>Tune your system layouts and execution workflows.</p>
      </div>

      <div className="card settings-list premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Theme Preference</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>Override default OS colors with the bespoke night aurora palette.</p>
          </div>
          <button
            type="button"
            className={theme === 'dark' ? 'toggle on' : 'toggle'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
          >
            <span />
          </button>
        </div>

        {Object.entries(settings).map(([key, value], idx) => {
          const meta = settingMeta[key] || { title: key, desc: 'Customize this variable.' };
          
          return (
            <div 
              key={key} 
              className="setting-row" 
              style={{ 
                padding: '24px 32px', 
                borderBottom: idx === Object.keys(settings).length - 1 ? 'none' : '1px solid var(--line)' 
              }}
            >
              <div>
                <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>{meta.title}</strong>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>{meta.desc}</p>
              </div>
              <button
                type="button"
                className={value ? 'toggle on' : 'toggle'}
                onClick={() => toggleSetting(key)}
                aria-pressed={value}
              >
                <span />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  );
}

export default SettingsPage;
