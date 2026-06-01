import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardWorkspace from './components/workspace/DashboardWorkspace';
import GlobalStyles from './styles/GlobalStyles';
import { onAuthStateChanged, signOut, updateProfile, updatePassword } from 'firebase/auth';
import { auth, db } from './firebase/config';
import { doc, setDoc } from 'firebase/firestore';

const THEME_STORAGE_KEY = 'gola.theme';
const LEGACY_THEME_STORAGE_KEY = 'gola.mock.theme';

function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(() => {
    const primary = localStorage.getItem(THEME_STORAGE_KEY);
    if (primary) return primary;

    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
      return legacy;
    }

    return 'light';
  });

  const handleSaveProfile = async ({ name, email, password }) => {
    if (!auth.currentUser) return;

    try {
      if (password) {
        await updatePassword(auth.currentUser, password);
      }
      if (name !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      const profileRef = doc(db, 'users', auth.currentUser.uid, 'app', 'state');
      await setDoc(
        profileRef,
        {
          displayName: name,
          email,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      setUser((prev) => (prev ? { ...prev, name, email } : prev));
    } catch (error) {
      console.warn('Failed to save profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/app" replace /> : <LoginPage theme={theme} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/app" replace /> : <RegisterPage theme={theme} />}
        />
        <Route
          path="/app/*"
          element={
            <PrivateRoute user={user}>
              <DashboardWorkspace user={user} theme={theme} setTheme={setTheme} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute user={user}>
              <ProfilePage user={user} theme={theme} onSaveProfile={handleSaveProfile} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
