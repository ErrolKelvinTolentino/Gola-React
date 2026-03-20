import React from 'react';
import { Target, RotateCw, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

function TasksPage({ activeTasksToday, today, isTaskDoneForDate, toggleTaskDoneForToday, getRecurrenceText, prettyDate }) {
  
  const pendingTasks = activeTasksToday.filter(t => !isTaskDoneForDate(t.task, today));
  const completedTasks = activeTasksToday.filter(t => isTaskDoneForDate(t.task, today));
  
  const completionPercentage = activeTasksToday.length > 0 
    ? Math.round((completedTasks.length / activeTasksToday.length) * 100) 
    : 0;

  return (
    <section className="page page-enter">
      <div className="section-head" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Execution Terminal</h1>
          <p className="lead" style={{ margin: 0 }}>All daily active priorities gathered from your global workspace.</p>
        </div>
        
        {activeTasksToday.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: completionPercentage === 100 ? 'var(--good)' : 'var(--text)' }}>
              {completionPercentage}%
            </span>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>COMPLETED TODAY</span>
          </div>
        )}
      </div>

      {activeTasksToday.length === 0 ? (
        <div className="card premium-surface" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '2px dashed var(--line)' }}>
          <CheckCircle2 color="var(--good)" size={48} />
          <div style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text)' }}>You're all caught up!</div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>No active tasks scheduled for today. Take a break or map out new goals.</p>
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
                          onChange={() => toggleTaskDoneForToday(goalId, task.id)}
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
                <CheckCircle2 size={16} /> Completed <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>({completedTasks.length})</span>
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
                          onChange={() => toggleTaskDoneForToday(goalId, task.id)}
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
                        <span className="meta-chip good" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Finished today</span>
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
