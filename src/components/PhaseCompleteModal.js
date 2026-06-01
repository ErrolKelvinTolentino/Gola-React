import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Award, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { playSuccessSound } from '../utils/audio';

export default function PhaseCompleteModal({
  isOpen,
  onClose,
  goalName,
  completedPhase,
  nextPhase,
  theme = 'light'
}) {
  // Play sound on reveal
  useEffect(() => {
    if (isOpen) {
      playSuccessSound();
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !completedPhase) return null;

  const isDark = theme === 'dark';
  const isFinalPhase = !nextPhase;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modal = (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        animation: 'phaseBackdropIn 0.25s ease forwards',
      }}
    >
      <style>{`
        @keyframes phaseBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes phaseCardIn {
          from { opacity: 0; transform: scale(0.9) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          padding: '48px 32px 36px',
          background: isDark ? 'rgba(22,24,38,0.97)' : '#ffffff',
          borderRadius: 24,
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: isDark
            ? '0 32px 64px -12px rgba(0,0,0,0.7)'
            : '0 32px 64px -12px rgba(0,0,0,0.18)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
          animation: 'phaseCardIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        {/* Award badge floating above card */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '-80px',
          marginBottom: '16px',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isFinalPhase
              ? 'linear-gradient(135deg, #f59e0b, #ec4899)'
              : `linear-gradient(135deg, #8b5cf6, ${completedPhase.color || '#ec4899'})`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            transform: 'rotate(-5deg)',
          }}>
            <Award size={30} color="#fff" />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.65rem',
          fontWeight: 800,
          margin: '0 0 6px',
          color: isDark ? '#f1f5f9' : '#0f172a',
          letterSpacing: '-0.02em',
        }}>
          {isFinalPhase ? '🏆 Goal Accomplished!' : '🎉 Phase Complete!'}
        </h2>
        <p style={{
          fontSize: '0.82rem',
          color: isDark ? '#94a3b8' : '#64748b',
          fontWeight: 600,
          margin: '0 0 28px',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {goalName}
        </p>

        {/* Completed phase card */}
        <div style={{
          background: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.22)',
          borderRadius: 16,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
            <CheckCircle2 size={15} color="#10b981" />
            <strong style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981' }}>
              Completed: {completedPhase.label || 'Phase'}
            </strong>
          </div>
          {completedPhase.description && (
            <p style={{ fontSize: '0.87rem', color: isDark ? '#cbd5e1' : '#334155', margin: 0, lineHeight: 1.55 }}>
              {completedPhase.description}
            </p>
          )}
        </div>

        {/* Transition arrow */}
        {!isFinalPhase && nextPhase && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
            }}>
              <ArrowRight size={13} color={isDark ? '#94a3b8' : '#64748b'} />
            </div>
            <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
          </div>
        )}

        {/* Next phase card  OR  final celebration */}
        {!isFinalPhase && nextPhase ? (
          <div style={{
            background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
            border: '1px dashed rgba(139,92,246,0.4)',
            borderRadius: 16,
            padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
              <Sparkles size={15} color="#8b5cf6" />
              <strong style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6' }}>
                Up Next: {nextPhase.label || 'Next Phase'}
              </strong>
            </div>
            {nextPhase.description && (
              <p style={{ fontSize: '0.87rem', color: isDark ? '#cbd5e1' : '#334155', margin: 0, lineHeight: 1.55 }}>
                {nextPhase.description}
              </p>
            )}
          </div>
        ) : (
          isFinalPhase && (
            <div style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 16,
              padding: '14px 18px',
            }}>
              <strong style={{ fontSize: '0.9rem', color: '#d97706', display: 'block', marginBottom: 6 }}>
                You've completed every phase! 🌟
              </strong>
              <p style={{ fontSize: '0.87rem', color: isDark ? '#cbd5e1' : '#334155', margin: 0, lineHeight: 1.55 }}>
                Outstanding work. You've reached the final milestone of your roadmap.
                Celebrate your growth, and when ready, set your sights on your next vision!
              </p>
            </div>
          )
        )}

        {/* CTA button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 28,
            padding: '14px 0',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 14,
            cursor: 'pointer',
            border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 20px -4px rgba(139,92,246,0.45)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(139,92,246,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(139,92,246,0.45)'; }}
        >
          {isFinalPhase ? '🎉 Celebrate & Close' : "Let's Proceed! →"}
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
