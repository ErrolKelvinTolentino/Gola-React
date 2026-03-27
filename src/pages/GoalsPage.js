import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, RotateCw, Calendar as CalendarIcon, CheckCircle2, Cpu, Edit2, Trophy, MessageSquare, Plus } from 'lucide-react';
import { getGoalProgress, getDateKey } from '../utils/dateUtils';
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

const FieldBox = ({ children, style }) => (
  <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)', display: 'grid', gap: '16px', ...style }}>
    {children}
  </div>
);

function GoalTaskForm({ title, subtitle, form, onChange, onSubmit, onCancel, weekDays, isEdit, toggleSpecificDayHandler }) {
  // A completely revitalized form avoiding dark inputs blending into dark backgrounds.
  return (
    <form className="modal-form" onSubmit={onSubmit} style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>{subtitle}</p>
      </div>

      <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600 }}>
        Title
        <input type="text" placeholder="What needs to get done?" value={form.title} onChange={e => onChange({ title: e.target.value })} required />
      </label>

      <FieldBox>
        <div className="task-form-row">
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
            Time Estimate & Duration
            <select value={form.timeEstimate || '30m'} onChange={e => onChange({ timeEstimate: e.target.value })}>
              <option value="15m">15 min (Quick Win)</option>
              <option value="30m">30 min (Standard)</option>
              <option value="1h">1 hour (Focused)</option>
              <option value="2h+">2+ hours (Deep Work)</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
            Energy Context
            <select value={form.energy || 'Medium'} onChange={e => onChange({ energy: e.target.value })}>
              <option value="Low">Low (Maintenance/Admin)</option>
              <option value="Medium">Medium (Standard)</option>
              <option value="High">High (Creative/Complex)</option>
            </select>
          </label>
        </div>
      </FieldBox>

      <FieldBox style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <div className="task-form-row">
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
            Execution Rhythm
            <select value={form.recurrenceType} onChange={e => onChange({ recurrenceType: e.target.value })}>
              <option value="one-time">One-time / Milestone</option>
              <option value="daily">Daily Habit</option>
              <option value="weekly">Weekly Routine</option>
              <option value="specific-days">Specific Days</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
            Hard Deadline
            <input type="date" value={form.deadline || ''} onChange={e => onChange({ deadline: e.target.value })} />
          </label>
        </div>

        {form.recurrenceType === 'one-time' && (
          <div style={{ animation: 'elegantFadeIn 0.2s ease forwards' }}>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
              Specific Scheduled Date (Optional)
              <input type="date" value={form.oneTimeDate || ''} onChange={e => onChange({ oneTimeDate: e.target.value })} />
            </label>
          </div>
        )}

        {form.recurrenceType === 'weekly' && (
          <div style={{ animation: 'elegantFadeIn 0.2s ease forwards' }}>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
              Day of the week
              <select value={form.weeklyDay} onChange={e => onChange({ weeklyDay: Number(e.target.value) })}>
                {weekDays.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          </div>
        )}

        {form.recurrenceType === 'specific-days' && (
          <div className="week-picker" style={{ animation: 'elegantFadeIn 0.2s ease forwards', gap: '6px', marginTop: '4px' }}>
            {weekDays.map((day, i) => (
              <button 
                key={day} type="button" 
                className={form.specificDays.includes(i) ? 'day-chip active' : 'day-chip'} 
                onClick={() => toggleSpecificDayHandler(i)}
                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', background: form.specificDays.includes(i) ? 'var(--accent)' : 'var(--panel)', color: form.specificDays.includes(i) ? '#fff' : 'var(--muted)' }}
              >{day}</button>
            ))}
          </div>
        )}
      </FieldBox>

      <div className="modal-actions" style={{ marginTop: '12px' }}>
        <button type="button" className="ghost-btn" onClick={onCancel} style={{ padding: '12px 24px' }}>Cancel</button>
        <button type="submit" className="primary-btn" style={{ padding: '12px 24px' }}>{isEdit ? 'Save Changes' : 'Append Action'}</button>
      </div>
    </form>
  );
}

function TaskEditWrapper({ task, updateTask, goalId, onDone, weekDays }) {
  const [form, setForm] = useState({ 
    ...task, 
    timeEstimate: task.timeEstimate || '30m', 
    energy: task.energy || 'Medium' 
  });
  const onChange = (payload) => setForm(f => ({ ...f, ...payload }));
  const toggleDay = (idx) => {
    const nextDays = form.specificDays.includes(idx) ? form.specificDays.filter(d => d !== idx) : [...form.specificDays, idx];
    onChange({ specificDays: nextDays.sort((a,b)=>a-b) });
  };
  const onSubmit = (e) => {
    e.preventDefault();
    updateTask(goalId, task.id, form);
    onDone();
  };
  return <GoalTaskForm title="Edit Task metrics" subtitle="Adjust parameters and timelines." form={form} onChange={onChange} toggleSpecificDayHandler={toggleDay} onSubmit={onSubmit} onCancel={onDone} weekDays={weekDays} isEdit />;
}

function AssessmentModal({ goal, onComplete, onCancel, theme }) {
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState('Satisfactory (Target hit with expected results)');

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({ reflection, rating, completedAt: getDateKey(new Date()) });
  };

  return (
    <ModalOverlay onClose={onCancel} theme={theme}>
      <form className="modal-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', maxWidth: '440px', width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><Trophy size={48} color="#10b981" /></div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>Target Achieved</h3>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>You've reached 100% completion for "{goal.name}". Take a moment to document your execution performance.</p>
        </div>

        <FieldBox>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600 }}>
            Execution Rating
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option>Outstanding (Exceeded expectations & timelines)</option>
              <option>Satisfactory (Target hit with expected results)</option>
              <option>Challenging (Completed but required extensive effort/pivots)</option>
            </select>
          </label>
        </FieldBox>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600 }}>
          Reflection & Key Learnings
          <textarea rows="4" placeholder="What went well? What obstacles did you overcome? How can you apply this to future goals?" value={reflection} onChange={(e) => setReflection(e.target.value)} required />
        </label>

        <div className="modal-actions" style={{ marginTop: '8px' }}>
          <button type="button" className="ghost-btn" onClick={onCancel} style={{ padding: '12px 24px' }}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px' }}>Lock Goal Assessment</button>
        </div>
      </form>
    </ModalOverlay>
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
  updateTask,
  completeGoal,
  theme
}) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
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
    setEditingTask(null);
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

          {(() => {
            const progress = getGoalProgress(selectedGoal);
            const isCompleted = selectedGoal.status === 'completed';
            
            const oneTime = selectedGoal.tasks.filter(t => t.recurrenceType === 'one-time');
            const daily = selectedGoal.tasks.filter(t => t.recurrenceType === 'daily');
            const weekly = selectedGoal.tasks.filter(t => t.recurrenceType === 'weekly' || t.recurrenceType === 'specific-days');

            const renderList = (tasks, emptyObj) => {
              if (tasks.length === 0 && !emptyObj) return null;
              return (
                <div style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '24px' }}>
                  <ul className="task-list" style={{ gap: '0' }}>
                    {tasks.length === 0 && emptyObj && (
                      <li className="empty-row" style={{ padding: '40px 20px', flexDirection: 'column', gap: '16px', background: 'transparent' }}>
                        <CheckCircle2 color="var(--muted)" size={48} />
                        <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text)' }}>{emptyObj.title}</div>
                        <p>{emptyObj.desc}</p>
                      </li>
                    )}
                    {tasks.map((task, idx) => {
                      const activeToday = isTaskActiveOnDate(task, today);
                      const doneToday = isTaskDoneForDate(task, today);
                      return (
                        <li 
                          key={task.id} 
                          className={doneToday ? 'done' : ''}
                          style={{
                            border: 'none',
                            borderBottom: idx === tasks.length - 1 ? 'none' : '1px solid var(--line)',
                            borderRadius: '0',
                            padding: '16px 24px',
                            background: doneToday ? 'var(--bg-2)' : 'var(--panel)',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            gap: '16px'
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={doneToday}
                                onChange={() => toggleTaskDoneForToday(selectedGoal.id, task.id)}
                                style={{ width: '22px', height: '22px', marginRight: '8px' }}
                              />
                              <span style={{ fontWeight: 600 }}>{task.title}</span>
                            </label>
                            <div className="task-meta" style={{ marginTop: '8px', paddingLeft: '30px' }}>
                              <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RotateCw size={14} /> {getRecurrenceText(task)}
                              </small>
                              {task.timeEstimate && <span className="meta-chip">⏱ {task.timeEstimate}</span>}
                              {task.energy && <span className="meta-chip">⚡ {task.energy}</span>}
                              <span className={activeToday ? 'meta-chip good' : 'meta-chip'}>
                                {activeToday ? 'Active today' : 'Not today'}
                              </span>
                              {task.deadline && (
                                <span className="meta-chip highlight">
                                  <CalendarIcon size={12} /> {prettyDate(task.deadline)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button className="ghost-btn" style={{ padding: '8px' }} onClick={() => setEditingTask(task)} title="Edit Task metrics">
                            <Edit2 size={16} color="var(--muted)" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            };

            return (
              <>
                {progress === 100 && !isCompleted && (
                  <div style={{ animation: 'elegantFadeIn 0.4s ease forwards', padding: '24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} /> Goal Fully Executed!
                      </h4>
                      <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem', opacity: 0.9 }}>You've hit 100% execution on this pipeline. It's time to reflect and close it out.</p>
                    </div>
                    <button className="primary-btn" onClick={() => setIsAssessmentModalOpen(true)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', flexShrink: 0 }}>
                      Complete Goal
                    </button>
                  </div>
                )}

                {isCompleted && selectedGoal.assessment && (
                  <div style={{ animation: 'elegantFadeIn 0.4s ease forwards', padding: '24px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: '16px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Trophy size={20} color="#10b981" />
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>Completed Goal Assessment</h4>
                      <span className="meta-chip good" style={{ marginLeft: 'auto', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{selectedGoal.assessment.rating}</span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>"{selectedGoal.assessment.reflection}"</p>
                  </div>
                )}

                <div className="section-head compact" style={{ marginTop: '16px' }}>
                  <h3>Milestones & One-Time Actions</h3>
                </div>
                {renderList(oneTime, { title: 'No milestones mapped.', desc: 'Create one-time actionable steps for this goal.' })}

                {(daily.length > 0 || weekly.length > 0) && (
                  <div className="section-head compact" style={{ marginTop: '32px' }}>
                    <h3>Recurring Execution Flow</h3>
                  </div>
                )}
                {renderList(daily)}
                {renderList(weekly)}
              </>
            );
          })()}
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
                style={{ padding: '24px', display: 'grid', gap: '6px', textAlign: 'left', borderRadius: '16px', gridTemplateColumns: '1fr auto', boxAlign: 'center', alignItems: 'center' }} 
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
                
                <div className="two-col-equal">
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
            title="Append New Task"
            subtitle="Compose one-time or recurring actions for this goal."
            goalId={selectedGoal.id}
            form={getTaskForm(selectedGoal.id)}
            onChange={(payload) => updateTaskForm(selectedGoal.id, payload)}
            onSubmit={(e) => { addTaskToGoal(selectedGoal.id, e); setIsTaskModalOpen(false); }}
            toggleSpecificDayHandler={(idx) => toggleSpecificDay(selectedGoal.id, idx)}
            weekDays={weekDays}
            onCancel={() => setIsTaskModalOpen(false)}
            isEdit={false}
          />
        </ModalOverlay>
      )}

      {editingTask && selectedGoal && (
        <ModalOverlay onClose={() => setEditingTask(null)} theme={theme}>
          <TaskEditWrapper
            task={editingTask}
            updateTask={updateTask}
            goalId={selectedGoal.id}
            weekDays={weekDays}
            onDone={() => setEditingTask(null)}
          />
        </ModalOverlay>
      )}

      {isAssessmentModalOpen && selectedGoal && (
        <AssessmentModal
          goal={selectedGoal}
          theme={theme}
          onCancel={() => setIsAssessmentModalOpen(false)}
          onComplete={(payload) => {
            completeGoal(selectedGoal.id, payload);
            setIsAssessmentModalOpen(false);
          }}
        />
      )}
    </section>
  );
}

export default GoalsPage;
