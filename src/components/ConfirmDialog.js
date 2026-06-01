import React, { useEffect, useCallback } from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  animation: 'confirmDialogFadeIn 0.25s ease',
};

const cardStyle = {
  background: 'var(--panel-strong)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid var(--line)',
  borderRadius: 24,
  padding: '32px 30px 24px',
  minWidth: 360,
  maxWidth: 440,
  width: '90vw',
  boxShadow: 'var(--shadow)',
  animation: 'confirmDialogScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: 800,
  color: 'var(--text)',
  margin: 0,
  marginBottom: 10,
  letterSpacing: '-0.02em',
};

const messageStyle = {
  fontSize: '0.88rem',
  lineHeight: 1.6,
  color: 'var(--muted)',
  margin: 0,
  marginBottom: 28,
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
};

const VARIANT_CONFIRM_STYLES = {
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)',
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 8px 16px rgba(245, 158, 11, 0.25)',
  },
  default: {
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: 'var(--btn-shadow)',
  },
};

const keyframesCSS = `
@keyframes confirmDialogFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes confirmDialogScaleIn {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
`;

const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  const confirmBtnStyle = {
    ...VARIANT_CONFIRM_STYLES[variant] || VARIANT_CONFIRM_STYLES.default,
  };

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={overlayStyle} onClick={handleOverlayClick}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>{title}</h2>
          {message && <p style={messageStyle}>{message}</p>}
          <div style={actionsStyle}>
            <button className="ghost-btn" onClick={onCancel} type="button">
              {cancelLabel}
            </button>
            <button
              className="primary-btn"
              style={confirmBtnStyle}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
