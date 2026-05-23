import React from 'react';

function parseTimeEstimate(value) {
  if (!value) return 30;
  if (value === '15m') return 15;
  if (value === '30m') return 30;
  if (value === '1h') return 60;
  if (value === '2h+') return 120;
  const asNumber = Number.parseInt(value, 10);
  return Number.isFinite(asNumber) ? asNumber : 30;
}

function CapacityWarning({ tasks, userCapacity = 240 }) {
  const totalMinutes = (tasks || []).reduce((sum, task) => sum + parseTimeEstimate(task.timeEstimate), 0);
  if (totalMinutes <= userCapacity) return null;
  const overBy = totalMinutes - userCapacity;

  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        borderRadius: '14px',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        background: 'rgba(239, 68, 68, 0.08)',
        color: '#ef4444',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <span>⚠️ Over capacity by {overBy} min</span>
    </div>
  );
}

export default CapacityWarning;
