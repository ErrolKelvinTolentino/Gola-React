import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const keyframesCSS = `
@keyframes rateLimitToastSlideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(24px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes rateLimitToastSlideOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(24px); }
}
@keyframes rateLimitProgressShrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;

const toastStyle = {
  position: 'fixed',
  bottom: 32,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(239, 68, 68, 0.95)', // Red alert theme
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  color: '#fff',
  borderRadius: '16px',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  fontSize: 14,
  fontWeight: 600,
  boxShadow: '0 12px 40px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(255,255,255,0.1)',
  zIndex: 10001,
  overflow: 'hidden',
  maxWidth: '90vw',
  width: 420,
  animation: 'rateLimitToastSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
};

const toastExitStyle = {
  ...toastStyle,
  animation: 'rateLimitToastSlideOut 0.25s ease forwards',
};

const dismissBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.8)',
  cursor: 'pointer',
  padding: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const progressBarContainerStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  background: 'rgba(255,255,255,0.2)',
  overflow: 'hidden',
};

const RateLimitToast = ({
  message = 'AI Rate Limit Exceeded',
  duration = 8000,
  onDismiss,
}) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 250);
    return () => clearTimeout(exitTimer);
  }, [exiting, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
  };

  const progressBarStyle = {
    height: '100%',
    background: '#fff',
    animation: `rateLimitProgressShrink ${duration}ms linear forwards`,
  };

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={exiting ? toastExitStyle : toastStyle}>
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.86rem', lineHeight: 1.4 }}>{message}</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            Offline mode fallback activated automatically
          </span>
        </div>
        <button style={dismissBtnStyle} onClick={handleDismiss}>
          <X size={16} />
        </button>
        <div style={progressBarContainerStyle}>
          <div style={progressBarStyle} />
        </div>
      </div>
    </>
  );
};

export default RateLimitToast;
