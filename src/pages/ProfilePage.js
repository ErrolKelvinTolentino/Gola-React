import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function ProfilePage({ user, theme = 'light', onSaveProfile, onLogout }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const isDark = theme === 'dark';
  const pageText = isDark ? '#e2e8f0' : '#0f172a';
  const mutedText = isDark ? '#a5b4c8' : '#64748b';
  const cardBg = isDark ? 'rgba(24, 24, 27, 0.78)' : 'rgba(255,255,255,0.78)';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15, 23, 42, 0.08)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)';
  const inputBorder = isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(15,23,42,0.16)';

  const handleSave = () => {
    onSaveProfile({ name: name.trim(), email: email.trim(), password });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const cardStyle = {
    border: cardBorder,
    borderRadius: '20px',
    background: cardBg,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: isDark ? '0 20px 34px rgba(0, 0, 0, 0.45)' : '0 16px 30px rgba(15, 23, 42, 0.12)',
    padding: '20px',
    display: 'grid',
    gap: '14px',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease'
  };

  return (
    <section
      style={{
        minHeight: '100vh',
        padding: '28px',
        color: pageText,
        background:
          isDark
            ? 'radial-gradient(circle at 14% 18%, rgba(167, 139, 250, 0.2), transparent 42%), radial-gradient(circle at 88% 12%, rgba(96, 165, 250, 0.2), transparent 44%), radial-gradient(circle at 74% 88%, rgba(244, 114, 182, 0.14), transparent 50%), linear-gradient(145deg, #09090b 0%, #18181b 100%)'
            : 'radial-gradient(circle at 14% 18%, rgba(139, 92, 246, 0.2), transparent 42%), radial-gradient(circle at 88% 12%, rgba(59, 130, 246, 0.22), transparent 44%), radial-gradient(circle at 74% 88%, rgba(236, 72, 153, 0.18), transparent 50%), linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)'
      }}
    >
      <div style={{ width: 'min(1080px, 100%)', margin: '0 auto', display: 'grid', gap: '20px', animation: 'elegantFadeIn 0.35s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate('/app')}
            style={{ background: cardBg, color: pageText, borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined }}
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={onLogout}
            style={{ color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.24)', background: cardBg }}
          >
            Logout
          </button>
        </div>

        <div
          style={{
            ...cardStyle,
            gridTemplateColumns: 'auto 1fr',
            alignItems: 'center',
            gap: '18px',
            background: isDark
              ? 'linear-gradient(140deg, rgba(39, 39, 42, 0.82) 0%, rgba(45, 27, 65, 0.6) 100%)'
              : 'linear-gradient(140deg, rgba(255,255,255,0.84) 0%, rgba(243, 232, 255, 0.78) 100%)'
          }}
        >
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '999px',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.35rem',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              boxShadow: '0 12px 24px rgba(124, 58, 237, 0.36)'
            }}
          >
            {getInitials(name || user?.name)}
          </div>

          <div style={{ display: 'grid', gap: '4px' }}>
            <h1
              style={{
                margin: 0,
                color: pageText,
                WebkitTextFillColor: pageText,
                background: 'none',
                fontSize: '1.8rem',
                letterSpacing: '-0.02em'
              }}
            >
              {name || user?.name}
            </h1>
            <p style={{ margin: 0, color: mutedText, fontSize: '0.95rem' }}>{email || user?.email}</p>
            <span style={{ fontSize: '0.82rem', color: mutedText }}>Manage your account and productivity preferences</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: '1.12rem', color: pageText }}>Account Info</h2>

            <label style={{ display: 'grid', gap: '6px', fontSize: '0.86rem', fontWeight: 600, color: pageText }}>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{ minHeight: '42px', borderRadius: '12px', border: inputBorder, color: pageText, padding: '9px 12px', background: inputBg }}
              />
            </label>

            <label style={{ display: 'grid', gap: '6px', fontSize: '0.86rem', fontWeight: 600, color: pageText }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ minHeight: '42px', borderRadius: '12px', border: inputBorder, color: pageText, padding: '9px 12px', background: inputBg }}
              />
            </label>

            <label style={{ display: 'grid', gap: '6px', fontSize: '0.86rem', fontWeight: 600, color: pageText }}>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Optional"
                style={{ minHeight: '42px', borderRadius: '12px', border: inputBorder, color: pageText, padding: '9px 12px', background: inputBg }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '6px' }}>
              <button type="button" className="primary-btn" onClick={handleSave} style={{ minWidth: '140px' }}>
                Save Changes
              </button>
              {saved && <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.84rem' }}>Saved</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', color: pageText }}>App Info</h3>
              <p style={{ margin: 0, color: mutedText, fontSize: '0.9rem' }}>
                Gola — AI Goal Management
              </p>
              <p style={{ margin: 0, color: mutedText, fontSize: '0.82rem' }}>
                Version 2.0 • Powered by Groq AI
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
