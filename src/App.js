import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import FocusPage from './pages/FocusPage';
import ReviewPage from './pages/ReviewPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import GlobalTimerWidget from './components/GlobalTimerWidget';
import { useTimer } from './context/TimerContext';
import GlobalStyles from './styles/GlobalStyles';
import { AppShell, AuroraLayer, MainPanel, FocusWrap } from './styles/AppLayout';
import { DEFAULT_SETTINGS, INITIAL_GOALS, NAV_ITEMS, WEEK_DAYS } from './data/appData';
import {
  buildCalendarCells,
  getDateKey,
  getRecurrenceText,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  prettyDate
} from './utils/dateUtils';
import { getNextMidnight, getYesterday, rolloverIncompleteTasks } from './utils/taskRollover';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const THEME_STORAGE_KEY = 'gola.theme';
const LEGACY_THEME_STORAGE_KEY = 'gola.mock.theme';
const STORAGE_SUFFIXES = {
  goals: 'goals',
  focusSessions: 'focusSessions',
  streak: 'streak',
  aiEnabled: 'aiEnabled'
};

const LEGACY_SHARED_STATE_KEYS = ['gola.goals', 'gola.focusSessions', 'gola.streak', 'gola.aiEnabled'];
const getRolloverStorageKey = (uid) => (uid ? `gola.${uid}.rollover.last` : 'gola.rollover.last');

const getUserScopedStorageKey = (uid, suffix) => {
  if (!uid) return null;
  return `gola.${uid}.${suffix}`;
};

const parseStoredJson = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

/* ── Streak milestone check ────────────────────────────────────────── */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100];
function checkStreakMilestone(streak) {
  if (STREAK_MILESTONES.includes(streak)) {
    return streak;
  }
  return null;
}

function DashboardWorkspace({ user, onLogout, theme, setTheme }) {
  const navigate = useNavigate();
  const { setActiveTask } = useTimer();
  const hasHydratedCloud = useRef(false);
  const userStorageKey = useCallback(
    (suffix) => getUserScopedStorageKey(user?.uid, suffix),
    [user?.uid]
  );
  const [activePage, setActivePage] = useState('Today');
  
  // ── Goals state (persisted) ──────────────────────────────────────
  const [goals, setGoals] = useState(() => {
    const stored = parseStoredJson(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.goals));
    if (Array.isArray(stored)) return stored;
    return INITIAL_GOALS;
  });
  
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalVision, setGoalVision] = useState('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // ── New state: Focus sessions, streak, AI toggle ─────────────────
  const [focusSessions, setFocusSessions] = useState(() => {
    return parseStoredJson(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.focusSessions)) || [];
  });
  
  const [streak, setStreak] = useState(() => {
    const stored = parseStoredJson(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.streak));
    return stored?.streak || 0;
  });
  
  const [lastActiveDate, setLastActiveDate] = useState(() => {
    const stored = parseStoredJson(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.streak));
    return stored?.lastActiveDate || null;
  });

  const [aiEnabled, setAiEnabled] = useState(() => {
    const stored = localStorage.getItem(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.aiEnabled));
    return stored !== null ? stored === 'true' : true;
  });

  // ── Streak milestone toast ───────────────────────────────────────
  const [streakToast, setStreakToast] = useState(null);

  // ── Hydrate dashboard state from Firestore ───────────────────────
  useEffect(() => {
    let isSubscribed = true;

    const hydrateFromCloud = async () => {
      if (!user?.uid) {
        hasHydratedCloud.current = true;
        return;
      }

      try {
        const appStateRef = doc(db, 'users', user.uid, 'app', 'state');
        const snapshot = await getDoc(appStateRef);

        if (!isSubscribed) return;

        if (snapshot.exists()) {
          const cloud = snapshot.data();

          if (Array.isArray(cloud.goals)) {
            setGoals(cloud.goals);
          }

          if (Array.isArray(cloud.focusSessions)) {
            setFocusSessions(cloud.focusSessions);
          }

          if (typeof cloud.streak === 'number') {
            setStreak(cloud.streak);
          }

          if (typeof cloud.lastActiveDate === 'string' || cloud.lastActiveDate === null) {
            setLastActiveDate(cloud.lastActiveDate ?? null);
          }

          if (typeof cloud.aiEnabled === 'boolean') {
            setAiEnabled(cloud.aiEnabled);
          }

          if (cloud.theme === 'light' || cloud.theme === 'dark') {
            setTheme(cloud.theme);
          }

          if (cloud.settings && typeof cloud.settings === 'object') {
            setSettings((current) => ({ ...current, ...cloud.settings }));
          }
        } else {
          setGoals([]);
          setFocusSessions([]);
          setStreak(0);
          setLastActiveDate(null);
          setAiEnabled(true);
          setSettings(DEFAULT_SETTINGS);

          await setDoc(
            appStateRef,
            {
              goals: [],
              focusSessions: [],
              streak: 0,
              lastActiveDate: null,
              aiEnabled: true,
              theme,
              settings: DEFAULT_SETTINGS,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        }
      } catch (error) {
        console.warn('Failed to hydrate Firestore data:', error);
      } finally {
        if (isSubscribed) {
          hasHydratedCloud.current = true;
        }
      }
    };

    hydrateFromCloud();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid, user?.email, user?.name, theme, setTheme]);

  // ── Persist goals ────────────────────────────────────────────────
  useEffect(() => {
    const key = userStorageKey(STORAGE_SUFFIXES.goals);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(goals));
  }, [goals, userStorageKey]);

  // ── Persist focus sessions ───────────────────────────────────────
  useEffect(() => {
    const key = userStorageKey(STORAGE_SUFFIXES.focusSessions);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(focusSessions));
  }, [focusSessions, userStorageKey]);

  // ── Persist streak ───────────────────────────────────────────────
  useEffect(() => {
    const key = userStorageKey(STORAGE_SUFFIXES.streak);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify({ streak, lastActiveDate }));
  }, [streak, lastActiveDate, userStorageKey]);

  // ── Persist AI toggle ────────────────────────────────────────────
  useEffect(() => {
    const key = userStorageKey(STORAGE_SUFFIXES.aiEnabled);
    if (!key) return;
    localStorage.setItem(key, String(aiEnabled));
  }, [aiEnabled, userStorageKey]);

  // ── Cleanup legacy shared cache keys ─────────────────────────────
  useEffect(() => {
    LEGACY_SHARED_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  // ── Persist dashboard state to Firestore ─────────────────────────
  useEffect(() => {
    if (!user?.uid || !hasHydratedCloud.current) return;

    const timeout = setTimeout(() => {
      const appStateRef = doc(db, 'users', user.uid, 'app', 'state');

      setDoc(
        appStateRef,
        {
          goals,
          focusSessions,
          streak,
          lastActiveDate,
          aiEnabled,
          theme,
          settings,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch((error) => {
        console.warn('Failed to sync Firestore data:', error);
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    aiEnabled,
    focusSessions,
    goals,
    lastActiveDate,
    settings,
    streak,
    theme,
    user?.uid
  ]);

  // ── Rollover incomplete tasks at midnight ───────────────────────
  useEffect(() => {
    const rolloverKey = getRolloverStorageKey(user?.uid);
    const todayKeyLocal = getDateKey(new Date());
    const lastRollover = localStorage.getItem(rolloverKey);

    if (lastRollover !== todayKeyLocal) {
      const yesterday = getYesterday(new Date());
      const rollover = rolloverIncompleteTasks(goals, yesterday, new Date());
      if (rollover.didUpdate) {
        setGoals(rollover.goals);
        persistGoals(rollover.goals);
      }
      localStorage.setItem(rolloverKey, todayKeyLocal);
    }

    const nextMidnight = getNextMidnight(new Date());
    const timeoutMs = nextMidnight.getTime() - Date.now();
    if (timeoutMs <= 0) return () => {};

    const timeout = setTimeout(() => {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 1);
      const rollover = rolloverIncompleteTasks(goals, fromDate, toDate);
      if (rollover.didUpdate) {
        setGoals(rollover.goals);
        persistGoals(rollover.goals);
      }
      localStorage.setItem(rolloverKey, getDateKey(toDate));
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [goals, persistGoals, user?.uid]);

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

  const getActiveTasksForDate = useCallback(
    (date) =>
      goals.flatMap((goal) =>
        goal.tasks
          .filter((task) => isTaskActiveOnDate(task, date))
          .map((task) => ({ goalId: goal.id, goalName: goal.name, task }))
      ),
    [goals]
  );

  const persistGoals = useCallback(
    (nextGoals) => {
      if (!user?.uid || !hasHydratedCloud.current) return;
      const appStateRef = doc(db, 'users', user.uid, 'app', 'state');
      setDoc(
        appStateRef,
        {
          goals: nextGoals,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch((error) => {
        console.warn('Failed to sync goals to Firestore:', error);
      });
    },
    [user?.uid]
  );

  const completedToday = activeTasksToday.filter(({ task }) => isTaskDoneForDate(task, today)).length;
  const completionRate = activeTasksToday.length
    ? Math.round((completedToday / activeTasksToday.length) * 100)
    : 0;

  const allTaskCount = goals.reduce((sum, goal) => sum + goal.tasks.length, 0);

  const calendarCells = buildCalendarCells(goals, today);

  const monthName = today.toLocaleString('en-US', { month: 'long' });

  // ── Focus minutes for today ──────────────────────────────────────
  const focusMinutesToday = focusSessions
    .filter(s => s.date === todayKey)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const openGoalModal = () => setIsGoalModalOpen(true);
  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setGoalName('');
    setGoalVision('');
  };

  const addGoal = (eventOrTasks, roadmapData) => {
    let generatedTasks = [];
    let nameOverride;
    let visionOverride;
    let roadmapOverride;

    if (eventOrTasks && typeof eventOrTasks.preventDefault === 'function') {
      eventOrTasks.preventDefault();
    } else if (Array.isArray(eventOrTasks)) {
      generatedTasks = eventOrTasks;
    } else if (eventOrTasks && typeof eventOrTasks === 'object') {
      if (Array.isArray(eventOrTasks.tasks)) {
        generatedTasks = eventOrTasks.tasks;
      }
      nameOverride = eventOrTasks.name;
      visionOverride = eventOrTasks.vision;
      roadmapOverride = eventOrTasks.roadmapData;
    }

    const finalName = (nameOverride ?? goalName).trim();
    if (!finalName) return;

    const newGoal = {
      id: Date.now(),
      name: finalName,
      vision: (visionOverride ?? goalVision).trim() || 'A clear target worth showing up for.',
      tasks: generatedTasks,
      roadmap: roadmapOverride || roadmapData || null,
      focusMinutes: 0,
      weeklyReflections: []
    };

    setGoals((currentGoals) => [newGoal, ...currentGoals]);
    setSelectedGoalId(newGoal.id);
    closeGoalModal();
  };

  const addTaskToGoal = (goalId, form) => {
    if (!form?.title?.trim()) return;
    if (form.recurrenceType === 'specific-days' && (form.specificDays || []).length === 0) return;

    const newTask = {
      id: Date.now(),
      title: form.title.trim(),
      description: form.description || '',
      recurrenceType: form.recurrenceType,
      oneTimeDate: form.oneTimeDate,
      weeklyDay: form.weeklyDay,
      specificDays: form.specificDays,
      deadline: form.deadline,
      timeEstimate: form.timeEstimate,
      energy: form.energy,
      phaseId: form.phaseId || undefined,
      progressMinutes: 0,
      order: Date.now(),
      completed: false,
      completedDates: []
    };

    setGoals((currentGoals) => {
      const nextGoals = currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, tasks: [newTask, ...goal.tasks] } : goal
      );
      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  // ── Streak update logic ──────────────────────────────────────────
  const updateStreak = useCallback(() => {
    const todayStr = todayKey;
    
    if (lastActiveDate === todayStr) {
      // Already counted today
      return;
    }
    
    // Check if last active was yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateKey(yesterday);
    
    let newStreak;
    if (lastActiveDate === yesterdayStr) {
      newStreak = streak + 1;
    } else if (lastActiveDate === todayStr) {
      newStreak = streak;
    } else {
      newStreak = 1;
    }
    
    setStreak(newStreak);
    setLastActiveDate(todayStr);
    
    // Check for milestone
    const milestone = checkStreakMilestone(newStreak);
    if (milestone) {
      setStreakToast(milestone);
      setTimeout(() => setStreakToast(null), 4000);
    }
  }, [todayKey, lastActiveDate, streak, today]);

  const toggleTaskDoneForDate = (goalId, taskId, dateInput) => {
    const dateKey = getDateKey(dateInput || today);

    setGoals((currentGoals) => {
      const nextGoals = currentGoals.map((goal) => {
        if (goal.id !== goalId) return goal;

        return {
          ...goal,
          tasks: goal.tasks.map((task) => {
            if (task.id !== taskId) return task;

            if (task.recurrenceType === 'one-time') {
              return { ...task, completed: !task.completed, updatedAt: new Date().toISOString() };
            }

            const alreadyDone = task.completedDates.includes(dateKey);
            const nextDates = alreadyDone
              ? task.completedDates.filter((item) => item !== dateKey)
              : [...task.completedDates, dateKey];

            return { ...task, completedDates: nextDates, updatedAt: new Date().toISOString() };
          })
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });

    if (dateKey === todayKey) {
      updateStreak();
    }
  };

  const toggleTaskDoneForToday = (goalId, taskId) => {
    toggleTaskDoneForDate(goalId, taskId, today);
  };

  const toggleSetting = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const addPhaseToGoal = (goalId, phase) => {
    setGoals(current => {
      const nextGoals = current.map(g => {
        if (g.id !== goalId) return g;
        const currentRoadmap = g.roadmap || { phases: [] };
        return {
          ...g,
          roadmap: {
            ...currentRoadmap,
            phases: [...(currentRoadmap.phases || []), phase]
          },
          updatedAt: new Date().toISOString()
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  const movePhase = (goalId, phaseIndex, direction) => {
    setGoals(current => {
      const nextGoals = current.map(g => {
        if (g.id !== goalId || !g.roadmap?.phases) return g;
        const newPhases = [...g.roadmap.phases];
        if (direction === 'up' && phaseIndex > 0) {
          [newPhases[phaseIndex - 1], newPhases[phaseIndex]] = [newPhases[phaseIndex], newPhases[phaseIndex - 1]];
        } else if (direction === 'down' && phaseIndex < newPhases.length - 1) {
          [newPhases[phaseIndex + 1], newPhases[phaseIndex]] = [newPhases[phaseIndex], newPhases[phaseIndex + 1]];
        }
        return {
          ...g,
          roadmap: {
            ...g.roadmap,
            phases: newPhases
          },
          updatedAt: new Date().toISOString()
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  const updateTask = (goalId, taskId, payload) => {
    const updatedAt = payload?.updatedAt || new Date().toISOString();
    setGoals(current => {
      const nextGoals = current.map(g => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...payload, updatedAt } : t),
          updatedAt
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  const completeGoal = (goalId, assessment) => {
    const completedAt = new Date().toISOString();
    setGoals(current => {
      const nextGoals = current.map(g => {
        if (g.id !== goalId) return g;
        return { ...g, status: 'completed', assessment, completedAt, updatedAt: completedAt };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  // ── Focus session logging ────────────────────────────────────────
  const logFocusSession = useCallback((sessionData) => {
    const { goalId, taskId, duration } = sessionData;
    
    // Add to sessions log
    setFocusSessions(prev => [...prev, {
      date: todayKey,
      goalId,
      taskId,
      duration // in minutes
    }]);

    // Increment focus minutes on the goal
    if (goalId) {
      setGoals((current) => {
        const nextGoals = current.map((g) => {
          if (g.id !== goalId) return g;
          const nextTasks = g.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextProgress = (task.progressMinutes || 0) + duration;
            return { ...task, progressMinutes: nextProgress, updatedAt: new Date().toISOString() };
          });
          const nextGoal = { ...g, tasks: nextTasks, focusMinutes: (g.focusMinutes || 0) + duration };
          return nextGoal;
        });
        persistGoals(nextGoals);
        return nextGoals;
      });
    }
  }, [persistGoals, todayKey]);

  // ── Weekly review adjustment ─────────────────────────────────────
  const adjustGoal = useCallback((goalId, adjustmentType, assessment) => {
    setGoals(current => current.map(g => {
      if (g.id !== goalId) return g;
      const reflections = g.weeklyReflections || [];
      return {
        ...g,
        weeklyReflections: [...reflections, {
          date: todayKey,
          assessment: assessment || '',
          adjustment: adjustmentType
        }]
      };
    }));
  }, [todayKey]);

  // ── Data export ──────────────────────────────────────────────────
  const exportData = useCallback(() => {
    const data = {
      goals,
      focusSessions,
      streak,
      lastActiveDate,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gola-export-${todayKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [goals, focusSessions, streak, lastActiveDate, todayKey]);

  const recurrenceText = (task) => getRecurrenceText(task, WEEK_DAYS);

  const renderActivePage = () => {
    if (activePage === 'Today') {
      return (
        <TasksPage
          goals={goals}
          activeTasksToday={activeTasksToday}
          today={today}
          getActiveTasksForDate={getActiveTasksForDate}
          isTaskActiveOnDate={isTaskActiveOnDate}
          isTaskDoneForDate={isTaskDoneForDate}
          toggleTaskDoneForDate={toggleTaskDoneForDate}
          toggleTaskDoneForToday={toggleTaskDoneForToday}
          updateTask={updateTask}
          getRecurrenceText={recurrenceText}
          prettyDate={prettyDate}
          streak={streak}
          completionRate={completionRate}
          aiEnabled={aiEnabled}
          focusMinutesToday={focusMinutesToday}
          onStartFocus={(taskId, goalId) => {
            setActivePage('Focus');
          }}
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
          addTaskToGoal={addTaskToGoal}
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
          addPhaseToGoal={addPhaseToGoal}
          movePhase={movePhase}
          completeGoal={completeGoal}
          aiEnabled={aiEnabled}
        />
      );
    }

    if (activePage === 'Focus') {
      return (
        <FocusPage 
          activeTasksToday={activeTasksToday} 
          toggleTaskDoneForToday={toggleTaskDoneForToday}
          setActivePage={setActivePage}
          logFocusSession={logFocusSession}
          focusMinutesToday={focusMinutesToday}
        />
      );
    }

    if (activePage === 'Review') {
      return (
        <ReviewPage
          goals={goals}
          focusSessions={focusSessions}
          onAdjustGoal={adjustGoal}
          today={today}
          aiEnabled={aiEnabled}
          isTaskActiveOnDate={isTaskActiveOnDate}
          isTaskDoneForDate={isTaskDoneForDate}
        />
      );
    }

    if (activePage === 'Settings') {
      return (
        <SettingsPage
          theme={theme}
          setTheme={setTheme}
          aiEnabled={aiEnabled}
          setAiEnabled={setAiEnabled}
          exportData={exportData}
          onOpenProfile={() => navigate('/profile')}
        />
      );
    }

    // Default: Today
    return (
        <TasksPage
        goals={goals}
        activeTasksToday={activeTasksToday}
        today={today}
        getActiveTasksForDate={getActiveTasksForDate}
        isTaskActiveOnDate={isTaskActiveOnDate}
        isTaskDoneForDate={isTaskDoneForDate}
        toggleTaskDoneForDate={toggleTaskDoneForDate}
        toggleTaskDoneForToday={toggleTaskDoneForToday}
        updateTask={updateTask}
        getRecurrenceText={recurrenceText}
        prettyDate={prettyDate}
        streak={streak}
        completionRate={completionRate}
        aiEnabled={aiEnabled}
        focusMinutesToday={focusMinutesToday}
        onStartFocus={(taskId, goalId) => {
          setActiveTask(taskId);
          setActivePage('Focus');
        }}
      />
    );
  };

  // Compute the page label for TopBar
  const pageLabel = activePage === 'Today' ? 'Today' : activePage;

  return (
    <AppShell $themeMode={theme}>
      <AuroraLayer $variant="aurora-a" />
      <AuroraLayer $variant="aurora-b" />
      <AuroraLayer $variant="aurora-c" />

      <Sidebar 
        navItems={NAV_ITEMS} 
        activePage={activePage} 
        onChangePage={setActivePage} 
      />
      <GlobalTimerWidget activePage={activePage} setActivePage={setActivePage} />

      <MainPanel $focusMode={activePage === 'Focus'}>
        <TopBar
          date={today}
          activePage={pageLabel}
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

      {/* Streak milestone toast */}
      {streakToast && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          color: '#fff',
          padding: '14px 28px',
          borderRadius: '999px',
          fontSize: '1rem',
          fontWeight: 700,
          boxShadow: '0 12px 40px rgba(245, 158, 11, 0.4)',
          animation: 'floatUpFade 0.4s ease forwards',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔥 {streakToast} day streak!
        </div>
      )}
    </AppShell>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(() => {
    const primary = localStorage.getItem(THEME_STORAGE_KEY);
    if (primary) return primary;

    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
      return legacy;
    }

    return 'light';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // We will load custom Firestore data here later in Phase 4
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingAuth) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}><div className="spinner"></div></div>;
  }

  return (
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/app" replace /> : <LoginPage theme={theme} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/app" replace /> : <RegisterPage theme={theme} />}
        />
        <Route
          path="/app"
          element={user ? <DashboardWorkspace user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={
            user ? (
              <ProfilePage user={user} theme={theme} onLogout={handleLogout} />
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
