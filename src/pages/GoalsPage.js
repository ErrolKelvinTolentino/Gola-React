import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, RotateCw, Calendar as CalendarIcon, CheckCircle2, Cpu } from 'lucide-react';
import { getGoalProgress } from '../utils/dateUtils';
import AiGoalWizard from '../components/AiGoalWizard';

function ModalOverlay({ onClose, children, theme }) {
  return createPortal(
    <div className={`modal-backdrop theme-${theme}`} onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function GoalTaskForm({ goalId, form, updateTaskForm, addTaskToGoal, toggleSpecificDay, weekDays, onDone }) {
  const handleSubmit = (event) => {
    addTaskToGoal(goalId, event);
    onDone();
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="section-head">
        <h3>Add Task</h3>
        <p>Compose one-time or recurring actions for this goal.</p>
      </div>

      <input
        type="text"
        placeholder="Task name"
        value={form.title}
        onChange={(event) => updateTaskForm(goalId, { title: event.target.value })}
        required
      />

      <div className="task-form-row">
        <label>
          Recurrence
          <select
            value={form.recurrenceType}
            onChange={(event) => updateTaskForm(goalId, { recurrenceType: event.target.value })}
          >
            <option value="one-time">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="specific-days">Specific days</option>
          </select>
        </label>

        <label>
          Deadline (Optional)
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => updateTaskForm(goalId, { deadline: event.target.value })}
          />
        </label>
      </div>

      <div className="task-form-row">
        <label>
          Time Estimate
          <select
            value={form.timeEstimate}
            onChange={(event) => updateTaskForm(goalId, { timeEstimate: event.target.value })}
          >
            <option value="15m">15 min (Quick Win)</option>
            <option value="30m">30 min (Standard)</option>
            <option value="1h">1 hour (Focused)</option>
            <option value="2h+">2+ hours (Deep Work)</option>
          </select>
        </label>

        <label>
          Energy Context
          <select
            value={form.energy}
            onChange={(event) => updateTaskForm(goalId, { energy: event.target.value })}
          >
            <option value="Low">Low (Maintenance/Admin)</option>
            <option value="Medium">Medium (Standard)</option>
            <option value="High">High (Creative/Complex)</option>
          </select>
        </label>
      </div>

      {form.recurrenceType === 'one-time' && (
        <label>
          Task date
          <input
            type="date"
            value={form.oneTimeDate}
            onChange={(event) => updateTaskForm(goalId, { oneTimeDate: event.target.value })}
          />
        </label>
      )}

      {form.recurrenceType === 'weekly' && (
        <label>
          Weekly on
          <select
            value={form.weeklyDay}
            onChange={(event) => updateTaskForm(goalId, { weeklyDay: Number(event.target.value) })}
          >
            {weekDays.map((day, dayIndex) => (
              <option key={day} value={dayIndex}>{day}</option>
            ))}
          </select>
        </label>
      )}

      {form.recurrenceType === 'specific-days' && (
        <div className="week-picker">
          {weekDays.map((day, dayIndex) => (
            <button
              key={day}
              type="button"
              className={form.specificDays.includes(dayIndex) ? 'day-chip active' : 'day-chip'}
              onClick={() => toggleSpecificDay(goalId, dayIndex)}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="ghost-btn" onClick={onDone}>Cancel</button>
        <button className="primary-btn" type="submit">Add Task</button>
      </div>
    </form>
  );
}

function GoalsPage({
  goals,
  selectedGoal,
  selectedGoalId,
  setSelectedGoalId,
  allTaskCount,
  getTaskForm,
  updateTaskForm,
  addTaskToGoal,
  toggleSpecificDay,
  weekDays,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  toggleTaskDoneForToday,
  getRecurrenceText,
  prettyDate,
  today,
  isGoalModalOpen,
  openGoalModal,
  closeGoalModal,
  goalName,
  setGoalName,
  goalVision,
  setGoalVision,
  addGoal,
  theme
}) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState(null);

  useEffect(() => {
    if (!isGoalModalOpen) {
      setCreationMode(null);
    }
  }, [isGoalModalOpen]);

  const handleOpenGoal = (goalId) => {
    setSelectedGoalId(goalId);
    setIsTaskModalOpen(false);
  };

  const handleBackToGoals = () => {
    setSelectedGoalId(null);
    setIsTaskModalOpen(false);
  };

  return (
    <section className="page page-enter goals-page">
      <div className="goals-head">
        <div>
          <h1>Goals Workspace</h1>
          <p className="lead">Start with your goals list. Open one to manage tasks.</p>
        </div>
        <div className="goals-summary card">
          <strong>{goals.length}</strong>
          <span>Goals</span>
          <strong>{allTaskCount}</strong>
          <span>Tasks</span>
        </div>
      </div>

      {!selectedGoal && (
        <div className="goals-grid-list">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <button
                key={goal.id}
                type="button"
                className="goal-nav"
                onClick={() => handleOpenGoal(goal.id)}
              >
                <div className="goal-nav-top">
                  <strong>{goal.name}</strong>
                  <span>{progress}%</span>
                </div>
                <small>{goal.vision}</small>
                <small>{goal.tasks.length} tasks</small>
                <div className="goal-progress">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedGoal && (
        <div className="card goal-detail-pane premium-surface goals-detail-shell">
          <div className="goals-detail-header">
            <button type="button" className="ghost-btn back-goals-btn" onClick={handleBackToGoals}>
              Back to goals
            </button>
            <button type="button" className="primary-btn add-task-btn" onClick={() => setIsTaskModalOpen(true)}>
              Add Task
            </button>
          </div>

          <div className="goal-head" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>{selectedGoal.name}</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '24px' }}>{selectedGoal.vision}</p>
            
            <div style={{ padding: '20px', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--text)' }}>Execution Progress</span>
                <span style={{ color: 'var(--accent)' }}>{getGoalProgress(selectedGoal)}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--panel)', borderRadius: '99px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ width: `${getGoalProgress(selectedGoal)}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
            </div>
          </div>

          <div className="section-head compact">
            <h3>Tasks in Goal</h3>
            <p>Mark progress for today directly from this view.</p>
          </div>

          <div style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--line)' }}>
            <ul className="task-list interactive" style={{ gap: '0' }}>
              {selectedGoal.tasks.length === 0 && (
                <li className="empty-row" style={{ padding: '40px 20px', flexDirection: 'column', gap: '16px', background: 'transparent' }}>
                  <CheckCircle2 color="var(--muted)" size={48} />
                  <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text)' }}>No tasks here yet.</div>
                  <p>Add some actionable steps to make progress on this goal.</p>
                </li>
              )}
              {selectedGoal.tasks.map((task, idx) => {
                const activeToday = isTaskActiveOnDate(task, today);
                const doneToday = isTaskDoneForDate(task, today);
                return (
                  <li 
                    key={task.id} 
                    className={doneToday ? 'done' : ''}
                    style={{
                      border: 'none',
                      borderBottom: idx === selectedGoal.tasks.length - 1 ? 'none' : '1px solid var(--line)',
                      borderRadius: '0',
                      padding: '16px 24px',
                      background: doneToday ? 'var(--bg-2)' : 'var(--panel)',
                    }}
                  >
                    <label style={{ fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={doneToday}
                        onChange={() => toggleTaskDoneForToday(selectedGoal.id, task.id)}
                        style={{ width: '22px', height: '22px', marginRight: '6px' }}
                      />
                      <span>{task.title}</span>
                    </label>
                    <div className="task-meta">
                      <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RotateCw size={14} /> {getRecurrenceText(task)}
                      </small>
                      {task.timeEstimate && (
                        <span className="meta-chip">⏱ {task.timeEstimate}</span>
                      )}
                      {task.energy && (
                        <span className="meta-chip">⚡ {task.energy}</span>
                      )}
                      <span className={activeToday ? 'meta-chip good' : 'meta-chip'}>
                        {activeToday ? 'Active today' : 'Not today'}
                      </span>
                      {task.deadline && (
                        <span className="meta-chip highlight">
                          <CalendarIcon size={12} /> {prettyDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!selectedGoal && (
        <button type="button" className="fab-goal" onClick={openGoalModal} aria-label="Add goal">
          +
        </button>
      )}

      {isGoalModalOpen && (
        <ModalOverlay onClose={closeGoalModal} theme={theme}>
          {!creationMode && (
            <div style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>Initialize New Target</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>Are you defining this manually or would you like AI to construct your execution roadmap?</p>
              </div>
              <button 
                className="ghost-btn" 
                style={{ padding: '24px', border: '2px solid var(--line)', display: 'grid', gap: '6px', textAlign: 'left', borderRadius: '16px' }} 
                onClick={() => setCreationMode('manual')}
              >
                <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>Create Manually</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Input your goal, description, strict deadlines, and manually map out your actions.</span>
              </button>
              <button 
                className="primary-btn" 
                style={{ padding: '24px', display: 'grid', gap: '6px', textAlign: 'left', borderRadius: '16px', gridTemplateColumns: 'minmax(0,1fr) auto', boxAlign: 'center', alignItems: 'center' }} 
                onClick={() => setCreationMode('ai')}
              >
                <div>
                  <strong style={{ fontSize: '1.1rem', display: 'block' }}>Plan with AI Workspace</strong>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', display: 'block' }}>Complete a quick parameterization and let the AI generate a tactical checklist.</span>
                </div>
                <Cpu size={32} style={{ opacity: 0.8 }} />
              </button>
            </div>
          )}

          {creationMode === 'manual' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>Create Goal Manually</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>Explicitly define your goal metrics and strict timelines.</p>
              </div>
              <form className="modal-form" onSubmit={addGoal} style={{ display: 'grid', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
                  Goal name
                  <input type="text" placeholder="Enter target objective" value={goalName} onChange={(e) => setGoalName(e.target.value)} required />
                </label>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
                  Description & Definition
                  <textarea rows="3" placeholder="What does success look like?" value={goalVision} onChange={(e) => setGoalVision(e.target.value)} />
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
                    Global Deadline (Optional)
                    <input type="date" />
                  </label>
                  <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
                    Prioritization
                    <select>
                      <option>High Priority</option>
                      <option>Medium Priority</option>
                      <option>Low Priority</option>
                    </select>
                  </label>
                </div>

                <div className="modal-actions" style={{ marginTop: '16px' }}>
                  <button type="button" className="ghost-btn" onClick={() => setCreationMode(null)}>Back</button>
                  <button type="submit" className="primary-btn">Save Goal</button>
                </div>
              </form>
            </>
          )}

          {creationMode === 'ai' && (
            <AiGoalWizard 
              goalName={goalName}
              setGoalName={setGoalName}
              goalVision={goalVision}
              setGoalVision={setGoalVision}
              onCancel={() => setCreationMode(null)}
              onSaveWithTasks={(tasks) => addGoal(tasks)}
            />
          )}

        </ModalOverlay>
      )}

      {isTaskModalOpen && selectedGoal && (
        <ModalOverlay onClose={() => setIsTaskModalOpen(false)} theme={theme}>
          <GoalTaskForm
            goalId={selectedGoal.id}
            form={getTaskForm(selectedGoal.id)}
            updateTaskForm={updateTaskForm}
            addTaskToGoal={addTaskToGoal}
            toggleSpecificDay={toggleSpecificDay}
            weekDays={weekDays}
            onDone={() => setIsTaskModalOpen(false)}
          />
        </ModalOverlay>
      )}
    </section>
  );
}

export default GoalsPage;
