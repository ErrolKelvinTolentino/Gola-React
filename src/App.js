import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import FocusPage from './pages/FocusPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import GlobalTimerWidget from './components/GlobalTimerWidget';
import GlobalStyles from './styles/GlobalStyles';
import { AppShell, AuroraLayer, MainPanel, FocusWrap } from './styles/AppLayout';
import { DEFAULT_SETTINGS, DEFAULT_TASK_FORM, INITIAL_GOALS, NAV_ITEMS, WEEK_DAYS } from './data/appData';
import {
  buildCalendarCells,
  getDateKey,
  getRecurrenceText,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  prettyDate
} from './utils/dateUtils';

const USER_STORAGE_KEY = 'gola.mock.user';
const ACCOUNT_STORAGE_KEY = 'gola.mock.account';
const THEME_STORAGE_KEY = 'gola.mock.theme';

const parseStoredJson = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const getNameFromEmail = (email) => {
  const local = (email || 'user').split('@')[0] || 'user';
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
};

function DashboardWorkspace({ user, onLogout, theme, setTheme }) {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('Home');
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalVision, setGoalVision] = useState('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [taskFormsByGoal, setTaskFormsByGoal] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

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

  const calendarCells = buildCalendarCells(goals, today);

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

  const addGoal = (eventOrTasks) => {
    let generatedTasks = [];
    if (eventOrTasks && typeof eventOrTasks.preventDefault === 'function') {
      eventOrTasks.preventDefault();
    } else if (Array.isArray(eventOrTasks)) {
      generatedTasks = eventOrTasks;
    }
    
    if (!goalName.trim()) return;

    const newGoal = {
      id: Date.now(),
      name: goalName.trim(),
      vision: goalVision.trim() || 'A clear target worth showing up for.',
      tasks: generatedTasks
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
      timeEstimate: form.timeEstimate,
      energy: form.energy,
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

  const updateTask = (goalId, taskId, payload) => {
    setGoals(current => current.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...payload } : t)
      };
    }));
  };

  const completeGoal = (goalId, assessment) => {
    setGoals(current => current.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, status: 'completed', assessment };
    }));
  };

  const recurrenceText = (task) => getRecurrenceText(task, WEEK_DAYS);

  const renderActivePage = () => {
    if (activePage === 'Tasks') {
      return (
        <TasksPage
          activeTasksToday={activeTasksToday}
          today={today}
          isTaskDoneForDate={isTaskDoneForDate}
          toggleTaskDoneForToday={toggleTaskDoneForToday}
          getRecurrenceText={recurrenceText}
          prettyDate={prettyDate}
        />
      );
    }

    if (activePage === 'Goals') {
      return (
        <GoalsPage
          goals={goals}
          selectedGoal={selectedGoal}
          selectedGoalId={selectedGoalId}
          setSelectedGoalId={setSelectedGoalId}
          allTaskCount={allTaskCount}
          getTaskForm={getTaskForm}
          updateTaskForm={updateTaskForm}
          addTaskToGoal={addTaskToGoal}
          toggleSpecificDay={toggleSpecificDay}
          weekDays={WEEK_DAYS}
          isTaskActiveOnDate={isTaskActiveOnDate}
          isTaskDoneForDate={isTaskDoneForDate}
          toggleTaskDoneForToday={toggleTaskDoneForToday}
          getRecurrenceText={recurrenceText}
          prettyDate={prettyDate}
          today={today}
          isGoalModalOpen={isGoalModalOpen}
          openGoalModal={openGoalModal}
          closeGoalModal={closeGoalModal}
          goalName={goalName}
          setGoalName={setGoalName}
          goalVision={goalVision}
          setGoalVision={setGoalVision}
          addGoal={addGoal}
          theme={theme}
          updateTask={updateTask}
          completeGoal={completeGoal}
        />
      );
    }

    if (activePage === 'Calendar') {
      return (
        <CalendarPage
          goals={goals}
          weekDays={WEEK_DAYS}
          todayKey={todayKey}
          compactCalendar={settings.compactCalendar}
        />
      );
    }

    if (activePage === 'Focus') {
      return (
        <FocusPage 
          activeTasksToday={activeTasksToday} 
          toggleTaskDoneForToday={toggleTaskDoneForToday}
          setActivePage={setActivePage}
        />
      );
    }

    if (activePage === 'Settings') {
      return (
        <SettingsPage
          theme={theme}
          setTheme={setTheme}
          settings={settings}
          toggleSetting={toggleSetting}
        />
      );
    }

    return (
      <HomePage
        goalsCount={goals.length}
        allTaskCount={allTaskCount}
        activeTasksCount={activeTasksToday.length}
        completionRate={completionRate}
        completedToday={completedToday}
        selectedGoal={selectedGoal}
        today={today}
      />
    );
  };

  return (
    <AppShell $themeMode={theme}>
      <AuroraLayer $variant="aurora-a" />
      <AuroraLayer $variant="aurora-b" />
      <AuroraLayer $variant="aurora-c" />

      <Sidebar navItems={NAV_ITEMS.filter((item) => item !== 'Settings')} activePage={activePage} onChangePage={setActivePage} />
      <GlobalTimerWidget activePage={activePage} setActivePage={setActivePage} />

      <MainPanel $focusMode={activePage === 'Focus'}>
        <TopBar
          date={today}
          activePage={activePage}
          user={user}
          onOpenProfile={() => navigate('/profile')}
          onOpenSettings={() => setActivePage('Settings')}
          onLogout={onLogout}
        />
        {activePage === 'Focus' ? (
          <FocusWrap>
            {renderActivePage()}
          </FocusWrap>
        ) : renderActivePage()}
      </MainPanel>
    </AppShell>
  );
}

function App() {
  const [user, setUser] = useState(() => parseStoredJson(USER_STORAGE_KEY));
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleLogin = ({ email, password }) => {
    const account = parseStoredJson(ACCOUNT_STORAGE_KEY);
    const normalizedEmail = email.trim().toLowerCase();

    // No backend: validate against locally stored mock account or a demo credential pair.
    if (account?.email) {
      const accountEmail = account.email.toLowerCase();
      if (normalizedEmail !== accountEmail || password !== account.password) {
        return { ok: false, message: 'Wrong email or password.' };
      }
    } else {
      const demoEmail = 'demo@gola.app';
      const demoPassword = 'demo1234';
      if (normalizedEmail !== demoEmail || password !== demoPassword) {
        return { ok: false, message: 'Wrong email or password. Use demo@gola.app / demo1234 or register first.' };
      }
    }

    const nextUser = {
      name:
        account && account.email?.toLowerCase() === normalizedEmail
          ? account.name
          : getNameFromEmail(email),
      email: email.trim()
    };

    setUser(nextUser);
    return { ok: true };
  };

  const handleRegister = ({ name, email, password }) => {
    const account = {
      name,
      email,
      password,
      createdAt: Date.now()
    };

    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    setUser({ name, email });
  };

  const handleSaveProfile = ({ name, email, password }) => {
    const safeName = name?.trim() || getNameFromEmail(email || user?.email);
    const safeEmail = email?.trim() || user?.email || '';

    const nextUser = {
      ...user,
      name: safeName,
      email: safeEmail
    };

    setUser(nextUser);

    const account = parseStoredJson(ACCOUNT_STORAGE_KEY) || {};
    localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        ...account,
        name: safeName,
        email: safeEmail,
        password: password || account.password || '',
        updatedAt: Date.now()
      })
    );
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/app" replace /> : <LoginPage onLogin={handleLogin} theme={theme} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/app" replace /> : <RegisterPage onRegister={handleRegister} theme={theme} />}
        />
        <Route
          path="/app"
          element={user ? <DashboardWorkspace user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={
            user ? (
              <ProfilePage user={user} theme={theme} onSaveProfile={handleSaveProfile} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
