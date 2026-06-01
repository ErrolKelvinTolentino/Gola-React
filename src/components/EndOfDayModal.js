import React, { useState, useEffect, useCallback } from 'react';

const MOODS = [
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Great' },
  { emoji: '🤩', label: 'Amazing' },
];

const MAX_REFLECTION_LENGTH = 280;

function getScoreColor(score) {
  if (score <= 30) return 'var(--danger, #ef4444)';
  if (score <= 60) return 'var(--warn, #f59e0b)';
  if (score <= 80) return 'var(--good, #22c55e)';
  return 'var(--accent, #a78bfa)';
}

function getMoodRingColor(moodIndex) {
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#38bdf8', '#a78bfa'];
  return colors[moodIndex] || 'var(--accent)';
}

export default function EndOfDayModal({
  isOpen,
  onClose,
  onSave,
  todayScore = 0,
  tasksCompleted = 0,
  totalTasks = 0,
  focusMinutes = 0,
  streak = 0,
  theme = 'light',
}) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [reflectionText, setReflectionText] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMood(null);
      setReflectionText('');
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

  if (!isOpen) return null;

  const handleSave = () => {
    if (selectedMood === null) return;
    onSave({ mood: selectedMood, reflection: reflectionText.trim() });
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const scoreColor = getScoreColor(todayScore);

  const taskPercent = totalTasks ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
  const focusTarget = 60;
  const focusPercent = Math.min(100, Math.round((focusMinutes / focusTarget) * 100));

  const tasksContribution = Math.round(taskPercent * 0.6);
  const focusContribution = Math.round(focusPercent * 0.25);
  const streakContribution = Math.max(0, todayScore - tasksContribution - focusContribution);

  return (
    <div
      className={`modal-backdrop ${theme === 'dark' ? 'theme-dark' : ''}`}
      onClick={handleOverlayClick}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 16px',
          padding: '32px 28px',
          background: 'var(--panel-strong)',
          borderRadius: 24,
          border: 'var(--glass-border)',
          boxShadow: 'var(--shadow)',
          animation: 'eodCardEntry 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🎯 Day Complete</h2>
          <div style={{ ...styles.score, color: scoreColor }}>{todayScore}</div>
          <span style={styles.scoreLabel}>Today's Score</span>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <span style={styles.stat}>
            Tasks: {tasksCompleted}/{totalTasks}
          </span>
          <span style={styles.statDot}>•</span>
          <span style={styles.stat}>Focus: {focusMinutes}m</span>
          <span style={styles.statDot}>•</span>
          <span style={styles.stat}>
            Streak: {streak} day{streak !== 1 ? 's' : ''} 🔥
          </span>
        </div>

        {/* Score Breakdown Indicator */}
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--muted, #8a8e9f)',
          textAlign: 'center',
          padding: '8px 12px',
          background: 'var(--input-bg, rgba(0,0,0,0.02))',
          border: '1px solid var(--line, rgba(0,0,50,0.05))',
          borderRadius: '12px',
          marginTop: '-4px',
          marginBottom: 16,
          lineHeight: 1.4
        }}>
          Score breakdown: {tasksContribution} pts (Tasks) + {focusContribution} pts (Focus) + {streakContribution} pts (Streak)
        </div>

        {/* Mood Selector */}
        <div style={styles.section}>
          <label style={styles.label}>How did today feel?</label>
          <div style={styles.moodRow}>
            {MOODS.map((mood, index) => {
              const moodValue = index + 1;
              const isSelected = selectedMood === moodValue;
              return (
                <button
                  key={moodValue}
                  onClick={() => setSelectedMood(moodValue)}
                  style={{
                    ...styles.moodButton,
                    transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${getMoodRingColor(index)}`
                      : 'none',
                    background: isSelected
                      ? 'var(--input-border, rgba(0,0,0,0.12))'
                      : 'var(--input-bg, rgba(0,0,0,0.04))',
                    border: '1px solid var(--line)',
                  }}
                  title={mood.label}
                  aria-label={mood.label}
                >
                  <span style={styles.moodEmoji}>{mood.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reflection Input */}
        <div style={styles.section}>
          <label style={styles.label}>Quick reflection (optional)</label>
          <textarea
            value={reflectionText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_REFLECTION_LENGTH) {
                setReflectionText(e.target.value);
              }
            }}
            placeholder="What went well? What could improve?"
            style={styles.textarea}
            rows={3}
            maxLength={MAX_REFLECTION_LENGTH}
          />
          <div style={styles.charCounter}>
            {reflectionText.length}/{MAX_REFLECTION_LENGTH}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={selectedMood === null}
            style={{
              ...styles.saveButton,
              opacity: selectedMood === null ? 0.4 : 1,
              cursor: selectedMood === null ? 'not-allowed' : 'pointer',
            }}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text, #1a1c29)',
    margin: '0 0 12px 0',
    letterSpacing: '-0.01em',
  },
  score: {
    fontSize: 56,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    margin: '0 0 4px 0',
  },
  scoreLabel: {
    fontSize: 13,
    color: 'var(--muted, #8a8e9f)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    padding: '14px 0',
    marginBottom: 8,
    borderTop: '1px solid var(--line, rgba(0,0,50,0.08))',
    borderBottom: '1px solid var(--line, rgba(0,0,50,0.08))',
  },
  stat: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text, #1a1c29)',
  },
  statDot: {
    fontSize: 13,
    color: 'var(--muted, #8a8e9f)',
  },
  section: {
    marginTop: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--muted, #8a8e9f)',
    marginBottom: 10,
    letterSpacing: '0.01em',
  },
  moodRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
    outline: 'none',
    padding: 0,
  },
  moodEmoji: {
    fontSize: 24,
    lineHeight: 1,
  },
  textarea: {
    width: '100%',
    background: 'var(--input-bg, rgba(255,255,255,0.8))',
    border: '1px solid var(--input-border, rgba(0, 0, 50, 0.15))',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    color: 'var(--text, #1a1c29)',
    resize: 'none',
    outline: 'none',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    lineHeight: 1.5,
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 11,
    color: 'var(--muted, #8a8e9f)',
    marginTop: 6,
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    marginTop: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  saveButton: {
    width: '100%',
    padding: '14px 0',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 14,
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em',
  },
};

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'eod-modal-keyframes';
  if (!document.getElementById(styleId)) {
    const sheet = document.createElement('style');
    sheet.id = styleId;
    sheet.textContent = `
      @keyframes eodOverlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes eodCardEntry {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(12px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(sheet);
  }
}
