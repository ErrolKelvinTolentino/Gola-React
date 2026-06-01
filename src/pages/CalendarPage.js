import React, { useState } from 'react';
import { CalendarDays, Flame, ChevronLeft, ChevronRight, CheckCircle2, Target, Lock, Star, RotateCw } from 'lucide-react';
import { buildCalendarCells, isTaskActiveOnDate, isTaskDoneForDate as isTaskDoneForDateUtil, getTaskLockStatus } from '../utils/dateUtils';

function CalendarPage({ goals, weekDays, todayKey, compactCalendar, isTaskDoneForDate, toggleTaskCompletion }) {
  const safeIsTaskDoneForDate = isTaskDoneForDate || isTaskDoneForDateUtil;
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayKey);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
    setSelectedDateStr(todayKey);
  };

  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });
  const year = viewDate.getFullYear();
  
  // Dynamically compute cells for whatever month we are viewing
  const calendarCells = buildCalendarCells(goals, viewDate);
  const totalMonthlyTasks = calendarCells.reduce((sum, cell) => sum + (cell.count || 0), 0);
  const totalMonthlyCompletions = calendarCells.reduce((sum, cell) => sum + (cell.completedCount || 0), 0);

  // Compute tasks for the currently selected date
  const selectedDateObj = new Date(`${selectedDateStr}T00:00:00`);
  const activeTasksForSelectedDate = goals.flatMap((goal) =>
    goal.tasks
      .filter((task) => isTaskActiveOnDate(task, selectedDateObj))
      .map((task) => ({
        goalId: goal.id,
        goalName: goal.name,
        task
      }))
  );

  const completedTasksForSelectedDate = activeTasksForSelectedDate.filter(t => safeIsTaskDoneForDate(t.task, selectedDateObj));
  const completionPercentage = activeTasksForSelectedDate.length > 0 
    ? Math.round((completedTasksForSelectedDate.length / activeTasksForSelectedDate.length) * 100)
    : 0;

  const getLockStatus = (task, goalId, date) => {
    const goal = goals.find(g => g.id === goalId);
    return getTaskLockStatus(task, goal, date);
  };

  const getRecurrenceLabel = (task) => {
    if (task.recurrenceType === 'one-time') return 'Once';
    if (task.recurrenceType === 'daily') return 'Daily';
    if (task.recurrenceType === 'weekly') return 'Weekly';
    return 'Custom';
  };

  return (
    <section className="page page-enter two-col-layout">
      
      {/* Left Column: The Interactive Heatmap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="section-head" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Your Path & Pace</h1>
            <p className="lead" style={{ margin: 0 }}>How you have been showing up for your dreams, day by gentle day.</p>
          </div>
          
          {totalMonthlyTasks > 0 && (
            <div style={{ textAlign: 'right', display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--accent)' }}>
                  {totalMonthlyTasks}
                </span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>INTENTIONS THIS MONTH</span>
              </div>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--good)' }}>
                  {totalMonthlyCompletions}
                </span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>GENTLE STEPS TAKEN</span>
              </div>
            </div>
          )}
        </div>

        <article className="card premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="calendar-header" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
            
            <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CalendarDays size={24} color="var(--accent)" />
              {monthName} {year}
            </h3>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="ghost-btn" onClick={handleToday} style={{ padding: '8px 16px' }}>Today</button>
              <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                <button className="ghost-btn" onClick={handlePrevMonth} style={{ borderRadius: 0, padding: '8px 12px', border: 'none' }}>
                  <ChevronLeft size={20} />
                </button>
                <div style={{ width: '1px', background: 'var(--line)' }} />
                <button className="ghost-btn" onClick={handleNextMonth} style={{ borderRadius: 0, padding: '8px 12px', border: 'none' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

          </div>
          
          <div className="calendar-grid labels" style={{ padding: '0 16px', borderBottom: 'var(--glass-border)' }}>
            {weekDays.map((day) => (
              <span key={day} style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>{day}</span>
            ))}
          </div>

          <div className={`calendar-grid days ${compactCalendar ? 'compact' : ''}`} style={{ padding: '16px', gap: '8px', minHeight: '400px' }}>
            {calendarCells.map((cell, index) => {
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateStr;
              
              let heatStyle = {};
              let isDarkLevel = false;

              if (cell.count > 0) {
                const rate = Math.round((cell.completedCount / cell.count) * 100);

                if (rate === 100) {
                  isDarkLevel = true;
                  heatStyle = { 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.08) 100%)', 
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                    color: 'var(--text)'
                  };
                } else if (rate > 0) {
                  heatStyle = { 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.08) 100%)', 
                    borderColor: 'rgba(139, 92, 246, 0.45)',
                    color: 'var(--text)'
                  };
                } else {
                  // 0% completion rate but has scheduled tasks
                  const isPast = cell.dateKey < todayKey;
                  if (isPast) {
                    heatStyle = {
                      background: 'rgba(239, 68, 68, 0.04)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      color: 'rgba(239, 68, 68, 0.8)'
                    };
                  } else {
                    heatStyle = {
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderColor: 'var(--line)',
                      color: 'var(--text)'
                    };
                  }
                }
              }

              let cellClass = "day-cell day-cell-interactive";
              if (isToday) cellClass += " day-cell-today";
              if (isSelected) cellClass += " day-cell-selected";

              return (
                <div
                  key={`${cell.dateKey}-${index}`}
                  className={cellClass}
                  onClick={() => { if (cell.day) setSelectedDateStr(cell.dateKey); }}
                  style={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--line)',
                    ...heatStyle,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: compactCalendar ? 'center' : 'flex-start',
                    padding: compactCalendar ? '6px' : '10px 8px',
                    cursor: cell.day ? 'pointer' : 'default',
                    opacity: cell.day ? 1 : 0,
                    minHeight: compactCalendar ? '42px' : '75px',
                    boxSizing: 'border-box'
                  }}
                >
                  {cell.day && (
                     <>
                       <strong style={{ fontSize: '0.95rem', color: isToday ? 'var(--good)' : 'inherit', alignSelf: 'flex-start' }}>
                         {cell.day}
                       </strong>
                        
                        {cell.count > 0 && !compactCalendar && (
                          <small style={{ 
                            marginTop: 'auto', 
                            background: isDarkLevel ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.04)', 
                            color: isDarkLevel ? 'var(--good)' : 'var(--text)',
                            padding: '3px 6px', 
                            borderRadius: '6px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            alignSelf: 'stretch',
                            justifyContent: 'center'
                          }}>
                            {cell.completedCount === cell.count ? <Flame size={11} color="var(--good)" fill="var(--good)" /> : null}
                            {cell.completedCount}/{cell.count} done
                          </small>
                        )}
                        {cell.count > 0 && compactCalendar && (
                           <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cell.completedCount === cell.count ? 'var(--good)' : 'var(--accent)', marginTop: '4px' }} />
                        )}
                     </>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {/* Right Column: Daily Execution Focus */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={20} color="var(--accent)" /> Focus For
         </h3>
         <div style={{ padding: '16px 20px', background: 'var(--panel)', border: 'var(--glass-border)', borderRadius: '16px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{selectedDateObj.getDate()}</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 600 }}>{selectedDateObj.toLocaleString('en-US', { month: 'short' })}, {selectedDateObj.getFullYear()}</span>
            {selectedDateStr === todayKey && <span className="meta-chip good" style={{ marginLeft: 'auto' }}>Today</span>}
         </div>

         {activeTasksForSelectedDate.length > 0 && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 4px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
               <span style={{ color: 'var(--muted)' }}>Steps completed</span>
               <span style={{ color: completionPercentage === 100 ? 'var(--good)' : 'var(--accent)' }}>
                 {completedTasksForSelectedDate.length} / {activeTasksForSelectedDate.length} done ({completionPercentage}%)
               </span>
             </div>
             <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
               <div style={{ 
                 height: '100%', 
                 background: completionPercentage === 100 
                   ? 'linear-gradient(90deg, #10b981, #34d399)' 
                   : 'linear-gradient(90deg, var(--accent), var(--accent-2))', 
                 width: `${completionPercentage}%`,
                 transition: 'width 0.3s ease'
               }} />
             </div>
             <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 550, marginTop: '2px' }}>
               {completionPercentage === 100 
                 ? '🎉 A beautiful day! Every step completed.' 
                 : completionPercentage > 0 
                   ? '🌱 Breathing life into your goals. You\'re doing wonderful.' 
                   : '✨ Intentions set for this day.'}
             </span>
           </div>
         )}

         <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--panel-strong)', border: '1px solid var(--line)' }}>
            {activeTasksForSelectedDate.length === 0 ? (
               <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                 <CheckCircle2 size={40} opacity={0.5} />
                 <span style={{ fontWeight: 500, lineHeight: 1.5 }}>A quiet space. No tasks scheduled. Rest, breathe, and recharge.</span>
               </div>
            ) : (
               <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {activeTasksForSelectedDate.map((t, idx) => {
                    const isDone = safeIsTaskDoneForDate(t.task, selectedDateObj);
                    const lockStatus = getLockStatus(t.task, t.goalId, selectedDateObj);
                    const isLocked = lockStatus.isLocked;
                    const lockReason = lockStatus.reason;

                    return (
                      <li key={idx} style={{ 
                        padding: '16px 20px', 
                        borderBottom: idx !== activeTasksForSelectedDate.length - 1 ? '1px solid var(--line)' : 'none', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px',
                        background: isLocked ? 'rgba(0,0,0,0.08)' : t.task.isPriority && !isDone ? 'rgba(245, 158, 11, 0.02)' : 'transparent',
                        opacity: isLocked ? 0.5 : isDone ? 0.65 : 1,
                        borderLeft: t.task.isPriority && !isDone && !isLocked ? '3px solid #f59e0b' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '10px', 
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            flex: 1
                          }}>
                            <input
                              type="checkbox"
                              checked={isDone}
                              disabled={isLocked}
                              onChange={() => {
                                if (!isLocked && toggleTaskCompletion) {
                                  toggleTaskCompletion(t.goalId, t.task.id, selectedDateObj);
                                }
                              }}
                              style={{ width: '18px', height: '18px', marginTop: '2px', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {t.task.isPriority && <Star size={14} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />}
                                <span style={{ 
                                  fontWeight: 600, 
                                  fontSize: '0.96rem', 
                                  color: 'var(--text)',
                                  textDecoration: isDone ? 'line-through' : 'none'
                                }}>
                                  {t.task.title}
                                </span>
                                {isLocked && (
                                  <span style={{ fontSize: '0.68rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                    <Lock size={9} /> Locked
                                  </span>
                                )}
                              </div>
                              {isLocked && lockReason && (
                                <div style={{ marginTop: '2px', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                                  {lockReason}
                                </div>
                              )}
                              {t.task.description && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                                  {t.task.description}
                                </p>
                              )}
                            </div>
                          </label>
                        </div>
                        
                        {/* Metadata and progress indicators */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingLeft: '28px', marginTop: '2px' }}>
                          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '0.72rem' }}>
                            <Target size={11} /> {t.goalName}
                          </small>
                          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '0.72rem' }}>
                            <RotateCw size={11} /> {getRecurrenceLabel(t.task)}
                          </small>
                          {t.task.timeEstimate && (
                            <span className="meta-chip" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              ⏱ {t.task.timeEstimate}
                            </span>
                          )}
                          {t.task.subtasks && t.task.subtasks.length > 0 && (
                            <span className="meta-chip" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              📋 {t.task.subtasks.filter(s => s.completed).length}/{t.task.subtasks.length} subtasks
                            </span>
                          )}
                          {t.task.targetCount && (
                            <span className="meta-chip" style={{ fontSize: '0.65rem', padding: '1px 5px', color: '#f59e0b' }}>
                              🎯 {t.task.completedDates?.length || 0}/{t.task.targetCount} reps
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
               </ul>
            )}
         </div>
      </div>

      <style>{`
        .day-cell-interactive {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .day-cell-interactive:hover {
          transform: translateY(-3px) scale(1.04) !important;
          z-index: 5;
          box-shadow: 0 10px 24px -8px rgba(139, 92, 246, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
        .day-cell-selected {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 2px var(--panel), 0 0 16px var(--accent) !important;
          z-index: 4;
        }
        .day-cell-today {
          border-color: var(--good) !important;
          box-shadow: inset 0 0 0 1.5px var(--good) !important;
        }
        .day-cell-today.day-cell-selected {
          box-shadow: inset 0 0 0 1.5px var(--good), 0 0 0 2px var(--panel), 0 0 16px var(--accent) !important;
        }
      `}</style>
    </section>
  );
}

export default CalendarPage;
