import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  RotateCw,
  Calendar as CalendarIcon,
  CheckCircle2,
  BarChart3,
  Zap,
  Trash2,
  Search,
  X,
  Filter,
  Lock,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { addDays, getDateKey, isTaskActiveOnDate as isTaskActiveOnDateUtil, getTaskLockStatus } from '../utils/dateUtils';
import MorningBriefing from '../components/MorningBriefing';
import ErrorBoundary from '../components/ErrorBoundary';
import TodayScore from '../components/TodayScore';
import CapacityWarning from '../components/CapacityWarning';
import { getRecommendedTask } from '../services/recommendationEngine';

/* ─── Mini SVG ring for day-cell progress ─────────────────────── */
function RingProgress({ pct = 0, size = 32, stroke = 3, isEmpty = false }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  const color = pct === 100 ? 'var(--good)' : pct > 0 ? 'var(--accent)' : 'var(--line)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      {!isEmpty && pct > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      )}
    </svg>
  );
}

/* ─── Task dots (up to 5) ────────────────────────────────────────── */
function TaskDots({ count = 0, done = 0 }) {
  const shown = Math.min(count, 5);
  return (
    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: i < done ? 'var(--accent)' : 'var(--line)',
            flexShrink: 0,
            transition: 'background 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function getUserEnergy() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'Medium';
  if (hour >= 10 && hour < 14) return 'High';
  if (hour >= 14 && hour < 17) return 'Medium';
  return 'Low';
}

function parseTimeEstimate(value) {
  if (!value) return 30;
  if (value === '15m') return 15;
  if (value === '30m') return 30;
  if (value === '1h') return 60;
  if (value === '2h+') return 120;
  const asNumber = Number.parseInt(value, 10);
  return Number.isFinite(asNumber) ? asNumber : 30;
}

function BinaryControl({ isCompleted, isLocked, onToggle, goalId, taskId }) {
  return (
    <input
      type="checkbox"
      checked={isCompleted}
      onChange={() => !isLocked && onToggle(goalId, taskId)}
      disabled={isLocked}
      style={{ width: '20px', height: '20px', marginRight: '6px', cursor: isLocked ? 'not-allowed' : 'pointer', accentColor: 'var(--accent)' }}
    />
  );
}

function QuantityControl({ task, goalId, dateKey, isLocked, updateTask, isOneTime, isCompleted }) {
  const currentVal = isOneTime ? (task.currentValue || 0) : (task.dailyProgress?.[dateKey] || 0);
  const targetVal = task.targetValue || 10;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(currentVal);

  const handleIncrement = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const nextVal = currentVal + 1;
    if (isOneTime) {
      updateTask(goalId, task.id, { currentValue: nextVal });
    } else {
      const dailyProgress = { ...(task.dailyProgress || {}) };
      dailyProgress[dateKey] = nextVal;
      updateTask(goalId, task.id, { dailyProgress });
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const nextVal = Math.max(0, currentVal - 1);
    if (isOneTime) {
      updateTask(goalId, task.id, { currentValue: nextVal });
    } else {
      const dailyProgress = { ...(task.dailyProgress || {}) };
      dailyProgress[dateKey] = nextVal;
      updateTask(goalId, task.id, { dailyProgress });
    }
  };

  const handleSaveInput = () => {
    setEditing(false);
    const parsed = Math.max(0, parseInt(inputVal, 10) || 0);
    if (isOneTime) {
      updateTask(goalId, task.id, { currentValue: parsed });
    } else {
      const dailyProgress = { ...(task.dailyProgress || {}) };
      dailyProgress[dateKey] = parsed;
      updateTask(goalId, task.id, { dailyProgress });
    }
  };

  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px', userSelect: 'none' }}
      onClick={e => { e.stopPropagation(); e.preventDefault(); }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isLocked || currentVal === 0}
        className="ghost-btn"
        style={{ padding: '0 6px', fontSize: '0.8rem', minHeight: '0', height: '22px', display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', cursor: isLocked || currentVal === 0 ? 'not-allowed' : 'pointer' }}
      >
        -
      </button>
      {editing ? (
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleSaveInput}
          onKeyDown={e => { if (e.key === 'Enter') handleSaveInput(); }}
          autoFocus
          style={{ width: '36px', padding: '1px', fontSize: '0.8rem', textAlign: 'center', background: 'var(--bg-2)', border: '1px solid var(--accent)', borderRadius: '4px', color: 'var(--text)' }}
        />
      ) : (
        <span
          onDoubleClick={() => { if (!isLocked) { setEditing(true); setInputVal(currentVal); } }}
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            minWidth: '40px',
            textAlign: 'center',
            color: isCompleted ? 'var(--good)' : 'var(--text)',
            cursor: isLocked ? 'default' : 'pointer'
          }}
          title="Double-click to edit"
        >
          {currentVal}/{targetVal}
        </span>
      )}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isLocked}
        className="ghost-btn"
        style={{ padding: '0 6px', fontSize: '0.8rem', minHeight: '0', height: '22px', display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', cursor: isLocked ? 'not-allowed' : 'pointer' }}
      >
        +
      </button>
    </div>
  );
}

function ScaleControl({ task, goalId, dateKey, isLocked, updateTask, isOneTime }) {
  const currentVal = isOneTime ? (task.currentValue || 0) : (task.dailyProgress?.[dateKey] || 0);
  return (
    <div 
      style={{ display: 'flex', gap: '2px', marginRight: '6px' }}
      onClick={e => { e.stopPropagation(); e.preventDefault(); }}
    >
      {[1, 2, 3, 4, 5].map(rating => (
        <button
          key={rating}
          type="button"
          disabled={isLocked}
          onClick={() => {
            const newVal = currentVal === rating ? 0 : rating;
            if (isOneTime) {
              updateTask(goalId, task.id, { currentValue: newVal });
            } else {
              const dailyProgress = { ...(task.dailyProgress || {}) };
              dailyProgress[dateKey] = newVal;
              updateTask(goalId, task.id, { dailyProgress });
            }
          }}
          style={{ background: 'transparent', border: 'none', padding: '1px', cursor: isLocked ? 'not-allowed' : 'pointer' }}
        >
          <Star
            size={15}
            fill={rating <= currentVal ? '#f59e0b' : 'none'}
            color={rating <= currentVal ? '#f59e0b' : 'var(--muted)'}
          />
        </button>
      ))}
    </div>
  );
}

function MultistateControl({ task, goalId, dateKey, isLocked, updateTask, isOneTime }) {
  const currentVal = isOneTime ? (task.currentValue || 0) : (task.dailyProgress?.[dateKey] || 0);
  const labels = ['Todo', 'Progress', 'Blocked', 'Done'];
  const colors = [
    { border: '1px solid var(--muted)', color: 'var(--muted)', bg: 'transparent' },
    { border: '1px solid #3b82f6', color: '#fff', bg: '#3b82f6' },
    { border: '1px solid #f59e0b', color: '#fff', bg: '#f59e0b' },
    { border: '1px solid #10b981', color: '#fff', bg: '#10b981' }
  ];
  const currentStyle = colors[currentVal] || colors[0];

  const cycleState = () => {
    if (isLocked) return;
    const nextVal = (currentVal + 1) % 4;
    if (isOneTime) {
      updateTask(goalId, task.id, { currentValue: nextVal, stateLabel: labels[nextVal] });
    } else {
      const dailyProgress = { ...(task.dailyProgress || {}) };
      dailyProgress[dateKey] = nextVal;
      updateTask(goalId, task.id, { dailyProgress, stateLabel: labels[nextVal] });
    }
  };

  return (
    <button
      type="button"
      onClick={cycleState}
      disabled={isLocked}
      style={{
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.72rem',
        fontWeight: 700,
        background: currentStyle.bg,
        color: currentStyle.color,
        border: currentStyle.border,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        marginRight: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        transition: 'all 0.2s ease'
      }}
    >
      {labels[currentVal]}
    </button>
  );
}

function InteractiveControl({ task, goalId, dateKey, isLocked, updateTask, onToggle }) {
  const isOneTime = task.recurrenceType === 'one-time';
  const type = task.completionType || 'binary';

  const isCompleted = isOneTime
    ? (type === 'quantity' ? (task.currentValue || 0) >= (task.targetValue || 10)
       : type === 'duration' ? (task.currentValue || 0) >= (task.targetValue || 30)
       : type === 'subtasks' ? Array.isArray(task.subtasks) && task.subtasks.length > 0 && task.subtasks.every(s => s.completed)
       : type === 'scale' ? (task.currentValue || 0) > 0
       : type === 'multistate' ? task.currentValue === 3
       : task.completed)
    : (type === 'quantity' ? (task.dailyProgress?.[dateKey] || 0) >= (task.targetValue || 10)
       : type === 'duration' ? (task.dailyProgress?.[dateKey] || 0) >= (task.targetValue || 30)
       : type === 'subtasks' ? (() => { const subList = task.dailySubtasks?.[dateKey] || task.subtasks || []; return Array.isArray(subList) && subList.length > 0 && subList.every(s => s.completed); })()
       : type === 'scale' ? (task.dailyProgress?.[dateKey] || 0) > 0
       : type === 'multistate' ? task.dailyProgress?.[dateKey] === 3
       : Array.isArray(task.completedDates) && task.completedDates.includes(dateKey));

  if (type === 'binary') {
    return (
      <BinaryControl isCompleted={isCompleted} isLocked={isLocked} onToggle={onToggle} goalId={goalId} taskId={task.id} />
    );
  }

  if (type === 'quantity') {
    return (
      <QuantityControl task={task} goalId={goalId} dateKey={dateKey} isLocked={isLocked} updateTask={updateTask} isOneTime={isOneTime} isCompleted={isCompleted} />
    );
  }

  if (type === 'duration') {
    return (
      <BinaryControl isCompleted={isCompleted} isLocked={isLocked} onToggle={onToggle} goalId={goalId} taskId={task.id} />
    );
  }

  if (type === 'scale') {
    return (
      <ScaleControl task={task} goalId={goalId} dateKey={dateKey} isLocked={isLocked} updateTask={updateTask} isOneTime={isOneTime} />
    );
  }

  if (type === 'multistate') {
    return (
      <MultistateControl task={task} goalId={goalId} dateKey={dateKey} isLocked={isLocked} updateTask={updateTask} isOneTime={isOneTime} />
    );
  }

  return (
    <BinaryControl isCompleted={isCompleted} isLocked={isLocked} onToggle={onToggle} goalId={goalId} taskId={task.id} />
  );
}

function TasksPage({
  user,
  goals = [],
  setActivePage,
  activeTasksToday = [],
  today = new Date(),
  getActiveTasksForDate,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  toggleTaskCompletion,
  toggleTaskDoneForToday,
  updateTask,
  deleteTask,
  getRecurrenceText,
  prettyDate,
  streak,
  completionRate,
  aiEnabled,
  focusMinutesToday,
  todayScore,
  weeklyScores,
  onStartFocus
}) {
  const todayKey = getDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const safeIsTaskActiveOnDate = isTaskActiveOnDate || isTaskActiveOnDateUtil;
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [postponeValue, setPostponeValue] = useState('');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [userCapacity, setUserCapacity] = useState(() => {
    const saved = localStorage.getItem('gola.userCapacity');
    return saved ? parseInt(saved, 10) : 240;
  });

  // ── Compassionate Triage state & effect ─────────────────────────
  const [triageTasks, setTriageTasks] = useState([]);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [currentTriageIndex, setCurrentTriageIndex] = useState(0);
  const [splitSubtaskInputs, setSplitSubtaskInputs] = useState(['', '']);

  useEffect(() => {
    if (goals.length === 0 || !user?.uid) return;

    const triageStorageKey = `gola.${user.uid}.lastTriageDate`;
    const lastTriage = localStorage.getItem(triageStorageKey);
    const todayStr = todayKey;

    if (lastTriage !== todayStr) {
      const yesterday = addDays(new Date(), -1);
      
      const leftovers = goals.flatMap(goal => {
        return goal.tasks
          .filter(task => safeIsTaskActiveOnDate(task, yesterday, goal) && !isTaskDoneForDate(task, yesterday))
          .map(task => {
            let phaseOrder = 999;
            let phaseLabel = null;
            if (goal.roadmap?.phases) {
              const phaseIndex = goal.roadmap.phases.findIndex(p =>
                p.tasks?.some(pt => pt.id === task.id) || task.phaseId === p.id
              );
              if (phaseIndex >= 0) {
                phaseOrder = phaseIndex;
                phaseLabel = goal.roadmap.phases[phaseIndex].label;
              }
            }
            return { goalId: goal.id, goalName: goal.name, task, phaseOrder, phaseLabel };
          })
          .sort((a, b) => a.phaseOrder - b.phaseOrder);
      });

      if (leftovers.length > 0) {
        setTriageTasks(leftovers);
        setCurrentTriageIndex(0);
        setShowTriageModal(true);
      } else {
        localStorage.setItem(triageStorageKey, todayStr);
      }
    }
  }, [goals, user?.uid, todayKey, safeIsTaskActiveOnDate, isTaskDoneForDate]);

  const handleTriageComplete = () => {
    setShowTriageModal(false);
    const triageStorageKey = `gola.${user?.uid}.lastTriageDate`;
    localStorage.setItem(triageStorageKey, todayKey);
  };

  // ── Search & Filter state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGoal, setFilterGoal] = useState('all');
  const [filterEnergy, setFilterEnergy] = useState('all');
  const [filterRecurrence, setFilterRecurrence] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);

  const scrollRef = useRef(null);
  const cellRefs = useRef({});

  // ── Resolve tasks for any date ──────────────────────────────────
  const resolveActiveTasksForDate = useMemo(() => {
    if (typeof getActiveTasksForDate === 'function') return getActiveTasksForDate;
    if (goals.length > 0) {
      return (date) =>
        goals.flatMap((goal) =>
          goal.tasks
            .filter((task) => safeIsTaskActiveOnDate(task, date, goal))
            .map((task) => ({ goalId: goal.id, goalName: goal.name, task }))
        );
    }
    return (date) => (getDateKey(date) === todayKey ? activeTasksToday : []);
  }, [getActiveTasksForDate, goals, safeIsTaskActiveOnDate, todayKey, activeTasksToday]);

  const selectedDate = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey]);

  const BUFFER = 3;
  const MIN_PAST = 3;
  const MIN_FUTURE = 10;
  const dayItems = useMemo(() => {
    const selOffset = Math.round(
      (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const startOffset = Math.min(-MIN_PAST, selOffset - BUFFER);
    const endOffset   = Math.max(MIN_FUTURE, selOffset + BUFFER);

    const list = [];
    for (let offset = startOffset; offset <= endOffset; offset++) {
      const date = addDays(today, offset);
      const dateKey = getDateKey(date);
      const activeTasks = resolveActiveTasksForDate(date);
      const completed = activeTasks.filter(({ task }) => isTaskDoneForDate(task, date)).length;
      const completion = activeTasks.length
        ? Math.round((completed / activeTasks.length) * 100)
        : 0;
      list.push({ date, dateKey, activeTasks, completed, completion, isPast: offset < 0 });
    }
    return list;
  }, [today, selectedDate, resolveActiveTasksForDate, isTaskDoneForDate]);

  const todayIndex = dayItems.findIndex((item) => item.dateKey === todayKey);

  const selectedDay =
    dayItems.find((item) => item.dateKey === selectedDateKey) ??
    dayItems[todayIndex] ?? dayItems[0];

  const tasksForSelectedDay = selectedDay?.activeTasks || [];
  const pendingTasks = tasksForSelectedDay.filter(
    ({ task }) => !isTaskDoneForDate(task, selectedDate)
  );
  const completedTasks = tasksForSelectedDay.filter(({ task }) =>
    isTaskDoneForDate(task, selectedDate)
  );
  const completionPercentage =
    tasksForSelectedDay.length > 0
      ? Math.round((completedTasks.length / tasksForSelectedDay.length) * 100)
      : 0;

  const totalGoalsTouched = new Set(tasksForSelectedDay.map(({ goalId }) => goalId)).size;
  const allOpenTasks = goals.reduce(
    (sum, goal) =>
      sum +
      goal.tasks.filter(
        (task) =>
          safeIsTaskActiveOnDate(task, selectedDate, goal) && !isTaskDoneForDate(task, selectedDate)
      ).length,
    0
  );

  const activeDayLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const monthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const filterTaskFn = useCallback((item) => {
    const { task, goalId, goalName } = item;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (task.title?.toLowerCase().includes(q)) return true;
      if (task.description?.toLowerCase().includes(q)) return true;
      if (goalName.toLowerCase().includes(q)) return true;
      const allSubtasks = [
        ...(task.subtasks || []),
        ...Object.values(task.dailySubtasks || {}).flat()
      ];
      if (allSubtasks.some(sub => sub.title?.toLowerCase().includes(q))) return true;
      if (task.energy?.toLowerCase().includes(q)) return true;
      if (task.recurrenceType?.toLowerCase().includes(q)) return true;
      return false;
    }
    
    if (filterGoal !== 'all' && goalId !== filterGoal) return false;
    if (filterEnergy !== 'all' && task.energy !== filterEnergy) return false;
    if (filterRecurrence !== 'all' && task.recurrenceType !== filterRecurrence) return false;
    
    return true;
  }, [searchQuery, filterGoal, filterEnergy, filterRecurrence]);

  const sortTasksFn = useCallback((a, b) => {
    if (sortBy === 'priority') {
      const aVal = a.task.isPriority ? 1 : 0;
      const bVal = b.task.isPriority ? 1 : 0;
      return bVal - aVal;
    }
    if (sortBy === 'goal') {
      return a.goalName.localeCompare(b.goalName);
    }
    if (sortBy === 'energy') {
      const energyPriority = { High: 3, Medium: 2, Low: 1 };
      const aVal = energyPriority[a.task.energy] || 0;
      const bVal = energyPriority[b.task.energy] || 0;
      return bVal - aVal;
    }
    if (sortBy === 'recurrence') {
      const recurrencePriority = { 'one-time': 1, daily: 2, weekly: 3, specific: 4 };
      const aVal = recurrencePriority[a.task.recurrenceType] || 5;
      const bVal = recurrencePriority[b.task.recurrenceType] || 5;
      return aVal - bVal;
    }
    return a._order - b._order;
  }, [sortBy]);

  const orderedPendingTasks = useMemo(() => {
    return [...pendingTasks]
      .map((item, index) => {
        const orderVal = item.task.order;
        let numericOrder;
        if (typeof orderVal === 'number') {
          numericOrder = orderVal;
        } else if (typeof orderVal === 'string') {
          const match = orderVal.match(/^temp_(\d+)/);
          if (match) {
            numericOrder = parseInt(match[1], 10);
          } else {
            const parsed = parseInt(orderVal, 10);
            numericOrder = isNaN(parsed) ? index : parsed;
          }
        } else {
          numericOrder = index;
        }
        return { ...item, _order: numericOrder };
      })
      .filter((item) => !item.task._graduated)
      .filter(filterTaskFn)
      .sort(sortTasksFn);
  }, [pendingTasks, filterTaskFn, sortTasksFn]);

  const filteredCompletedTasks = useMemo(() => {
    return [...completedTasks]
      .map((item, index) => ({ ...item, _order: index }))
      .filter(filterTaskFn)
      .sort(sortTasksFn);
  }, [completedTasks, filterTaskFn, sortTasksFn]);

  const recommendedTask = useMemo(() => {
    const taskPool = orderedPendingTasks.map(({ task, goalId, goalName }) => ({
      ...task,
      goalId,
      goalName
    }));
    return getRecommendedTask(taskPool, getUserEnergy(), new Date().getHours());
  }, [orderedPendingTasks]);

  const usedMinutes = tasksForSelectedDay.reduce(
    (sum, item) => sum + parseTimeEstimate(item.task.timeEstimate),
    0
  );
  const capacityPercent = Math.min(100, Math.round((usedMinutes / userCapacity) * 100));

  const shiftDate = useCallback(
    (direction) => {
      const next = addDays(selectedDate, direction);
      setSelectedDateKey(getDateKey(next));
    },
    [selectedDate]
  );

  const jumpToToday = useCallback(() => {
    setSelectedDateKey(todayKey);
  }, [todayKey]);

  useEffect(() => {
    const el = cellRefs.current[selectedDateKey];
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;
      if (!hasInitialScrolled) {
        container.scrollTo({ left: targetScroll, behavior: 'instant' });
        setHasInitialScrolled(true);
      } else {
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [selectedDateKey, hasInitialScrolled]);

  const handleToggleTaskDone = (goalId, taskId) => {
    if (typeof toggleTaskCompletion === 'function') {
      toggleTaskCompletion(goalId, taskId, selectedDate);
      return;
    }
    if (typeof toggleTaskDoneForToday === 'function') {
      toggleTaskDoneForToday(goalId, taskId);
    }
  };

  const handleToggleSubtask = (goalId, task, subtaskId, dateKey) => {
    if (!updateTask) return;
    const isOneTime = task.recurrenceType === 'one-time';
    if (isOneTime) {
      const currentSubtasks = task.subtasks || [];
      const nextSubtasks = currentSubtasks.map(s => {
        if (s.id !== subtaskId) return s;
        return { ...s, completed: !s.completed };
      });
      updateTask(goalId, task.id, { subtasks: nextSubtasks });
    } else {
      const dailySubtasks = { ...(task.dailySubtasks || {}) };
      const currentSubtasks = dailySubtasks[dateKey] || task.subtasks || [];
      const nextSubtasks = currentSubtasks.map(s => {
        if (s.id !== subtaskId) return s;
        return { ...s, completed: !s.completed };
      });
      dailySubtasks[dateKey] = nextSubtasks;
      updateTask(goalId, task.id, { dailySubtasks });
    }
  };

  const handlePostpone = (goalId, task, newDateKey) => {
    if (!newDateKey || !updateTask) return;
    const fromKey = selectedDateKey;
    const postponedDates = Array.isArray(task.postponedDates) ? [...task.postponedDates] : [];
    postponedDates.push({ from: fromKey, to: newDateKey });

    const updates = {
      postponedDates,
      completedDates: (task.completedDates || []).filter((dateKey) => dateKey !== fromKey),
      updatedAt: new Date().toISOString()
    };

    if (task.recurrenceType !== 'one-time' && task.dailySubtasks?.[fromKey]) {
      const freshDailySubtasks = { ...(task.dailySubtasks || {}) };
      delete freshDailySubtasks[fromKey];
      updates.dailySubtasks = freshDailySubtasks;
    }

    if (task.recurrenceType === 'one-time') {
      updates.oneTimeDate = newDateKey;
      updates.completed = false;
    }

    updateTask(goalId, task.id, updates);
    setPostponeTarget(null);
    setPostponeValue('');
  };

  const handleDragEnd = (result) => {
    if (!result?.destination) return;
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    if (fromIndex === toIndex) return;

    const reordered = Array.from(orderedPendingTasks);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    reordered.forEach((item, index) => {
      if (item.task.order !== index) {
        updateTask(item.goalId, item.task.id, { order: index });
      }
    });
  };

  const isToday = selectedDateKey === todayKey;

  return (
    <section className="page page-enter">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="section-head"
        style={{
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.4rem', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            {goals.length === 0 
              ? `Welcome, ${user?.name || 'friend'}.` 
              : `Welcome back, ${user?.name || 'friend'}.`}
          </h1>
          <p className="lead" style={{ margin: 0 }}>
            {goals.length === 0 
              ? `Today is ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Take a deep breath, and when you are ready, let's start your journey together.` 
              : `Today is ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Welcome to your gentle, warm space. Let's take it one step at a time.`}
          </p>
        </div>
        {goals.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                lineHeight: 1,
                color: completionPercentage === 100 ? 'var(--good)' : 'var(--text)',
                transition: 'color 0.4s ease',
              }}
            >
              {completionPercentage}%
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.78rem',
                color: 'var(--muted)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Completed {isToday ? 'Today' : 'On Selected Day'}
            </span>
          </div>
        )}
      </div>

      {goals.length === 0 ? (
        <div
          className="card premium-surface"
          style={{
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            border: '1px solid var(--line)',
            borderRadius: '24px',
            background: 'var(--panel)',
            boxShadow: 'var(--shadow)',
            maxWidth: '500px',
            margin: '40px auto 0'
          }}
        >
          <div style={{ fontSize: '3rem' }}>🌱</div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
              Welcome to Gola, a gentle space to grow
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
              We help you nurture your goals by breaking them down into small, friendly daily actions. 
              There is no pressure and no rush. Let's take a gentle first step.
            </p>
          </div>
          <button
            onClick={() => setActivePage && setActivePage('Goals')}
            className="primary-btn"
            style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 700 }}
          >
            Start Your Journey
          </button>
        </div>
      ) : (
        <>
          <ErrorBoundary componentName="MorningBriefing">
            <MorningBriefing
              user={user}
              todayTasks={activeTasksToday || []}
              goals={goals || []}
              completionRate={completionRate}
              streak={streak || 0}
              aiEnabled={aiEnabled}
              onStartTask={onStartFocus}
            />
          </ErrorBoundary>

      {isToday && todayScore !== undefined && (
        <div style={{ marginBottom: '18px' }}>
          <TodayScore
            score={todayScore}
            completionRate={completionRate}
            focusMinutes={focusMinutesToday}
            streak={streak}
            weeklyScores={weeklyScores || []}
          />
        </div>
      )}

      {recommendedTask && (
        <div className="card premium-surface" style={{ padding: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                Recommended Next Task
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                {recommendedTask.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {recommendedTask.goalName}
              </div>
            </div>
            <button
              className="primary-btn"
              onClick={() => onStartFocus(recommendedTask.id, recommendedTask.goalId)}
              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px' }}
            >
              Focus <Zap size={12} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Horizontal Calendar Card ────────────────────────────── */}
      <div
        className="card premium-surface"
        style={{ padding: '16px', marginBottom: '18px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              {monthLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!isToday && (
              <button
                className="ghost-btn"
                onClick={jumpToToday}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  background: 'color-mix(in oklab, var(--accent) 12%, var(--panel))',
                  border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
                title="Jump to today"
              >
                <Zap size={12} />
                Today
              </button>
            )}
            <button
              className="ghost-btn"
              style={{ padding: '6px 10px', borderRadius: '10px' }}
              onClick={() => shiftDate(-1)}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="ghost-btn"
              style={{ padding: '6px 10px', borderRadius: '10px' }}
              onClick={() => shiftDate(1)}
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {dayItems.map((item) => {
            const isSelected = item.dateKey === selectedDateKey;
            const isTodayCell = item.dateKey === todayKey;
            const hasTasks = item.activeTasks.length > 0;

            return (
              <button
                key={item.dateKey}
                ref={(el) => {
                  cellRefs.current[item.dateKey] = el;
                }}
                type="button"
                onClick={() => setSelectedDateKey(item.dateKey)}
                style={{
                  flexShrink: 0,
                  width: '64px',
                  scrollSnapAlign: 'center',
                  padding: '10px 6px 8px',
                  borderRadius: '16px',
                  border: isSelected
                    ? '2px solid var(--accent)'
                    : isTodayCell
                    ? '2px solid color-mix(in oklab, var(--accent) 40%, transparent)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'color-mix(in oklab, var(--accent) 14%, var(--panel))'
                    : isTodayCell
                    ? 'color-mix(in oklab, var(--accent) 6%, var(--panel))'
                    : 'var(--panel)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isSelected
                    ? '0 8px 24px -4px color-mix(in oklab, var(--accent) 45%, transparent)'
                    : 'none',
                  opacity: item.isPast && !isSelected ? 0.72 : 1,
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: isSelected
                      ? 'var(--accent)'
                      : isTodayCell
                      ? 'color-mix(in oklab, var(--accent) 70%, var(--muted))'
                      : 'var(--muted)',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {item.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>

                <div style={{ position: 'relative', width: 32, height: 32 }}>
                  <RingProgress
                    pct={item.completion}
                    size={32}
                    stroke={hasTasks ? 3 : 2}
                    isEmpty={!hasTasks}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: isSelected
                        ? 'var(--accent)'
                        : isTodayCell
                        ? 'var(--text)'
                        : item.isPast
                        ? 'var(--muted)'
                        : 'var(--text)',
                      lineHeight: 1,
                    }}
                  >
                    {item.date.getDate()}
                  </span>
                </div>

                <TaskDots count={item.activeTasks.length} done={item.completed} />

                {isTodayCell && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-1px',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '2px 4px',
                      borderRadius: '6px 6px 0 6px',
                      lineHeight: 1.2,
                    }}
                  >
                    NOW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.92rem',
              color: 'var(--text)',
            }}
          >
            {activeDayLabel}
          </span>
          {tasksForSelectedDay.length > 0 && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color:
                  completionPercentage === 100
                    ? 'var(--good)'
                    : completionPercentage > 0
                    ? 'var(--accent)'
                    : 'var(--muted)',
                background:
                  completionPercentage === 100
                    ? 'color-mix(in oklab, var(--good) 12%, transparent)'
                    : completionPercentage > 0
                    ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
                    : 'var(--panel)',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor:
                  completionPercentage === 100
                    ? 'color-mix(in oklab, var(--good) 25%, transparent)'
                    : completionPercentage > 0
                    ? 'color-mix(in oklab, var(--accent) 20%, transparent)'
                    : 'var(--line)',
                transition: 'all 0.3s ease',
              }}
            >
              {completedTasks.length}/{tasksForSelectedDay.length} done
            </span>
          )}
        </div>
      </div>

      {/* ── Stat chips ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        {[
          {
            label: 'SCHEDULED',
            value: tasksForSelectedDay.length,
            sub: 'Tasks due this day',
          },
          {
            label: 'OPEN LOAD',
            value: allOpenTasks,
            sub: 'Unfinished tasks',
          },
          {
            label: 'ACTIVE GOALS',
            value: totalGoalsTouched,
            sub: 'Goals contributing',
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="card"
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              display: 'grid',
              gap: '2px',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--muted)',
                fontWeight: 800,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1 }}>
              {value}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      <div className="card premium-surface" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Today vs Capacity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{usedMinutes}/{userCapacity} min</span>
            <button
              onClick={() => {
                const input = prompt('Set your daily capacity (minutes, 30-600):', userCapacity);
                if (input) {
                  const val = Math.max(30, Math.min(600, parseInt(input, 10) || 240));
                  setUserCapacity(val);
                  localStorage.setItem('gola.userCapacity', val.toString());
                }
              }}
              style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
              title="Change daily capacity"
            >
              ⚙️
            </button>
          </div>
        </div>
        <div style={{ height: '8px', borderRadius: '999px', background: 'var(--line)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${capacityPercent}%`,
              background: capacityPercent >= 100 ? '#ef4444' : 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      <CapacityWarning tasks={tasksForSelectedDay.map((item) => item.task)} userCapacity={userCapacity} />

      {/* ── Task list ──────────────────────────────────────────────── */}
      {tasksForSelectedDay.length === 0 ? (
        <div
          className="card premium-surface"
          style={{
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            border: '2px dashed var(--line)',
          }}
        >
          <CheckCircle2 color="var(--good)" size={48} />
          <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text)' }}>
            A quiet day ahead
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            There are no active tasks on {activeDayLabel}. Enjoy the open space, or choose another day in the timeline.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    background: 'var(--panel-strong)',
                    fontSize: '0.88rem',
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ghost-btn"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      padding: '4px',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`ghost-btn ${showFilters ? 'active' : ''}`}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${showFilters ? 'var(--accent)' : 'var(--line)'}`,
                  background: 'var(--panel-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: showFilters ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer'
                }}
              >
                <Filter size={14} />
                Filters
                {(filterGoal !== 'all' || filterEnergy !== 'all' || filterRecurrence !== 'all' || sortBy !== 'default') && (
                  <span style={{
                    background: 'var(--accent)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    display: 'inline-block'
                  }} />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="card premium-surface" style={{
                marginTop: '10px',
                padding: '16px',
                borderRadius: '16px',
                display: 'grid',
                gap: '14px',
                animation: 'elegantFadeIn 0.2s ease forwards'
              }}>
                <style>{`@keyframes elegantFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Filter by Goal
                    </span>
                    <select
                      value={filterGoal}
                      onChange={(e) => setFilterGoal(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-2)',
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="all">All Goals</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sort by
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-2)',
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="default">Default Order</option>
                      <option value="priority">Priority First</option>
                      <option value="goal">Goal (A-Z)</option>
                      <option value="energy">Energy (High first)</option>
                      <option value="recurrence">Recurrence Type</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Energy Requirement
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['all', 'High', 'Medium', 'Low'].map((energy) => (
                      <button
                        type="button"
                        key={energy}
                        onClick={() => setFilterEnergy(energy)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${filterEnergy === energy ? 'var(--accent)' : 'var(--line)'}`,
                          background: filterEnergy === energy ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-2)',
                          color: filterEnergy === energy ? 'var(--accent)' : 'var(--text)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {energy === 'all' ? 'All' : energy}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recurrence Type
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['all', 'one-time', 'daily', 'weekly', 'specific'].map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFilterRecurrence(type)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${filterRecurrence === type ? 'var(--accent)' : 'var(--line)'}`,
                          background: filterRecurrence === type ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-2)',
                          color: filterRecurrence === type ? 'var(--accent)' : 'var(--text)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {type === 'all' ? 'All' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {(filterGoal !== 'all' || filterEnergy !== 'all' || filterRecurrence !== 'all' || sortBy !== 'default') && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterGoal('all');
                        setFilterEnergy('all');
                        setFilterRecurrence('all');
                        setSortBy('default');
                      }}
                      className="ghost-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        color: '#ef4444',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={12} />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PENDING */}
          {orderedPendingTasks.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1.05rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    background: 'var(--accent)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block',
                    boxShadow: '0 0 8px var(--accent)',
                  }}
                />
                Pending Actions{' '}
                <span style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                  ({pendingTasks.length})
                </span>
              </h3>
              <div className="card premium-surface" style={{ padding: '0', overflow: 'hidden' }}>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="pending-tasks">
                    {(provided) => (
                      <ul
                        className="task-list interactive"
                        style={{ gap: '0' }}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {orderedPendingTasks.map(({ goalId, goalName, task }, idx) => {
                          const activeGoal = goals.find(g => g.id === goalId);
                          const lockStatus = getTaskLockStatus(task, activeGoal, selectedDate);
                          const isLocked = lockStatus.isLocked;
                          const lockReason = lockStatus.reason;

                          return (
                            <Draggable key={`${goalId}-${task.id}`} draggableId={`${goalId}-${task.id}`} index={idx}>
                              {(dragProvided) => (
                                <li
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{
                                    border: task.isPriority && !isLocked ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
                                    borderBottom: idx === orderedPendingTasks.length - 1 ? 'none' : '1px solid var(--line)',
                                    borderRadius: task.isPriority && !isLocked ? '12px' : '0',
                                    margin: task.isPriority && !isLocked ? '6px 0' : '0',
                                    padding: '18px 22px',
                                    background: isLocked ? 'rgba(0,0,0,0.08)' : task.isPriority ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                                    boxShadow: task.isPriority && !isLocked ? '0 0 12px rgba(245, 158, 11, 0.05)' : 'none',
                                    opacity: isLocked ? 0.5 : 1,
                                    ...dragProvided.draggableProps.style,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                    <label
                                      style={{
                                        fontSize: '1rem',
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        flex: 1
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <InteractiveControl
                                          task={task}
                                          goalId={goalId}
                                          dateKey={selectedDateKey}
                                          isLocked={isLocked}
                                          updateTask={updateTask}
                                          onToggle={handleToggleTaskDone}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                          {task.isPriority && <Star size={15} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />}
                                          <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{task.title}</span>
                                          {isLocked && (
                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                              <Lock size={10} /> Locked
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {isLocked && lockReason && (
                                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#ef4444', fontWeight: 500, paddingLeft: '30px' }}>
                                          {lockReason}
                                        </div>
                                      )}

                                      {task.description && (
                                        <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, paddingLeft: '30px' }}>
                                          {task.description}
                                        </div>
                                      )}
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                                      <button
                                        className="primary-btn"
                                        onClick={() => !isLocked && onStartFocus(task.id, goalId)}
                                        disabled={isLocked}
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', minHeight: '0', borderRadius: '8px', flexShrink: 0, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.5 : 1 }}
                                      >
                                        Focus <Zap size={12} style={{ marginLeft: '4px' }} />
                                      </button>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          className="ghost-btn"
                                          onClick={() => {
                                            setPostponeTarget(`${goalId}-${task.id}`);
                                            setPostponeValue('');
                                          }}
                                          style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                                        >
                                          Postpone
                                        </button>
                                        {deleteTask && (
                                          <button
                                            className="ghost-btn"
                                            onClick={() => deleteTask(goalId, task.id)}
                                            title="Delete task"
                                            style={{ padding: '6px', opacity: 0.4, color: '#ef4444' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                      {postponeTarget === `${goalId}-${task.id}` && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <input
                                            type="date"
                                            value={postponeValue}
                                            min={getDateKey(addDays(selectedDate, 1))}
                                            onChange={(e) => setPostponeValue(e.target.value)}
                                            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.75rem', width: '130px' }}
                                          />
                                          <button
                                            onClick={() => { if (postponeValue) handlePostpone(goalId, task, postponeValue); }}
                                            disabled={!postponeValue}
                                            style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '6px', background: postponeValue ? 'var(--accent)' : 'var(--line)', color: postponeValue ? '#fff' : 'var(--muted)', border: 'none', cursor: postponeValue ? 'pointer' : 'not-allowed' }}
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setPostponeTarget(null)}
                                            style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--line)', cursor: 'pointer' }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="task-meta" style={{ marginTop: '8px', paddingLeft: '30px' }}>
                                    <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Target size={13} /> {goalName}
                                    </small>
                                    <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <RotateCw size={13} /> {getRecurrenceText(task)}
                                    </small>
                                    {task.timeEstimate && (
                                      <span className="meta-chip">⏱ {task.timeEstimate}</span>
                                    )}
                                    {task.energy && <span className="meta-chip">⚡ {task.energy}</span>}
                                    {task.progressMinutes > 0 && (
                                      <span className="meta-chip">🧠 {task.progressMinutes}/{parseTimeEstimate(task.timeEstimate)} min</span>
                                    )}
                                    {task.deadline && (
                                      <span className="meta-chip highlight">
                                        <CalendarIcon size={11} /> {prettyDate(task.deadline)}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ paddingLeft: '30px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0', fontWeight: 700 }}
                                        >
                                          {expandedTasks[task.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          📋 {(() => {
                                            const subList = task.recurrenceType === 'one-time' ? (task.subtasks || []) : (task.dailySubtasks?.[selectedDateKey] || task.subtasks || []);
                                            return `${subList.filter(s => s.completed).length}/${subList.length}`;
                                          })()} checklist items
                                        </button>

                                        {expandedTasks[task.id] && (
                                          <ul style={{ listStyle: 'none', padding: '10px 14px', margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                                            {(() => {
                                              const subList = task.recurrenceType === 'one-time' ? (task.subtasks || []) : (task.dailySubtasks?.[selectedDateKey] || task.subtasks || []);
                                              return subList.map(sub => (
                                                <li key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                                  <input
                                                    type="checkbox"
                                                    checked={sub.completed}
                                                    onChange={() => handleToggleSubtask(goalId, task, sub.id, selectedDateKey)}
                                                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                                                  />
                                                  <span style={{ textDecoration: sub.completed ? 'line-through' : 'none', color: sub.completed ? 'var(--muted)' : 'var(--text)' }}>
                                                    {sub.title}
                                                  </span>
                                                </li>
                                              ));
                                            })()}
                                          </ul>
                                        )}
                                      </div>
                                    )}

                                    {task.targetCount && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                          <span style={{ color: 'var(--muted)' }}>Habit progression</span>
                                          <span style={{ color: '#f59e0b' }}>{(task.completedDates || []).length} / {task.targetCount} reps</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, #f59e0b, var(--accent))', 
                                            width: `${Math.min(100, (((task.completedDates || []).length) / task.targetCount) * 100)}%`,
                                            transition: 'width 0.3s ease'
                                          }} />
                                        </div>
                                      </div>
                                    )}

                                    {task.endDate && (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        ⏳ Habit active until: <strong>{task.endDate}</strong>
                                      </span>
                                    )}
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {completedTasks.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1.05rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: 0.65,
                }}
              >
                <CheckCircle2 size={16} /> Finished{' '}
                <span style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                  ({completedTasks.length})
                </span>
              </h3>
              <div
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  background: 'var(--bg-2)',
                  border: '1px dashed var(--line)',
                }}
              >
                <ul className="task-list interactive" style={{ gap: '0' }}>
                  {filteredCompletedTasks.map(({ goalId, goalName, task }, idx) => (
                    <li
                      key={`${goalId}-${task.id}`}
                      className="done"
                      style={{
                        border: 'none',
                        borderBottom:
                          idx === filteredCompletedTasks.length - 1
                            ? 'none'
                            : '1px dashed var(--line)',
                        borderRadius: '0',
                        padding: '14px 22px',
                        background: 'transparent',
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <label
                          style={{
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <InteractiveControl
                              task={task}
                              goalId={goalId}
                              dateKey={selectedDateKey}
                              isLocked={false}
                              updateTask={updateTask}
                              onToggle={handleToggleTaskDone}
                            />
                            {task.isPriority && <Star size={14} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />}
                            <span>{task.title}</span>
                          </div>
                          {task.description && (
                            <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, paddingLeft: '28px' }}>
                              {task.description}
                            </div>
                          )}
                        </label>
                        {deleteTask && (
                          <button
                            className="ghost-btn"
                            onClick={() => deleteTask(goalId, task.id)}
                            title="Delete task"
                            style={{ padding: '6px', opacity: 0.4, color: '#ef4444', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="task-meta" style={{ marginTop: '8px', paddingLeft: '28px' }}>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={12} /> {goalName}
                        </small>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <RotateCw size={12} /> {getRecurrenceText(task)}
                        </small>
                        {task.timeEstimate && (
                          <span
                            className="meta-chip"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            ⏱ {task.timeEstimate}
                          </span>
                        )}
                        {task.progressMinutes > 0 && (
                          <span className="meta-chip" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            🧠 {task.progressMinutes}/{parseTimeEstimate(task.timeEstimate)} min
                          </span>
                        )}
                        {task.deadline && (
                          <span
                            className="meta-chip highlight"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            <CalendarIcon size={11} /> {prettyDate(task.deadline)}
                          </span>
                        )}
                        <span
                          className="meta-chip good"
                          style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                        >
                          <BarChart3 size={11} /> Done
                        </span>
                      </div>

                      <div style={{ paddingLeft: '28px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0', fontWeight: 700, opacity: 0.8 }}
                            >
                              {expandedTasks[task.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              📋 {(() => {
                                const subList = task.recurrenceType === 'one-time' ? (task.subtasks || []) : (task.dailySubtasks?.[selectedDateKey] || task.subtasks || []);
                                return `${subList.filter(s => s.completed).length}/${subList.length}`;
                              })()} checklist items
                            </button>

                            {expandedTasks[task.id] && (
                              <ul style={{ listStyle: 'none', padding: '10px 14px', margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--line)', borderRadius: '12px', opacity: 0.8 }}>
                                {(() => {
                                  const subList = task.recurrenceType === 'one-time' ? (task.subtasks || []) : (task.dailySubtasks?.[selectedDateKey] || task.subtasks || []);
                                  return subList.map(sub => (
                                    <li key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={sub.completed}
                                        disabled={true}
                                        style={{ width: '15px', height: '15px', cursor: 'not-allowed', opacity: 0.6 }}
                                      />
                                      <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>
                                        {sub.title}
                                      </span>
                                    </li>
                                  ));
                                })()}
                              </ul>
                            )}
                          </div>
                        )}

                        {task.targetCount && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px', opacity: 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                              <span style={{ color: 'var(--muted)' }}>Habit progression</span>
                              <span style={{ color: '#f59e0b' }}>{(task.completedDates || []).length} / {task.targetCount} reps</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #f59e0b, var(--accent))', 
                                width: `${Math.min(100, (((task.completedDates || []).length) / task.targetCount) * 100)}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        )}

                        {task.endDate && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                            ⏳ Habit active until: <strong>{task.endDate}</strong>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compassionate Triage Modal */}
      {showTriageModal && triageTasks.length > 0 && currentTriageIndex < triageTasks.length && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', display: 'grid', gap: '18px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>🌱</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.25rem', color: 'var(--text)' }}>Compassionate Triage</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.4 }}>
                Leftover items from yesterday detected. Let's decide how to move forward gently.
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, marginTop: '6px' }}>
                Task {currentTriageIndex + 1} of {triageTasks.length}
              </div>
            </div>

            <div className="card" style={{ padding: '14px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {triageTasks[currentTriageIndex].goalName}
              </div>
              {triageTasks[currentTriageIndex].phaseLabel && (
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--accent)', marginTop: '2px'
                }}>
                  Phase {triageTasks[currentTriageIndex].phaseOrder + 1}: {triageTasks[currentTriageIndex].phaseLabel}
                  {triageTasks[currentTriageIndex].phaseOrder === 0 && (
                    <span style={{ fontSize: '0.6rem', color: '#ef4444', marginLeft: '6px' }}>⚠ Priority</span>
                  )}
                </div>
              )}
              <h4 style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700 }}>
                {triageTasks[currentTriageIndex].task.title}
              </h4>
              {triageTasks[currentTriageIndex].task.description && (
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {triageTasks[currentTriageIndex].task.description}
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: '0.88rem' }}
                onClick={() => {
                  const task = triageTasks[currentTriageIndex].task;
                  const goalId = triageTasks[currentTriageIndex].goalId;
                  handlePostpone(goalId, task, todayKey);
                  if (currentTriageIndex + 1 >= triageTasks.length) {
                    handleTriageComplete();
                  } else {
                    setCurrentTriageIndex(c => c + 1);
                  }
                }}
              >
                📅 Postpone to Today
              </button>

              <button
                type="button"
                className="primary-btn"
                style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: '0.88rem' }}
                onClick={() => {
                  const task = triageTasks[currentTriageIndex].task;
                  const goalId = triageTasks[currentTriageIndex].goalId;
                  const tomorrowKey = getDateKey(addDays(new Date(), 1));
                  handlePostpone(goalId, task, tomorrowKey);
                  if (currentTriageIndex + 1 >= triageTasks.length) {
                    handleTriageComplete();
                  } else {
                    setCurrentTriageIndex(c => c + 1);
                  }
                }}
              >
                ☀️ Postpone to Tomorrow
              </button>

              <button
                type="button"
                className="primary-btn"
                style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: '0.88rem' }}
                onClick={() => {
                  const task = triageTasks[currentTriageIndex].task;
                  const goalId = triageTasks[currentTriageIndex].goalId;
                  updateTask(goalId, task.id, { recurrenceType: 'one-time', oneTimeDate: null, deadline: null });
                  if (currentTriageIndex + 1 >= triageTasks.length) {
                    handleTriageComplete();
                  } else {
                    setCurrentTriageIndex(c => c + 1);
                  }
                }}
              >
                📦 Park in Backlog
              </button>

              <div style={{ display: 'grid', gap: '6px', border: '1px dashed var(--line)', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>⚡ Break Down into Subtasks</span>
                {splitSubtaskInputs.map((val, subIdx) => (
                  <input
                    key={subIdx}
                    type="text"
                    placeholder={`Subtask ${subIdx + 1}`}
                    value={val}
                    onChange={e => {
                      const nextInputs = [...splitSubtaskInputs];
                      nextInputs[subIdx] = e.target.value;
                      setSplitSubtaskInputs(nextInputs);
                    }}
                    style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                ))}
                <button
                  type="button"
                  className="primary-btn"
                  style={{ padding: '8px', fontSize: '0.82rem' }}
                  disabled={splitSubtaskInputs.every(val => !val.trim())}
                  onClick={() => {
                    const task = triageTasks[currentTriageIndex].task;
                    const goalId = triageTasks[currentTriageIndex].goalId;
                    const subs = splitSubtaskInputs
                      .filter(val => val.trim())
                      .map(val => ({ id: `sub-${Date.now()}-${Math.random()}`, title: val.trim(), completed: false }));
                    
                    updateTask(goalId, task.id, { 
                      completionType: 'subtasks', 
                      subtasks: subs,
                      recurrenceType: 'one-time',
                      oneTimeDate: todayKey
                    });
                    
                    setSplitSubtaskInputs(['', '']);
                    if (currentTriageIndex + 1 >= triageTasks.length) {
                      handleTriageComplete();
                    } else {
                      setCurrentTriageIndex(c => c + 1);
                    }
                  }}
                >
                  Split & Schedule for Today
                </button>
              </div>

              <button
                type="button"
                className="primary-btn"
                style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.88rem' }}
                onClick={() => {
                  const task = triageTasks[currentTriageIndex].task;
                  const goalId = triageTasks[currentTriageIndex].goalId;
                  deleteTask(goalId, task.id);
                  if (currentTriageIndex + 1 >= triageTasks.length) {
                    handleTriageComplete();
                  } else {
                    setCurrentTriageIndex(c => c + 1);
                  }
                }}
              >
                🗑️ Drop / Discard Task
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleTriageComplete}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Skip Triage
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
      <div style={{ marginTop: '32px' }}>
      </div>
    </section>
  );
}

export default TasksPage;