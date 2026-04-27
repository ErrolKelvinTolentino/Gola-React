import { Link } from 'react-router-dom';
import { useState } from 'react';
import AuthLayout from '../components/auth/AuthLayout';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

function RegisterPage({ onRegister, theme = 'light' }) {
  const isDark = theme === 'dark';
  const labelColor = isDark ? '#e2e8f0' : '#0f172a';
  const mutedColor = isDark ? '#cbd5e1' : '#64748b';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)';
  const inputBorder = isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(15, 23, 42, 0.14)';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name.trim() });
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: name.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'users', user.uid, 'app', 'state'), {
        goals: [],
        focusSessions: [],
        streak: 0,
        lastActiveDate: null,
        theme: 'light',
        aiEnabled: true,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start building your focus system with Gola."
      logoSize={88}
      logoFramed={false}
      theme={theme}
      footer={
        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.9rem', color: mutedColor }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
        <label style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            required
            style={{ minHeight: '44px', borderRadius: '12px', border: inputBorder, color: labelColor, padding: '10px 12px', fontSize: '0.92rem', background: inputBg }}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            style={{ minHeight: '44px', borderRadius: '12px', border: inputBorder, color: labelColor, padding: '10px 12px', fontSize: '0.92rem', background: inputBg }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <label style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create password"
              required
              style={{ minHeight: '44px', borderRadius: '12px', border: inputBorder, color: labelColor, padding: '10px 12px', fontSize: '0.92rem', background: inputBg }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px', color: labelColor, fontSize: '0.88rem', fontWeight: 600 }}>
            Confirm
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm"
              required
              style={{ minHeight: '44px', borderRadius: '12px', border: inputBorder, color: labelColor, padding: '10px 12px', fontSize: '0.92rem', background: inputBg }}
            />
          </label>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#be123c', fontWeight: 600 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-btn"
          style={{
            minHeight: '44px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
            boxShadow: '0 12px 24px rgba(124, 58, 237, 0.32)',
            cursor: 'pointer'
          }}
        >
          Register
        </button>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
