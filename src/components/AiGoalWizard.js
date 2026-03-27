import React, { useState, useEffect, useRef } from 'react';
import { Target, Loader2, Cpu, LayoutList, CheckCircle2, Repeat, Calendar, Zap, Clock, ChevronRight, Flame, BarChart2, BookOpen, Star } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Roadmap generation engine
   Builds a phased plan from the wizard responses + goal params
───────────────────────────────────────────────────────────── */
function buildRoadmap(goalName, goalVision, deadline, notes, responses) {
  const pacing      = responses[2] || '';
  const bottleneck  = responses[1] || '';
  const timeline    = responses[0] || '';

  const isHabits    = pacing.includes('habits');
  const isBursts    = pacing.includes('bursts');
  const isAgressive = timeline.includes('aggressive');
  const isLongTerm  = timeline.includes('marathon');

  const now = Date.now();
  let idSeed = now;
  const uid = () => ++idSeed;

  // ── AI-generated description ──────────────────────────────────
  const bottleneckAdvice =
    bottleneck.includes('Time')       ? 'Time-blocking and ruthless prioritization will be critical success levers.' :
    bottleneck.includes('Knowledge')  ? 'Front-loading research and skill sprints de-risks execution early.' :
    bottleneck.includes('Motivation') ? 'Micro-wins and visible streaks will sustain momentum across the journey.' :
                                        'Mapping external dependencies upfront reduces blocking surprises.';

  const pacingAdvice =
    isHabits  ? 'Daily habit compounding is your core mechanism — small consistent actions accumulate exponential results.' :
    isBursts  ? 'Weekly deep-focus sessions maximize cognitive throughput for complex, creative output.' :
                'Front-loading high-effort tasks creates early momentum and preserves energy for later phases.';

  const summary = {
    headline: isAgressive ? 'High-Intensity Execution Sprint' : isLongTerm ? 'Sustainable Long-Term Build' : 'Balanced Progressive Roadmap',
    description: `Your goal "${goalName || 'target'}" has been broken into structured phases designed around your stated constraints. ${bottleneckAdvice} ${pacingAdvice}${notes ? ` Additional context accounted for: ${notes.slice(0, 120)}.` : ''}`,
    keyResults: [
      isAgressive ? 'Complete all Phase 1 foundations within first 7 days' : 'Establish core routines within the first 2 weeks',
      isHabits    ? 'Maintain a 5-day execution streak within Week 2' : 'Execute one major milestone per week',
      bottleneck.includes('Knowledge') ? 'Complete one learning sprint before active execution begins' : 'Reduce friction by removing all blockers in Week 1',
      `Reach 60% roadmap completion by the midpoint of your timeline`,
    ],
    moodColor: isAgressive ? '#ec4899' : isLongTerm ? '#3b82f6' : '#8b5cf6',
  };

  // ── Phase definitions ────────────────────────────────────────
  // Each task must match the full app task schema
  const mkTask = (title, recurrenceType, opts = {}) => ({
    id: uid(),
    title,
    recurrenceType,
    oneTimeDate:  opts.oneTimeDate  ?? deadline,
    deadline:     opts.deadline     ?? deadline,
    weeklyDay:    opts.weeklyDay    ?? 1,
    specificDays: opts.specificDays ?? [],
    timeEstimate: opts.timeEstimate ?? '30m',
    energy:       opts.energy       ?? 'Medium',
    completed:    false,
    completedDates: [],
  });

  let phases = [];

  if (isHabits) {
    // ── Daily-habit compounding plan ────────────────────────
    phases = [
      {
        id: 'p1', label: 'Week 1', theme: 'Environment Setup',
        color: '#8b5cf6', icon: 'foundation',
        description: 'Prepare your environment, gather resources, and eliminate friction before daily habits begin.',
        tasks: [
          mkTask(`Define success metrics for "${goalName || 'goal'}"`,         'one-time', { timeEstimate: '30m', energy: 'Medium' }),
          mkTask(`Research best practices & gather resources`,                  'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Set up your workspace / tools`,                               'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Identify and remove top 3 daily blockers`,                    'one-time', { timeEstimate: '30m', energy: 'Medium' }),
        ],
      },
      {
        id: 'p2', label: 'Week 2', theme: 'Habit Ignition',
        color: '#ec4899', icon: 'ignition',
        description: 'Launch your core daily habits and build early momentum. Focus on consistency, not perfection.',
        tasks: [
          mkTask(`Day 1: First full execution session`,                         'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Day 2–5: Daily micro-practice block`,                         'one-time', { timeEstimate: '15m', energy: 'Medium' }),
          mkTask(`Day 6: Weekly self-review & calibration`,                     'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Day 7: Rest & passive reinforcement`,                         'one-time', { timeEstimate: '15m', energy: 'Low'    }),
        ],
      },
      {
        id: 'p3', label: 'Week 3 – 4', theme: 'Momentum Phase',
        color: '#3b82f6', icon: 'momentum',
        description: 'Compound daily output with increasing depth. Introduce stretch tasks to push above baseline.',
        tasks: [
          mkTask(`Increase session depth by 25%`,                               'one-time', { timeEstimate: '30m', energy: 'High'   }),
          mkTask(`Add one accountability checkpoint`,                           'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Mid-goal milestone review`,                                   'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
          mkTask(`Document 3 lessons learned`,                                  'one-time', { timeEstimate: '30m', energy: 'Low'    }),
        ],
      },
      {
        id: 'p_daily', label: 'Daily Habits', theme: 'Recurring Core',
        color: '#10b981', icon: 'recurring',
        description: 'These tasks repeat every day and are the engine of your compound growth.',
        tasks: [
          mkTask(`Daily 15-min execution block`,                                'daily',    { timeEstimate: '15m', energy: 'High', deadline: '', oneTimeDate: '' }),
          mkTask(`Daily progress log (2 min)`,                                  'daily',    { timeEstimate: '15m', energy: 'Low',  deadline: '', oneTimeDate: '' }),
        ],
      },
      {
        id: 'p_weekly', label: 'Weekly Reviews', theme: 'Review & Adjust',
        color: '#f59e0b', icon: 'review',
        description: 'Weekly reviews keep you aligned and allow rapid adjustment of priorities.',
        tasks: [
          mkTask(`Weekly retro & planning session`,                             'weekly',   { timeEstimate: '30m', energy: 'Low',    weeklyDay: 0, deadline: '', oneTimeDate: '' }),
          mkTask(`Week-ahead preparation block`,                                'weekly',   { timeEstimate: '15m', energy: 'Medium', weeklyDay: 6, deadline: '', oneTimeDate: '' }),
        ],
      },
    ];

  } else if (isBursts) {
    // ── Deep-focus burst plan ───────────────────────────────
    phases = [
      {
        id: 'p1', label: 'Week 1', theme: 'Orientation Sprint',
        color: '#8b5cf6', icon: 'foundation',
        description: 'Define scope, gather materials, and schedule your weekly deep-work blocks upfront.',
        tasks: [
          mkTask(`Scope definition & project kickoff`,                          'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Resource library assembly`,                                   'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
          mkTask(`Calendar blocking: reserve deep-work slots`,                  'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Distraction elimination protocol`,                            'one-time', { timeEstimate: '15m', energy: 'Low'    }),
        ],
      },
      {
        id: 'p2', label: 'Week 2', theme: 'First Deep Burst',
        color: '#ec4899', icon: 'ignition',
        description: 'Your first major deep-work week. Aim for quality over quantity — produce one significant output.',
        tasks: [
          mkTask(`Deep Work Block A (Session 1)`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Deep Work Block A (Session 2)`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Output review & improvement cycle`,                           'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
          mkTask(`Week 2 retro: what worked, what didn't`,                      'one-time', { timeEstimate: '30m', energy: 'Low'    }),
        ],
      },
      {
        id: 'p3', label: 'Week 3', theme: 'Depth Amplification',
        color: '#3b82f6', icon: 'momentum',
        description: 'Second burst cycle. Increase output quality and begin connecting earlier work into a cohesive whole.',
        tasks: [
          mkTask(`Deep Work Block B (Session 1)`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Deep Work Block B (Session 2)`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Cross-reference & synthesis session`,                         'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Peer / self-feedback checkpoint`,                             'one-time', { timeEstimate: '30m', energy: 'Medium' }),
        ],
      },
      {
        id: 'p4', label: 'Week 4', theme: 'Consolidation & Delivery',
        color: '#f59e0b', icon: 'delivery',
        description: 'Polish, finalize, and deliver the core output. Wrap up with a retrospective.',
        tasks: [
          mkTask(`Final refinement session`,                                    'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Quality audit & gap check`,                                   'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
          mkTask(`Final delivery / publish / submit`,                           'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Full goal retrospective`,                                     'one-time', { timeEstimate: '30m', energy: 'Low'    }),
        ],
      },
      {
        id: 'p_weekly', label: 'Recurring', theme: 'Ongoing Maintenance',
        color: '#10b981', icon: 'recurring',
        description: 'Light weekly and monthly touchpoints that keep progress visible between deep sessions.',
        tasks: [
          mkTask(`Weekly quick-sync (30 min)`,                                  'weekly',   { timeEstimate: '30m', energy: 'Low',    weeklyDay: 0, deadline: '', oneTimeDate: '' }),
          mkTask(`Mid-week status pulse`,                                        'weekly',   { timeEstimate: '15m', energy: 'Low',    weeklyDay: 3, deadline: '', oneTimeDate: '' }),
        ],
      },
    ];

  } else {
    // ── Front-loaded aggressive plan ───────────────────────
    phases = [
      {
        id: 'p1', label: 'Day 1 – 3', theme: 'Rapid Kickoff',
        color: '#ec4899', icon: 'foundation',
        description: 'Move fast. In the first 3 days, define everything and eliminate ambiguity before full execution.',
        tasks: [
          mkTask(`Day 1: Kick-off — define deliverables & KPIs`,                'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Day 1: Competitive / context research blitz`,                 'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Day 2: Heavy Execution Slab A`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Day 3: Heavy Execution Slab B`,                               'one-time', { timeEstimate: '2h+', energy: 'High'   }),
        ],
      },
      {
        id: 'p2', label: 'Day 4 – 7', theme: 'Peak Output',
        color: '#8b5cf6', icon: 'ignition',
        description: 'The hardest and most important work happens here. Protect these days ruthlessly.',
        tasks: [
          mkTask(`Day 4: Core deliverable build (Part 1 of 2)`,                 'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Day 5: Core deliverable build (Part 2 of 2)`,                 'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Day 6: Integration & coherence pass`,                         'one-time', { timeEstimate: '1h',  energy: 'High'   }),
          mkTask(`Day 7: First draft review & gap list`,                        'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
        ],
      },
      {
        id: 'p3', label: 'Week 2', theme: 'Refinement & Hardening',
        color: '#3b82f6', icon: 'momentum',
        description: 'Refine the Week 1 output. Resolve issues, incorporate feedback, and harden the work.',
        tasks: [
          mkTask(`Address gap list from Day 7 review`,                          'one-time', { timeEstimate: '2h+', energy: 'High'   }),
          mkTask(`Quality assurance audit`,                                     'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
          mkTask(`Stakeholder / external check (if applicable)`,                'one-time', { timeEstimate: '30m', energy: 'Medium' }),
          mkTask(`Final polish pass`,                                            'one-time', { timeEstimate: '1h',  energy: 'Medium' }),
        ],
      },
      {
        id: 'p4', label: 'Week 3+', theme: 'Finalization & sustainment',
        color: '#f59e0b', icon: 'delivery',
        description: 'Deliver, then maintain. Front-loaded goals still need a sustaining rhythm after launch.',
        tasks: [
          mkTask(`Delivery / launch action`,                                    'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Post-delivery retrospective`,                                 'one-time', { timeEstimate: '30m', energy: 'Low'    }),
          mkTask(`Maintenance weekly check-in`,                                 'weekly',   { timeEstimate: '15m', energy: 'Low',    weeklyDay: 1, deadline: '', oneTimeDate: '' }),
        ],
      },
    ];
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
const RECUR_LABEL  = { 'one-time': 'One-time', daily: 'Daily', weekly: 'Weekly', 'specific-days': 'Select Days' };
const RECUR_ICON   = { 'one-time': Calendar, daily: Flame, weekly: Repeat };
const TIME_COLOR   = { '15m': '#10b981', '30m': '#3b82f6', '1h': '#8b5cf6', '2h+': '#ec4899' };

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', flex: '1 1 calc(33% - 12px)', minWidth: '140px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

function TaskPill({ task, updateTaskTitle }) {
  const RecurIcon = RECUR_ICON[task.recurrenceType] || Calendar;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px',
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      borderRadius: '10px',
      transition: 'transform 0.15s ease',
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ENERGY_COLOR[task.energy] || '#8b5cf6', flexShrink: 0 }} />
      <input 
        type="text" 
        value={task.title} 
        onChange={e => updateTaskTitle(task.id, e.target.value)}
        style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', padding: 0, minWidth: 0, borderBottom: '1px solid transparent', transition: 'border 0.2s', ...({':focus': { borderBottom: '1px dashed var(--muted)' }})}}
      />
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, padding: '3px 7px', borderRadius: '6px', background: TIME_COLOR[task.timeEstimate] + '18', color: TIME_COLOR[task.timeEstimate] || 'var(--accent)' }}>
          <Clock size={10} /> {task.timeEstimate}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, padding: '3px 7px', borderRadius: '6px', background: 'var(--panel)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
          <RecurIcon size={10} /> {RECUR_LABEL[task.recurrenceType]}
        </span>
      </div>
    </div>
  );
}

function PhaseCard({ phase, index, isLast, updateTaskTitle }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{ position: 'relative', display: 'flex', gap: '16px' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${phase.color}, ${phase.color}aa)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 4px ${phase.color}20`,
          color: '#fff', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
        }}>
          {index + 1}
        </div>
        {!isLast && (
          <div style={{ width: '2px', flex: 1, minHeight: '16px', background: `linear-gradient(to bottom, ${phase.color}60, transparent)`, marginTop: '6px' }} />
        )}
      </div>

      {/* Card */}
      <div style={{ flex: 1, marginBottom: isLast ? 0 : '12px' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: open ? '10px' : 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: phase.color }}>{phase.label}</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--line)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>{phase.tasks.length} tasks</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{phase.theme}</div>
          </div>
          <ChevronRight size={18} color="var(--muted)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }} />
        </button>

        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{phase.description}</p>
            {phase.tasks.map(task => <TaskPill key={task.id} task={task} updateTaskTitle={updateTaskTitle} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main wizard component
───────────────────────────────────────────────────────────── */
function AiGoalWizard({ goalName, setGoalName, goalVision, setGoalVision, onCancel, onSaveWithTasks }) {
  const [step, setStep] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  const [questions, setQuestions]                 = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses]                 = useState({});
  const [roadmap, setRoadmap]                     = useState(null);

  const responsesRef = useRef(responses);
  useEffect(() => { responsesRef.current = responses; }, [responses]);

  // ── Step 3: generate clarifying questions ─────────────────────
  useEffect(() => {
    if (step !== 3) return;
    setResponses({});
    setCurrentQuestionIndex(0);
    const t = setTimeout(() => {
      setQuestions([
        {
          text: `To properly construct the roadmap for "${goalName || 'this target'}", how aggressive is your timeline based on your deadline?`,
          options: ['Very aggressive (heavy daily workload)', 'Moderate & steady (balanced weekly tasks)', 'Long-term marathon (light, consistent steps)'],
        },
        {
          text: `What is the most likely bottleneck or challenge you'll face pursuing this goal?`,
          options: ['Time & Scheduling constraints', 'Knowledge or Skill gaps', 'Motivation & Energy', 'External dependencies / resources'],
        },
        {
          text: `How do you prefer to pace your execution workflows?`,
          options: ['Front-load the hardest tasks early', 'Evenly spread tiny daily habits', 'Work in weekly deep-focus bursts'],
        },
      ]);
      setStep(4);
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Step 5: build detailed roadmap ────────────────────────────
  useEffect(() => {
    if (step !== 5) return;
    const t = setTimeout(() => {
      const result = buildRoadmap(goalName, goalVision, deadline, notes, responsesRef.current);
      setRoadmap(result);
      setStep(6);
    }, 2800);
    return () => clearTimeout(t);
  }, [step, goalName, goalVision, deadline, notes]);

  const updateTaskTitle = (taskId, newTitle) => {
    setRoadmap(prev => {
      if (!prev) return prev;
      const newPhases = prev.phases.map(p => ({
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t)
      }));
      const newAllTasks = newPhases.flatMap(p => p.tasks);
      return { ...prev, phases: newPhases, allTasks: newAllTasks };
    });
  };

  const handleNext = () => setStep(s => s + 1);

  const stepLabel = step <= 2 ? 'Goal Parameterization'
    : step <= 4 ? 'AI Clarification'
    : step === 5 ? 'Generating Roadmap'
    : 'Your AI Roadmap';

  return (
    <div className="ai-wizard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Wizard Header ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>{stepLabel}</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Powered by AI planning models.</p>
        </div>
        <span style={{ fontSize: '0.85rem', background: 'var(--bg-2)', color: 'var(--accent)', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>
          Step {Math.min(step, 6)} / 6
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--line)', borderRadius: '99px', marginTop: '-12px' }}>
        <div style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', width: `${(Math.min(step, 6) / 6) * 100}%`, transition: 'width 0.5s ease' }} />
      </div>

      {/* ── Step 1: Core Goal ─────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Start with the core definition of what you want to achieve.</p>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.95rem', fontWeight: 500 }}>
            Goal Name
            <input type="text" placeholder="E.g., Launch SaaS MVP" value={goalName} onChange={e => setGoalName(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.95rem', fontWeight: 500 }}>
            Goal Description
            <textarea rows="3" placeholder="What does success look like? Describe your vision..." value={goalVision} onChange={e => setGoalVision(e.target.value)} />
          </label>
          <div className="modal-actions" style={{ marginTop: '4px' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary-btn">Next Step</button>
          </div>
        </form>
      )}

      {/* ── Step 2: Timeline & Notes ──────────────────────────── */}
      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Add optional constraints before the AI builds your plan.</p>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.95rem', fontWeight: 500 }}>
            Target Deadline (Optional)
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '8px', fontSize: '0.95rem', fontWeight: 500 }}>
            Additional Notes & Constraints
            <textarea rows="3" placeholder="Any specific requirements or limitations?" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="modal-actions" style={{ marginTop: '4px' }}>
            <button type="button" className="ghost-btn" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="primary-btn">Initialize AI Analysis <Cpu size={16} style={{ marginLeft: '8px' }} /></button>
          </div>
        </form>
      )}

      {/* ── Step 3: Loading questions ─────────────────────────── */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={40} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Brainstorming clarifying questions…</p>
        </div>
      )}

      {/* ── Step 4: Q&A ───────────────────────────────────────── */}
      {step === 4 && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'linear-gradient(145deg, var(--panel), var(--bg-2))', borderRadius: '12px', border: '1px solid var(--accent)' }}>
            <p style={{ margin: 0, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', lineHeight: '1.5' }}>
              <Cpu size={22} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
              {questions[currentQuestionIndex].text}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select the best match.</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)' }}>Q{currentQuestionIndex + 1} / {questions.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {questions[currentQuestionIndex].options.map(opt => {
              const isActive = responses[currentQuestionIndex] === opt;
              return (
                <button key={opt} type="button" className={`ghost-btn${isActive ? ' active' : ''}`}
                  style={{ textAlign: 'left', borderColor: isActive ? 'var(--accent)' : '', background: isActive ? 'rgba(124,58,237,0.08)' : '' }}
                  onClick={() => setResponses(prev => ({ ...prev, [currentQuestionIndex]: opt }))}>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="modal-actions" style={{ marginTop: '4px' }}>
            <button type="button" className="ghost-btn" onClick={() => {
              if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1);
              else setStep(2);
            }}>Back</button>
            <button type="button" className="primary-btn" disabled={!responses[currentQuestionIndex]}
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(i => i + 1);
                else handleNext();
              }}>
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Submit Responses'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Loading roadmap ───────────────────────────── */}
      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px' }}>
            <Loader2 size={64} color="var(--accent)" style={{ animation: 'spin 2s linear infinite' }} />
            <BarChart2 size={24} color="var(--accent)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1.05rem' }}>Compiling your personalized roadmap…</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Analysing your parameters, constraints & pacing style.</p>
          </div>
          {notes && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', maxWidth: '320px', fontStyle: 'italic' }}>
              "{notes.slice(0, 100)}{notes.length > 100 ? '…' : ''}"
            </p>
          )}
        </div>
      )}

      {/* ── Step 6: Rich Roadmap ─────────────────────────────── */}
      {step === 6 && roadmap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* Scrollable body */}
          <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: '12px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Goal Profile ──────────────────────────────────── */}
            <div style={{ padding: '16px 20px', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={12} /> Target Context (Editable)
              </div>
              <input 
                type="text" 
                value={goalName} 
                onChange={e => setGoalName(e.target.value)}
                placeholder="Name your goal..."
                style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', padding: 0, borderBottom: '1px dashed transparent' }} 
                onFocus={e => e.target.style.borderBottom = '1px dashed var(--muted)'}
                onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
              />
              <textarea 
                rows="2"
                value={goalVision} 
                onChange={e => setGoalVision(e.target.value)} 
                placeholder="What does success look like?"
                style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5, font: 'inherit', background: 'transparent', border: 'none', outline: 'none', padding: 0, resize: 'none', borderBottom: '1px dashed transparent' }} 
                onFocus={e => e.target.style.borderBottom = '1px dashed var(--line)'}
                onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
              />
            </div>

            {/* ── AI Summary card ──────────────────────────────── */}
            <div style={{
              borderRadius: '16px', overflow: 'hidden',
              border: `1px solid ${roadmap.summary.moodColor}40`,
              background: `linear-gradient(135deg, ${roadmap.summary.moodColor}12 0%, var(--panel) 70%)`,
            }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${roadmap.summary.moodColor}20`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: roadmap.summary.moodColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} color={roadmap.summary.moodColor} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: roadmap.summary.moodColor }}>AI Analysis</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{roadmap.summary.headline}</div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>{roadmap.summary.description}</p>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '8px' }}>Key Results</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {roadmap.summary.keyResults.map((kr, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Star size={12} color={roadmap.summary.moodColor} style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4 }}>{kr}</span>
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
              <StatPill icon={Flame}       value={roadmap.stats.dailyTasks}    label="Daily"          color="#f59e0b" />
              <StatPill icon={Repeat}      value={roadmap.stats.weeklyTasks}   label="Weekly"         color="#3b82f6" />
              <StatPill icon={CheckCircle2} value={roadmap.stats.phases}       label="Phases"         color="#10b981" />
            </div>

            {/* ── Legend ───────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px 16px', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', alignSelf: 'center', marginRight: '4px' }}>Energy:</span>
              {Object.entries(ENERGY_COLOR).map(([k, c]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} /> {k}
                </span>
              ))}
              <span style={{ width: '1px', background: 'var(--line)', margin: '0 4px' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', alignSelf: 'center', marginRight: '4px' }}>Duration:</span>
              {Object.entries(TIME_COLOR).map(([k, c]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: c + '18', color: c }}>
                  <Clock size={9} /> {k}
                </span>
              ))}
            </div>

            {/* ── Phase Timeline ────────────────────────────────── */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={12} /> Execution Phases
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {roadmap.phases.map((phase, i) => (
                  <PhaseCard key={phase.id} phase={phase} index={i} isLast={i === roadmap.phases.length - 1} updateTaskTitle={updateTaskTitle} />
                ))}
              </div>
            </div>

          </div>{/* end scroll area */}

          {/* ── Actions ──────────────────────────────────────── */}
          <div className="modal-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Discard</button>
            <button type="button" className="primary-btn" onClick={() => {
              if (notes) setGoalVision(v => v ? `${v}\n\nNotes: ${notes}` : `Notes: ${notes}`);
              onSaveWithTasks(roadmap.allTasks);
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
