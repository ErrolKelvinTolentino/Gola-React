import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Target, CheckCircle2, AlertTriangle, XCircle, 
  Clock, ChevronDown, ChevronUp, Loader2, Sparkles, History,
  Wrench
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { addDays, getDateKey, getGoalProgress, isTaskActiveOnDate, isTaskDoneForDate as isTaskDoneForDateUtil } from '../utils/dateUtils';
import { generateWeeklyReview, isGroqAvailable } from '../services/groqService';

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: AlertTriangle },
  behind: { label: 'Needs Focus', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircle }
};

function GoalTasksPreview({ goal, weekStart, today, safeIsTaskDoneForDate }) {
  const [expanded, setExpanded] = useState(false);
  
  // Filter tasks that are active this week
  const activeTasksThisWeek = goal.tasks.filter(task => {
    for (let i = 0; i < 7; i++) {
      if (isTaskActiveOnDate(task, addDays(weekStart, i))) return true;
    }
    return false;
  });

  if (activeTasksThisWeek.length === 0) return null;

  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide tasks active this week' : 'Show tasks active this week'} ({activeTasksThisWeek.length})
      </button>

      {expanded && (
        <ul style={{ listStyle: 'none', padding: '10px 14px', margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--line)', borderRadius: '12px' }}>
          {activeTasksThisWeek.map(task => {
            let completedCount = 0;
            let activeCount = 0;
            for (let i = 0; i < 7; i++) {
              const day = addDays(weekStart, i);
              if (isTaskActiveOnDate(task, day)) {
                activeCount++;
                if (safeIsTaskDoneForDate(task, day)) {
                  completedCount++;
                }
              }
            }

            const isCompleted = task.recurrenceType === 'one-time' ? task.completed : (completedCount === activeCount && activeCount > 0);

            return (
              <li key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={true}
                    style={{ width: '14px', height: '14px', cursor: 'not-allowed', opacity: 0.7 }}
                  />
                  <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--muted)' : 'var(--text)', fontWeight: 500 }}>
                    {task.title}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {task.recurrenceType === 'one-time' ? 'One-time' : `${completedCount}/${activeCount} days`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReviewPage({ goals, focusSessions, onAdjustGoal, updateGoal, today, aiEnabled, isTaskDoneForDate }) {
  const [aiReview, setAiReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeAdjustment, setActiveAdjustment] = useState(null); // { goalId, type }
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const safeIsTaskDoneForDate = isTaskDoneForDate || isTaskDoneForDateUtil;

  // ── Calculate weekly stats ────────────────────────────────────
  const weekStats = useMemo(() => {
    const weekStart = addDays(today, -6);
    
    return goals.map(goal => {
      let tasksCompleted = 0;
      let totalTaskOccurrences = 0;
      let activeDaysCount = 0;
      const sparklineData = [];

      // Check each day of the past week
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = getDateKey(day);
        let dayTasksCompleted = 0;
        let dayTasksActive = 0;

        for (const task of goal.tasks) {
          if (isTaskActiveOnDate(task, day)) {
            dayTasksActive++;
            if (safeIsTaskDoneForDate(task, day)) {
              dayTasksCompleted++;
            }
          }
        }

        const dayFocusMinutes = (focusSessions || [])
          .filter(s => s.goalId === goal.id && s.date === dayKey)
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const isDayActive = dayTasksCompleted > 0 || dayFocusMinutes > 0;
        if (isDayActive) {
          activeDaysCount++;
        }

        const dayRate = dayTasksActive > 0 
          ? Math.round((dayTasksCompleted / dayTasksActive) * 100) 
          : 0;

        sparklineData.push({
          date: dayKey,
          rate: dayRate,
          focus: dayFocusMinutes
        });

        tasksCompleted += dayTasksCompleted;
        totalTaskOccurrences += dayTasksActive;
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

      const totalFocusMinutes = (focusSessions || [])
        .filter(s => s.goalId === goal.id)
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
        totalFocusMinutes,
        activeDaysCount,
        sparklineData,
        status,
        weeklyReflections: goal.weeklyReflections || []
      };
    });
  }, [goals, today, focusSessions, safeIsTaskDoneForDate]);

  const localGoalInsights = useMemo(() => {
    return weekStats.map(stat => {
      let insight = '';
      let suggestion = '';

      if (stat.completionRate === 0) {
        insight = `No tasks were completed for "${stat.name}" this week.`;
        suggestion = 'Start with a micro-step: set a simple task that takes less than 5 minutes to complete.';
      } else if (stat.completionRate < 40) {
        insight = `Progress on "${stat.name}" needs focus at ${stat.completionRate}% completion.`;
        suggestion = 'Consider using the "Reduce Scope" adjustment to focus only on high-priority tasks and build consistency.';
      } else if (stat.completionRate < 70) {
        insight = `You are on the right track with "${stat.name}" (${stat.completionRate}% completion), but there is room for improvement.`;
        suggestion = 'Try scheduling dedicated focus sessions in your calendar for these specific tasks.';
      } else {
        insight = `Excellent work! You achieved a high completion rate of ${stat.completionRate}% on "${stat.name}".`;
        suggestion = 'Keep this momentum going! You are building a powerful habit.';
      }

      return {
        goalId: stat.goalId,
        insight,
        suggestion
      };
    });
  }, [weekStats]);

  const previousWeekStats = useMemo(() => {
    const weekStart = addDays(today, -13);

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

  const localOverallAssessment = useMemo(() => {
    if (goalsWithTasksCount === 0) return null;
    
    const activeGoalsCount = goalsWithTasks.length;
    const avgCompletion = currentWeekCompletionRate;
    const totalFocus = weekStats.reduce((sum, g) => sum + g.focusMinutes, 0);

    let assessment = '';
    if (avgCompletion === 0) {
      assessment = `It looks like you had a challenging week with no task completions. Don't worry! Goal planning is about iteration. Try adjusting your goal deadlines or reducing scope to start fresh this week.`;
    } else if (avgCompletion < 40) {
      assessment = `You completed ${avgCompletion}% of your tasks across ${activeGoalsCount} goals. You are struggling with daily consistency. We recommend extending your timelines or reducing your weekly task load to make things more manageable.`;
    } else if (avgCompletion < 70) {
      assessment = `A solid week! You completed ${avgCompletion}% of your tasks and logged ${totalFocus} minutes of focus. You are close to building consistent habits—try to focus on priority tasks first.`;
    } else {
      assessment = `Superb performance! You completed ${avgCompletion}% of your tasks and logged ${totalFocus} minutes of focus. You are in complete control of your goals. Keep up this incredible momentum!`;
    }

    return assessment;
  }, [goalsWithTasks, goalsWithTasksCount, currentWeekCompletionRate, weekStats]);

  // ── Chart data: Focus Time (last 14 days) ─────────────────────
  const focusChartData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const day = addDays(today, -i);
      const key = getDateKey(day);
      const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const minutes = (focusSessions || [])
        .filter(s => s.date === key)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
      data.push({ date: label, minutes });
    }
    return data;
  }, [today, focusSessions]);

  const hasFocusData = focusChartData.some(d => d.minutes > 0);

  // ── Chart data: Completion Rate (last 14 days) ────────────────
  const completionChartData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const day = addDays(today, -i);
      const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      let active = 0;
      let completed = 0;
      for (const goal of goals) {
        for (const task of goal.tasks) {
          if (isTaskActiveOnDate(task, day)) {
            active++;
            if (safeIsTaskDoneForDate(task, day)) {
              completed++;
            }
          }
        }
      }
      const rate = active > 0 ? Math.round((completed / active) * 100) : 0;
      data.push({ date: label, rate });
    }
    return data;
  }, [today, goals, safeIsTaskDoneForDate]);

  const hasCompletionData = completionChartData.some(d => d.rate > 0);

  const chartTooltipStyle = {
    contentStyle: {
      background: 'var(--panel-strong)',
      border: '1px solid var(--line)',
      borderRadius: '10px',
      fontSize: '0.82rem',
      color: 'var(--text)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
    },
    cursor: { fill: 'rgba(139, 92, 246, 0.08)' }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  const handleAdjustGoal = async (goalId, adjustmentType, note = '') => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !updateGoal) return;

    let updatedTasks = [...goal.tasks];
    let updatedGoalDeadline = goal.deadline;

    if (adjustmentType === 'extend_timeline') {
      updatedTasks = goal.tasks.map(task => {
        const updated = { ...task };
        if (task.recurrenceType === 'one-time' && task.deadline) {
          updated.deadline = getDateKey(addDays(new Date(task.deadline), 7));
          updated.oneTimeDate = updated.deadline;
        }
        if (task.endDate) {
          updated.endDate = getDateKey(addDays(new Date(task.endDate), 7));
        }
        return updated;
      });
      if (goal.deadline) {
        updatedGoalDeadline = getDateKey(addDays(new Date(goal.deadline), 7));
      }
    }

    if (adjustmentType === 'reduce_scope') {
      updatedTasks = goal.tasks.map(task => {
        const updated = { ...task };
        
        // Convert daily to weekdays
        if (task.recurrenceType === 'daily') {
          updated.recurrenceType = 'specific-days';
          updated.specificDays = [1, 2, 3, 4, 5]; // Mon to Fri
        }
        // Specific days, remove one day
        else if (task.recurrenceType === 'specific-days' && Array.isArray(task.specificDays) && task.specificDays.length > 1) {
          updated.specificDays = task.specificDays.slice(0, -1);
        }
        // Reduce habit targets by 25%
        if (task.targetCount) {
          updated.targetCount = Math.max(1, Math.round(task.targetCount * 0.75));
        }
        return updated;
      });

      // Postpone 25% of overdue one-time tasks by 7 days
      const oneTimeTasks = updatedTasks.filter(t => t.recurrenceType === 'one-time' && t.deadline && !t.completed);
      if (oneTimeTasks.length > 0) {
        const numToPostpone = Math.max(1, Math.ceil(oneTimeTasks.length * 0.25));
        const sortedOneTime = [...oneTimeTasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        const idsToPostpone = new Set(sortedOneTime.slice(0, numToPostpone).map(t => t.id));

        updatedTasks = updatedTasks.map(task => {
          if (idsToPostpone.has(task.id)) {
            const nextDeadline = getDateKey(addDays(new Date(task.deadline), 7));
            return {
              ...task,
              deadline: nextDeadline,
              oneTimeDate: nextDeadline
            };
          }
          return task;
        });
      }
    }

    const reflection = {
      goalId,
      date: getDateKey(new Date()),
      adjustment: adjustmentType,
      note: note.trim() || null,
      completionRate: getGoalProgress(goal)
    };

    const reflections = [...(goal.weeklyReflections || []), reflection];
    
    updateGoal(goalId, { 
      tasks: updatedTasks, 
      deadline: updatedGoalDeadline,
      weeklyReflections: reflections 
    });

    let toastMsg = '';
    if (adjustmentType === 'extend_timeline') {
      toastMsg = `Extended timeline for "${goal.name}" by 1 week`;
    } else if (adjustmentType === 'reduce_scope') {
      toastMsg = `Reduced workload for "${goal.name}" by 25%`;
    } else if (adjustmentType === 'keep_current') {
      toastMsg = `Sticking with current plan for "${goal.name}"`;
    } else {
      toastMsg = `Applied ${adjustmentType.replace('_', ' ')} to "${goal.name}"`;
    }
    showToast(toastMsg);
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

      {/* ── Focus Time Trend Chart ────────────────────────────── */}
      <div className="card premium-surface" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={16} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Focus Time Trend</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 'auto', fontWeight: 600 }}>Last 14 days</span>
        </div>
        {hasFocusData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={focusChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="focusBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--line)' }}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit=" min"
              />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value) => [`${value} min`, 'Focus']}
              />
              <Bar dataKey="minutes" fill="url(#focusBarGradient)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--muted)'
          }}>
            <Clock size={28} />
            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>No focus sessions yet</span>
          </div>
        )}
      </div>

      {/* ── Daily Completion Rate Chart ───────────────────────── */}
      <div className="card premium-surface" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CheckCircle2 size={16} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Daily Completion Rate</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 'auto', fontWeight: 600 }}>Last 14 days</span>
        </div>
        {hasCompletionData ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={completionChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="completionAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--line)' }}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value) => [`${value}%`, 'Completed']}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#completionAreaGradient)"
                dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: '#8b5cf6', r: 5, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--muted)'
          }}>
            <CheckCircle2 size={28} />
            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>No completion data yet</span>
          </div>
        )}
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

      {(aiReview?.overallAssessment || localOverallAssessment) && (
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
              {aiReview?.overallAssessment ? 'AI Assessment' : 'Performance Analysis'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>
            {aiReview?.overallAssessment || localOverallAssessment}
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
            const activeGoal = goals.find(g => g.id === stat.goalId);
            
            const weekStart = addDays(today, -6);
            const adjustmentThisWeek = stat.weeklyReflections.find(r => {
              const refDate = new Date(`${r.date}T00:00:00`);
              return refDate >= weekStart && refDate <= today;
            });

            return (
              <div key={stat.goalId} className="card premium-surface" style={{ padding: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={16} color="var(--accent)" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{stat.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {adjustmentThisWeek && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--accent)',
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.25)'
                      }}>
                        <Wrench size={12} />
                        Plan Adjusted
                      </span>
                    )}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: adjustmentThisWeek ? '#10b981' : statusCfg.color,
                      background: adjustmentThisWeek ? 'rgba(16, 185, 129, 0.1)' : statusCfg.bg,
                      border: `1px solid ${adjustmentThisWeek ? '#10b981' : statusCfg.color}25`
                    }}>
                      <StatusIcon size={12} />
                      {adjustmentThisWeek ? 'Recovering' : statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Health Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px',
                  background: 'var(--panel-strong)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)'
                }}>
                  {/* Metric 1: Completion Rate */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completion</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 750, color: adjustmentThisWeek ? '#10b981' : statusCfg.color, marginTop: '4px' }}>
                      {stat.completionRate}%
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                      {stat.tasksCompleted}/{stat.totalTaskOccurrences} tasks
                    </span>
                  </div>

                  {/* Metric 2: Consistency */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consistency</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 750, color: 'var(--text)', marginTop: '4px' }}>
                      {stat.activeDaysCount} / 7 days
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                      Active days this week
                    </span>
                  </div>

                  {/* Metric 3: Focus Time */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Focus Time</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 750, color: 'var(--text)', marginTop: '4px' }}>
                      {stat.focusMinutes}m <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>this week</span>
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                      Total: {stat.totalFocusMinutes}m
                    </span>
                  </div>

                  {/* Metric 4: Sparkline (7-Day Trend) */}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>7-Day Trend</span>
                    <div style={{ height: '32px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stat.sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs>
                            <linearGradient id={`sparklineGrad-${stat.goalId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={adjustmentThisWeek ? '#10b981' : statusCfg.color} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={adjustmentThisWeek ? '#10b981' : statusCfg.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="rate"
                            stroke={adjustmentThisWeek ? '#10b981' : statusCfg.color}
                            strokeWidth={1.8}
                            fill={`url(#sparklineGrad-${stat.goalId})`}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI / Local Insight */}
                {(aiInsight || localGoalInsights.find(l => l.goalId === stat.goalId)) && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-2)',
                    borderRadius: '10px',
                    marginBottom: '12px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
                      {aiInsight?.insight || localGoalInsights.find(l => l.goalId === stat.goalId)?.insight}
                    </p>
                    {(aiInsight?.suggestion || localGoalInsights.find(l => l.goalId === stat.goalId)?.suggestion) && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        💡 {aiInsight?.suggestion || localGoalInsights.find(l => l.goalId === stat.goalId)?.suggestion}
                      </p>
                    )}
                  </div>
                )}

                {/* Active tasks list preview */}
                {activeGoal && (
                  <GoalTasksPreview 
                    goal={activeGoal}
                    weekStart={weekStart}
                    today={today}
                    safeIsTaskDoneForDate={safeIsTaskDoneForDate}
                  />
                )}

                {/* Adjustment confirmation note input */}
                {activeAdjustment?.goalId === stat.goalId && (
                  <div className="card" style={{
                    padding: '16px',
                    marginTop: '12px',
                    background: 'rgba(255, 255, 255, 0.015)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wrench size={14} color="var(--accent)" />
                      Confirm Action: {activeAdjustment.type === 'extend_timeline' ? 'Extend Timeline by 1 Week' : activeAdjustment.type === 'reduce_scope' ? 'Reduce Daily workload by 25%' : 'Keep Current Plan'}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                      {activeAdjustment.type === 'extend_timeline' 
                        ? 'This will push one-time task deadlines and active habit end dates back by 7 days to give you breathing room.' 
                        : activeAdjustment.type === 'reduce_scope' 
                          ? 'This will change daily tasks to weekdays-only, drop custom days, reduce habit targets by 25%, and postpone overdue tasks.' 
                          : 'Sticking to the current tasks and timeline without modification.'}
                    </p>
                    <textarea
                      placeholder="Optional: Why are you making this adjustment? Jot down your reflection..."
                      value={adjustmentNote}
                      onChange={(e) => setAdjustmentNote(e.target.value)}
                      maxLength={280}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '0.85rem',
                        minHeight: '60px',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          setActiveAdjustment(null);
                          setAdjustmentNote('');
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-btn"
                        onClick={() => {
                          handleAdjustGoal(stat.goalId, activeAdjustment.type, adjustmentNote);
                          setActiveAdjustment(null);
                          setAdjustmentNote('');
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        Apply & Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Display adjusted reflection for this week */}
                {adjustmentThisWeek && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(139, 92, 246, 0.04)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '10px',
                    marginTop: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 700 }}>
                      <Wrench size={13} /> Plan Adjusted: {adjustmentThisWeek.adjustment?.replace('_', ' ')}
                    </div>
                    {adjustmentThisWeek.note && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        "{adjustmentThisWeek.note}"
                      </p>
                    )}
                  </div>
                )}

                {/* Adjustment buttons (for at_risk or behind) */}
                {(stat.status === 'at_risk' || stat.status === 'behind') && !adjustmentThisWeek && !activeAdjustment && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      className="ghost-btn"
                      onClick={() => setActiveAdjustment({ goalId: stat.goalId, type: 'extend_timeline' })}
                      style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Extend timeline by 1 week
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => setActiveAdjustment({ goalId: stat.goalId, type: 'reduce_scope' })}
                      style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Reduce daily tasks by 25%
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => setActiveAdjustment({ goalId: stat.goalId, type: 'keep_current' })}
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
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text)' }}>
                      Adjustment: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.adjustment?.replace('_', ' ') || 'None'}</span>
                    </p>
                    {r.note && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        "{r.note}"
                      </p>
                    )}
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
