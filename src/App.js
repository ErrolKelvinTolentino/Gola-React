import { useState } from 'react';
import golaLogo from './assets/gola-logo.png';
import lumiWave from './assets/lumi-wave.png';
import lumiFocused from './assets/lumi-focused.png';
import './App.css';

const NAV_ITEMS = ['Home', 'Tasks', 'Goals', 'Calendar', 'Settings'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INITIAL_GOALS = [
  {
    id: 1,
    name: 'Build Gola Web Launch',
    vision: 'Ship a polished release with daily traction.',
    tasks: [
      {
        id: 101,
        title: 'Sync morning planning',
        recurrenceType: 'daily',
        weeklyDay: '',
        specificDays: [],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      },
      {
        id: 102,
        title: 'Sprint review call',
        recurrenceType: 'weekly',
        weeklyDay: 5,
        specificDays: [],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      },
      {
        id: 103,
        title: 'Launch page QA',
        recurrenceType: 'one-time',
        weeklyDay: '',
        specificDays: [],
        oneTimeDate: getDateKey(new Date()),
        deadline: getDateKey(addDays(new Date(), 2)),
        completed: false,
        completedDates: []
      }
    ]
  },
  {
    id: 2,
    name: 'Personal Growth',
    vision: 'Sustain energy, focus, and creativity.',
    tasks: [
      {
        id: 201,
        title: 'Deep work block',
        recurrenceType: 'specific-days',
        weeklyDay: '',
        specificDays: [1, 2, 4],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      }
    ]
  }
];

const DEFAULT_TASK_FORM = {
  title: '',
  recurrenceType: 'one-time',
  oneTimeDate: getDateKey(new Date()),
  weeklyDay: 1,
  specificDays: [1, 3, 5],
  deadline: ''
};

function addDays(date, amount) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + amount);
  return clone;
}

function getDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function prettyDate(dateKey) {
  if (!dateKey) return 'No deadline';
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isTaskActiveOnDate(task, date) {
  const dateKey = getDateKey(date);
  const weekDay = new Date(`${dateKey}T00:00:00`).getDay();

  if (task.recurrenceType === 'daily') return true;
  if (task.recurrenceType === 'weekly') return Number(task.weeklyDay) === weekDay;
  if (task.recurrenceType === 'specific-days') return task.specificDays.includes(weekDay);
  return task.oneTimeDate === dateKey;
}

function isTaskDoneForDate(task, date) {
  const dateKey = getDateKey(date);

  if (task.recurrenceType === 'one-time') {
    return task.completed;
  }

  return task.completedDates.includes(dateKey);
}

function getGoalProgress(goal) {
  if (goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter((task) => {
    if (task.recurrenceType === 'one-time') return task.completed;
    return task.completedDates.length > 0;
  }).length;

  return Math.round((completed / goal.tasks.length) * 100);
}

function App() {
  const [activePage, setActivePage] = useState('Home');
  const [theme, setTheme] = useState('light');
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [selectedGoalId, setSelectedGoalId] = useState(INITIAL_GOALS[0].id);
  const [goalName, setGoalName] = useState('');
  const [goalVision, setGoalVision] = useState('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [taskFormsByGoal, setTaskFormsByGoal] = useState({});
  const [settings, setSettings] = useState({
    notifications: true,
    focusMode: false,
    compactCalendar: false
  });

  const today = new Date();
  const todayKey = getDateKey(today);

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) || null;

  const activeTasksToday = goals.flatMap((goal) =>
    goal.tasks
      .filter((task) => isTaskActiveOnDate(task, today))
      .map((task) => ({
        goalId: goal.id,
        goalName: goal.name,
        task
      }))
  );

  const completedToday = activeTasksToday.filter(({ task }) => isTaskDoneForDate(task, today)).length;
  const completionRate = activeTasksToday.length
    ? Math.round((completedToday / activeTasksToday.length) * 100)
    : 0;

  const allTaskCount = goals.reduce((sum, goal) => sum + goal.tasks.length, 0);

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarCells = [];

  for (let i = 0; i < firstDay; i += 1) {
    calendarCells.push({ day: '', dateKey: '' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = getDateKey(new Date(today.getFullYear(), today.getMonth(), day));
    const date = new Date(`${dateKey}T00:00:00`);
    const count = goals.reduce(
      (sum, goal) => sum + goal.tasks.filter((task) => isTaskActiveOnDate(task, date)).length,
      0
    );
    calendarCells.push({ day, dateKey, count });
  }

  const monthName = today.toLocaleString('en-US', { month: 'long' });

  const getTaskForm = (goalId) => {
    const form = taskFormsByGoal[goalId];
    return form || DEFAULT_TASK_FORM;
  };

  const updateTaskForm = (goalId, patch) => {
    setTaskFormsByGoal((current) => ({
      ...current,
      [goalId]: {
        ...getTaskForm(goalId),
        ...patch
      }
    }));
  };

  const toggleSpecificDay = (goalId, weekDay) => {
    const form = getTaskForm(goalId);
    const exists = form.specificDays.includes(weekDay);
    const nextDays = exists
      ? form.specificDays.filter((day) => day !== weekDay)
      : [...form.specificDays, weekDay];

    updateTaskForm(goalId, { specificDays: nextDays.sort((a, b) => a - b) });
  };

  const openGoalModal = () => setIsGoalModalOpen(true);
  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setGoalName('');
    setGoalVision('');
  };

  const addGoal = (event) => {
    event.preventDefault();
    if (!goalName.trim()) return;

    const newGoal = {
      id: Date.now(),
      name: goalName.trim(),
      vision: goalVision.trim() || 'A clear target worth showing up for.',
      tasks: []
    };

    setGoals((currentGoals) => [newGoal, ...currentGoals]);
    setSelectedGoalId(newGoal.id);
    closeGoalModal();
  };

  const addTaskToGoal = (goalId, event) => {
    event.preventDefault();
    const form = getTaskForm(goalId);

    if (!form.title.trim()) return;
    if (form.recurrenceType === 'specific-days' && form.specificDays.length === 0) return;

    const newTask = {
      id: Date.now(),
      title: form.title.trim(),
      recurrenceType: form.recurrenceType,
      oneTimeDate: form.oneTimeDate,
      weeklyDay: form.weeklyDay,
      specificDays: form.specificDays,
      deadline: form.deadline,
      completed: false,
      completedDates: []
    };

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, tasks: [newTask, ...goal.tasks] } : goal
      )
    );

    setTaskFormsByGoal((current) => ({
      ...current,
      [goalId]: {
        ...DEFAULT_TASK_FORM,
        specificDays: [...DEFAULT_TASK_FORM.specificDays],
        oneTimeDate: getDateKey(new Date())
      }
    }));
  };

  const toggleTaskDoneForToday = (goalId, taskId) => {
    const dateKey = todayKey;

    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId) return goal;

        return {
          ...goal,
          tasks: goal.tasks.map((task) => {
            if (task.id !== taskId) return task;

            if (task.recurrenceType === 'one-time') {
              return { ...task, completed: !task.completed };
            }

            const alreadyDone = task.completedDates.includes(dateKey);
            const nextDates = alreadyDone
              ? task.completedDates.filter((item) => item !== dateKey)
              : [...task.completedDates, dateKey];

            return { ...task, completedDates: nextDates };
          })
        };
      })
    );
  };

  const toggleSetting = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderRecurrenceText = (task) => {
    if (task.recurrenceType === 'daily') return 'Daily';
    if (task.recurrenceType === 'weekly') return `Weekly • ${WEEK_DAYS[task.weeklyDay]}`;
    if (task.recurrenceType === 'specific-days') {
      return `Specific • ${task.specificDays.map((day) => WEEK_DAYS[day]).join(', ')}`;
    }
    return `One-time • ${prettyDate(task.oneTimeDate)}`;
  };

  const renderHome = () => (
    <section className="page page-enter">
      <div className="hero-wrap card premium-surface">
        <img src={lumiWave} alt="Lumi mascot waving" className="hero-lumi" />
        <div>
          <h1>Welcome to Gola Web</h1>
          <p className="lead">A premium focus cockpit crafted for elegant daily execution.</p>
          <div className="hero-pills">
            <span>{goals.length} goals</span>
            <span>{allTaskCount} total tasks</span>
            <span>{activeTasksToday.length} active today</span>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <article className="card feature-card">
          <p className="eyebrow">Today Completion</p>
          <h2>{completionRate}%</h2>
          <p>{completedToday} of {activeTasksToday.length || 0} active tasks done.</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Focused Goal</p>
          <h2>{selectedGoal ? selectedGoal.name : 'No goal selected'}</h2>
          <p>{selectedGoal ? selectedGoal.vision : 'Create your first goal to get started.'}</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Date</p>
          <h2>{today.toLocaleDateString('en-US', { weekday: 'long' })}</h2>
          <p>{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </article>
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="page page-enter">
      <h1>Tasks Active Today</h1>
      <p className="lead">Only tasks due today, across all goals, so you can execute without noise.</p>
      <div className="card premium-surface">
        <ul className="task-list interactive">
          {activeTasksToday.length === 0 && <li className="empty-row">No active tasks today.</li>}
          {activeTasksToday.map(({ goalId, goalName: ownerGoal, task }) => {
            const done = isTaskDoneForDate(task, today);
            return (
              <li key={`${goalId}-${task.id}`} className={done ? 'done' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleTaskDoneForToday(goalId, task.id)}
                  />
                  <span>{task.title}</span>
                </label>
                <div className="task-meta">
                  <small>{ownerGoal}</small>
                  <small>{renderRecurrenceText(task)}</small>
                  <span className="deadline-pill">{prettyDate(task.deadline)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  const renderGoalTaskForm = (goalId) => {
    const form = getTaskForm(goalId);

    return (
      <form className="task-form" onSubmit={(event) => addTaskToGoal(goalId, event)}>
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
            Deadline
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => updateTaskForm(goalId, { deadline: event.target.value })}
            />
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
              {WEEK_DAYS.map((day, dayIndex) => (
                <option key={day} value={dayIndex}>{day}</option>
              ))}
            </select>
          </label>
        )}

        {form.recurrenceType === 'specific-days' && (
          <div className="week-picker">
            {WEEK_DAYS.map((day, dayIndex) => (
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

        <button className="primary-btn" type="submit">Add Task</button>
      </form>
    );
  };

  const renderGoals = () => (
    <section className="page page-enter goals-page">
      <div className="goals-head">
        <div>
          <h1>Goals Workspace</h1>
          <p className="lead">Select a goal to plan tasks, cadence, and execution details.</p>
        </div>
        <div className="goals-summary card">
          <strong>{goals.length}</strong>
          <span>Goals</span>
          <strong>{allTaskCount}</strong>
          <span>Tasks</span>
        </div>
      </div>

      <div className="goal-layout premium-layout">
        <aside className="card goal-list-pane premium-surface">
          <div className="section-head compact">
            <h3>Your Goals</h3>
            <p>Pick one to open details.</p>
          </div>
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <button
                key={goal.id}
                type="button"
                className={selectedGoalId === goal.id ? 'goal-nav active' : 'goal-nav'}
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <div className="goal-nav-top">
                  <strong>{goal.name}</strong>
                  <span>{progress}%</span>
                </div>
                <small>{goal.tasks.length} tasks</small>
                <div className="goal-progress">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </button>
            );
          })}
        </aside>

        <div className="card goal-detail-pane premium-surface">
          {!selectedGoal && <p>Select a goal to view its tasks.</p>}
          {selectedGoal && (
            <>
              <div className="goal-head">
                <h2>{selectedGoal.name}</h2>
                <p>{selectedGoal.vision}</p>
              </div>

              {renderGoalTaskForm(selectedGoal.id)}

              <div className="section-head compact">
                <h3>Tasks in Goal</h3>
                <p>Mark progress for today directly from this view.</p>
              </div>

              <ul className="task-list interactive">
                {selectedGoal.tasks.length === 0 && <li className="empty-row">No tasks yet for this goal.</li>}
                {selectedGoal.tasks.map((task) => {
                  const activeToday = isTaskActiveOnDate(task, today);
                  const doneToday = isTaskDoneForDate(task, today);
                  return (
                    <li key={task.id} className={doneToday ? 'done' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={doneToday}
                          onChange={() => toggleTaskDoneForToday(selectedGoal.id, task.id)}
                        />
                        <span>{task.title}</span>
                      </label>
                      <div className="task-meta">
                        <small>{renderRecurrenceText(task)}</small>
                        <span className={activeToday ? 'status-pill live' : 'status-pill'}>
                          {activeToday ? 'Active today' : 'Not today'}
                        </span>
                        <span className="deadline-pill">{prettyDate(task.deadline)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <button type="button" className="fab-goal" onClick={openGoalModal} aria-label="Add goal">
        +
      </button>

      {isGoalModalOpen && (
        <div className="modal-backdrop" onClick={closeGoalModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Create New Goal</h3>
            <p>Define your target, then start attaching actionable tasks.</p>
            <form className="modal-form" onSubmit={addGoal}>
              <label>
                Goal name
                <input
                  type="text"
                  placeholder="Enter goal"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  required
                />
              </label>
              <label>
                Vision
                <textarea
                  rows="3"
                  placeholder="What does success look like?"
                  value={goalVision}
                  onChange={(event) => setGoalVision(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeGoalModal}>Cancel</button>
                <button type="submit" className="primary-btn">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );

  const renderCalendar = () => (
    <section className="page page-enter">
      <h1>Calendar</h1>
      <p className="lead">Monthly view with number of active tasks per day.</p>
      <article className="card premium-surface">
        <div className="calendar-header">
          <h3>{monthName} {today.getFullYear()}</h3>
          <img src={lumiFocused} alt="Lumi focused" className="calendar-lumi" />
        </div>
        <div className="calendar-grid labels">
          {WEEK_DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={`calendar-grid days ${settings.compactCalendar ? 'compact' : ''}`}>
          {calendarCells.map((cell, index) => (
            <div
              key={`${cell.dateKey}-${index}`}
              className={cell.dateKey === todayKey ? 'day-cell today' : 'day-cell'}
            >
              <strong>{cell.day}</strong>
              {!!cell.day && <small>{cell.count} tasks</small>}
            </div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderSettings = () => (
    <section className="page page-enter">
      <h1>Settings</h1>
      <p className="lead">Tune your visual mode and productivity preferences.</p>

      <div className="card settings-list premium-surface">
        <label className="setting-row">
          <div>
            <strong>Dark mode</strong>
            <p>Switch between soft daylight and mesmerizing night aurora.</p>
          </div>
          <button
            type="button"
            className={theme === 'dark' ? 'toggle on' : 'toggle'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
          >
            <span />
          </button>
        </label>

        {Object.entries(settings).map(([key, value]) => (
          <label key={key} className="setting-row">
            <div>
              <strong>{key.replace(/([A-Z])/g, ' $1')}</strong>
              <p>Customize this setting for your daily flow.</p>
            </div>
            <button
              type="button"
              className={value ? 'toggle on' : 'toggle'}
              onClick={() => toggleSetting(key)}
              aria-pressed={value}
            >
              <span />
            </button>
          </label>
        ))}
      </div>
    </section>
  );

  const renderActivePage = () => {
    if (activePage === 'Tasks') return renderTasks();
    if (activePage === 'Goals') return renderGoals();
    if (activePage === 'Calendar') return renderCalendar();
    if (activePage === 'Settings') return renderSettings();
    return renderHome();
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="aurora aurora-c" />

      <aside className="sidebar">
        <div className="brand">
          <img src={golaLogo} alt="Gola logo" className="brand-logo" />
          <div>
            <strong>Gola</strong>
            <p>Premium Focus System</p>
          </div>
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={activePage === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setActivePage(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="top-bar">
          <p>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <span>{theme === 'dark' ? 'Night Aurora' : 'Soft Aurora'}</span>
        </header>
        {renderActivePage()}
      </main>
    </div>
  );
}

export default App;
