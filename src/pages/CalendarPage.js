import React, { useState } from 'react';
import { CalendarDays, Flame, ChevronLeft, ChevronRight, CheckCircle2, Target } from 'lucide-react';
import { buildCalendarCells, isTaskActiveOnDate, getDateKey } from '../utils/dateUtils';

function CalendarPage({ goals, weekDays, todayKey, compactCalendar }) {
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

  // Compute tasks for the currently selected date
  const selectedDateObj = new Date(`${selectedDateStr}T00:00:00`);
  const activeTasksForSelectedDate = goals.flatMap((goal) =>
    goal.tasks
      .filter((task) => isTaskActiveOnDate(task, selectedDateObj))
      .map((task) => ({
        goalName: goal.name,
        task
      }))
  );

  return (
    <section className="page page-enter" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1.5fr)', gap: '24px', alignItems: 'start' }}>
      
      {/* Left Column: The Interactive Heatmap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="section-head" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Global Calendar</h1>
            <p className="lead" style={{ margin: 0 }}>Heatmap evaluation of your scheduled workloads.</p>
          </div>
          
          {totalMonthlyTasks > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--accent)' }}>
                {totalMonthlyTasks}
              </span>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>MONTHLY ACTIONS</span>
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
              if (cell.count > 0 && cell.count <= 2) heatStyle = { background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.2)' };
              if (cell.count > 2 && cell.count <= 5) heatStyle = { background: 'rgba(124, 58, 237, 0.25)', borderColor: 'var(--accent)' };
              if (cell.count > 5) heatStyle = { background: 'var(--accent)', color: 'white' };
              
              if (isToday) {
                heatStyle = { ...heatStyle, background: 'var(--panel)', border: '2px solid var(--good)', color: 'var(--text)' };
              }

              if (isSelected && !!cell.day) {
                heatStyle = { ...heatStyle, outline: '3px solid var(--text)', outlineOffset: '2px' };
              }

              return (
                <div
                  key={`${cell.dateKey}-${index}`}
                  className={isToday ? 'day-cell today' : 'day-cell'}
                  onClick={() => { if (cell.day) setSelectedDateStr(cell.dateKey); }}
                  style={{ 
                    borderRadius: '12px', 
                    minHeight: compactCalendar ? '60px' : '100px', 
                    border: '1px solid var(--line)',
                    ...heatStyle,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: compactCalendar ? 'center' : 'flex-start',
                    padding: compactCalendar ? '0' : '8px',
                    cursor: cell.day ? 'pointer' : 'default',
                    opacity: cell.day ? 1 : 0
                  }}
                >
                  {cell.day && (
                     <>
                       <strong style={{ fontSize: '0.95rem', color: isToday ? 'var(--good)' : '' }}>{cell.day}</strong>
                        
                        {cell.count > 0 && !compactCalendar && (
                          <small style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {cell.count > 5 ? <Flame size={12} color="#f59e0b" /> : null}
                            {cell.count} {cell.count === 1 ? 'task' : 'tasks'}
                          </small>
                        )}
                        {cell.count > 0 && compactCalendar && (
                           <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginTop: '4px' }} />
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
            <CalendarDays size={20} color="var(--accent)" /> Schedule For
         </h3>
         <div style={{ padding: '16px 20px', background: 'var(--panel)', border: 'var(--glass-border)', borderRadius: '16px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{selectedDateObj.getDate()}</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 600 }}>{selectedDateObj.toLocaleString('en-US', { month: 'short' })}, {selectedDateObj.getFullYear()}</span>
            {selectedDateStr === todayKey && <span className="meta-chip good" style={{ marginLeft: 'auto' }}>Today</span>}
         </div>

         <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--panel-strong)', border: '1px solid var(--line)' }}>
            {activeTasksForSelectedDate.length === 0 ? (
               <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                 <CheckCircle2 size={40} opacity={0.5} />
                 <span style={{ fontWeight: 500 }}>No operations scheduled.</span>
               </div>
            ) : (
               <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                 {activeTasksForSelectedDate.map((t, idx) => (
                   <li key={idx} style={{ padding: '16px', borderBottom: idx !== activeTasksForSelectedDate.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                     <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text)' }}>{t.task.title}</span>
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                       <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
                         <Target size={12} /> {t.goalName}
                       </small>
                       {t.task.timeEstimate && <span className="meta-chip" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>⏱ {t.task.timeEstimate}</span>}
                     </div>
                   </li>
                 ))}
               </ul>
            )}
         </div>
      </div>
    </section>
  );
}

export default CalendarPage;
