import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Flame } from 'lucide-react';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getScoreColor(score) {
  if (score <= 30) return '#ef4444';
  if (score <= 60) return '#f59e0b';
  if (score <= 80) return '#10b981';
  return '#8b5cf6';
}

function TodayScore({
  score = 0,
  completionRate = 0,
  focusMinutes = 0,
  streak = 0,
  weeklyScores = []
}) {
  const radius = 52;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (score / 100) * circumference;
  const [animatedOffset, setAnimatedOffset] = useState(targetOffset);

  const color = getScoreColor(score);
  const isElite = score > 80;

  // Trigger arc animation on score updates smoothly
  useEffect(() => {
    setAnimatedOffset(targetOffset);
  }, [targetOffset]);

  // Weekly sparkline
  const maxBarHeight = 32;
  const scores = weeklyScores.length > 0
    ? weeklyScores.slice(-7)
    : Array.from({ length: 7 }, () => ({ date: '', score: 0 }));
  // Pad to 7 if needed
  while (scores.length < 7) {
    scores.unshift({ date: '', score: 0 });
  }

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{
      padding: '24px',
      background: 'var(--panel-strong)',
      border: '1px solid var(--line)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    }}>

      {/* === Circular Score Display === */}
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        ...(isElite ? { filter: `drop-shadow(0 0 18px ${color}50)` } : {})
      }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--line)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated progress arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset !== null ? animatedOffset : circumference}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: isElite ? `drop-shadow(0 0 6px ${color}90)` : 'none'
            }}
          />
        </svg>

        {/* Center label */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            lineHeight: 1,
            color: color,
            fontVariantNumeric: 'tabular-nums'
          }}>
            {score}
          </span>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--muted)',
            marginTop: '4px'
          }}>
            Today
          </span>
        </div>
      </div>

      {/* === Breakdown Pills === */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <span style={pillStyle}>
          <CheckCircle2 size={14} color="var(--good)" style={{ flexShrink: 0 }} />
          Tasks: {completionRate}%
        </span>
        <span style={pillStyle}>
          <Clock size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
          Focus: {focusMinutes}m
        </span>
        <span style={pillStyle}>
          <Flame size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          Streak: {streak}d
        </span>
      </div>

      {/* === Score Formula Breakdown === */}
      <div style={{
        fontSize: '0.68rem',
        color: 'var(--muted)',
        textAlign: 'center',
        padding: '6px 12px',
        background: 'var(--input-bg, rgba(255, 255, 255, 0.5))',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        marginTop: '-8px',
        width: '100%',
        maxWidth: '280px',
        lineHeight: 1.4
      }}>
        Score breakdown: {Math.round(completionRate * 0.6)} pts (Tasks) + {Math.round(Math.min(100, Math.round((focusMinutes / 60) * 100)) * 0.25)} pts (Focus) + {Math.max(0, score - Math.round(completionRate * 0.6) - Math.round(Math.min(100, Math.round((focusMinutes / 60) * 100)) * 0.25))} pts (Streak)
      </div>

      {/* === Weekly Sparkline === */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '6px',
        width: '100%',
        justifyContent: 'center',
        paddingTop: '4px'
      }}>
        {scores.map((day, i) => {
          const isToday = i === scores.length - 1;
          const barHeight = Math.max(4, (day.score / 100) * maxBarHeight);

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: `${barHeight}px`,
                  borderRadius: '4px',
                  background: isToday ? color : 'var(--muted)',
                  opacity: isToday ? 1 : 0.35,
                  transition: 'height 0.6s ease, background 0.3s ease'
                }}
              />
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                color: isToday ? color : 'var(--muted)',
                opacity: isToday ? 1 : 0.5
              }}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TodayScore;
