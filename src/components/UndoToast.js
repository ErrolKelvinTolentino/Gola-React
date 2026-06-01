import React, { useEffect, useState } from 'react';

const keyframesCSS = `
@keyframes undoToastSlideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(24px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes undoToastSlideOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(24px); }
}
@keyframes undoProgressShrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;

const toastStyle = {
  position: 'fixed',
  bottom: 32,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(15,23,42,0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  color: '#fff',
  borderRadius: 999,
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  fontSize: 14,
  fontWeight: 500,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
  zIndex: 10000,
  overflow: 'hidden',
  minWidth: 220,
  animation: 'undoToastSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
};

const toastExitStyle = {
  ...toastStyle,
  animation: 'undoToastSlideOut 0.25s ease forwards',
};

const undoBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
};

const progressBarContainerStyle = {
  position: 'absolute',
  bottom: 0,
  left: 16,
  right: 16,
  height: 2,
  borderRadius: 1,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
};

const UndoToast = ({
  message = 'Action completed',
  onUndo,
  duration = 4000,
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

  const handleUndo = () => {
    if (onUndo) onUndo();
    setExiting(true);
  };

  const progressBarStyle = {
    height: '100%',
    background: 'var(--accent, #6366f1)',
    borderRadius: 1,
    animation: `undoProgressShrink ${duration}ms linear forwards`,
  };

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={exiting ? toastExitStyle : toastStyle}>
        <span style={{ flex: 1 }}>{message}</span>
        {onUndo && (
          <button style={undoBtnStyle} onClick={handleUndo}>
            Undo
          </button>
        )}
        <div style={progressBarContainerStyle}>
          <div style={progressBarStyle} />
        </div>
      </div>
    </>
  );
};

export default UndoToast;
