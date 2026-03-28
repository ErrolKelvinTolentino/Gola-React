import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Target, RotateCw, Calendar as CalendarIcon, CheckCircle2, BarChart3 } from 'lucide-react';
import { addDays, getDateKey, isTaskActiveOnDate as isTaskActiveOnDateUtil } from '../utils/dateUtils';

function TasksPage({
  goals = [],
  activeTasksToday = [],
  today = new Date(),
  getActiveTasksForDate,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  toggleTaskDoneForDate,
  toggleTaskDoneForToday,
  getRecurrenceText,
  prettyDate
}) {
  const todayKey = getDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const safeIsTaskActiveOnDate = isTaskActiveOnDate || isTaskActiveOnDateUtil;

  const resolveActiveTasksForDate = useMemo(() => {
    if (typeof getActiveTasksForDate === 'function') return getActiveTasksForDate;

    if (goals.length > 0) {
      return (date) =>
        goals.flatMap((goal) =>
          goal.tasks
            .filter((task) => safeIsTaskActiveOnDate(task, date))
            .map((task) => ({
              goalId: goal.id,
              goalName: goal.name,
              task
            }))
        );
    }

    return (date) => (getDateKey(date) === todayKey ? activeTasksToday : []);
  }, [getActiveTasksForDate, goals, safeIsTaskActiveOnDate, todayKey, activeTasksToday]);

  const selectedDate = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey]);

  const dayItems = useMemo(() => {
    const list = [];
    for (let offset = -3; offset <= 3; offset += 1) {
      const date = addDays(today, offset);
      const dateKey = getDateKey(date);
      const activeTasks = resolveActiveTasksForDate(date);
      const completed = activeTasks.filter(({ task }) => isTaskDoneForDate(task, date)).length;
      const completion = activeTasks.length ? Math.round((completed / activeTasks.length) * 100) : 0;
      list.push({ date, dateKey, activeTasks, completed, completion });
    }
    return list;
  }, [today, resolveActiveTasksForDate, isTaskDoneForDate]);

  const selectedDay = dayItems.find((item) => item.dateKey === selectedDateKey) || dayItems[3];
  const tasksForSelectedDay = selectedDay?.activeTasks || [];

  const pendingTasks = tasksForSelectedDay.filter(({ task }) => !isTaskDoneForDate(task, selectedDate));
  const completedTasks = tasksForSelectedDay.filter(({ task }) => isTaskDoneForDate(task, selectedDate));
  const completionPercentage = tasksForSelectedDay.length > 0 ? Math.round((completedTasks.length / tasksForSelectedDay.length) * 100) : 0;

  const totalGoalsTouched = new Set(tasksForSelectedDay.map(({ goalId }) => goalId)).size;
  const allOpenTasks = goals.reduce(
    (sum, goal) =>
      sum +
      goal.tasks.filter((task) => {
        if (!safeIsTaskActiveOnDate(task, selectedDate)) return false;
        return !isTaskDoneForDate(task, selectedDate);
      }).length,
    0
  );

  const activeDayLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const shiftDate = (direction) => {
    const next = addDays(selectedDate, direction);
    setSelectedDateKey(getDateKey(next));
  };

  const handleToggleTaskDone = (goalId, taskId) => {
    if (typeof toggleTaskDoneForDate === 'function') {
      toggleTaskDoneForDate(goalId, taskId, selectedDate);
      return;
    }
    if (typeof toggleTaskDoneForToday === 'function') {
      toggleTaskDoneForToday(goalId, taskId);
    }
  };

  return (
    <section className="page page-enter">
      <div className="section-head" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1>Execution Terminal</h1>
          <p className="lead" style={{ margin: 0 }}>Mission control for scheduled actions and completion flow.</p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: completionPercentage === 100 ? 'var(--good)' : 'var(--text)' }}>{completionPercentage}%</span>
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>COMPLETE ON {selectedDateKey === todayKey ? 'TODAY' : 'SELECTED DAY'}</span>
        </div>
      </div>

      <div className="card premium-surface" style={{ padding: '14px', marginBottom: '18px', display: 'grid', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <button className="ghost-btn" style={{ padding: '7px 10px' }} onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{activeDayLabel}</div>
          <button className="ghost-btn" style={{ padding: '7px 10px' }} onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(104px, 1fr))', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {dayItems.map((item) => {
            const isSelected = item.dateKey === selectedDateKey;
            const isToday = item.dateKey === todayKey;
            return (
              <button
                key={item.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(item.dateKey)}
                className="ghost-btn"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: isSelected ? 'color-mix(in oklab, var(--accent) 14%, var(--panel))' : 'var(--panel)',
                  display: 'grid',
                  gap: '4px',
                  textAlign: 'left',
                  minWidth: '104px',
                  boxShadow: isSelected ? '0 8px 18px rgba(124, 58, 237, 0.22)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--muted)' }}>
                    {item.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  {isToday && <span className="meta-chip good" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>Today</span>}
                </div>
                <strong style={{ fontSize: '1rem', lineHeight: 1.1 }}>{item.date.toLocaleDateString('en-US', { day: '2-digit' })}</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {item.activeTasks.length} task{item.activeTasks.length === 1 ? '' : 's'}
                </div>
                <div style={{ height: '5px', borderRadius: '999px', background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ width: `${item.completion}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px', borderRadius: '16px', display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em' }}>SCHEDULED</span>
          <strong style={{ fontSize: '1.4rem' }}>{tasksForSelectedDay.length}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tasks due this day</span>
        </div>
        <div className="card" style={{ padding: '14px', borderRadius: '16px', display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em' }}>OPEN LOAD</span>
          <strong style={{ fontSize: '1.4rem' }}>{allOpenTasks}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Unfinished tasks on selected day</span>
        </div>
        <div className="card" style={{ padding: '14px', borderRadius: '16px', display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em' }}>ACTIVE GOALS</span>
          <strong style={{ fontSize: '1.4rem' }}>{totalGoalsTouched}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Goals contributing tasks</span>
        </div>
      </div>

      {tasksForSelectedDay.length === 0 ? (
        <div className="card premium-surface" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '2px dashed var(--line)' }}>
          <CheckCircle2 color="var(--good)" size={48} />
          <div style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text)' }}>No tasks scheduled</div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>There are no active tasks on {activeDayLabel}. Choose another day in the timeline.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* PENDING TASKS */}
          {pendingTasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--accent)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} />
                Pending Actions <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>({pendingTasks.length})</span>
              </h3>
              <div className="card premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
                <ul className="task-list interactive" style={{ gap: '0' }}>
                  {pendingTasks.map(({ goalId, goalName, task }, idx) => (
                    <li 
                      key={`${goalId}-${task.id}`} 
                      style={{
                        border: 'none',
                        borderBottom: idx === pendingTasks.length - 1 ? 'none' : '1px solid var(--line)',
                        borderRadius: '0',
                        padding: '20px 24px',
                        background: 'transparent',
                      }}
                    >
                      <label style={{ fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleTaskDone(goalId, task.id)}
                          style={{ width: '24px', height: '24px', marginRight: '4px' }}
                        />
                        <span>{task.title}</span>
                      </label>
                      <div className="task-meta">
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={14} /> {goalName}
                        </small>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <RotateCw size={14} /> {getRecurrenceText(task)}
                        </small>
                        {task.timeEstimate && (
                          <span className="meta-chip">⏱ {task.timeEstimate}</span>
                        )}
                        {task.energy && (
                          <span className="meta-chip">⚡ {task.energy}</span>
                        )}
                        {task.deadline && (
                          <span className="meta-chip highlight">
                            <CalendarIcon size={12} /> {prettyDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* COMPLETED TASKS */}
          {completedTasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                <CheckCircle2 size={16} /> Finished <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>({completedTasks.length})</span>
              </h3>
              <div className="card" style={{ padding: '0', overflow: 'hidden', background: 'var(--bg-2)', border: '1px dashed var(--line)' }}>
                <ul className="task-list interactive" style={{ gap: '0' }}>
                  {completedTasks.map(({ goalId, goalName, task }, idx) => (
                    <li 
                      key={`${goalId}-${task.id}`} 
                      className="done"
                      style={{
                        border: 'none',
                        borderBottom: idx === completedTasks.length - 1 ? 'none' : '1px dashed var(--line)',
                        borderRadius: '0',
                        padding: '16px 24px',
                        background: 'transparent',
                        opacity: 0.7
                      }}
                    >
                      <label style={{ fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => handleToggleTaskDone(goalId, task.id)}
                          style={{ width: '20px', height: '20px', marginRight: '6px' }}
                        />
                        <span>{task.title}</span>
                      </label>
                      <div className="task-meta" style={{ marginTop: '8px' }}>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={12} /> {goalName}
                        </small>
                        {task.timeEstimate && (
                          <span className="meta-chip" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>⏱ {task.timeEstimate}</span>
                        )}
                        <span className="meta-chip good" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          <BarChart3 size={11} /> Completed on selected day
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
    </section>
  );
}

export default TasksPage;
