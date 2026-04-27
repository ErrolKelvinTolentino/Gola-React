import { Link } from 'react-router-dom';
import { useState } from 'react';
import AuthLayout from '../components/auth/AuthLayout';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

function LoginPage({ onLogin, theme = 'light' }) {
  const isDark = theme === 'dark';
  const labelColor = isDark ? '#e2e8f0' : '#0f172a';
  const mutedColor = isDark ? '#cbd5e1' : '#64748b';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)';
  const inputBorder = isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(15, 23, 42, 0.14)';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [isLoginPressed, setIsLoginPressed] = useState(false);

  const inputStyle = (field) => ({
    minHeight: '46px',
    borderRadius: '14px',
    border: focusedField === field ? '1px solid #7c3aed' : inputBorder,
    padding: '10px 12px',
    fontSize: '0.92rem',
    color: labelColor,
    background: inputBg,
    boxShadow:
      focusedField === field
        ? '0 0 0 3px rgba(124, 58, 237, 0.15), 0 6px 14px rgba(15, 23, 42, 0.08)'
        : '0 2px 6px rgba(15, 23, 42, 0.04)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
    outline: 'none'
  });

  const loginButtonStyle = {
    minHeight: '46px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    boxShadow: isLoginHovered
      ? '0 16px 30px rgba(124, 58, 237, 0.38)'
      : '0 12px 24px rgba(124, 58, 237, 0.32)',
    cursor: 'pointer',
    transform: isLoginPressed ? 'scale(0.985)' : isLoginHovered ? 'translateY(-1px)' : 'translateY(0)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.2s ease',
    filter: isLoginHovered ? 'brightness(1.04)' : 'brightness(1)'
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError('Failed to login: ' + err.message);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your goals and task rhythm."
      logoSize={88}
      logoFramed={false}
      theme={theme}
      footer={
        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.9rem', color: mutedColor }}>
          New here?{' '}
          <Link to="/register" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>
            Go to Register
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', width: '100%' }} aria-label="Login form">
        <label htmlFor="login-email" style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
          Email
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError('');
            }}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField('')}
            placeholder="you@example.com"
            required
            autoComplete="email"
            aria-label="Email"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            tabIndex={1}
            style={inputStyle('email')}
          />
        </label>

        <label htmlFor="login-password" style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
          Password
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError('');
            }}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField('')}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            aria-label="Password"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            tabIndex={2}
            style={inputStyle('password')}
          />
        </label>

        {error && (
          <p id="login-error" role="alert" aria-live="polite" style={{ margin: 0, fontSize: '0.84rem', color: '#be123c', fontWeight: 600 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          aria-label="Login"
          tabIndex={3}
          onMouseEnter={() => setIsLoginHovered(true)}
          onMouseLeave={() => {
            setIsLoginHovered(false);
            setIsLoginPressed(false);
          }}
          onMouseDown={() => setIsLoginPressed(true)}
          onMouseUp={() => setIsLoginPressed(false)}
          style={loginButtonStyle}
        >
          Login
        </button>

      </form>
    </AuthLayout>
  );
}

export default LoginPage;
