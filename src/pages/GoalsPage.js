import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Target, RotateCw, Calendar as CalendarIcon, CheckCircle2, Cpu,
  Edit2, Trophy, Plus, Search, X, SlidersHorizontal, LayoutList,
  Flame, Zap, Clock, BarChart3, BookOpen, Star, ChevronRight,
  Filter, ArrowUpDown, GripVertical
} from 'lucide-react';
import { getGoalProgress, getDateKey } from '../utils/dateUtils';
import AiGoalWizard from '../components/AiGoalWizard';

/* ═══════════════════════════════════════════════════════════════════
   ModalOverlay — portal-based modal wrapper
═══════════════════════════════════════════════════════════════════ */
function ModalOverlay({ onClose, children }) {
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GoalTaskForm — 3-step wizard for adding/editing a single task
═══════════════════════════════════════════════════════════════════ */
function GoalTaskForm({ title, form, onChange, onSubmit, onCancel, weekDays, isEdit, toggleSpecificDayHandler }) {
  const [step, setStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (step < 3) return setStep(s => s + 1);
    onSubmit(e);
  };

  const cadenceLabel = form.recurrenceType === 'one-time'
    ? 'One-time milestone'
    : form.recurrenceType === 'daily'
    ? 'Daily habit'
    : form.recurrenceType === 'weekly'
    ? `Weekly on ${weekDays[form.weeklyDay]}`
    : `On ${form.specificDays.map(d => weekDays[d]).join(', ') || 'selected days'}`;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', width: 'min(100%, 600px)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{title}</h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>
          Step {step}/3
        </span>
      </div>

      {step === 1 && (
        <>
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={e => onChange({ title: e.target.value })}
            required
            autoFocus
            style={{ fontSize: '1rem', padding: '12px 16px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select value={form.timeEstimate || '30m'} onChange={e => onChange({ timeEstimate: e.target.value })}>
              <option value="15m">15 min</option>
              <option value="30m">30 min</option>
              <option value="1h">1 hour</option>
              <option value="2h+">2+ hours</option>
            </select>
            <select value={form.energy || 'Medium'} onChange={e => onChange({ energy: e.target.value })}>
              <option value="Low">Low energy</option>
              <option value="Medium">Medium energy</option>
              <option value="High">High energy</option>
            </select>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <select value={form.recurrenceType} onChange={e => onChange({ recurrenceType: e.target.value })}>
            <option value="one-time">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="specific-days">Specific days</option>
          </select>
          <input type="date" value={form.deadline || ''} onChange={e => onChange({ deadline: e.target.value })} />
          <button type="button" className="ghost-btn" onClick={() => setShowAdvanced(s => !s)}
            style={{ justifySelf: 'start', fontSize: '0.82rem' }}>
            {showAdvanced ? 'Hide details' : 'Show details'}
          </button>
          {showAdvanced && (
            <div style={{ display: 'grid', gap: '8px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
              {form.recurrenceType === 'one-time' && (
                <input type="date" value={form.oneTimeDate || ''} onChange={e => onChange({ oneTimeDate: e.target.value })} />
              )}
              {form.recurrenceType === 'weekly' && (
                <select value={form.weeklyDay} onChange={e => onChange({ weeklyDay: Number(e.target.value) })}>
                  {weekDays.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              )}
              {form.recurrenceType === 'specific-days' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {weekDays.map((day, i) => (
                    <button key={day} type="button"
                      onClick={() => toggleSpecificDayHandler(i)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)',
                        background: form.specificDays.includes(i) ? 'var(--accent)' : 'var(--panel)',
                        color: form.specificDays.includes(i) ? '#fff' : 'var(--muted)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                      }}>{day.slice(0, 2)}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: '8px', padding: '14px', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--muted)' }}>Title</span>
            <span style={{ fontWeight: 600 }}>{form.title || 'Untitled'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--muted)' }}>Effort</span>
            <span style={{ fontWeight: 600 }}>{form.timeEstimate || '30m'} · {form.energy || 'Medium'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--muted)' }}>Schedule</span>
            <span style={{ fontWeight: 600 }}>{cadenceLabel}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          {step > 1 && <button type="button" className="ghost-btn" onClick={() => setStep(s => s - 1)}>Back</button>}
        </div>
        <button type="submit" className="primary-btn" style={{ padding: '10px 20px' }}>
          {step < 3 ? 'Continue' : isEdit ? 'Save' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ManualGoalWizard — 3-step goal creation without AI
═══════════════════════════════════════════════════════════════════ */
function ManualGoalWizard({ goalName, setGoalName, goalVision, setGoalVision, onBack, onSubmit }) {
  const [step, setStep] = useState(1);
  return (
    <form onSubmit={e => { e.preventDefault(); step < 3 ? setStep(s => s + 1) : onSubmit(e); }}
      style={{ display: 'grid', gap: '14px', width: 'min(100%, 600px)', margin: '0 auto' }}>
      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Create Goal</h3>
      {step === 1 && (
        <>
          <input type="text" placeholder="Goal name" value={goalName} onChange={e => setGoalName(e.target.value)} required autoFocus />
          <textarea rows={3} placeholder="What does success look like?" value={goalVision} onChange={e => setGoalVision(e.target.value)} />
        </>
      )}
      {step === 2 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <input type="date" onChange={e => {}} placeholder="Deadline (optional)" />
        </div>
      )}
      {step === 3 && (
        <div style={{ padding: '14px', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--line)', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--muted)' }}>Goal</span>
            <span style={{ fontWeight: 600 }}>{goalName || 'Untitled'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--muted)' }}>Vision</span>
            <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{goalVision || 'None'}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
        <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 1 && <button type="button" className="ghost-btn" onClick={() => setStep(s => s - 1)}>Previous</button>}
          <button type="submit" className="primary-btn" style={{ padding: '10px 20px' }}>
            {step < 3 ? 'Continue' : 'Save Goal'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AssessmentModal — shown when a goal hits 100%
═══════════════════════════════════════════════════════════════════ */
function AssessmentModal({ goal, onComplete, onCancel }) {
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState('Satisfactory');

  return (
    <ModalOverlay onClose={onCancel}>
      <form onSubmit={e => { e.preventDefault(); onComplete({ reflection, rating, completedAt: getDateKey(new Date()) }); }}
        style={{ display: 'grid', gap: '14px', maxWidth: '420px', width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <Trophy size={40} color="#10b981" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>Goal Complete!</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
            You crushed "{goal.name}". How did it go?
          </p>
        </div>
        <select value={rating} onChange={e => setRating(e.target.value)}>
          <option>Outstanding</option>
          <option>Satisfactory</option>
          <option>Challenging</option>
        </select>
        <textarea rows={3} placeholder="What did you learn?" value={reflection} onChange={e => setReflection(e.target.value)} required />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ background: '#10b981', border: 'none' }}>Save Assessment</button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TaskRow — single task in the list
═══════════════════════════════════════════════════════════════════ */
const ENERGY_COLORS = { High: '#ec4899', Medium: '#8b5cf6', Low: '#3b82f6' };
const TIME_COLORS = { '15m': '#10b981', '30m': '#3b82f6', '1h': '#8b5cf6', '2h+': '#ec4899' };

function TaskRow({ task, goalId, isActiveToday, isDoneToday, onToggle, onEdit, dense }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center',
      padding: dense ? '10px 14px' : '14px 18px',
      background: isDoneToday ? 'var(--bg-2)' : 'transparent',
      borderBottom: '1px solid var(--line)',
      opacity: isDoneToday ? 0.6 : 1,
      transition: 'background 0.15s ease, opacity 0.15s ease'
    }}>
      <input type="checkbox" checked={isDoneToday} onChange={() => onToggle(goalId, task.id)}
        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: dense ? '0.88rem' : '0.95rem', fontWeight: 600,
          textDecoration: isDoneToday ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{task.title}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <RotateCw size={11} /> {task.recurrenceType === 'one-time' ? 'Once' : task.recurrenceType === 'daily' ? 'Daily' : task.recurrenceType === 'weekly' ? 'Weekly' : 'Custom'}
          </span>
          {task.timeEstimate && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: TIME_COLORS[task.timeEstimate] + '18', color: TIME_COLORS[task.timeEstimate] }}>
              <Clock size={10} style={{ marginRight: '2px' }} />{task.timeEstimate}
            </span>
          )}
          {task.energy && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: ENERGY_COLORS[task.energy] + '18', color: ENERGY_COLORS[task.energy] }}>
              <Zap size={10} style={{ marginRight: '2px' }} />{task.energy}
            </span>
          )}
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
            background: isActiveToday ? 'rgba(16,185,129,0.1)' : 'var(--bg-2)',
            color: isActiveToday ? '#10b981' : 'var(--muted)'
          }}>{isActiveToday ? 'Today' : 'Later'}</span>
          {task.deadline && (
            <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
              <CalendarIcon size={11} /> {task.deadline}
            </span>
          )}
        </div>
      </div>
      <button className="ghost-btn" onClick={() => onEdit(task)} title="Edit"
        style={{ padding: '6px', opacity: 0.5, flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
        <Edit2 size={14} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GoalsPage — main export
═══════════════════════════════════════════════════════════════════ */
function GoalsPage({
  goals, selectedGoal, selectedGoalId, setSelectedGoalId, allTaskCount,
  getTaskForm, updateTaskForm, addTaskToGoal, toggleSpecificDay, weekDays,
  isTaskActiveOnDate, isTaskDoneForDate, toggleTaskDoneForToday,
  getRecurrenceText, prettyDate, today,
  isGoalModalOpen, openGoalModal, closeGoalModal,
  goalName, setGoalName, goalVision, setGoalVision,
  addGoal, updateTask, completeGoal, theme, aiEnabled
}) {
  /* ── Local UI state ───────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('tasks');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState(null);
  const [taskQuery, setTaskQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [denseMode, setDenseMode] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  /* ── Reset creation mode when modal closes ───────────────── */
  useEffect(() => { if (!isGoalModalOpen) setCreationMode(null); }, [isGoalModalOpen]);

  /* ── Navigation ───────────────────────────────────────────── */
  const handleOpenGoal = (goalId) => {
    setSelectedGoalId(goalId);
    setTaskQuery('');
    setTaskFilter('all');
    setActiveTab('tasks');
  };
  const handleBackToGoals = () => setSelectedGoalId(null);

  /* ── Filter & sort logic ──────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    if (!selectedGoal) return [];
    let tasks = [...selectedGoal.tasks];

    // Apply search
    if (taskQuery.trim()) {
      const q = taskQuery.trim().toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    }

    // Apply status filter
    if (taskFilter === 'today') {
      tasks = tasks.filter(t => isTaskActiveOnDate(t, today));
    } else if (taskFilter === 'open') {
      tasks = tasks.filter(t => !isTaskDoneForDate(t, today));
    } else if (taskFilter === 'done') {
      tasks = tasks.filter(t => isTaskDoneForDate(t, today));
    }

    // Apply sort
    if (sortBy === 'energy') {
      const order = { High: 0, Medium: 1, Low: 2 };
      tasks.sort((a, b) => (order[a.energy] ?? 1) - (order[b.energy] ?? 1));
    } else if (sortBy === 'time') {
      const order = { '15m': 0, '30m': 1, '1h': 2, '2h+': 3 };
      tasks.sort((a, b) => (order[a.timeEstimate] ?? 1) - (order[b.timeEstimate] ?? 1));
    } else if (sortBy === 'alpha') {
      tasks.sort((a, b) => a.title.localeCompare(b.title));
    }

    return tasks;
  }, [selectedGoal, taskQuery, taskFilter, sortBy, today]);

  const pendingTasks = filteredTasks.filter(t => !isTaskDoneForDate(t, today));
  const doneTasks = filteredTasks.filter(t => isTaskDoneForDate(t, today));
  const activeCount = selectedGoal ? selectedGoal.tasks.filter(t => isTaskActiveOnDate(t, today)).length : 0;
  const doneCount = selectedGoal ? selectedGoal.tasks.filter(t => isTaskDoneForDate(t, today)).length : 0;

  /* ═════════════════════════════════════════════════════════════
     RENDER: Goals List (no goal selected)
  ═════════════════════════════════════════════════════════════ */
  if (!selectedGoal) {
    return (
      <section className="page page-enter" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h1 style={{ marginBottom: '4px' }}>Goals</h1>
            <p className="lead" style={{ margin: 0 }}>{goals.length} goals · {allTaskCount} tasks</p>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="card premium-surface" style={{
            padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '16px', border: '2px dashed var(--line)', textAlign: 'center'
          }}>
            <Target size={48} color="var(--muted)" />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                No goals yet
              </div>
              <p style={{ color: 'var(--muted)', margin: 0, maxWidth: '360px' }}>
                Create your first goal and let AI build a personalized roadmap, or define it manually.
              </p>
            </div>
            <button className="primary-btn" onClick={openGoalModal} style={{ marginTop: '8px', padding: '12px 24px' }}>
              <Plus size={18} style={{ marginRight: '6px' }} />Create Goal
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {goals.map(goal => {
              const progress = getGoalProgress(goal);
              const goalActive = goal.tasks.filter(t => isTaskActiveOnDate(t, today)).length;
              const goalDone = goal.tasks.filter(t => isTaskDoneForDate(t, today)).length;
              return (
                <button key={goal.id} type="button" className="card premium-surface"
                  onClick={() => handleOpenGoal(goal.id)}
                  style={{
                    padding: '20px', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    display: 'flex', flexDirection: 'column', gap: '12px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{goal.name}</div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: progress === 100 ? '#10b981' : 'var(--accent)' }}>
                      {progress}%
                    </span>
                  </div>
                  {goal.vision && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {goal.vision}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    <span>{goal.tasks.length} tasks</span>
                    <span>{goalActive} active</span>
                    <span>{goalDone} done</span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-2)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                  </div>
                  {goal.roadmap?.isAiGenerated && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={10} /> AI Generated
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button className="fab-goal" onClick={openGoalModal} aria-label="Add goal">+</button>

        {isGoalModalOpen && (
          <ModalOverlay onClose={closeGoalModal}>
            {!creationMode ? (
              <div style={{ display: 'grid', gap: '18px', padding: '8px 0', maxWidth: '420px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>New Goal</h3>
                  <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>How would you like to create it?</p>
                </div>
                <button className="ghost-btn" onClick={() => setCreationMode('manual')}
                  style={{ padding: '20px', border: '2px solid var(--line)', borderRadius: '14px', textAlign: 'left', display: 'grid', gap: '4px' }}>
                  <strong style={{ fontSize: '1.05rem' }}>Create Manually</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Define your goal and add tasks yourself.</span>
                </button>
                <button className="primary-btn" onClick={() => setCreationMode('ai')}
                  style={{ padding: '20px', display: 'grid', gap: '4px', textAlign: 'left', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.05rem' }}>Plan with AI</strong>
                    <Cpu size={24} style={{ opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>AI asks clarifying questions and builds a detailed roadmap.</span>
                </button>
              </div>
            ) : creationMode === 'manual' ? (
              <ManualGoalWizard
                goalName={goalName} setGoalName={setGoalName}
                goalVision={goalVision} setGoalVision={setGoalVision}
                onBack={() => setCreationMode(null)}
                onSubmit={addGoal}
              />
            ) : (
              <AiGoalWizard
                goalName={goalName} setGoalName={setGoalName}
                goalVision={goalVision} setGoalVision={setGoalVision}
                onCancel={() => setCreationMode(null)}
                onSaveWithTasks={(tasks, roadmapData) => addGoal(tasks, roadmapData)}
                aiEnabled={aiEnabled}
              />
            )}
          </ModalOverlay>
        )}
      </section>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     RENDER: Goal Detail (goal is selected)
  ═════════════════════════════════════════════════════════════ */
  const progress = getGoalProgress(selectedGoal);
  const isCompleted = selectedGoal.status === 'completed';

  return (
    <section className="page page-enter" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        flexWrap: 'wrap', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="ghost-btn" onClick={handleBackToGoals} style={{ padding: '8px 12px' }}>← Back</button>
          <h1 style={{ fontSize: '1.4rem', margin: 0, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedGoal.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--panel)', padding: '3px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <button onClick={() => setActiveTab('overview')}
            style={{
              padding: '7px 14px', fontSize: '0.84rem', fontWeight: 600, borderRadius: '6px',
              border: 'none', cursor: 'pointer',
              background: activeTab === 'overview' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--text)' : 'var(--muted)'
            }}>Overview</button>
          <button onClick={() => setActiveTab('tasks')}
            style={{
              padding: '7px 14px', fontSize: '0.84rem', fontWeight: 600, borderRadius: '6px',
              border: 'none', cursor: 'pointer',
              background: activeTab === 'tasks' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'tasks' ? 'var(--text)' : 'var(--muted)'
            }}>Tasks</button>
        </div>
      </div>

      {/* Completion banner */}
      {progress === 100 && !isCompleted && (
        <div style={{
          padding: '18px 22px', background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} color="#10b981" />
            <div>
              <div style={{ fontWeight: 700, color: '#10b981' }}>100% Complete</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>All tasks executed. Lock in your assessment.</div>
            </div>
          </div>
          <button className="primary-btn" onClick={() => setIsAssessmentModalOpen(true)}
            style={{ background: '#10b981', border: 'none', padding: '10px 18px', fontSize: '0.88rem', flexShrink: 0 }}>
            Complete Goal
          </button>
        </div>
      )}

      {isCompleted && selectedGoal.assessment && (
        <div style={{
          padding: '18px 22px', background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: '14px', marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Trophy size={20} color="#10b981" />
            <span style={{ fontWeight: 700 }}>Completed</span>
            <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: 'auto', fontWeight: 600 }}>
              {selectedGoal.assessment.rating}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            "{selectedGoal.assessment.reflection}"
          </p>
        </div>
      )}

      {/* ── OVERVIEW TAB ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '18px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
          {/* Vision */}
          <div className="card premium-surface" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '8px' }}>
              Vision
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {selectedGoal.vision || 'No description provided.'}
            </p>
          </div>

          {/* Progress */}
          <div className="card premium-surface" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '10px' }}>
              Progress
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>{progress}%</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {doneCount} of {selectedGoal.tasks.length} tasks done
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-2)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: '99px', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '12px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              <span><Flame size={13} style={{ marginRight: '3px' }} />{activeCount} active today</span>
              <span><CheckCircle2 size={13} style={{ marginRight: '3px' }} />{doneCount} done</span>
              <span><Clock size={13} style={{ marginRight: '3px' }} />{selectedGoal.focusMinutes || 0} focus min</span>
            </div>
          </div>

          {/* AI Roadmap summary */}
          {selectedGoal.roadmap?.summary && (
            <div style={{
              borderRadius: '14px', overflow: 'hidden',
              border: `1px solid ${selectedGoal.roadmap.summary.moodColor}40`,
              background: `linear-gradient(135deg, ${selectedGoal.roadmap.summary.moodColor}10 0%, var(--panel) 70%)`,
            }}>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${selectedGoal.roadmap.summary.moodColor}20`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={18} color={selectedGoal.roadmap.summary.moodColor} />
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: selectedGoal.roadmap.summary.moodColor }}>
                    {selectedGoal.roadmap.isAiGenerated ? 'AI Analysis' : 'Roadmap'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {selectedGoal.roadmap.summary.headline}
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 22px', display: 'grid', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>
                  {selectedGoal.roadmap.summary.description}
                </p>
                {selectedGoal.roadmap.summary.keyResults?.length > 0 && (
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {selectedGoal.roadmap.summary.keyResults.map((kr, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.84rem', color: 'var(--text)' }}>
                        <Star size={12} color={selectedGoal.roadmap.summary.moodColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                        {kr}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Total Tasks', value: selectedGoal.tasks.length, color: '#8b5cf6' },
              { label: 'Active Today', value: activeCount, color: '#10b981' },
              { label: 'Completed', value: doneCount, color: '#3b82f6' },
              { label: 'Focus Minutes', value: selectedGoal.focusMinutes || 0, color: '#ec4899' },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'grid', gap: '14px', animation: 'elegantFadeIn 0.2s ease forwards' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px',
              padding: '8px 14px', background: 'var(--panel)', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <Search size={15} color="var(--muted)" />
              <input type="text" value={taskQuery} onChange={e => setTaskQuery(e.target.value)}
                placeholder="Search tasks..." style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '0.9rem', color: 'var(--text)', padding: 0
                }} />
              {taskQuery && (
                <button onClick={() => setTaskQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={14} color="var(--muted)" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'today', 'open', 'done'].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  style={{
                    padding: '7px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: '8px',
                    border: '1px solid var(--line)', cursor: 'pointer',
                    background: taskFilter === f ? 'var(--accent)' : 'var(--panel)',
                    color: taskFilter === f ? '#fff' : 'var(--muted)'
                  }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}>
              <option value="default">Default</option>
              <option value="energy">By energy</option>
              <option value="time">By duration</option>
              <option value="alpha">A–Z</option>
            </select>

            {/* Dense toggle */}
            <button onClick={() => setDenseMode(d => !d)} className="ghost-btn"
              style={{ padding: '7px 10px', fontSize: '0.78rem' }}>
              {denseMode ? 'Comfort' : 'Compact'}
            </button>

            {/* Add task */}
            <button className="primary-btn" onClick={() => setIsTaskModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              <Plus size={16} style={{ marginRight: '4px' }} />Add Task
            </button>
          </div>

          {/* Count indicator */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
            <span>{filteredTasks.length} tasks</span>
            <span style={{ color: '#10b981' }}>{doneTasks.length} done</span>
            <span>{pendingTasks.length} pending</span>
          </div>

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <div className="card premium-surface" style={{
              padding: '48px 24px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '12px', border: '2px dashed var(--line)'
            }}>
              <CheckCircle2 size={40} color="var(--muted)" />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                {taskQuery ? 'No matching tasks' : taskFilter === 'done' ? 'No completed tasks yet' : 'No tasks'}
              </div>
              <p style={{ color: 'var(--muted)', margin: 0, textAlign: 'center', fontSize: '0.88rem' }}>
                {taskQuery ? 'Try a different search term.' : taskFilter === 'done' ? 'Complete some tasks to see them here.' : 'Add your first task to get started.'}
              </p>
              {!taskQuery && taskFilter !== 'done' && (
                <button className="primary-btn" onClick={() => setIsTaskModalOpen(true)} style={{ marginTop: '4px' }}>
                  <Plus size={16} style={{ marginRight: '4px' }} />Add Task
                </button>
              )}
            </div>
          ) : (
            <div className="card premium-surface" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--line)' }}>
              {/* Pending section */}
              {pendingTasks.length > 0 && (
                <div>
                  <div style={{
                    padding: '10px 18px', fontSize: '0.72rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)',
                    borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }} />
                    Pending ({pendingTasks.length})
                  </div>
                  {pendingTasks.map((task, idx) => (
                    <TaskRow key={task.id} task={task} goalId={selectedGoal.id}
                      isActiveToday={isTaskActiveOnDate(task, today)}
                      isDoneToday={false}
                      onToggle={toggleTaskDoneForToday}
                      onEdit={setEditingTask}
                      dense={denseMode} />
                  ))}
                </div>
              )}

              {/* Done section */}
              {doneTasks.length > 0 && (
                <div>
                  <div style={{
                    padding: '10px 18px', fontSize: '0.72rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)',
                    borderBottom: '1px solid var(--line)', borderTop: pendingTasks.length > 0 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7
                  }}>
                    <CheckCircle2 size={12} /> Done ({doneTasks.length})
                  </div>
                  {doneTasks.map((task, idx) => (
                    <TaskRow key={task.id} task={task} goalId={selectedGoal.id}
                      isActiveToday={isTaskActiveOnDate(task, today)}
                      isDoneToday={true}
                      onToggle={toggleTaskDoneForToday}
                      onEdit={setEditingTask}
                      dense={denseMode} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────── */}
      {isTaskModalOpen && (
        <ModalOverlay onClose={() => setIsTaskModalOpen(false)}>
          <GoalTaskForm
            title="New Task"
            form={getTaskForm(selectedGoal.id)}
            onChange={payload => updateTaskForm(selectedGoal.id, payload)}
            onSubmit={e => { addTaskToGoal(selectedGoal.id, e); setIsTaskModalOpen(false); }}
            toggleSpecificDayHandler={idx => toggleSpecificDay(selectedGoal.id, idx)}
            weekDays={weekDays}
            onCancel={() => setIsTaskModalOpen(false)}
            isEdit={false}
          />
        </ModalOverlay>
      )}

      {editingTask && (
        <ModalOverlay onClose={() => setEditingTask(null)}>
          <GoalTaskForm
            title="Edit Task"
            form={{ ...editingTask, timeEstimate: editingTask.timeEstimate || '30m', energy: editingTask.energy || 'Medium' }}
            onChange={payload => setEditingTask(prev => ({ ...prev, ...payload }))}
            onSubmit={e => { e.preventDefault(); updateTask(selectedGoal.id, editingTask.id, editingTask); setEditingTask(null); }}
            toggleSpecificDayHandler={idx => {
              const next = editingTask.specificDays?.includes(idx)
                ? editingTask.specificDays.filter(d => d !== idx)
                : [...(editingTask.specificDays || []), idx];
              setEditingTask(prev => ({ ...prev, specificDays: next.sort((a, b) => a - b) }));
            }}
            weekDays={weekDays}
            onCancel={() => setEditingTask(null)}
            isEdit
          />
        </ModalOverlay>
      )}

      {isAssessmentModalOpen && (
        <AssessmentModal
          goal={selectedGoal}
          onCancel={() => setIsAssessmentModalOpen(false)}
          onComplete={payload => { completeGoal(selectedGoal.id, payload); setIsAssessmentModalOpen(false); }}
        />
      )}
    </section>
  );
}

export default GoalsPage;