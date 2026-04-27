import React from 'react';
import { Download, User, Sparkles, Cpu } from 'lucide-react';
import { isGeminiAvailable } from '../services/geminiService';

function SettingsPage({ theme, setTheme, aiEnabled, setAiEnabled, exportData, onOpenProfile }) {
  const geminiAvailable = isGeminiAvailable();

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

        {/* AI Features Toggle */}
        <div className="setting-row" style={{ padding: '24px 32px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '1.1rem' }}>AI Features</strong>
              {geminiAvailable ? (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  Connected
                </span>
              ) : (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  No API Key
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Enable Gemini-powered morning briefings, domain-specific goal planning, and weekly review insights.
              {!geminiAvailable && (
                <span style={{ display: 'block', marginTop: '6px', fontSize: '0.82rem', color: '#f59e0b' }}>
                  Set <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem' }}>REACT_APP_GEMINI_API_KEY</code> in your .env file to enable AI features.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className={aiEnabled ? 'toggle on' : 'toggle'}
            onClick={() => setAiEnabled(!aiEnabled)}
            aria-pressed={aiEnabled}
            disabled={!geminiAvailable}
            style={{ opacity: geminiAvailable ? 1 : 0.5 }}
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
