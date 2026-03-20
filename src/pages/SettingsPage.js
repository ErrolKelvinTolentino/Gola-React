function SettingsPage({ theme, setTheme, settings, toggleSetting }) {
  return (
    <section className="page page-enter">
      <h1>Settings</h1>
      <p className="lead">Tune your visual mode and productivity preferences.</p>

      <div className="card settings-list premium-surface">
        <label className="setting-row">
          <div>
            <strong>Dark mode</strong>
            <p>Switch between soft daylight and mesmerizing night aurora.</p>
          </div>
          <button
            type="button"
            className={theme === 'dark' ? 'toggle on' : 'toggle'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
          >
            <span />
          </button>
        </label>

        {Object.entries(settings).map(([key, value]) => (
          <label key={key} className="setting-row">
            <div>
              <strong>{key.replace(/([A-Z])/g, ' $1')}</strong>
              <p>Customize this setting for your daily flow.</p>
            </div>
            <button
              type="button"
              className={value ? 'toggle on' : 'toggle'}
              onClick={() => toggleSetting(key)}
              aria-pressed={value}
            >
              <span />
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}

export default SettingsPage;
