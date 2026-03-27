import golaLogo from '../../assets/gola-logo.png';

function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  logoSize = 56,
  logoFramed = true,
  brandTitle = 'GOLA',
  theme = 'light'
}) {
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          isDark
            ? 'radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.22), transparent 44%), radial-gradient(circle at 85% 10%, rgba(96, 165, 250, 0.2), transparent 42%), radial-gradient(circle at 78% 88%, rgba(244, 114, 182, 0.16), transparent 48%), linear-gradient(145deg, #141827 0%, #20253a 58%, #29223f 100%)'
            : 'radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.28), transparent 44%), radial-gradient(circle at 85% 10%, rgba(59, 130, 246, 0.24), transparent 42%), radial-gradient(circle at 78% 88%, rgba(236, 72, 153, 0.22), transparent 48%), linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)'
      }}
    >
      <div
        style={{
          width: 'min(100%, 430px)',
          borderRadius: '24px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.55)',
          background: isDark
            ? 'linear-gradient(155deg, rgba(35, 41, 63, 0.78) 0%, rgba(45, 33, 70, 0.72) 100%)'
            : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: isDark ? '0 24px 54px rgba(0, 0, 0, 0.45)' : '0 24px 54px rgba(15, 23, 42, 0.14)',
          padding: '28px 26px',
          display: 'grid',
          gap: '18px',
          animation: 'elegantScaleUp 0.34s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'grid', justifyItems: 'center', gap: '10px' }}>
          <img
            src={golaLogo}
            alt="Gola logo"
            style={{
              width: `${logoSize}px`,
              height: `${logoSize}px`,
              borderRadius: logoFramed ? '16px' : '0',
              boxShadow: logoFramed ? '0 12px 24px rgba(124, 58, 237, 0.22)' : 'none'
            }}
          />
          <strong
            style={{
              marginTop: '2px',
              fontSize: '1.25rem',
              letterSpacing: '0.12em',
              fontWeight: 800,
              color: isDark ? '#c4b5fd' : '#6d28d9'
            }}
          >
            {brandTitle}
          </strong>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '1.7rem',
                letterSpacing: '-0.02em',
                color: isDark ? '#f8fafc' : '#0f172a',
                WebkitTextFillColor: isDark ? '#f8fafc' : '#0f172a',
                background: 'none'
              }}
            >
              {title}
            </h1>
            <p style={{ margin: '6px 0 0', color: isDark ? '#a5b4c8' : '#475569', fontSize: '0.95rem', lineHeight: 1.45 }}>
              {subtitle}
            </p>
          </div>
        </div>

        {children}

        {footer}
      </div>
    </div>
  );
}

export default AuthLayout;
