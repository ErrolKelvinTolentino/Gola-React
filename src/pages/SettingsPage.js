import React from 'react';
import { Download, Upload, User } from 'lucide-react';
import { isGroqAvailable } from '../services/groqService';
import { useTimer } from '../context/TimerContext';

function SettingsPage({ theme, setTheme, aiEnabled, setAiEnabled, exportData, importData, onOpenProfile, settings = {}, onToggleSetting }) {
  const groqAvailable = isGroqAvailable();
  const { soundEnabled, setSoundEnabled, autoStartNext, setAutoStartNext } = useTimer();

  return (
    <section className="page page-enter">
      <div className="section-head" style={{ marginBottom: '24px' }}>
        <h1>Configuration</h1>
        <p className="lead" style={{ margin: 0 }}>Tune your system layouts and execution workflows.</p>
      </div>

      <div className="card settings-list premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Theme Toggle */}
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

        {/* Compact Calendar Toggle */}
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Compact Calendar Layout</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>Use a smaller calendar cell height without textual labels on the global heatmap.</p>
          </div>
          <button
            type="button"
            className={settings.compactCalendar ? 'toggle on' : 'toggle'}
            onClick={() => onToggleSetting && onToggleSetting('compactCalendar')}
            aria-pressed={settings.compactCalendar}
          >
            <span />
          </button>
        </div>


        {/* Data Export */}
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Export Data</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Download all your goals, tasks, focus sessions, and streak data as a JSON file.
            </p>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={exportData}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 18px', fontSize: '0.88rem', fontWeight: 600 
            }}
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>

        {/* Data Import */}
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Import Data</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Restore your goals, tasks, focus sessions, and streak data from a previously exported JSON backup.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label
              className="ghost-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Upload size={16} />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && importData) {
                    importData(file);
                    alert('Data imported successfully!');
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Timer Settings */}
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Timer Preferences</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Control sound alerts and session flow.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted)' }}>Timer sounds</span>
              <button
                type="button"
                className={soundEnabled ? 'toggle on' : 'toggle'}
                onClick={() => setSoundEnabled(!soundEnabled)}
                aria-pressed={soundEnabled}
              >
                <span />
              </button>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted)' }}>Auto-start next</span>
              <button
                type="button"
                className={autoStartNext ? 'toggle on' : 'toggle'}
                onClick={() => setAutoStartNext(!autoStartNext)}
                aria-pressed={autoStartNext}
              >
                <span />
              </button>
            </label>
          </div>
        </div>

        {/* Account Link */}
        <div className="setting-row" style={{ padding: '24px 32px' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Account</strong>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Manage your profile, name, email, and password.
            </p>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={onOpenProfile}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 18px', fontSize: '0.88rem', fontWeight: 600 
            }}
          >
            <User size={16} />
            Profile
          </button>
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
