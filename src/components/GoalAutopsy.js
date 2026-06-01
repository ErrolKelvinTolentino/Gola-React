import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Calendar, TrendingDown, X, CheckCircle2 } from 'lucide-react';

const OPTIONS = [
  { id: 1, label: 'Life got busy — I want to resume', Icon: Calendar },
  { id: 2, label: 'I lost motivation', Icon: TrendingDown },
  { id: 3, label: "This goal doesn't matter anymore", Icon: X },
  { id: 4, label: 'I achieved it informally', Icon: CheckCircle2 },
];

function GoalAutopsy({ isOpen, goal, daysSinceActivity, onArchive, onRecommit, onDismiss }) {
  const [selectedOption, setSelectedOption] = useState(null);

  // Reset selection when opening for a different goal
  useEffect(() => {
    if (isOpen) setSelectedOption(null);
  }, [isOpen, goal?.id]);

  // Close on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !goal) return null;

  // Staleness bar: 14 days = 0%, 30+ days = 100%
  const staleRatio = Math.min(Math.max((daysSinceActivity - 14) / (30 - 14), 0), 1);
  const staleColor = staleRatio < 0.5
    ? `rgba(245, 158, 11, ${0.7 + staleRatio * 0.3})`   // amber zone
    : `rgba(239, 68, 68, ${0.5 + staleRatio * 0.5})`;    // red zone

  const isRecommit = selectedOption === 1 || selectedOption === 2;
  const isArchive  = selectedOption === 3 || selectedOption === 4;

  const handleAction = () => {
    if (isRecommit) onRecommit?.(goal.id);
    else if (isArchive) onArchive?.(goal.id);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        padding: '20px',
        animation: 'fadeIn 0.25s ease forwards',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      <div
        className="modal-card"
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg)',
          border: 'var(--glass-border)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.25)',
          color: 'var(--text)',
          animation: 'popScale 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          opacity: 0,
          transform: 'scale(0.95) translateY(10px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b, #f59e0baa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
          }}>
            <Zap size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.3,
            }}>
              Goal Check: &ldquo;{goal.name}&rdquo;
            </h3>
          </div>
        </div>

        {/* ── Context ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}>
            It&rsquo;s been <strong style={{ color: staleColor, fontWeight: 700 }}>{daysSinceActivity} days</strong> since
            you last worked on this goal.
          </p>

          {/* Staleness progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '99px',
            background: 'var(--line)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: 'inherit',
              width: `${Math.max(staleRatio * 100, 4)}%`,
              background: `linear-gradient(90deg, #f59e0b, ${staleRatio > 0.5 ? '#ef4444' : '#f59e0b'})`,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--muted)',
            marginTop: '-6px',
          }}>
            <span>14d</span>
            <span>30d+</span>
          </div>
        </div>

        {/* ── Options ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            marginBottom: '2px',
          }}>
            What happened?
          </span>

          {OPTIONS.map(({ id, label, Icon }) => {
            const isActive = selectedOption === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedOption(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: isActive
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--line)',
                  background: isActive
                    ? 'rgba(124, 58, 237, 0.06)'
                    : 'var(--panel)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive
                    ? '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    : 'none',
                  transform: isActive ? 'translateX(3px)' : 'translateX(0)',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
              >
                {/* Radio indicator */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isActive
                    ? '2px solid var(--accent)'
                    : '2px solid var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  {isActive && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                    }} />
                  )}
                </div>
                <Icon
                  size={18}
                  color={isActive ? 'var(--accent)' : 'var(--muted)'}
                  style={{ flexShrink: 0, transition: 'color 0.2s ease' }}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Actions ────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={onDismiss}
            style={{
              fontSize: '0.88rem',
              padding: '10px 18px',
              color: 'var(--muted)',
              fontWeight: 600,
            }}
          >
            Remind me later
          </button>

          {selectedOption && (
            <button
              type="button"
              onClick={handleAction}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '12px 22px',
                fontFamily: 'inherit',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px',
                minWidth: '44px',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                animation: 'floatUpFade 0.3s ease forwards',
                opacity: 0,
                ...(isRecommit
                  ? {
                      background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                      color: '#ffffff',
                      boxShadow: 'var(--btn-shadow)',
                    }
                  : {
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                      color: '#ffffff',
                      boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.4)',
                    }),
              }}
            >
              {isRecommit ? (
                <>
                  <Zap size={16} />
                  Recommit
                </>
              ) : (
                <>
                  <X size={16} />
                  Archive Goal
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoalAutopsy;
