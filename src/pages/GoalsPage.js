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
  <div style={{ padding: 'clamp(10px, 1.8vw, 14px)', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)', display: 'grid', gap: 'clamp(10px, 1.5vw, 14px)', ...style }}>
    {children}
  </div>
);

const StepBadge = ({ active, done, children }) => (
  <span
    style={{
      width: '26px',
      height: '26px',
      borderRadius: '999px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.76rem',
      fontWeight: 700,
      border: done || active ? '1px solid transparent' : '1px solid var(--line)',
      background: done ? 'linear-gradient(135deg, #10b981, #14b8a6)' : active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--panel)',
      color: done || active ? '#fff' : 'var(--muted)'
    }}
  >
    {done ? '✓' : children}
  </span>
);

function FormStepHeader({ step, labels, title, subtitle }) {
  return (
    <div style={{ display: 'grid', gap: '10px', marginBottom: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        {labels.map((label, idx) => {
          const stepIndex = idx + 1;
          const active = step === stepIndex;
          const done = step > stepIndex;
          return (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '10px',
                border: active ? '1px solid color-mix(in oklab, var(--accent) 50%, transparent)' : '1px solid var(--line)',
                background: active ? 'color-mix(in oklab, var(--accent) 10%, var(--panel))' : 'var(--panel)'
              }}
            >
              <StepBadge active={active} done={done}>{stepIndex}</StepBadge>
              <span style={{ fontSize: '0.78rem', color: active ? 'var(--text)' : 'var(--muted)', fontWeight: 600 }}>{label}</span>
            </div>
          );
        })}
      </div>
      <div>
        <h3 style={{ margin: '0 0 2px', fontSize: '1.15rem' }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.35 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function GoalTaskForm({ title, subtitle, form, onChange, onSubmit, onCancel, weekDays, isEdit, toggleSpecificDayHandler }) {
  const [step, setStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (step < 3) {
      nextStep();
      return;
    }
    onSubmit(event);
  };

  const cadenceLabel =
    form.recurrenceType === 'one-time'
      ? 'One-time milestone'
      : form.recurrenceType === 'daily'
        ? 'Daily habit'
        : form.recurrenceType === 'weekly'
          ? `Weekly on ${weekDays[form.weeklyDay]}`
          : `Specific days (${form.specificDays.map((d) => weekDays[d]).join(', ') || 'none'})`;

  return (
    <form className="modal-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', width: 'min(100%, 760px)', margin: '0 auto' }}>
      <FormStepHeader
        step={step}
        labels={['Core', 'Schedule', 'Review']}
        title={title}
        subtitle={subtitle}
      />

      {step === 1 && (
        <>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.93rem', fontWeight: 600 }}>
            Task title
            <input type="text" placeholder="What needs to get done?" value={form.title} onChange={e => onChange({ title: e.target.value })} required />
          </label>

          <FieldBox>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Time estimate
                <select value={form.timeEstimate || '30m'} onChange={e => onChange({ timeEstimate: e.target.value })}>
                  <option value="15m">15 min (Quick Win)</option>
                  <option value="30m">30 min (Standard)</option>
                  <option value="1h">1 hour (Focused)</option>
                  <option value="2h+">2+ hours (Deep Work)</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Energy context
                <select value={form.energy || 'Medium'} onChange={e => onChange({ energy: e.target.value })}>
                  <option value="Low">Low (Maintenance/Admin)</option>
                  <option value="Medium">Medium (Standard)</option>
                  <option value="High">High (Creative/Complex)</option>
                </select>
              </label>
            </div>
          </FieldBox>
        </>
      )}

      {step === 2 && (
        <>
          <FieldBox style={{ background: 'color-mix(in oklab, var(--accent) 6%, var(--panel))', borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--line))' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Execution rhythm
                <select value={form.recurrenceType} onChange={e => onChange({ recurrenceType: e.target.value })}>
                  <option value="one-time">One-time / Milestone</option>
                  <option value="daily">Daily Habit</option>
                  <option value="weekly">Weekly Routine</option>
                  <option value="specific-days">Specific Days</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Hard deadline
                <input type="date" value={form.deadline || ''} onChange={e => onChange({ deadline: e.target.value })} />
              </label>
            </div>

            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowAdvanced((prev) => !prev)}
              style={{ justifySelf: 'start', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              {showAdvanced ? 'Hide cadence details' : 'Show cadence details'}
            </button>

            {showAdvanced && (
              <div style={{ display: 'grid', gap: '10px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
                {form.recurrenceType === 'one-time' && (
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                    Specific scheduled date (optional)
                    <input type="date" value={form.oneTimeDate || ''} onChange={e => onChange({ oneTimeDate: e.target.value })} />
                  </label>
                )}

                {form.recurrenceType === 'weekly' && (
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                    Day of the week
                    <select value={form.weeklyDay} onChange={e => onChange({ weeklyDay: Number(e.target.value) })}>
                      {weekDays.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </label>
                )}

                {form.recurrenceType === 'specific-days' && (
                  <div className="week-picker" style={{ gap: '6px', marginTop: '2px' }}>
                    {weekDays.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        className={form.specificDays.includes(i) ? 'day-chip active' : 'day-chip'}
                        onClick={() => toggleSpecificDayHandler(i)}
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', background: form.specificDays.includes(i) ? 'var(--accent)' : 'var(--panel)', color: form.specificDays.includes(i) ? '#fff' : 'var(--muted)' }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FieldBox>
        </>
      )}

      {step === 3 && (
        <FieldBox style={{ background: 'color-mix(in oklab, var(--panel) 88%, #10b981 12%)' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', alignItems: 'start' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Task</strong>
              <span style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600 }}>{form.title || 'Untitled task'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', alignItems: 'start' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Effort profile</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{form.timeEstimate || '30m'} • {form.energy || 'Medium'} energy</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', alignItems: 'start' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Cadence</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{cadenceLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', alignItems: 'start' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Deadline</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{form.deadline || 'No hard deadline'}</span>
            </div>
          </div>
        </FieldBox>
      )}

      <div className="modal-actions" style={{ marginTop: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ghost-btn" onClick={onCancel} style={{ padding: '10px 16px' }}>Cancel</button>
          {step > 1 && (
            <button type="button" className="ghost-btn" onClick={prevStep} style={{ padding: '10px 16px' }}>
              Back
            </button>
          )}
        </div>
        <button type="submit" className="primary-btn" style={{ padding: '10px 18px' }}>
          {step < 3 ? 'Continue' : isEdit ? 'Save Changes' : 'Append Action'}
        </button>
      </div>
    </form>
  );
}

function ManualGoalWizard({ goalName, setGoalName, goalVision, setGoalVision, onBack, onSubmit }) {
  const [step, setStep] = useState(1);
  const [showConstraints, setShowConstraints] = useState(false);
  const [priority, setPriority] = useState('High Priority');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (step < 3) {
      setStep((prev) => Math.min(prev + 1, 3));
      return;
    }
    onSubmit(event);
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', width: 'min(100%, 760px)', margin: '0 auto' }}>
      <FormStepHeader
        step={step}
        labels={['Objective', 'Constraints', 'Review']}
        title="Create Goal Manually"
        subtitle="Define target scope first, then add constraints only if needed."
      />

      {step === 1 && (
        <>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.92rem', fontWeight: 600 }}>
            Goal name
            <input type="text" placeholder="Enter target objective" value={goalName} onChange={(e) => setGoalName(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.92rem', fontWeight: 600 }}>
            Description and definition
            <textarea rows="3" placeholder="What does success look like?" value={goalVision} onChange={(e) => setGoalVision(e.target.value)} />
          </label>
        </>
      )}

      {step === 2 && (
        <FieldBox>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowConstraints((prev) => !prev)}
            style={{ justifySelf: 'start', padding: '8px 12px', fontSize: '0.82rem' }}
          >
            {showConstraints ? 'Hide optional constraints' : 'Add optional constraints'}
          </button>

          {showConstraints && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Global deadline
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600 }}>
                Prioritization
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option>High Priority</option>
                  <option>Medium Priority</option>
                  <option>Low Priority</option>
                </select>
              </label>
            </div>
          )}
        </FieldBox>
      )}

      {step === 3 && (
        <FieldBox style={{ background: 'color-mix(in oklab, var(--panel) 90%, #3b82f6 10%)' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Goal</strong>
              <span style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600 }}>{goalName || 'Untitled goal'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Description</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{goalVision || 'No description added'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Constraints</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                {showConstraints ? `${priority}${deadline ? ` • Deadline: ${deadline}` : ''}` : 'No constraints added'}
              </span>
            </div>
          </div>
        </FieldBox>
      )}

      <div className="modal-actions" style={{ marginTop: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
          {step > 1 && (
            <button type="button" className="ghost-btn" onClick={() => setStep((prev) => Math.max(prev - 1, 1))}>
              Previous
            </button>
          )}
        </div>
        <button type="submit" className="primary-btn">{step < 3 ? 'Continue' : 'Save Goal'}</button>
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
  const [taskQuery, setTaskQuery] = useState('');
  const [taskQueryDraft, setTaskQueryDraft] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [showGoalOverview, setShowGoalOverview] = useState(false);
  const [denseMode, setDenseMode] = useState(true);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [pressedTaskId, setPressedTaskId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [addTaskHovered, setAddTaskHovered] = useState(false);

  useEffect(() => {
    if (!isGoalModalOpen) {
      setCreationMode(null);
    }
  }, [isGoalModalOpen]);

  const handleOpenGoal = (goalId) => {
    setSelectedGoalId(goalId);
    setIsTaskModalOpen(false);
    setTaskQuery('');
    setTaskQueryDraft('');
    setTaskFilter('all');
  };

  const handleBackToGoals = () => {
    setSelectedGoalId(null);
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskQuery('');
    setTaskQueryDraft('');
    setTaskFilter('all');
  };

  const taskMatches = (task) => {
    if (!selectedGoal) return false;
    const activeToday = isTaskActiveOnDate(task, today);
    const doneToday = isTaskDoneForDate(task, today);

    if (taskFilter === 'today' && !activeToday) return false;
    if (taskFilter === 'open' && doneToday) return false;
    if (taskFilter === 'done' && !doneToday) return false;

    if (!taskQuery.trim()) return true;
    const searchBlob = `${task.title} ${getRecurrenceText(task)} ${task.deadline || ''}`.toLowerCase();
    return searchBlob.includes(taskQuery.trim().toLowerCase());
  };

  const clearTaskControls = () => {
    setTaskQuery('');
    setTaskQueryDraft('');
    setTaskFilter('all');
  };

  const applyTaskSearch = () => {
    setTaskQuery(taskQueryDraft.trim());
  };

  const visibleTaskCount = selectedGoal ? selectedGoal.tasks.filter(taskMatches).length : 0;
  const activeTaskCount = selectedGoal ? selectedGoal.tasks.filter((task) => isTaskActiveOnDate(task, today)).length : 0;
  const doneTaskCount = selectedGoal ? selectedGoal.tasks.filter((task) => isTaskDoneForDate(task, today)).length : 0;

  return (
    <section className="page page-enter goals-page">
      {!selectedGoal && (
        <div className="goals-head" style={{ marginBottom: '20px' }}>
          <div>
            <h1>Goals Workspace</h1>
            <p className="lead" style={{ marginBottom: 0 }}>Start with your goals list. Open one to manage tasks.</p>
          </div>
          <div className="goals-summary card" style={{ padding: '10px 14px', minWidth: '116px', gap: '4px 10px' }}>
            <strong>{goals.length}</strong>
            <span>Goals</span>
            <strong>{allTaskCount}</strong>
            <span>Tasks</span>
          </div>
        </div>
      )}

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
        <div className="goals-detail-shell" style={{ padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
          <div
            style={{
              position: 'sticky',
              top: '-2px',
              zIndex: 6,
              display: 'grid',
              gap: '8px',
              padding: '12px',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, var(--panel-strong) 0%, var(--panel) 100%)',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="ghost-btn back-goals-btn" onClick={handleBackToGoals} style={{ padding: '8px 10px' }}>
                Back
              </button>
              <input
                type="text"
                value={taskQueryDraft}
                onChange={(e) => setTaskQueryDraft(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyTaskSearch();
                  }
                }}
                placeholder="Search tasks"
                style={{ width: '100%', padding: '10px 14px', minHeight: '40px', fontSize: '0.88rem', borderRadius: '999px', background: 'var(--bg-2)', border: searchFocused ? '1px solid var(--accent)' : '1px solid var(--line)', boxShadow: searchFocused ? '0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent)' : 'none', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={applyTaskSearch}
                style={{ padding: '8px 12px', fontSize: '0.78rem', background: 'var(--bg-2)', color: 'var(--muted)' }}
              >
                Search
              </button>
              <button
                type="button"
                className="primary-btn add-task-btn"
                onClick={() => setIsTaskModalOpen(true)}
                onMouseEnter={() => setAddTaskHovered(true)}
                onMouseLeave={() => setAddTaskHovered(false)}
                style={{ minWidth: '118px', minHeight: '40px', fontWeight: 700, boxShadow: addTaskHovered ? '0 14px 24px rgba(124, 58, 237, 0.42)' : '0 10px 22px rgba(124, 58, 237, 0.34)', transform: addTaskHovered ? 'translateY(-1px)' : 'translateY(0)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
              >
                Add Task
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  ['all', `All (${selectedGoal.tasks.length})`],
                  ['today', `Today (${activeTaskCount})`],
                  ['open', `Open (${selectedGoal.tasks.length - doneTaskCount})`],
                  ['done', `Done (${doneTaskCount})`]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={taskFilter === value ? 'day-chip active' : 'day-chip'}
                    onClick={() => setTaskFilter(value)}
                    style={{ padding: '6px 9px', fontSize: '0.75rem' }}
                  >
                    {label}
                  </button>
                ))}
                {(taskQuery || taskFilter !== 'all') && (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={clearTaskControls}
                    style={{ padding: '7px 10px', fontSize: '0.75rem' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', opacity: 0.86 }}>
                <span className="meta-chip" style={{ fontSize: '0.72rem', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--muted)' }}>Visible {visibleTaskCount}/{selectedGoal.tasks.length}</span>
                <span className="meta-chip good" style={{ fontSize: '0.72rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>Active {activeTaskCount}</span>
                <span className="meta-chip" style={{ fontSize: '0.72rem', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--muted)' }}>Done {doneTaskCount}</span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowGoalOverview((prev) => !prev)}
                style={{ padding: '7px 10px', fontSize: '0.74rem', background: 'transparent', color: 'var(--muted)' }}
              >
                {showGoalOverview ? 'Hide overview' : 'Show overview'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setDenseMode((prev) => !prev)}
                style={{ padding: '7px 10px', fontSize: '0.74rem', background: 'transparent', color: 'var(--muted)' }}
              >
                {denseMode ? 'Comfort' : 'Dense'}
              </button>
            </div>
          </div>
          </div>

          {showGoalOverview && (
            <div className="goal-head" style={{ marginBottom: '8px', paddingBottom: '8px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
              <h2 style={{ fontSize: '1.36rem', marginBottom: '4px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{selectedGoal.name}</h2>
              <p style={{ fontSize: '0.87rem', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.35 }}>{selectedGoal.vision}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <div className="meta-chip" style={{ padding: '8px 10px', justifyContent: 'center' }}>Tasks {selectedGoal.tasks.length}</div>
                <div className="meta-chip good" style={{ padding: '8px 10px', justifyContent: 'center' }}>Done {selectedGoal.tasks.filter((t) => isTaskDoneForDate(t, today)).length}</div>
                <div className="meta-chip" style={{ padding: '8px 10px', justifyContent: 'center' }}>Active {selectedGoal.tasks.filter((t) => isTaskActiveOnDate(t, today)).length}</div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text)' }}>Execution Progress</span>
                  <span style={{ color: 'var(--accent)' }}>{getGoalProgress(selectedGoal)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--panel)', borderRadius: '99px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: `${getGoalProgress(selectedGoal)}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              </div>
            </div>
          )}

          {(() => {
            const progress = getGoalProgress(selectedGoal);
            const isCompleted = selectedGoal.status === 'completed';
            
            const oneTime = selectedGoal.tasks.filter(t => t.recurrenceType === 'one-time');
            const daily = selectedGoal.tasks.filter(t => t.recurrenceType === 'daily');
            const weekly = selectedGoal.tasks.filter(t => t.recurrenceType === 'weekly' || t.recurrenceType === 'specific-days');

            const useUnifiedFinishedSection = taskFilter === 'all' || taskFilter === 'today' || taskFilter === 'done';
            const allFilteredTasks = selectedGoal.tasks.filter(taskMatches);
            const unifiedFinishedTasks = allFilteredTasks.filter((task) => isTaskDoneForDate(task, today));

            const renderTaskRows = (taskRows, keyPrefix = 'row') => (
              <ul className="task-list goals-task-list" style={{ gap: '0', alignContent: 'start' }}>
                {taskRows.map((task, idx) => {
                  const activeToday = isTaskActiveOnDate(task, today);
                  const doneToday = isTaskDoneForDate(task, today);
                  const rowKey = `${keyPrefix}-${task.id}-${task.recurrenceType || 'na'}-${task.deadline || 'na'}-${idx}`;
                  return (
                    <li
                      key={rowKey}
                      className={doneToday ? 'task-row goals-task-row done' : 'task-row goals-task-row'}
                      onMouseEnter={() => setHoveredTaskId(rowKey)}
                      onMouseLeave={() => {
                        setHoveredTaskId(null);
                        setPressedTaskId(null);
                      }}
                      onMouseDown={() => setPressedTaskId(rowKey)}
                      onMouseUp={() => setPressedTaskId(null)}
                      style={{
                        border: 'none',
                        borderBottom: idx === taskRows.length - 1 ? 'none' : '1px solid var(--line)',
                        borderRadius: '0',
                        padding: denseMode ? '8px 10px' : '11px 12px',
                        background: doneToday ? 'var(--bg-2)' : (idx % 2 === 0 ? 'var(--panel)' : 'var(--panel-strong)'),
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        alignItems: 'start',
                        gap: '10px',
                        animation: 'none',
                        opacity: 1,
                        width: '100%',
                        transform: pressedTaskId === rowKey ? 'scale(0.998)' : hoveredTaskId === rowKey ? 'translateY(-1px)' : 'translateY(0)',
                        boxShadow: hoveredTaskId === rowKey ? '0 8px 18px rgba(15, 23, 42, 0.09)' : 'none',
                        borderLeft: hoveredTaskId === rowKey || activeToday ? '2px solid color-mix(in oklab, var(--accent) 55%, transparent)' : '2px solid transparent',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-left-color 0.18s ease'
                      }}
                    >
                      <div>
                        <label style={{ fontSize: denseMode ? '0.9rem' : '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={doneToday}
                            onChange={() => toggleTaskDoneForToday(selectedGoal.id, task.id)}
                            style={{ width: denseMode ? '20px' : '22px', height: denseMode ? '20px' : '22px', marginRight: '8px' }}
                          />
                          <span style={{ fontWeight: 600 }}>{task.title}</span>
                        </label>
                        <div className="task-meta" style={{ marginTop: denseMode ? '4px' : '6px', paddingLeft: '28px', gap: '8px', justifyContent: 'flex-start' }}>
                          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', opacity: 0.9 }}>
                            <RotateCw size={14} /> {getRecurrenceText(task)}
                          </small>
                          {task.timeEstimate && <span className="meta-chip" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--muted)', opacity: 0.86 }}>⏱ {task.timeEstimate}</span>}
                          {task.energy && <span className="meta-chip" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--muted)', opacity: 0.86 }}>⚡ {task.energy}</span>}
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

                      <button className="ghost-btn" style={{ padding: denseMode ? '5px' : '6px', minHeight: denseMode ? '28px' : '30px', minWidth: denseMode ? '28px' : '30px' }} onClick={() => setEditingTask(task)} title="Edit Task metrics">
                        <Edit2 size={14} color="var(--muted)" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            );

            const renderList = (tasks, emptyObj) => {
              const filteredTasks = tasks.filter(taskMatches);
              const primaryTasks = useUnifiedFinishedSection
                ? filteredTasks.filter((task) => !isTaskDoneForDate(task, today))
                : filteredTasks;

              if (filteredTasks.length === 0 && !emptyObj) return null;

              if (primaryTasks.length === 0 && filteredTasks.length > 0) return null;

              return (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ padding: '0', overflow: 'visible', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '0', background: 'var(--panel-strong)', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)' }}>
                    {primaryTasks.length === 0 && emptyObj && (
                      <li className="empty-row" style={{ padding: '40px 20px', flexDirection: 'column', gap: '16px', background: 'transparent' }}>
                        <CheckCircle2 color="var(--muted)" size={48} />
                        <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text)' }}>{taskQuery ? 'No task matched your search/filter.' : emptyObj.title}</div>
                        <p style={{ margin: 0 }}>{taskQuery ? 'Try clearing search or switching filters.' : emptyObj.desc}</p>
                      </li>
                    )}
                    {primaryTasks.length > 0 && renderTaskRows(primaryTasks, 'primary')}
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display: 'grid', gap: '10px', paddingRight: '0', overflow: 'visible' }}>
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

                {taskFilter !== 'done' && (
                  <>
                    <div className="section-head compact" style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Milestones & One-Time Actions</h3>
                    </div>
                    {renderList(oneTime, { title: 'No milestones mapped.', desc: 'Create one-time actionable steps for this goal.' })}

                    {(daily.length > 0 || weekly.length > 0) && (
                      <div className="section-head compact" style={{ marginTop: '24px', marginBottom: '10px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
                        <h3 style={{ fontSize: '1.18rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Recurring Execution Flow</h3>
                      </div>
                    )}
                    {renderList(daily)}
                    {renderList(weekly)}
                  </>
                )}

                {useUnifiedFinishedSection && unifiedFinishedTasks.length > 0 && (
                  <div style={{ display: 'grid', gap: '8px', marginTop: taskFilter === 'done' ? '6px' : '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '2px' }}>
                      <CheckCircle2 size={14} color="var(--muted)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.01em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Finished Tasks ({unifiedFinishedTasks.length})
                      </span>
                    </div>
                    <div style={{ padding: '0', overflow: 'visible', borderRadius: '12px', border: '1px dashed var(--line)', background: 'var(--bg-2)' }}>
                      {renderTaskRows(unifiedFinishedTasks, 'finished')}
                    </div>
                  </div>
                )}

                {taskFilter === 'done' && unifiedFinishedTasks.length === 0 && (
                  <div style={{ padding: '0', overflow: 'visible', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-strong)', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)' }}>
                    <li className="empty-row" style={{ padding: '40px 20px', flexDirection: 'column', gap: '16px', background: 'transparent' }}>
                      <CheckCircle2 color="var(--muted)" size={48} />
                      <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text)' }}>No finished tasks yet.</div>
                      <p style={{ margin: 0 }}>Completed tasks from all schedules will appear here.</p>
                    </li>
                  </div>
                )}
              </div>
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
            <ManualGoalWizard
              goalName={goalName}
              setGoalName={setGoalName}
              goalVision={goalVision}
              setGoalVision={setGoalVision}
              onBack={() => setCreationMode(null)}
              onSubmit={addGoal}
            />
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
