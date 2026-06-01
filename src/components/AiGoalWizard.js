import React, { useState, useEffect, useRef } from 'react';
import { Target, Cpu, LayoutList, CheckCircle2, Repeat, Calendar, Zap, Clock, ChevronRight, Flame, BarChart2, BookOpen, Star, Trash2, Plus, X, PenTool } from 'lucide-react';
import { generateClarifyingQuestions, generateRoadmap, mapAiRoadmapToAppSchema, isGroqAvailable } from '../services/groqService';

/* ─────────────────────────────────────────────────────────────
   Roadmap generation engine
   Builds a phased plan from the wizard responses + goal params
 ───────────────────────────────────────────────────────────── */
function buildRoadmap(goalName, goalVision, deadline, notes, responses) {
  const pacing = responses[2] || '';
  const bottleneck = responses[1] || '';
  const timeline = responses[0] || '';

  const isHabits = pacing.includes('habits');
  const isBursts = pacing.includes('bursts');
  const isAgressive = timeline.includes('aggressive');
  const isLongTerm = timeline.includes('marathon');

  const now = Date.now();
  let idSeed = now;
  const uid = () => ++idSeed;

  const source = `${goalName || ''} ${goalVision || ''}`.toLowerCase();
  const normalizedGoal = goalName?.trim() || 'your goal';

  const detectDomain = () => {
    if (/(app|code|software|website|saas|api|react|flutter|backend|frontend|program)/.test(source)) return 'build';
    if (/(fit|fitness|workout|gym|run|weight|health|diet|yoga)/.test(source)) return 'fitness';
    if (/(study|exam|course|learn|school|university|certification|language)/.test(source)) return 'learning';
    if (/(write|book|blog|content|newsletter|youtube|podcast|creator)/.test(source)) return 'content';
    if (/(sales|revenue|client|business|startup|marketing|brand)/.test(source)) return 'business';
    return 'general';
  };

  const domain = detectDomain();

  const domainTaskPool = {
    build: [
      `Define the core scope for ${normalizedGoal}`,
      `Break ${normalizedGoal} into implementation milestones`,
      `Ship one usable increment for ${normalizedGoal}`,
      `Run QA and bug triage for ${normalizedGoal}`,
      `Collect feedback and prioritize the next sprint`
    ],
    fitness: [
      `Set baseline metrics for ${normalizedGoal}`,
      `Design your weekly training split for ${normalizedGoal}`,
      `Complete a focused training block`,
      `Track nutrition/sleep consistency for recovery`,
      `Review progress and adjust intensity`
    ],
    learning: [
      `Define the competency targets for ${normalizedGoal}`,
      `Create a focused study roadmap by module`,
      `Complete one deep study session with notes`,
      `Practice with a quiz/exercise set`,
      `Run a weekly recall/review checkpoint`
    ],
    content: [
      `Define audience and outcome for ${normalizedGoal}`,
      `Outline your first content pieces`,
      `Produce and publish a core asset`,
      `Repurpose one asset across channels`,
      `Review performance and refine style`
    ],
    business: [
      `Clarify offer and success metrics for ${normalizedGoal}`,
      `Identify target segment and channel strategy`,
      `Execute one growth experiment`,
      `Analyze conversion bottlenecks`,
      `Refine positioning based on real feedback`
    ],
    general: [
      `Define measurable outcomes for ${normalizedGoal}`,
      `Break ${normalizedGoal} into weekly milestones`,
      `Complete one high-impact execution block`,
      `Review blockers and remove one source of friction`,
      `Run a weekly retrospective and recalibration`
    ]
  };

  const tasks = domainTaskPool[domain];

  const bottleneckAdvice =
    bottleneck.includes('Time') ? 'Time-blocking and ruthless prioritization will be critical success levers.' :
    bottleneck.includes('Knowledge') ? 'Front-loading research and skill sprints de-risks execution early.' :
    bottleneck.includes('Motivation') ? 'Micro-wins and visible streaks will sustain momentum across the journey.' :
    'Mapping external dependencies upfront reduces blocking surprises.';

  const pacingAdvice =
    isHabits ? 'Daily habit compounding is your core mechanism.' :
    isBursts ? 'Weekly deep-focus sessions are the primary engine.' :
    'Front-loading hard tasks creates early momentum.';

  const summary = {
    headline: isAgressive ? 'High-Intensity Execution Sprint' : isLongTerm ? 'Sustainable Long-Term Build' : 'Balanced Progressive Roadmap',
    description: `Fallback planner generated a goal-specific plan for "${normalizedGoal}". ${bottleneckAdvice} ${pacingAdvice}${notes ? ` Notes considered: ${notes.slice(0, 120)}.` : ''}`,
    keyResults: [
      `Establish a clear execution system for ${normalizedGoal}`,
      isHabits ? 'Sustain daily consistency through week 2' : 'Deliver at least one major milestone per week',
      `Resolve the primary risk: ${bottleneck || 'execution friction'}`,
      'Reach at least 60% roadmap completion by midpoint'
    ],
    moodColor: isAgressive ? '#ec4899' : isLongTerm ? '#3b82f6' : '#8b5cf6'
  };

  const mkTask = (title, recurrenceType, opts = {}) => ({
    id: uid(),
    title,
    description: opts.description ?? '',
    recurrenceType,
    oneTimeDate: opts.oneTimeDate ?? deadline,
    deadline: opts.deadline ?? deadline,
    weeklyDay: opts.weeklyDay ?? 1,
    specificDays: opts.specificDays ?? [],
    timeEstimate: opts.timeEstimate ?? '30m',
    energy: opts.energy ?? 'Medium',
    progressMinutes: 0,
    order: uid(),
    completed: false,
    completedDates: []
  });

  const phases = [
    {
      id: 'p1',
      label: isAgressive ? 'Days 1-3' : 'Week 1',
      theme: 'Foundation',
      color: '#8b5cf6',
      icon: 'foundation',
      description: `Set foundations and remove ambiguity for ${normalizedGoal}.`,
      tasks: [
        mkTask(tasks[0], 'one-time', { timeEstimate: '30m', energy: 'Medium' }),
        mkTask(tasks[1], 'one-time', { timeEstimate: '1h', energy: 'High' })
      ]
    },
    {
      id: 'p2',
      label: isAgressive ? 'Days 4-10' : 'Week 2',
      theme: isBursts ? 'Deep Execution' : 'Execution',
      color: '#ec4899',
      icon: 'ignition',
      description: `Drive visible progress on ${normalizedGoal} through focused output.`,
      tasks: [
        mkTask(tasks[2], 'one-time', { timeEstimate: isBursts ? '2h+' : '1h', energy: 'High' }),
        mkTask(tasks[3], 'one-time', { timeEstimate: '1h', energy: 'Medium' })
      ]
    },
    {
      id: 'p3',
      label: isLongTerm ? 'Week 3-4' : 'Week 3',
      theme: 'Review and Optimization',
      color: '#3b82f6',
      icon: 'momentum',
      description: 'Consolidate momentum, measure outcomes, and iterate.',
      tasks: [
        mkTask(tasks[4], 'one-time', { timeEstimate: '30m', energy: 'Low' }),
        mkTask(`Create next-step plan for ${normalizedGoal}`, 'one-time', { timeEstimate: '30m', energy: 'Medium' })
      ]
    }
  ];

  if (isHabits) {
    phases.push({
      id: 'p_daily',
      label: 'Daily',
      theme: 'Recurring Core',
      color: '#10b981',
      icon: 'recurring',
      description: 'Daily actions that compound outcomes.',
      tasks: [
        mkTask(`Daily 15-min block on ${normalizedGoal}`, 'daily', { timeEstimate: '15m', energy: 'Medium', deadline: '', oneTimeDate: '' }),
        mkTask('Daily progress log and reflection', 'daily', { timeEstimate: '15m', energy: 'Low', deadline: '', oneTimeDate: '' })
      ]
    });
  } else {
    phases.push({
      id: 'p_weekly',
      label: 'Weekly',
      theme: 'Recurring Checkpoints',
      color: '#f59e0b',
      icon: 'review',
      description: 'Weekly review and planning rhythm.',
      tasks: [
        mkTask(`Weekly review for ${normalizedGoal}`, 'weekly', { timeEstimate: '30m', energy: 'Low', weeklyDay: 0, deadline: '', oneTimeDate: '' }),
        mkTask('Plan the next execution block', 'weekly', { timeEstimate: '15m', energy: 'Medium', weeklyDay: 6, deadline: '', oneTimeDate: '' })
      ]
    });
  }

  // Flatten all tasks for addGoal
  const allTasks = phases.flatMap(p => p.tasks);

  // Stats
  const stats = {
    totalTasks:   allTasks.length,
    oneTimeTasks: allTasks.filter(t => t.recurrenceType === 'one-time').length,
    dailyTasks:   allTasks.filter(t => t.recurrenceType === 'daily').length,
    weeklyTasks:  allTasks.filter(t => t.recurrenceType === 'weekly').length,
    phases:       phases.filter(p => !p.id.startsWith('p_')).length,
  };

  return { summary, phases, allTasks, stats };
}

/* ─────────────────────────────────────────────────────────────
   Visual helpers
 ───────────────────────────────────────────────────────────── */
const ENERGY_COLOR = { High: '#ec4899', Medium: '#8b5cf6', Low: '#3b82f6' };
const RECUR_ICON   = { 'one-time': Calendar, daily: Flame, weekly: Repeat };
const TIME_COLOR   = { '15m': '#10b981', '30m': '#3b82f6', '1h': '#8b5cf6', '2h+': '#ec4899' };

const getFallbackQuestions = (goalName) => [
  {
    text: `To properly construct the roadmap for "${goalName || 'this target'}", how aggressive is your timeline based on your deadline?`,
    options: ['Very aggressive (heavy daily workload)', 'Moderate & steady (balanced weekly tasks)', 'Long-term marathon (light, consistent steps)'],
  },
  {
    text: 'What is the most likely bottleneck or challenge you\'ll face pursuing this goal?',
    options: ['Time & Scheduling constraints', 'Knowledge or Skill gaps', 'Motivation & Energy', 'External dependencies / resources'],
  },
  {
    text: 'How do you prefer to pace your execution workflows?',
    options: ['Front-load the hardest tasks early', 'Evenly spread tiny daily habits', 'Work in weekly deep-focus bursts'],
  },
];

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '14px', flex: '1 1 calc(20% - 8px)', minWidth: '130px', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

function TaskPill({ task, updateTaskField, deleteTask }) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubText, setNewSubText] = useState('');
  const RecurIcon = RECUR_ICON[task.recurrenceType] || Calendar;
  const cType = task.completionType || 'binary';

  const addSub = (text) => {
    if (!text.trim()) return;
    const current = task.subtasks || [];
    const updated = [...current, { id: `sub-${Date.now()}-${Math.random()}`, title: text.trim(), completed: false }];
    updateTaskField(task.id, 'subtasks', updated);
    setNewSubText('');
  };

  const removeSub = (subId) => {
    const current = task.subtasks || [];
    const updated = current.filter(s => s.id !== subId);
    updateTaskField(task.id, 'subtasks', updated);
  };

  const updateSubTitle = (subId, newTitle) => {
    const current = task.subtasks || [];
    const updated = current.map(s => s.id === subId ? { ...s, title: newTitle } : s);
    updateTaskField(task.id, 'subtasks', updated);
  };

  return (
    <div className="task-pill-card" style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '12px 14px',
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      borderRadius: '14px',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ENERGY_COLOR[task.energy] || '#8b5cf6', flexShrink: 0 }} />
        <input 
          type="text" 
          value={task.title} 
          onChange={e => updateTaskField(task.id, 'title', e.target.value)}
          style={{
            flex: 1, fontSize: '0.88rem', fontWeight: 650, color: 'var(--text)',
            background: 'transparent', border: 'none', outline: 'none', padding: 0, minWidth: 0,
            borderBottom: '1px solid transparent', transition: 'all 0.2s'
          }}
          onFocus={e => e.target.style.borderBottom = '1px dashed var(--accent)'}
          onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
        />
        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          style={{
            background: 'transparent', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2px', minWidth: '24px', minHeight: '24px', opacity: 0.5,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
        >
          <Trash2 size={13} color="var(--pink)" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
        {/* Duration select */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={task.timeEstimate || '30m'}
            onChange={e => updateTaskField(task.id, 'timeEstimate', e.target.value)}
            style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '3px 18px 3px 6px',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: TIME_COLOR[task.timeEstimate] + '18', color: TIME_COLOR[task.timeEstimate] || 'var(--accent)',
              width: 'auto', minHeight: '22px', appearance: 'none', outline: 'none',
              backgroundPosition: 'right 4px center', backgroundSize: '8px'
            }}
          >
            <option value="15m">15m</option>
            <option value="30m">30m</option>
            <option value="1h">1h</option>
            <option value="2h+">2h+</option>
          </select>
          <Clock size={8} style={{ position: 'absolute', right: '6px', pointerEvents: 'none', color: TIME_COLOR[task.timeEstimate] }} />
        </div>

        {/* Recurrence select */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={task.recurrenceType || 'one-time'}
            onChange={e => updateTaskField(task.id, 'recurrenceType', e.target.value)}
            style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '3px 18px 3px 6px',
              borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer',
              background: 'var(--panel)', color: 'var(--muted)',
              width: 'auto', minHeight: '22px', appearance: 'none', outline: 'none',
              backgroundPosition: 'right 4px center', backgroundSize: '8px'
            }}
          >
            <option value="one-time">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <RecurIcon size={8} style={{ position: 'absolute', right: '6px', pointerEvents: 'none', color: 'var(--muted)' }} />
        </div>

        {/* Completion type select */}
        <select
          value={cType}
          onChange={e => {
            const nextType = e.target.value;
            updateTaskField(task.id, 'completionType', nextType);
            if (nextType === 'quantity' && !task.targetValue) {
              updateTaskField(task.id, 'targetValue', 10);
            }
          }}
          style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
            borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer',
            background: 'var(--panel)', color: 'var(--accent)',
            width: 'auto', minHeight: '22px', outline: 'none'
          }}
        >
          <option value="binary">Checkbox</option>
          <option value="quantity">Counter</option>
          <option value="subtasks">Subtasks</option>
          <option value="scale">Scale</option>
          <option value="multistate">Status</option>
        </select>

        {/* Target inputs */}
        {cType === 'quantity' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
            <span>Target:</span>
            <input
              type="number"
              min="1"
              value={task.targetValue || 1}
              onChange={e => updateTaskField(task.id, 'targetValue', Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: '40px', padding: '1px 3px', fontSize: '0.68rem', fontWeight: 700,
                textAlign: 'center', border: '1px dashed var(--line)', background: 'var(--panel)',
                borderRadius: '4px', minHeight: '18px', color: 'var(--text)'
              }}
            />
          </div>
        )}

        {/* Subtasks toggle */}
        {cType === 'subtasks' && (
          <button
            type="button"
            onClick={() => setShowSubtasks(!showSubtasks)}
            style={{
              fontSize: '0.66rem', fontWeight: 750, padding: '2px 6px',
              borderRadius: '5px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
              minWidth: 'auto', minHeight: '20px'
            }}
          >
            {task.subtasks?.length || 0} steps {showSubtasks ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Subtasks list */}
      {cType === 'subtasks' && showSubtasks && (
        <div style={{
          marginTop: '6px', padding: '10px', background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '10px', border: '1px solid var(--line)', display: 'flex',
          flexDirection: 'column', gap: '6px', animation: 'wizardSlideIn 0.2s ease-out'
        }}>
          {(task.subtasks || []).map((sub, sIdx) => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>{sIdx + 1}.</span>
              <input
                type="text"
                value={sub.title}
                onChange={e => updateSubTitle(sub.id, e.target.value)}
                style={{
                  flex: 1, fontSize: '0.78rem', color: 'var(--text)', background: 'transparent',
                  border: 'none', outline: 'none', padding: 0, borderBottom: '1px solid transparent'
                }}
                onFocus={e => e.target.style.borderBottom = '1px dashed var(--accent)'}
                onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
              />
              <button
                type="button"
                onClick={() => removeSub(sub.id)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--muted)',
                  cursor: 'pointer', padding: '1px', minWidth: '18px', minHeight: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={10} color="var(--pink)" />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <input
              type="text"
              placeholder="Add step..."
              value={newSubText}
              onChange={e => setNewSubText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(newSubText); } }}
              style={{
                flex: 1, fontSize: '0.76rem', padding: '4px 8px', borderRadius: '6px',
                border: '1px dashed var(--line)', background: 'var(--panel)', minHeight: '26px'
              }}
            />
            <button
              type="button"
              onClick={() => addSub(newSubText)}
              style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                color: '#fff', border: 'none', cursor: 'pointer', minWidth: 'auto', minHeight: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseCard({ phase, index, isLast, updateTaskField, deleteTask, addTaskToPhase }) {
  const [open, setOpen] = useState(index === 0);
  const [newTitle, setNewTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTaskToPhase(phase.id, newTitle.trim());
    setNewTitle('');
    setShowAdd(false);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${phase.color}, ${phase.color}dd)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 5px ${phase.color}15`,
          color: '#fff', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
        }}>
          {index + 1}
        </div>
        {!isLast && (
          <div style={{ width: '2px', flex: 1, minHeight: '24px', background: `linear-gradient(to bottom, ${phase.color}70, var(--line) 80%, transparent)`, marginTop: '8px', marginBottom: '8px' }} />
        )}
      </div>

      <div style={{ flex: 1, marginBottom: isLast ? 0 : '16px' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: open ? '12px' : 0,
            minHeight: '0'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase.color }}>{phase.label}</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--line)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>{phase.tasks.length} tasks</span>
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text)', marginTop: '3px' }}>{phase.theme}</div>
          </div>
          <ChevronRight size={18} color="var(--muted)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)', flexShrink: 0 }} />
        </button>

        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'wizardSlideIn 0.2s ease-out' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.5 }}>{phase.description}</p>
            {phase.tasks.map(task => (
              <TaskPill 
                key={task.id} 
                task={task} 
                updateTaskField={updateTaskField} 
                deleteTask={deleteTask} 
              />
            ))}
            
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  background: 'transparent',
                  border: '1px dashed var(--line)',
                  color: 'var(--muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}
              >
                <Plus size={12} /> Add Task
              </button>
            ) : (
              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginTop: '6px', animation: 'wizardSlideIn 0.15s ease-out' }}>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{
                    flex: 1, fontSize: '0.8rem', padding: '6px 10px',
                    borderRadius: '8px', border: '1px solid var(--line)',
                    background: 'var(--panel)', minHeight: '32px'
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', minWidth: 'auto', minHeight: '32px' }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewTitle(''); }}
                    className="ghost-btn"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', minWidth: 'auto', minHeight: '32px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main wizard component
 ───────────────────────────────────────────────────────────── */
function AiGoalWizard({ goalName, setGoalName, goalVision, setGoalVision, onCancel, onSaveWithTasks, aiEnabled }) {
  const [step, setStep] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);

  const [questions, setQuestions]                 = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses]                 = useState({});
  const [roadmap, setRoadmap]                     = useState(null);
  const [customResponse, setCustomResponse]       = useState('');
  const [isCustomMode, setIsCustomMode]           = useState(false);
  const [loadingMsg, setLoadingMsg]               = useState('');

  useEffect(() => {
    setIsCustomMode(false);
    setCustomResponse('');
  }, [currentQuestionIndex]);

  // Step 3 loading messages cycling
  useEffect(() => {
    if (step !== 3) return;
    const msgs = [
      "Connecting to GPT-OSS 120B database...",
      "Analyzing vision statement constraints...",
      "Detecting goal category & performance metrics...",
      "Consulting AI strategist model...",
      "Synthesizing clarifying context questions..."
    ];
    setLoadingMsg(msgs[0]);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setLoadingMsg(msgs[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [step]);

  // Step 5 loading messages cycling
  useEffect(() => {
    if (step !== 5) return;
    const msgs = [
      "Optimizing phase timelines...",
      "Allocating milestone order prerequisites...",
      "Synthesizing customized interactive task types...",
      "Formatting subtask breakdown arrays...",
      "Spreading recurring weekly habits across days...",
      "Pruning duplicate checklists...",
      "Assembling interactive pre-adoption review panel..."
    ];
    setLoadingMsg(msgs[0]);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setLoadingMsg(msgs[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [step]);

  const responsesRef = useRef(responses);
  useEffect(() => { responsesRef.current = responses; }, [responses]);

  // ── Step 3: generate clarifying questions ─────────────────────
  useEffect(() => {
    if (step !== 3) return;
    setResponses({});
    setCurrentQuestionIndex(0);
    setAiStatusMessage('');
    let cancelled = false;

    const fallbackQuestions = getFallbackQuestions(goalName);

    const fetchQuestions = async () => {
      if (aiEnabled && isGroqAvailable()) {
        let aiQuestions = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            aiQuestions = await generateClarifyingQuestions(goalName, goalVision, deadline, notes, {}, []);
            if (aiQuestions?.questions?.length) break;
          } catch (error) {
            if (attempt === 1) {
              console.warn('AI questions failed, falling back:', error);
              setAiStatusMessage(`AI question generation failed: ${error.message || 'unknown error'}`);
            }
          }
        }

        if (!cancelled && aiQuestions?.questions?.length) {
          setQuestions(aiQuestions.questions);
          setStep(4);
          return;
        }
      }

      if (!cancelled) {
        setQuestions(fallbackQuestions);
        setStep(4);
      }
    };

    fetchQuestions();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Step 5: build detailed roadmap ────────────────────────────
  useEffect(() => {
    if (step !== 5) return;
    setAiStatusMessage('');
    let cancelled = false;

    const fetchRoadmap = async () => {
      if (aiEnabled && isGroqAvailable()) {
        let mapped = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const aiResponse = await generateRoadmap(goalName, goalVision, deadline, notes, responsesRef.current);
            mapped = mapAiRoadmapToAppSchema(aiResponse, deadline);
            break;
          } catch (error) {
            if (attempt === 1) {
              console.warn('AI roadmap failed, falling back:', error);
              setAiStatusMessage(`AI roadmap generation failed: ${error.message || 'unknown error'}`);
            }
          }
        }

        if (!cancelled && mapped) {
          setAiStatusMessage('');
          setRoadmap(mapped);
          setStep(6);
          return;
        }
      }

      if (!cancelled) {
        const result = buildRoadmap(goalName, goalVision, deadline, notes, responsesRef.current);
        result.isAiGenerated = false;
        if (!aiEnabled) {
          setAiStatusMessage('AI features are disabled in Settings.');
        } else if (!isGroqAvailable()) {
          setAiStatusMessage('Groq API key is missing or invalid in environment configuration.');
        }
        setRoadmap(result);
        setStep(6);
      }
    };

    fetchRoadmap();
    return () => { cancelled = true; };
  }, [step, goalName, goalVision, deadline, notes, aiEnabled]);

  const updateTaskField = (taskId, field, value) => {
    setRoadmap(prev => {
      if (!prev) return prev;
      const newPhases = prev.phases.map(p => ({
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
      }));
      const newAllTasks = newPhases.flatMap(p => p.tasks);
      return { ...prev, phases: newPhases, allTasks: newAllTasks };
    });
  };

  const deleteTask = (taskId) => {
    setRoadmap(prev => {
      if (!prev) return prev;
      const newPhases = prev.phases.map(p => ({
        ...p,
        tasks: p.tasks.filter(t => t.id !== taskId)
      })).filter(p => p.tasks.length > 0 || p.id.startsWith('p_'));
      const newAllTasks = newPhases.flatMap(p => p.tasks);
      
      const newStats = {
        totalTasks:   newAllTasks.length,
        oneTimeTasks: newAllTasks.filter(t => t.recurrenceType === 'one-time').length,
        dailyTasks:   newAllTasks.filter(t => t.recurrenceType === 'daily').length,
        weeklyTasks:  newAllTasks.filter(t => t.recurrenceType === 'weekly').length,
        phases:       newPhases.filter(p => !p.id.startsWith('p_')).length,
      };

      return { ...prev, phases: newPhases, allTasks: newAllTasks, stats: newStats };
    });
  };

  const addTaskToPhase = (phaseId, title) => {
    const defaultTask = {
      id: Date.now() + Math.random(),
      title,
      description: '',
      recurrenceType: 'one-time',
      oneTimeDate: deadline || '',
      deadline: deadline || '',
      weeklyDay: 1,
      specificDays: [],
      timeEstimate: '30m',
      energy: 'Medium',
      completionType: 'binary',
      targetValue: null,
      currentValue: 0,
      subtasks: [],
      dailyProgress: {},
      progressMinutes: 0,
      order: 99,
      phaseId,
      completed: false,
      completedDates: []
    };

    setRoadmap(prev => {
      if (!prev) return prev;
      const newPhases = prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          tasks: [...p.tasks, defaultTask]
        };
      });
      const newAllTasks = newPhases.flatMap(p => p.tasks);
      
      const newStats = {
        totalTasks:   newAllTasks.length,
        oneTimeTasks: newAllTasks.filter(t => t.recurrenceType === 'one-time').length,
        dailyTasks:   newAllTasks.filter(t => t.recurrenceType === 'daily').length,
        weeklyTasks:  newAllTasks.filter(t => t.recurrenceType === 'weekly').length,
        phases:       newPhases.filter(p => !p.id.startsWith('p_')).length,
      };

      return { ...prev, phases: newPhases, allTasks: newAllTasks, stats: newStats };
    });
  };

  const handleNext = () => setStep(s => s + 1);

  const stepLabel = step <= 2 ? 'Goal Parameters'
    : step <= 4 ? 'AI Clarification'
    : step === 5 ? 'Generating Plan'
    : 'Your AI Roadmap';

  const wizardKeyframes = `
  @keyframes wizardPulse {
    0% { transform: scale(0.92); opacity: 0.55; }
    100% { transform: scale(1.08); opacity: 0.95; }
  }
  @keyframes wizardOrbit {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes wizardSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  `;

  return (
    <div className="ai-wizard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{wizardKeyframes}</style>

      {/* ── Wizard Header ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stepLabel}</h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)', fontWeight: 500 }}>Powered by OpenAI GPT-OSS 120B</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[1, 2, 3, 4, 5, 6].map(sNum => {
            const isActive = sNum === Math.min(step, 6);
            const isCompleted = sNum < Math.min(step, 6);
            return (
              <div key={sNum} style={{
                width: isActive ? '24px' : '8px',
                height: '8px',
                borderRadius: '99px',
                background: isActive ? 'linear-gradient(90deg, var(--accent), var(--accent-2))' : isCompleted ? 'var(--accent)' : 'var(--line)',
                opacity: isActive ? 1 : isCompleted ? 0.6 : 0.4,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            );
          })}
        </div>
      </div>

      {/* ── Step 1: Core Goal ─────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Welcome to the AI planning wizard. Let's outline the core definition of what you want to achieve.
          </p>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
            Goal Title
            <input 
              type="text" 
              placeholder="E.g., Launch SaaS MVP" 
              value={goalName} 
              onChange={e => setGoalName(e.target.value)} 
              required 
              style={{ padding: '12px 14px', borderRadius: '12px' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
            Goal Vision & Description
            <textarea 
              rows="4" 
              placeholder="Describe what success looks like. What is your ultimate vision?" 
              value={goalVision} 
              onChange={e => setGoalVision(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: '12px', resize: 'none', lineHeight: 1.5 }}
            />
          </label>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary-btn">Next Step</button>
          </div>
        </form>
      )}

      {/* ── Step 2: Timeline & Notes ──────────────────────────── */}
      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Establish timing guidelines or custom constraints for the AI model's roadmap synthesis.
          </p>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
            Target Deadline (Optional)
            <input 
              type="date" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              style={{ padding: '12px 14px', borderRadius: '12px' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
            Additional Context & Guidelines
            <textarea 
              rows="4" 
              placeholder="Any specific constraints, resources, daily limits, or personal preferences the AI should account for?" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: '12px', resize: 'none', lineHeight: 1.5 }}
            />
          </label>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-btn" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="primary-btn">
              Analyze Goal Context <Cpu size={16} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: Loading questions ─────────────────────────── */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
              opacity: 0.25,
              filter: 'blur(8px)',
              animation: 'wizardPulse 1.5s ease-in-out infinite alternate'
            }} />
            <div style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              border: '2px dashed var(--accent-2)',
              animation: 'wizardOrbit 6s linear infinite',
              opacity: 0.6
            }} />
            <div style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'wizardPulse 2s ease-in-out infinite alternate-reverse'
            }}>
              <Cpu size={24} color="#fff" />
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>AI Strategy Formulation</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', minHeight: '2.5em', maxWidth: '360px', lineHeight: 1.5, fontWeight: 500 }}>{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* ── Step 4: Q&A ───────────────────────────────────────── */}
      {step === 4 && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'wizardSlideIn 0.3s ease-out' }}>
          <div style={{ padding: '20px 24px', background: 'var(--bg-2)', borderRadius: '16px', border: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <Cpu size={22} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {questions[currentQuestionIndex].text}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>Pick the option that fits best:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--muted)' }}>Question {currentQuestionIndex + 1} of 3</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!isCustomMode ? (
              <>
                {questions[currentQuestionIndex].options.map((opt) => {
                  const isActive = responses[currentQuestionIndex] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setResponses(prev => ({ ...prev, [currentQuestionIndex]: opt }))}
                      style={{
                        textAlign: 'left',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        border: isActive ? '2px solid var(--accent)' : '1px solid var(--line)',
                        background: isActive ? 'rgba(139, 92, 246, 0.06)' : 'var(--panel)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isActive ? '0 8px 24px rgba(139, 92, 246, 0.08)' : 'none',
                        transform: isActive ? 'scale(1.01) translateY(-1px)' : 'none',
                        minHeight: '60px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isActive ? '6px solid var(--accent)' : '2px solid var(--muted)',
                          background: '#fff',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.4 }}>{opt}</span>
                      </div>
                      <ChevronRight size={16} color={isActive ? 'var(--accent)' : 'var(--muted)'} style={{ opacity: isActive ? 1 : 0.4 }} />
                    </button>
                  );
                })}
                
                {/* Custom Write-in Card */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setResponses(prev => {
                      const next = { ...prev };
                      delete next[currentQuestionIndex];
                      return next;
                    });
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: '1px dashed var(--muted)',
                    background: 'transparent',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    minHeight: '52px',
                    marginTop: '4px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}
                >
                  <PenTool size={14} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 650 }}>Write a custom response...</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'wizardSlideIn 0.2s ease-out' }}>
                <textarea
                  rows="3"
                  placeholder="Type your custom answer or specific requirements here..."
                  value={customResponse}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomResponse(val);
                    setResponses(prev => ({ ...prev, [currentQuestionIndex]: val.trim() }));
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                    resize: 'none',
                    border: '2px solid var(--accent)',
                    background: 'var(--panel)',
                    width: '100%',
                    fontFamily: 'inherit'
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setCustomResponse('');
                    setResponses(prev => {
                      const next = { ...prev };
                      delete next[currentQuestionIndex];
                      return next;
                    });
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: 'auto',
                    minHeight: 'auto'
                  }}
                >
                  ← Back to choices
                </button>
              </div>
            )}
          </div>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-btn" onClick={() => {
              if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1);
              else setStep(2);
            }}>Back</button>
            <button type="button" className="primary-btn" disabled={!responses[currentQuestionIndex] || isFetchingQuestion}
              onClick={async () => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(i => i + 1);
                  return;
                }

                if (questions.length < 3 && aiEnabled && isGroqAvailable()) {
                  setIsFetchingQuestion(true);
                  try {
                    const aiQuestions = await generateClarifyingQuestions(
                      goalName,
                      goalVision,
                      deadline,
                      notes,
                      responsesRef.current,
                      questions.map((q) => q.text)
                    );

                    if (aiQuestions?.questions?.length) {
                      setQuestions((prev) => [...prev, aiQuestions.questions[0]]);
                      setCurrentQuestionIndex((i) => i + 1);
                      setIsFetchingQuestion(false);
                      return;
                    }
                  } catch (error) {
                    console.warn('AI follow-up question failed, falling back:', error);
                    setAiStatusMessage(`AI follow-up failed: ${error.message || 'unknown error'}`);
                  }
                  const fallbackQuestions = getFallbackQuestions(goalName);
                  const remaining = fallbackQuestions.filter(
                    (fallback) => !questions.some((existing) => existing.text === fallback.text)
                  );
                  if (remaining.length > 0) {
                    setQuestions((prev) => [...prev, remaining[0]]);
                    setCurrentQuestionIndex((i) => i + 1);
                    setIsFetchingQuestion(false);
                    return;
                  }
                  setIsFetchingQuestion(false);
                }

                handleNext();
              }}>
              {currentQuestionIndex < questions.length - 1 || questions.length < 3 ? 'Next Question' : 'Synthesize Plan'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Loading roadmap ───────────────────────────── */}
      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--accent-2) 0%, transparent 70%)',
              opacity: 0.25,
              filter: 'blur(8px)',
              animation: 'wizardPulse 1.5s ease-in-out infinite alternate'
            }} />
            <div style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              border: '2px dashed var(--accent)',
              animation: 'wizardOrbit 8s linear infinite',
              opacity: 0.6
            }} />
            <div style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'wizardPulse 2s ease-in-out infinite alternate-reverse'
            }}>
              <BarChart2 size={24} color="#fff" />
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>Compiling Custom Roadmap</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', minHeight: '2.5em', maxWidth: '360px', lineHeight: 1.5, fontWeight: 500 }}>{loadingMsg}</p>
          </div>
          {notes && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              fontSize: '0.78rem',
              color: 'var(--muted)',
              maxWidth: '360px',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              "{notes}"
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Rich Roadmap ─────────────────────────────── */}
      {step === 6 && roadmap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', animation: 'wizardSlideIn 0.3s ease-out' }}>

          {!roadmap.isAiGenerated && (
            <div style={{
              marginBottom: '14px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'rgba(245, 158, 11, 0.06)',
              color: '#d97706',
              fontSize: '0.82rem',
              fontWeight: 700
            }}>
              ⚠️ Local Planner Fallback: {aiStatusMessage || 'Groq connection unavailable.'}
            </div>
          )}

          {/* Scrollable body */}
          <div className="custom-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '6px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Goal Profile ──────────────────────────────────── */}
            <div style={{ padding: '20px', background: 'var(--bg-2)', borderRadius: '16px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={12} /> Target Context (Editable)
              </div>
              <input 
                type="text" 
                value={goalName} 
                onChange={e => setGoalName(e.target.value)}
                placeholder="Goal Title..."
                style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', padding: 0, borderBottom: '1px dashed transparent' }} 
                onFocus={e => e.target.style.borderBottom = '1px dashed var(--muted)'}
                onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
              />
              <textarea 
                rows="2"
                value={goalVision} 
                onChange={e => setGoalVision(e.target.value)} 
                placeholder="Ultimate success vision..."
                style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5, font: 'inherit', background: 'transparent', border: 'none', outline: 'none', padding: 0, resize: 'none', borderBottom: '1px dashed transparent' }} 
                onFocus={e => e.target.style.borderBottom = '1px dashed var(--line)'}
                onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
              />
            </div>

            {/* ── AI Summary card ──────────────────────────────── */}
            <div style={{
              borderRadius: '20px', overflow: 'hidden',
              border: `1px solid ${roadmap.summary.moodColor}35`,
              background: `linear-gradient(135deg, ${roadmap.summary.moodColor}08 0%, var(--panel) 80%)`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${roadmap.summary.moodColor}15`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: roadmap.summary.moodColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color={roadmap.summary.moodColor} />
                </div>
                <div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: roadmap.summary.moodColor }}>
                    {roadmap.isAiGenerated ? 'AI Strategic Plan' : 'Rule-Based Blueprint'}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)', marginTop: '2px' }}>{roadmap.summary.headline}</div>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>{roadmap.summary.description}</p>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '8px' }}>Key Metrics & Targets</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roadmap.summary.keyResults.map((kr, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Star size={12} color={roadmap.summary.moodColor} style={{ marginTop: '4px', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.4 }}>{kr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats strip ──────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <StatPill icon={Target}      value={roadmap.stats.totalTasks}   label="Total Tasks"    color="#8b5cf6" />
              <StatPill icon={Calendar}    value={roadmap.stats.oneTimeTasks}  label="Milestones"     color="#ec4899" />
              <StatPill icon={Flame}       value={roadmap.stats.dailyTasks}    label="Daily Habits"   color="#10b981" />
              <StatPill icon={Repeat}      value={roadmap.stats.weeklyTasks}   label="Weekly"         color="#f59e0b" />
              <StatPill icon={CheckCircle2} value={roadmap.stats.phases}       label="Phases"         color="#3b82f6" />
            </div>

            {/* ── Legend ───────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', alignSelf: 'center', marginRight: '4px' }}>Energy Split:</span>
              {Object.entries(ENERGY_COLOR).map(([k, c]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} /> {k}
                </span>
              ))}
              <span style={{ width: '1px', background: 'var(--line)', margin: '0 4px', height: '12px', alignSelf: 'center' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', alignSelf: 'center', marginRight: '4px' }}>Duration:</span>
              {Object.entries(TIME_COLOR).map(([k, c]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: c + '15', color: c }}>
                  <Clock size={9} /> {k}
                </span>
              ))}
            </div>

            {/* ── Phase Timeline ────────────────────────────────── */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={12} /> Sequential Execution Roadmap
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {roadmap.phases.map((phase, i) => (
                  <PhaseCard 
                    key={phase.id} 
                    phase={phase} 
                    index={i} 
                    isLast={i === roadmap.phases.length - 1} 
                    updateTaskField={updateTaskField}
                    deleteTask={deleteTask}
                    addTaskToPhase={addTaskToPhase}
                  />
                ))}
              </div>
            </div>

          </div>{/* end scroll area */}

          {/* ── Actions ──────────────────────────────────────── */}
          <div className="modal-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Discard</button>
            <button type="button" className="primary-btn" onClick={() => {
              if (notes) setGoalVision(v => v ? `${v}\n\nNotes: ${notes}` : `Notes: ${notes}`);
              onSaveWithTasks(roadmap.allTasks, roadmap);
            }}>
              Adopt Roadmap <LayoutList size={16} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

export default AiGoalWizard;
