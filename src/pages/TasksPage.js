import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  RotateCw,
  Calendar as CalendarIcon,
  CheckCircle2,
  BarChart3,
  Zap,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { addDays, getDateKey, isTaskActiveOnDate as isTaskActiveOnDateUtil } from '../utils/dateUtils';
import MorningBriefing from '../components/MorningBriefing';
import QuotesBanner from '../components/QuotesBanner';
import CapacityWarning from '../components/CapacityWarning';
import { getRecommendedTask } from '../services/recommendationEngine';

/* ─── Mini SVG ring for day-cell progress ─────────────────────── */
function RingProgress({ pct = 0, size = 32, stroke = 3, isEmpty = false }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  const color = pct === 100 ? 'var(--good)' : pct > 0 ? 'var(--accent)' : 'var(--line)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      {/* progress arc */}
      {!isEmpty && pct > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      )}
    </svg>
  );
}

/* ─── Task dots (up to 5) ────────────────────────────────────────── */
function TaskDots({ count = 0, done = 0 }) {
  const shown = Math.min(count, 5);
  return (
    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: i < done ? 'var(--accent)' : 'var(--line)',
            flexShrink: 0,
            transition: 'background 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function parseTimeEstimate(value) {
  if (!value) return 30;
  if (value === '15m') return 15;
  if (value === '30m') return 30;
  if (value === '1h') return 60;
  if (value === '2h+') return 120;
  const asNumber = Number.parseInt(value, 10);
  return Number.isFinite(asNumber) ? asNumber : 30;
}

function TasksPage({
  goals = [],
  activeTasksToday = [],
  today = new Date(),
  getActiveTasksForDate,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  toggleTaskDoneForDate,
  toggleTaskDoneForToday,
  updateTask,
  getRecurrenceText,
  prettyDate,
  streak,
  completionRate,
  aiEnabled,
  focusMinutesToday,
  onStartFocus
}) {
  const todayKey = getDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const safeIsTaskActiveOnDate = isTaskActiveOnDate || isTaskActiveOnDateUtil;
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [postponeValue, setPostponeValue] = useState('');

  const scrollRef = useRef(null);
  const cellRefs = useRef({});

  // ── Resolve tasks for any date ──────────────────────────────────
  const resolveActiveTasksForDate = useMemo(() => {
    if (typeof getActiveTasksForDate === 'function') return getActiveTasksForDate;
    if (goals.length > 0) {
      return (date) =>
        goals.flatMap((goal) =>
          goal.tasks
            .filter((task) => safeIsTaskActiveOnDate(task, date))
            .map((task) => ({ goalId: goal.id, goalName: goal.name, task }))
        );
    }
    return (date) => (getDateKey(date) === todayKey ? activeTasksToday : []);
  }, [getActiveTasksForDate, goals, safeIsTaskActiveOnDate, todayKey, activeTasksToday]);

  // ── selectedDate must come first so dayItems can depend on it ─────
  const selectedDate = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey]);

  // ── Build dynamic window that always includes selectedDate ────────
  // Compute how far the selected date is from today, then expand bounds.
  const BUFFER = 3;  // cells to keep on each side of every anchor
  const MIN_PAST = 3;
  const MIN_FUTURE = 10;
  const dayItems = useMemo(() => {
    const selOffset = Math.round(
      (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const startOffset = Math.min(-MIN_PAST, selOffset - BUFFER);
    const endOffset   = Math.max(MIN_FUTURE, selOffset + BUFFER);

    const list = [];
    for (let offset = startOffset; offset <= endOffset; offset++) {
      const date = addDays(today, offset);
      const dateKey = getDateKey(date);
      const activeTasks = resolveActiveTasksForDate(date);
      const completed = activeTasks.filter(({ task }) => isTaskDoneForDate(task, date)).length;
      const completion = activeTasks.length
        ? Math.round((completed / activeTasks.length) * 100)
        : 0;
      list.push({ date, dateKey, activeTasks, completed, completion, isPast: offset < 0 });
    }
    return list;
  }, [today, selectedDate, resolveActiveTasksForDate, isTaskDoneForDate]);

  // Today's index within the dynamic window
  const todayIndex = dayItems.findIndex((item) => item.dateKey === todayKey);

  const selectedDay =
    dayItems.find((item) => item.dateKey === selectedDateKey) ??
    dayItems[todayIndex] ?? dayItems[0];

  const tasksForSelectedDay = selectedDay?.activeTasks || [];
  const pendingTasks = tasksForSelectedDay.filter(
    ({ task }) => !isTaskDoneForDate(task, selectedDate)
  );
  const completedTasks = tasksForSelectedDay.filter(({ task }) =>
    isTaskDoneForDate(task, selectedDate)
  );
  const completionPercentage =
    tasksForSelectedDay.length > 0
      ? Math.round((completedTasks.length / tasksForSelectedDay.length) * 100)
      : 0;

  const totalGoalsTouched = new Set(tasksForSelectedDay.map(({ goalId }) => goalId)).size;
  const allOpenTasks = goals.reduce(
    (sum, goal) =>
      sum +
      goal.tasks.filter(
        (task) =>
          safeIsTaskActiveOnDate(task, selectedDate) && !isTaskDoneForDate(task, selectedDate)
      ).length,
    0
  );

  const activeDayLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // ── Month label for header (derived from the selected date) ─────
  const monthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const orderedPendingTasks = useMemo(() => {
    return [...pendingTasks]
      .map((item, index) => ({ ...item, _order: item.task.order ?? index }))
      .sort((a, b) => a._order - b._order);
  }, [pendingTasks]);

  const recommendedTask = useMemo(() => {
    const taskPool = orderedPendingTasks.map(({ task, goalId, goalName }) => ({
      ...task,
      goalId,
      goalName
    }));
    return getRecommendedTask(taskPool, 'Medium', new Date().getHours());
  }, [orderedPendingTasks]);

  const capacityMinutes = 240;
  const usedMinutes = tasksForSelectedDay.reduce(
    (sum, item) => sum + parseTimeEstimate(item.task.timeEstimate),
    0
  );
  const capacityPercent = Math.min(100, Math.round((usedMinutes / capacityMinutes) * 100));

  // ── Keyboard / button navigation ────────────────────────────────
  const shiftDate = useCallback(
    (direction) => {
      const next = addDays(selectedDate, direction);
      setSelectedDateKey(getDateKey(next));
    },
    [selectedDate]
  );

  const jumpToToday = useCallback(() => {
    setSelectedDateKey(todayKey);
  }, [todayKey]);

  // ── Auto-scroll selected cell into view ─────────────────────────
  useEffect(() => {
    const el = cellRefs.current[selectedDateKey];
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [selectedDateKey]);

  // ── Toggle handler ───────────────────────────────────────────────
  const handleToggleTaskDone = (goalId, taskId) => {
    if (typeof toggleTaskDoneForDate === 'function') {
      toggleTaskDoneForDate(goalId, taskId, selectedDate);
      return;
    }
    if (typeof toggleTaskDoneForToday === 'function') {
      toggleTaskDoneForToday(goalId, taskId);
    }
  };

  const handlePostpone = (goalId, task, newDateKey) => {
    if (!newDateKey || !updateTask) return;
    const fromKey = selectedDateKey;
    const postponedDates = Array.isArray(task.postponedDates) ? [...task.postponedDates] : [];
    postponedDates.push({ from: fromKey, to: newDateKey });

    const updates = {
      postponedDates,
      completedDates: (task.completedDates || []).filter((dateKey) => dateKey !== fromKey),
      updatedAt: new Date().toISOString()
    };

    if (task.recurrenceType === 'one-time') {
      updates.oneTimeDate = newDateKey;
      updates.completed = false;
    }

    updateTask(goalId, task.id, updates);
    setPostponeTarget(null);
    setPostponeValue('');
  };

  const handleDragEnd = (result) => {
    if (!result?.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;

    const reordered = Array.from(orderedPendingTasks);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    reordered.forEach((item, index) => {
      if (item.task.order !== index) {
        updateTask(item.goalId, item.task.id, { order: index });
      }
    });
  };

  const isToday = selectedDateKey === todayKey;

  return (
    <section className="page page-enter">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="section-head"
        style={{
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.4rem', letterSpacing: '-0.03em', marginBottom: '4px' }}>Welcome back.</h1>
          <p className="lead" style={{ margin: 0 }}>
            Today is {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Here's your execution cockpit.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              lineHeight: 1,
              color: completionPercentage === 100 ? 'var(--good)' : 'var(--text)',
              transition: 'color 0.4s ease',
            }}
          >
            {completionPercentage}%
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '0.78rem',
              color: 'var(--muted)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Complete {isToday ? 'Today' : 'On Selected Day'}
          </span>
        </div>
      </div>

      <MorningBriefing
        todayTasks={activeTasksToday || []}
        goals={goals || []}
        completionRate={completionRate}
        streak={streak || 0}
        aiEnabled={aiEnabled}
      />

      {recommendedTask && (
        <div className="card premium-surface" style={{ padding: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                Recommended Next Task
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                {recommendedTask.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {recommendedTask.goalName}
              </div>
            </div>
            <button
              className="primary-btn"
              onClick={() => onStartFocus(recommendedTask.id, recommendedTask.goalId)}
              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px' }}
            >
              Focus <Zap size={12} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Horizontal Calendar Card ────────────────────────────── */}
      <div
        className="card premium-surface"
        style={{ padding: '16px', marginBottom: '18px' }}
      >
        {/* Month title + Jump to Today */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              {monthLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!isToday && (
              <button
                className="ghost-btn"
                onClick={jumpToToday}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  background: 'color-mix(in oklab, var(--accent) 12%, var(--panel))',
                  border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
                title="Jump to today"
              >
                <Zap size={12} />
                Today
              </button>
            )}
            <button
              className="ghost-btn"
              style={{ padding: '6px 10px', borderRadius: '10px' }}
              onClick={() => shiftDate(-1)}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="ghost-btn"
              style={{ padding: '6px 10px', borderRadius: '10px' }}
              onClick={() => shiftDate(1)}
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable day strip */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {dayItems.map((item) => {
            const isSelected = item.dateKey === selectedDateKey;
            const isTodayCell = item.dateKey === todayKey;
            const hasTasks = item.activeTasks.length > 0;

            return (
              <button
                key={item.dateKey}
                ref={(el) => {
                  cellRefs.current[item.dateKey] = el;
                }}
                type="button"
                onClick={() => setSelectedDateKey(item.dateKey)}
                style={{
                  flexShrink: 0,
                  width: '64px',
                  scrollSnapAlign: 'center',
                  padding: '10px 6px 8px',
                  borderRadius: '16px',
                  border: isSelected
                    ? '2px solid var(--accent)'
                    : isTodayCell
                    ? '2px solid color-mix(in oklab, var(--accent) 40%, transparent)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'color-mix(in oklab, var(--accent) 14%, var(--panel))'
                    : isTodayCell
                    ? 'color-mix(in oklab, var(--accent) 6%, var(--panel))'
                    : 'var(--panel)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isSelected
                    ? '0 8px 24px -4px color-mix(in oklab, var(--accent) 45%, transparent)'
                    : 'none',
                  opacity: item.isPast && !isSelected ? 0.72 : 1,
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {/* Weekday label */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: isSelected
                      ? 'var(--accent)'
                      : isTodayCell
                      ? 'color-mix(in oklab, var(--accent) 70%, var(--muted))'
                      : 'var(--muted)',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {item.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>

                {/* Day number inside a ring */}
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                  <RingProgress
                    pct={item.completion}
                    size={32}
                    stroke={hasTasks ? 3 : 2}
                    isEmpty={!hasTasks}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: isSelected
                        ? 'var(--accent)'
                        : isTodayCell
                        ? 'var(--text)'
                        : item.isPast
                        ? 'var(--muted)'
                        : 'var(--text)',
                      lineHeight: 1,
                    }}
                  >
                    {item.date.getDate()}
                  </span>
                </div>

                {/* Task dots */}
                <TaskDots count={item.activeTasks.length} done={item.completed} />

                {/* "TODAY" badge */}
                {isTodayCell && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-1px',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '2px 4px',
                      borderRadius: '6px 6px 0 6px',
                      lineHeight: 1.2,
                    }}
                  >
                    NOW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day label */}
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.92rem',
              color: 'var(--text)',
            }}
          >
            {activeDayLabel}
          </span>
          {tasksForSelectedDay.length > 0 && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color:
                  completionPercentage === 100
                    ? 'var(--good)'
                    : completionPercentage > 0
                    ? 'var(--accent)'
                    : 'var(--muted)',
                background:
                  completionPercentage === 100
                    ? 'color-mix(in oklab, var(--good) 12%, transparent)'
                    : completionPercentage > 0
                    ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
                    : 'var(--panel)',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor:
                  completionPercentage === 100
                    ? 'color-mix(in oklab, var(--good) 25%, transparent)'
                    : completionPercentage > 0
                    ? 'color-mix(in oklab, var(--accent) 20%, transparent)'
                    : 'var(--line)',
                transition: 'all 0.3s ease',
              }}
            >
              {completedTasks.length}/{tasksForSelectedDay.length} done
            </span>
          )}
        </div>
      </div>

      {/* ── Stat chips ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        {[
          {
            label: 'SCHEDULED',
            value: tasksForSelectedDay.length,
            sub: 'Tasks due this day',
          },
          {
            label: 'OPEN LOAD',
            value: allOpenTasks,
            sub: 'Unfinished tasks',
          },
          {
            label: 'ACTIVE GOALS',
            value: totalGoalsTouched,
            sub: 'Goals contributing',
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="card"
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              display: 'grid',
              gap: '2px',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--muted)',
                fontWeight: 800,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1 }}>
              {value}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      <div className="card premium-surface" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Today vs Capacity</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {usedMinutes}/{capacityMinutes} min
          </div>
        </div>
        <div style={{ height: '8px', borderRadius: '999px', background: 'var(--line)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${capacityPercent}%`,
              background: capacityPercent >= 100 ? '#ef4444' : 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      <CapacityWarning tasks={tasksForSelectedDay.map((item) => item.task)} userCapacity={capacityMinutes} />

      {/* ── Task list ──────────────────────────────────────────────── */}
      {tasksForSelectedDay.length === 0 ? (
        <div
          className="card premium-surface"
          style={{
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            border: '2px dashed var(--line)',
          }}
        >
          <CheckCircle2 color="var(--good)" size={48} />
          <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text)' }}>
            No tasks scheduled
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            There are no active tasks on {activeDayLabel}. Choose another day in the timeline.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* PENDING */}
          {orderedPendingTasks.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1.05rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    background: 'var(--accent)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block',
                    boxShadow: '0 0 8px var(--accent)',
                  }}
                />
                Pending Actions{' '}
                <span style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                  ({pendingTasks.length})
                </span>
              </h3>
              <div className="card premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="pending-tasks">
                    {(provided) => (
                      <ul
                        className="task-list interactive"
                        style={{ gap: '0' }}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {orderedPendingTasks.map(({ goalId, goalName, task }, idx) => (
                          <Draggable key={`${goalId}-${task.id}`} draggableId={`${goalId}-${task.id}`} index={idx}>
                            {(dragProvided) => (
                              <li
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                style={{
                                  border: 'none',
                                  borderBottom:
                                    idx === orderedPendingTasks.length - 1 ? 'none' : '1px solid var(--line)',
                                  borderRadius: '0',
                                  padding: '18px 22px',
                                  background: 'transparent',
                                  ...dragProvided.draggableProps.style,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                  <label
                                    style={{
                                      fontSize: '1rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-start',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                      <input
                                        type="checkbox"
                                        checked={isTaskDoneForDate(task, selectedDate)}
                                        onChange={() => handleToggleTaskDone(goalId, task.id)}
                                        style={{ width: '22px', height: '22px', marginRight: '8px', marginTop: '2px' }}
                                      />
                                      <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{task.title}</span>
                                    </div>
                                    {task.description && (
                                      <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                                        {task.description}
                                      </div>
                                    )}
                                  </label>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    <button
                                      className="primary-btn"
                                      onClick={() => onStartFocus(task.id, goalId)}
                                      style={{ padding: '6px 12px', fontSize: '0.75rem', minHeight: '0', borderRadius: '8px', flexShrink: 0, fontWeight: 700 }}
                                    >
                                      Focus <Zap size={12} style={{ marginLeft: '4px' }} />
                                    </button>
                                    <button
                                      className="ghost-btn"
                                      onClick={() => {
                                        setPostponeTarget(`${goalId}-${task.id}`);
                                        setPostponeValue('');
                                      }}
                                      style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                                    >
                                      Postpone
                                    </button>
                                    {postponeTarget === `${goalId}-${task.id}` && (
                                      <input
                                        type="date"
                                        value={postponeValue}
                                        min={getDateKey(addDays(selectedDate, 1))}
                                        onChange={(e) => {
                                          const nextValue = e.target.value;
                                          setPostponeValue(nextValue);
                                          if (nextValue) handlePostpone(goalId, task, nextValue);
                                        }}
                                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.75rem' }}
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="task-meta" style={{ marginTop: '8px', paddingLeft: '30px' }}>
                                  <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Target size={13} /> {goalName}
                                  </small>
                                  <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <RotateCw size={13} /> {getRecurrenceText(task)}
                                  </small>
                                  {task.timeEstimate && (
                                    <span className="meta-chip">⏱ {task.timeEstimate}</span>
                                  )}
                                  {task.energy && <span className="meta-chip">⚡ {task.energy}</span>}
                                  {task.deadline && (
                                    <span className="meta-chip highlight">
                                      <CalendarIcon size={11} /> {prettyDate(task.deadline)}
                                    </span>
                                  )}
                                </div>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {completedTasks.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1.05rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: 0.65,
                }}
              >
                <CheckCircle2 size={16} /> Finished{' '}
                <span style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                  ({completedTasks.length})
                </span>
              </h3>
              <div
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  background: 'var(--bg-2)',
                  border: '1px dashed var(--line)',
                }}
              >
                <ul className="task-list interactive" style={{ gap: '0' }}>
                  {completedTasks.map(({ goalId, goalName, task }, idx) => (
                    <li
                      key={`${goalId}-${task.id}`}
                      className="done"
                      style={{
                        border: 'none',
                        borderBottom:
                          idx === completedTasks.length - 1
                            ? 'none'
                            : '1px dashed var(--line)',
                        borderRadius: '0',
                        padding: '14px 22px',
                        background: 'transparent',
                        opacity: 0.7,
                      }}
                    >
                      <label
                        style={{
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => handleToggleTaskDone(goalId, task.id)}
                            style={{ width: '20px', height: '20px', marginRight: '6px' }}
                          />
                          <span>{task.title}</span>
                        </div>
                        {task.description && (
                          <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                            {task.description}
                          </div>
                        )}
                      </label>
                      <div className="task-meta" style={{ marginTop: '8px' }}>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={12} /> {goalName}
                        </small>
                        {task.timeEstimate && (
                          <span
                            className="meta-chip"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            ⏱ {task.timeEstimate}
                          </span>
                        )}
                        <span
                          className="meta-chip good"
                          style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                        >
                          <BarChart3 size={11} /> Done
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: '32px' }}>
        <QuotesBanner />
      </div>
    </section>
  );
}

export default TasksPage;
