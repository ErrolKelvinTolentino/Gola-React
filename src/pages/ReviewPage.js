import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Target, CheckCircle2, AlertTriangle, XCircle, 
  Clock, ChevronDown, ChevronUp, Loader2, Sparkles, History
} from 'lucide-react';
import { addDays, getDateKey, getGoalProgress, isTaskActiveOnDate, isTaskDoneForDate as isTaskDoneForDateUtil } from '../utils/dateUtils';
import { generateWeeklyReview, isGroqAvailable } from '../services/groqService';

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: AlertTriangle },
  behind: { label: 'Behind', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircle }
};

function ReviewPage({ goals, focusSessions, onAdjustGoal, updateGoal, today, aiEnabled, isTaskDoneForDate }) {
  const [aiReview, setAiReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const safeIsTaskDoneForDate = isTaskDoneForDate || isTaskDoneForDateUtil;

  // ── Calculate weekly stats ────────────────────────────────────
  const weekStats = useMemo(() => {
    const weekStart = addDays(today, -6);
    
    return goals.map(goal => {
      let tasksCompleted = 0;
      let totalTaskOccurrences = 0;

      // Check each day of the past week
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        for (const task of goal.tasks) {
          if (isTaskActiveOnDate(task, day)) {
            totalTaskOccurrences++;
            if (safeIsTaskDoneForDate(task, day)) {
              tasksCompleted++;
            }
          }
        }
      }

      const completionRate = totalTaskOccurrences > 0 
        ? Math.round((tasksCompleted / totalTaskOccurrences) * 100)
        : 0;

      const focusMinutes = (focusSessions || [])
        .filter(s => {
          if (s.goalId !== goal.id) return false;
          const sDate = new Date(`${s.date}T00:00:00`);
          return sDate >= weekStart && sDate <= today;
        })
        .reduce((sum, s) => sum + (s.duration || 0), 0);

      // Rule-based status
      let status = 'on_track';
      if (completionRate < 40) status = 'behind';
      else if (completionRate < 70) status = 'at_risk';

      return {
        goalId: goal.id,
        name: goal.name,
        totalTasks: goal.tasks.length,
        tasksCompleted,
        totalTaskOccurrences,
        completionRate,
        focusMinutes,
        status
      };
    });
  }, [goals, today, focusSessions, safeIsTaskDoneForDate]);

  const previousWeekStats = useMemo(() => {
    const weekStart = addDays(today, -13);
    const weekEnd = addDays(today, -7);

    return goals.map(goal => {
      let tasksCompleted = 0;
      let totalTaskOccurrences = 0;

      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        for (const task of goal.tasks) {
          if (isTaskActiveOnDate(task, day)) {
            totalTaskOccurrences++;
            if (safeIsTaskDoneForDate(task, day)) {
              tasksCompleted++;
            }
          }
        }
      }

      const completionRate = totalTaskOccurrences > 0
        ? Math.round((tasksCompleted / totalTaskOccurrences) * 100)
        : 0;

      return {
        goalId: goal.id,
        completionRate
      };
    });
  }, [goals, today, safeIsTaskDoneForDate]);

  const totalCompletedThisWeek = weekStats.reduce((sum, g) => sum + g.tasksCompleted, 0);
  const totalOccurrencesThisWeek = weekStats.reduce((sum, g) => sum + g.totalTaskOccurrences, 0);
  const goalsWithTasks = weekStats.filter(g => g.totalTaskOccurrences > 0);
  const goalsWithTasksCount = goalsWithTasks.length;
  const weekStatsSignature = useMemo(() => JSON.stringify(weekStats), [weekStats]);

  const currentWeekCompletionRate = totalOccurrencesThisWeek > 0
    ? Math.round((totalCompletedThisWeek / totalOccurrencesThisWeek) * 100)
    : 0;
  const previousWeekCompletionRate = useMemo(() => {
    const totalCompleted = previousWeekStats.reduce((sum, g) => sum + g.completionRate, 0);
    const totalGoals = previousWeekStats.length || 1;
    return Math.round(totalCompleted / totalGoals);
  }, [previousWeekStats]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  const handleAdjustGoal = async (goalId, adjustmentType) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !updateGoal) return;

    if (adjustmentType === 'extend_timeline') {
      const extendedTasks = goal.tasks.map(task => ({
        ...task,
        deadline: task.deadline ? getDateKey(addDays(new Date(task.deadline), 7)) : null
      }));
      updateGoal(goalId, { tasks: extendedTasks });
    }

    if (adjustmentType === 'reduce_scope') {
      const highPriorityTasks = goal.tasks.filter(t => t.energy !== 'Low');
      updateGoal(goalId, { tasks: highPriorityTasks });
    }

    const reflection = {
      goalId,
      date: getDateKey(new Date()),
      adjustment: adjustmentType,
      completionRate: getGoalProgress(goal)
    };

    const reflections = [...(goal.weeklyReflections || []), reflection];
    updateGoal(goalId, { weeklyReflections: reflections });

    showToast(`Applied ${adjustmentType.replace('_', ' ')} to ${goal.name}`);
  };

  const WeekComparison = ({ currentWeek, previousWeek }) => {
    const improvement = currentWeek - previousWeek;
    const label = improvement >= 0 ? '📈' : '📉';
    return (
      <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
        {label} {Math.abs(improvement)}% vs last week
      </div>
    );
  };

  // ── Fetch AI review ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchReview = async () => {
      if (!aiEnabled || !isGroqAvailable() || goalsWithTasksCount === 0) {
        setAiReview(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const result = await generateWeeklyReview(weekStats);
        if (!cancelled) {
          setAiReview(result);
        }
      } catch (error) {
        console.warn('AI weekly review failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReview();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiEnabled, goalsWithTasksCount, weekStatsSignature]);

  const weekRangeLabel = `${addDays(today, -6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Get AI insight for a specific goal
  const getGoalInsight = (goalId) => {
    if (!aiReview?.goalInsights) return null;
    return aiReview.goalInsights.find(gi => gi.goalId === goalId);
  };

  return (
    <section className="page page-enter">
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <BarChart3 size={24} color="var(--accent)" />
          <h1 style={{ marginBottom: 0 }}>Weekly Review</h1>
        </div>
        <p className="lead" style={{ margin: 0 }}>
          {weekRangeLabel} — Reflect on your progress and adjust your plan.
        </p>
      </div>

      {/* ── Top stat ─────────────────────────────────────────── */}
      <div className="card premium-surface" style={{
        padding: '24px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
        color: '#fff',
        border: 'none'
      }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.8)' }}>
          This Week's Summary
        </p>
        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
          {totalCompletedThisWeek} / {totalOccurrencesThisWeek} tasks completed
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', color: 'rgba(255,255,255,0.9)' }}>
          Across {goalsWithTasks.length} active goal{goalsWithTasks.length !== 1 ? 's' : ''}
        </p>
        <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.85)' }}>
          <WeekComparison currentWeek={currentWeekCompletionRate} previousWeek={previousWeekCompletionRate} />
        </div>
      </div>

      {/* ── AI Assessment ────────────────────────────────────── */}
      {loading && (
        <div style={{
          padding: '24px',
          background: 'var(--panel-strong)',
          border: '1px solid var(--line)',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Loader2 size={20} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Analyzing your weekly performance…</span>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {aiReview?.overallAssessment && (
        <div style={{
          padding: '20px',
          background: 'var(--panel-strong)',
          border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--line))',
          borderRadius: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
              AI Assessment
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>
            {aiReview.overallAssessment}
          </p>
        </div>
      )}

      {/* ── Per-goal cards ───────────────────────────────────── */}
      {goalsWithTasks.length === 0 ? (
        <div className="card premium-surface" style={{
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          border: '2px dashed var(--line)'
        }}>
          <CheckCircle2 color="var(--muted)" size={48} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
            No reviews yet
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center', maxWidth: '360px' }}>
            Complete your first week of tasks to unlock AI-powered weekly reviews and insights.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
          {weekStats.filter(g => g.totalTaskOccurrences > 0).map(stat => {
            const statusCfg = STATUS_CONFIG[stat.status];
            const StatusIcon = statusCfg.icon;
            const aiInsight = getGoalInsight(stat.goalId);

            return (
              <div key={stat.goalId} className="card premium-surface" style={{ padding: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={16} color="var(--accent)" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{stat.name}</h3>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: statusCfg.color,
                    background: statusCfg.bg,
                    border: `1px solid ${statusCfg.color}25`
                  }}>
                    <StatusIcon size={12} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--muted)' }}>
                      {stat.tasksCompleted} / {stat.totalTaskOccurrences} task occurrences completed
                    </span>
                    <span style={{ color: statusCfg.color }}>{stat.completionRate}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-2)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${stat.completionRate}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${statusCfg.color}, ${statusCfg.color}cc)`,
                      borderRadius: '99px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Focus minutes */}
                {stat.focusMinutes > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                    <Clock size={12} />
                    <span>{stat.focusMinutes} minutes focused this week</span>
                  </div>
                )}

                {/* AI Insight */}
                {aiInsight && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-2)',
                    borderRadius: '10px',
                    marginBottom: '12px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
                      {aiInsight.insight}
                    </p>
                    {aiInsight.suggestion && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        💡 {aiInsight.suggestion}
                      </p>
                    )}
                  </div>
                )}

                {/* Adjustment buttons (for at_risk or behind) */}
                {(stat.status === 'at_risk' || stat.status === 'behind') && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      className="ghost-btn"
                      onClick={() => handleAdjustGoal(stat.goalId, 'extend_timeline')}
                      style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Extend timeline by 1 week
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => handleAdjustGoal(stat.goalId, 'reduce_scope')}
                      style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Reduce daily tasks by 25%
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => handleAdjustGoal(stat.goalId, 'keep_current')}
                      style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}
                    >
                      Keep current plan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Past reviews ─────────────────────────────────────── */}
      {goals.some(g => (g.weeklyReflections || []).length > 0) && (
        <div style={{ marginTop: '12px' }}>
          <button
            className="ghost-btn"
            onClick={() => setShowHistory(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <History size={14} />
            View past reviews
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div style={{ marginTop: '12px', display: 'grid', gap: '8px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
              {goals.flatMap(g => 
                (g.weeklyReflections || []).map((r, idx) => (
                  <div key={`${g.id}-${idx}`} className="card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>{g.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{r.date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>
                      Adjustment: {r.adjustment?.replace('_', ' ') || 'None'}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--panel-strong)',
          border: '1px solid var(--line)',
          padding: '10px 18px',
          borderRadius: '999px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 999
        }}>
          {toast}
        </div>
      )}
    </section>
  );
}

export default ReviewPage;
