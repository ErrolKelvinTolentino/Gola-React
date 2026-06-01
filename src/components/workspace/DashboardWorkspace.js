import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';
import TopBar from '../layout/TopBar';
import TasksPage from '../../pages/TasksPage';
import FocusPage from '../../pages/FocusPage';
import CalendarPage from '../../pages/CalendarPage';
import SettingsPage from '../../pages/SettingsPage';
import GlobalTimerWidget from '../GlobalTimerWidget';
import MobileBottomNav from '../MobileBottomNav';
import ConfirmDialog from '../ConfirmDialog';
import UndoToast from '../UndoToast';
import EndOfDayModal from '../EndOfDayModal';
import GoalAutopsy from '../GoalAutopsy';
import PhaseCompleteModal from '../PhaseCompleteModal';
import ErrorBoundary from '../ErrorBoundary';
import { useTimer } from '../../context/TimerContext';
import { AppShell, AuroraLayer, MainPanel, FocusWrap } from '../../styles/AppLayout';
import { DEFAULT_SETTINGS, NAV_ITEMS, WEEK_DAYS } from '../../data/appData';
import {
  getDateKey,
  getRecurrenceText,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  getTaskLockStatus,
  prettyDate
} from '../../utils/dateUtils';
import { runDailyPruneIfNeeded } from '../../utils/dataPruning';
import { getNextMidnight, getYesterday, rolloverIncompleteTasks } from '../../utils/taskRollover';
import { isPhaseComplete } from '../../utils/phaseUtils';
import { db } from '../../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { playTabSound, playClickSound, playSuccessSound, playUncheckSound } from '../../utils/audio';

const GoalsPage = lazy(() => import('../../pages/GoalsPage'));
const ReviewPage = lazy(() => import('../../pages/ReviewPage'));

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

const createTempId = () => `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100];
function checkStreakMilestone(streak) {
  if (STREAK_MILESTONES.includes(streak)) {
    return streak;
  }
  return null;
}

function DashboardWorkspace({ user, onLogout, theme, setTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveTask } = useTimer();
  const hasHydratedCloud = useRef(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  const userStorageKey = useCallback(
    (suffix) => getUserScopedStorageKey(user?.uid, suffix),
    [user?.uid]
  );

  // Dynamic activePage computed from React Router path
  const activePage = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/goals')) return 'Goals';
    if (path.includes('/focus')) return 'Focus';
    if (path.includes('/calendar')) return 'Calendar';
    if (path.includes('/review')) return 'Review';
    if (path.includes('/settings')) return 'Settings';
    return 'Today';
  }, [location.pathname]);

  const handlePageChange = (page) => {
    playTabSound();
    navigate(`/app/${page.toLowerCase()}`);
  };
  
  // ── Goals state (persisted) ──────────────────────────────────────
  const [goals, setGoals] = useState(() => {
    const stored = parseStoredJson(getUserScopedStorageKey(user?.uid, STORAGE_SUFFIXES.goals));
    return Array.isArray(stored) ? stored : [];
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

  const [aiEnabled, setAiEnabled] = useState(true);

  // ── Streak milestone toast ───────────────────────────────────────
  const [streakToast, setStreakToast] = useState(null);

  // ── Undo system ─────────────────────────────────────────────────
  const [undoAction, setUndoAction] = useState(null);

  // ── Confirm dialog ──────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Daily scores (persisted) ────────────────────────────────────
  const [dailyScores, setDailyScores] = useState([]);

  // ── Daily reflections / End of Day (persisted) ──────────────────
  const [dailyReflections, setDailyReflections] = useState([]);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const endOfDayShownRef = useRef(false);
  const [completedPhaseInfo, setCompletedPhaseInfo] = useState(null);
  const prevGoalsRef = useRef(goals);

  // ── Goal Autopsy (stale goal detection) ─────────────────────────
  const [staleGoal, setStaleGoal] = useState(null);
  const [dismissedAutopsies, setDismissedAutopsies] = useState([]);
  const lastLocalWriteTimeRef = useRef(0);

  const latestStateRef = useRef({});
  latestStateRef.current = {
    goals,
    focusSessions,
    streak,
    lastActiveDate,
    aiEnabled,
    theme,
    settings,
    dailyScores,
    dailyReflections
  };

  // ── Hydrate dashboard state from Firestore ───────────────────────
  useEffect(() => {
    let isSubscribed = true;
    let unsubscribe = null;

    if (!user?.uid) {
      hasHydratedCloud.current = true;
      setIsHydrating(false);
      return () => {};
    }

    const appStateRef = doc(db, 'users', user.uid, 'app', 'state');
    unsubscribe = onSnapshot(
      appStateRef,
      async (snapshot) => {
        if (!isSubscribed) return;

        // Skip syncing from Firestore snapshot if there was a recent local write,
        // to prevent server echos of partial writes (e.g. goals only) from overwriting
        // local state changes (e.g. streak updates) before they are fully persisted.
        if (hasHydratedCloud.current && (Date.now() - lastLocalWriteTimeRef.current < 2500 || snapshot.metadata.hasPendingWrites)) {
          return;
        }

        if (snapshot.exists()) {
          const cloud = snapshot.data();
          const current = latestStateRef.current;

          if (Array.isArray(cloud.goals) && JSON.stringify(cloud.goals) !== JSON.stringify(current.goals)) {
            setGoals(cloud.goals);
          }

          if (Array.isArray(cloud.focusSessions) && JSON.stringify(cloud.focusSessions) !== JSON.stringify(current.focusSessions)) {
            setFocusSessions(cloud.focusSessions);
          }

          if (typeof cloud.streak === 'number' && cloud.streak !== current.streak) {
            setStreak(cloud.streak);
          }

          if ((typeof cloud.lastActiveDate === 'string' || cloud.lastActiveDate === null) && cloud.lastActiveDate !== current.lastActiveDate) {
            setLastActiveDate(cloud.lastActiveDate ?? null);
          }

          if (typeof cloud.aiEnabled === 'boolean') {
            setAiEnabled(true);
          }

          if ((cloud.theme === 'light' || cloud.theme === 'dark') && cloud.theme !== current.theme) {
            setTheme(cloud.theme);
          }

          if (cloud.settings && typeof cloud.settings === 'object' && JSON.stringify(cloud.settings) !== JSON.stringify(current.settings)) {
            setSettings((currentSettings) => ({ ...currentSettings, ...cloud.settings }));
          }

          if (Array.isArray(cloud.dailyScores) && JSON.stringify(cloud.dailyScores) !== JSON.stringify(current.dailyScores)) {
            setDailyScores(cloud.dailyScores);
          }

          if (Array.isArray(cloud.dailyReflections) && JSON.stringify(cloud.dailyReflections) !== JSON.stringify(current.dailyReflections)) {
            setDailyReflections(cloud.dailyReflections);
          }
        } else {
          const defaultState = {
            goals: [],
            focusSessions: [],
            streak: 0,
            lastActiveDate: null,
            aiEnabled: true,
            theme,
            settings: DEFAULT_SETTINGS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          setGoals(defaultState.goals);
          setFocusSessions(defaultState.focusSessions);
          setStreak(defaultState.streak);
          setLastActiveDate(defaultState.lastActiveDate);
          setAiEnabled(defaultState.aiEnabled);
          setSettings(DEFAULT_SETTINGS);

          await setDoc(appStateRef, defaultState, { merge: true });
        }

        if (isSubscribed) {
          hasHydratedCloud.current = true;
          setIsHydrating(false);
        }
      },
      (error) => {
        console.warn('Failed to hydrate Firestore data:', error);
        if (isSubscribed) {
          hasHydratedCloud.current = true;
          setIsHydrating(false);
        }
      }
    );
    return () => {
      isSubscribed = false;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, setTheme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const target = e.target.closest('button, [role="button"], a, input[type="submit"], input[type="button"], .clickable');
      if (target) {
        const isTabButton = target.closest('.nav-item, .mobile-bottom-nav button, .global-timer-widget');
        const isCheckbox = target.closest('.task-list input[type="checkbox"], .task-list label');
        if (!isTabButton && !isCheckbox) {
          playClickSound();
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

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
      lastLocalWriteTimeRef.current = Date.now();
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
          dailyScores,
          dailyReflections,
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
    dailyScores,
    dailyReflections,
    user?.uid
  ]);

  const persistGoals = useCallback(
    (nextGoals) => {
      if (!user?.uid || !hasHydratedCloud.current) return;
      lastLocalWriteTimeRef.current = Date.now();
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
  
  const [today, setToday] = useState(() => new Date());
  const todayKey = getDateKey(today);

  // ── Rollover incomplete tasks at midnight ───────────────────────
  useEffect(() => {
    if (isHydrating) return;
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
      // Prune stale dailyProgress / dailySubtasks entries
      runDailyPruneIfNeeded(rollover.didUpdate ? rollover.goals : goals, setGoals, persistGoals);
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
      setToday(new Date());
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [goals, persistGoals, user?.uid, isHydrating]);

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) || null;

  const activeTasksToday = goals.flatMap((goal) =>
    goal.tasks
      .filter((task) => {
        if (!isTaskActiveOnDate(task, today)) return false;
        const lockStatus = getTaskLockStatus(task, goal, today);
        return !lockStatus.isLocked;
      })
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
          .filter((task) => {
            if (!isTaskActiveOnDate(task, date)) return false;
            const lockStatus = getTaskLockStatus(task, goal, date);
            return !lockStatus.isLocked;
          })
          .map((task) => ({ goalId: goal.id, goalName: goal.name, task }))
      ),
    [goals]
  );

  const completedToday = activeTasksToday.filter(({ task }) => isTaskDoneForDate(task, today)).length;
  const completionRate = activeTasksToday.length
    ? Math.round((completedToday / activeTasksToday.length) * 100)
    : 0;

  const allTaskCount = goals.reduce((sum, goal) => sum + goal.tasks.length, 0);

  // ── Focus minutes for today ──────────────────────────────────────
  const focusMinutesToday = focusSessions
    .filter(s => s.date === todayKey)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  // ── Today Score computation ──────────────────────────────────────
  const todayScore = useMemo(() => {
    const taskScore = completionRate; // 0-100
    const focusTarget = 60; // target minutes
    const focusScore = Math.min(100, Math.round((focusMinutesToday / focusTarget) * 100));
    const streakScore = Math.min(100, Math.round((streak / 7) * 100));
    return Math.round(taskScore * 0.6 + focusScore * 0.25 + streakScore * 0.15);
  }, [completionRate, focusMinutesToday, streak]);

  // ── Weekly scores for sparkline ─────────────────────────────────
  const weeklyScores = useMemo(() => {
    const scores = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const found = dailyScores.find(s => s.date === key);
      scores.push({ date: key, score: found ? found.score : (i === 0 ? todayScore : 0) });
    }
    return scores;
  }, [dailyScores, today, todayScore]);

  // ── Persist today's score ───────────────────────────────────────
  useEffect(() => {
    if (isHydrating) return;
    setDailyScores(prev => {
      const exists = prev.find(s => s.date === todayKey);
      if (exists && exists.score === todayScore) return prev;
      const filtered = prev.filter(s => s.date !== todayKey);
      return [...filtered, { date: todayKey, score: todayScore }].slice(-90);
    });
  }, [todayScore, todayKey, isHydrating]);

  // ── Update document title with score ────────────────────────────
  useEffect(() => {
    document.title = activeTasksToday.length > 0 ? `Gola (${todayScore})` : 'Gola';
  }, [todayScore, activeTasksToday.length]);

  // ── End of Day trigger ──────────────────────────────────────────
  useEffect(() => {
    if (isHydrating || endOfDayShownRef.current) return;
    if (activeTasksToday.length > 0 && completedToday === activeTasksToday.length) {
      const alreadyReflected = dailyReflections.find(r => r.date === todayKey);
      if (!alreadyReflected) {
        endOfDayShownRef.current = true;
        setTimeout(() => setShowEndOfDay(true), 800);
      }
    }
  }, [completedToday, activeTasksToday.length, todayKey, dailyReflections, isHydrating]);

  const handleEndOfDaySave = useCallback(({ mood, reflection }) => {
    // Import here to avoid circular dependency at top level if any
    const { isPhaseComplete } = require('../../utils/phaseUtils');

    setDailyReflections(prev => [...prev, {
      date: todayKey,
      score: todayScore,
      mood,
      reflection,
      tasksCompleted: completedToday,
      totalTasks: activeTasksToday.length,
      focusMinutes: focusMinutesToday
    }]);

    // Check for phase progression
    let foundCompletedPhase = null;
    let nextPhaseInfo = null;
    let foundGoalName = null;

    for (const goal of goals) {
      if (goal.roadmap?.phases) {
        for (let i = 0; i < goal.roadmap.phases.length; i++) {
          const phase = goal.roadmap.phases[i];
          if (isPhaseComplete(phase, goal)) {
            const phaseTasks = goal.tasks?.filter(t => t.phaseId === phase.id) || [];
            const completedToday = phaseTasks.some(t => {
              if (t.recurrenceType === 'one-time') {
                return t.updatedAt && t.updatedAt.startsWith(todayKey);
              }
              return Array.isArray(t.completedDates) && t.completedDates.includes(todayKey);
            });

            if (completedToday) {
              foundGoalName = goal.name;
              foundCompletedPhase = phase;
              nextPhaseInfo = goal.roadmap.phases[i + 1] || null;
            }
          }
        }
      }
    }

    if (foundCompletedPhase) {
      setTimeout(() => {
        setCompletedPhaseInfo({
          goalName: foundGoalName,
          completedPhase: foundCompletedPhase,
          nextPhase: nextPhaseInfo
        });
      }, 500); // Slight delay after end of day modal closes
    }

  }, [todayKey, todayScore, completedToday, activeTasksToday.length, focusMinutesToday, goals]);

  // ── Stale Goal Detection (Goal Autopsy) ─────────────────────────
  useEffect(() => {
    if (isHydrating || staleGoal) return;
    const now = new Date();
    for (const goal of goals) {
      if (goal.status === 'completed') continue;
      if (dismissedAutopsies.includes(goal.id)) continue;
      
      let lastActivity = null;
      for (const task of goal.tasks) {
        const dates = (task.completedDates || []).concat(task.updatedAt ? [task.updatedAt.split('T')[0]] : []);
        for (const d of dates) {
          if (!lastActivity || d > lastActivity) lastActivity = d;
        }
      }
      if (!lastActivity && goal.updatedAt) {
        lastActivity = goal.updatedAt.split('T')[0];
      }
      if (lastActivity) {
        const lastDate = new Date(lastActivity + 'T00:00:00');
        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        if (daysSince >= 14) {
          setStaleGoal({ goal, daysSinceActivity: daysSince });
          break;
        }
      }
    }
  }, [goals, isHydrating, staleGoal, dismissedAutopsies]);

  const handleArchiveGoal = useCallback((goalId) => {
    setGoals(current => {
      const nextGoals = current.map(g =>
        g.id === goalId ? { ...g, status: 'completed', assessment: { reflection: 'Archived via Goal Check', rating: 0 }, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : g
      );
      persistGoals(nextGoals);
      return nextGoals;
    });
    setStaleGoal(null);
  }, [persistGoals]);

  const handleRecommitGoal = useCallback((goalId) => {
    setGoals(current => {
      const nextGoals = current.map(g =>
        g.id === goalId ? { ...g, updatedAt: new Date().toISOString() } : g
      );
      persistGoals(nextGoals);
      return nextGoals;
    });
    setStaleGoal(null);
  }, [persistGoals]);

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
    let deadlineOverride;

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
      deadlineOverride = eventOrTasks.deadline;
    }

    const finalName = (nameOverride ?? goalName).trim();
    if (!finalName) return;

    const newGoal = {
      id: createTempId(),
      name: finalName,
      vision: (visionOverride ?? goalVision).trim() || 'A clear target worth showing up for.',
      tasks: generatedTasks,
      roadmap: roadmapOverride || roadmapData || null,
      deadline: deadlineOverride || null,
      focusMinutes: 0,
      weeklyReflections: []
    };

    setGoals((currentGoals) => {
      const nextGoals = [newGoal, ...currentGoals];
      persistGoals(nextGoals);
      return nextGoals;
    });
    setSelectedGoalId(newGoal.id);
    closeGoalModal();
  };

  const addTaskToGoal = (goalId, form) => {
    if (!form?.title?.trim()) return;
    if (form.recurrenceType === 'specific-days' && (form.specificDays || []).length === 0) return;

    const newTask = {
      id: createTempId(),
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
      subtasks: form.subtasks || [],
      isPriority: form.isPriority || false,
      predecessorId: form.predecessorId || null,
      endDate: form.endDate || null,
      targetCount: form.targetCount || null,
      progressMinutes: 0,
      order: createTempId(),
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

  // ── Reactive Phase Completion Detection ───────────────────────────
  useEffect(() => {
    if (isHydrating) {
      prevGoalsRef.current = goals;
      return;
    }

    for (const nextGoal of goals) {
      const prevGoal = prevGoalsRef.current.find(g => g.id === nextGoal.id);
      if (prevGoal && nextGoal.roadmap?.phases) {
        for (const phase of nextGoal.roadmap.phases) {
          const wasCompleted = prevGoal.roadmap?.phases?.find(p => p.id === phase.id)
            ? isPhaseComplete(phase, prevGoal)
            : false;
          
          const isCompletedNow = isPhaseComplete(phase, nextGoal);

          if (isCompletedNow && !wasCompleted) {
            const phaseIndex = nextGoal.roadmap.phases.findIndex(p => p.id === phase.id);
            const nextPhase = phaseIndex + 1 < nextGoal.roadmap.phases.length
              ? nextGoal.roadmap.phases[phaseIndex + 1]
              : null;

            setCompletedPhaseInfo({
              goalName: nextGoal.name,
              completedPhase: phase,
              nextPhase
            });
            break;
          }
        }
      }
    }

    prevGoalsRef.current = goals;
  }, [goals, today, isHydrating]);

  // ── Reactive Streak and Last Active Date Sync ──────────────────────
  useEffect(() => {
    if (isHydrating) return;

    const todayStr = todayKey;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateKey(yesterday);

    const completedToday = goals.flatMap(g =>
      g.tasks.filter(t => isTaskActiveOnDate(t, today) && isTaskDoneForDate(t, today))
    ).length;

    const completedYesterday = goals.flatMap(g =>
      g.tasks.filter(t => isTaskActiveOnDate(t, yesterday) && isTaskDoneForDate(t, yesterday))
    ).length;

    if (completedToday > 0) {
      if (lastActiveDate !== todayStr) {
        let newStreak = 1;
        if (lastActiveDate === yesterdayStr) {
          newStreak = streak + 1;
        }
        setStreak(newStreak);
        setLastActiveDate(todayStr);

        const milestone = checkStreakMilestone(newStreak);
        if (milestone) {
          setStreakToast(milestone);
          setTimeout(() => setStreakToast(null), 4000);
        }
      }
    } else {
      if (lastActiveDate === todayStr) {
        const newStreak = completedYesterday > 0 ? Math.max(0, streak - 1) : 0;
        setStreak(newStreak);
        setLastActiveDate(completedYesterday > 0 ? yesterdayStr : null);
      } else if (lastActiveDate !== yesterdayStr && lastActiveDate !== null) {
        if (streak > 0) {
          setStreak(0);
        }
      }
    }
  }, [goals, todayKey, today, isHydrating, lastActiveDate, streak]);

  const toggleTaskCompletion = (goalId, taskId, dateInput) => {
    const dateKey = getDateKey(dateInput || today);

    // Determine and play audio feedback based on whether we are checking or unchecking the task
    const targetGoal = goals.find((g) => g.id === goalId);
    const targetTask = targetGoal?.tasks.find((t) => t.id === taskId);
    if (targetTask) {
      const isOneTime = targetTask.recurrenceType === 'one-time';
      const isCompleted = isOneTime
        ? targetTask.completed
        : (targetTask.completedDates || []).includes(dateKey);

      if (isCompleted) {
        playUncheckSound();
      } else {
        playSuccessSound();
      }
    }

    setGoals((currentGoals) => {
      const nextGoals = currentGoals.map((goal) => {
        if (goal.id !== goalId) return goal;

        return {
          ...goal,
          tasks: goal.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const isOneTime = task.recurrenceType === 'one-time';

            if (isOneTime) {
              let updated = { ...task, updatedAt: new Date().toISOString() };
              if (task.completionType === 'quantity') {
                const alreadyDone = (task.currentValue || 0) >= (task.targetValue || 10);
                updated.currentValue = alreadyDone ? 0 : (task.targetValue || 10);
                updated.completed = !alreadyDone;
              } else if (task.completionType === 'duration') {
                const alreadyDone = (task.currentValue || 0) >= (task.targetValue || 30);
                updated.currentValue = alreadyDone ? 0 : (task.targetValue || 30);
                updated.completed = !alreadyDone;
              } else if (task.completionType === 'subtasks') {
                const alreadyDone = Array.isArray(task.subtasks) && task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
                updated.subtasks = (task.subtasks || []).map(s => ({ ...s, completed: !alreadyDone }));
                updated.completed = !alreadyDone;
              } else if (task.completionType === 'scale') {
                const alreadyDone = (task.currentValue || 0) > 0;
                updated.currentValue = alreadyDone ? 0 : 5;
                updated.completed = !alreadyDone;
              } else if (task.completionType === 'multistate') {
                const alreadyDone = task.currentValue === 3;
                updated.currentValue = alreadyDone ? 0 : 3;
                updated.stateLabel = alreadyDone ? 'Todo' : 'Done';
                updated.completed = !alreadyDone;
              } else {
                updated.completed = !task.completed;
              }
              return updated;
            } else {
              // Recurring task
              let updated = { ...task, updatedAt: new Date().toISOString() };
              const completedDates = Array.isArray(task.completedDates) ? task.completedDates : [];
              const alreadyDone = completedDates.includes(dateKey);

              const nextDates = alreadyDone
                ? completedDates.filter((item) => item !== dateKey)
                : [...completedDates, dateKey];
              updated.completedDates = nextDates;

              if (task.completionType === 'quantity') {
                const dailyProgress = { ...(task.dailyProgress || {}) };
                dailyProgress[dateKey] = alreadyDone ? 0 : (task.targetValue || 10);
                updated.dailyProgress = dailyProgress;
              } else if (task.completionType === 'duration') {
                const dailyProgress = { ...(task.dailyProgress || {}) };
                dailyProgress[dateKey] = alreadyDone ? 0 : (task.targetValue || 30);
                updated.dailyProgress = dailyProgress;
              } else if (task.completionType === 'subtasks') {
                const dailySubtasks = { ...(task.dailySubtasks || {}) };
                const subList = dailySubtasks[dateKey] || task.subtasks || [];
                dailySubtasks[dateKey] = subList.map(s => ({ ...s, completed: !alreadyDone }));
                updated.dailySubtasks = dailySubtasks;
              } else if (task.completionType === 'scale') {
                const dailyProgress = { ...(task.dailyProgress || {}) };
                dailyProgress[dateKey] = alreadyDone ? 0 : 5;
                updated.dailyProgress = dailyProgress;
              } else if (task.completionType === 'multistate') {
                const dailyProgress = { ...(task.dailyProgress || {}) };
                dailyProgress[dateKey] = alreadyDone ? 0 : 3;
                updated.dailyProgress = dailyProgress;
              }

              return updated;
            }
          })
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  const toggleTaskDoneForToday = (goalId, taskId) => {
    toggleTaskCompletion(goalId, taskId, today);
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
          tasks: g.tasks.map(t => {
            if (t.id !== taskId) return t;
            let updated = { ...t, ...payload, updatedAt };

            if (updated.recurrenceType === 'one-time') {
              if (updated.completionType === 'quantity') {
                updated.completed = (updated.currentValue || 0) >= (updated.targetValue || 10);
              } else if (updated.completionType === 'duration') {
                updated.completed = (updated.currentValue || 0) >= (updated.targetValue || 30);
              } else if (updated.completionType === 'subtasks') {
                updated.completed = Array.isArray(updated.subtasks) && updated.subtasks.length > 0 && updated.subtasks.every(s => s.completed);
              } else if (updated.completionType === 'scale') {
                updated.completed = (updated.currentValue || 0) > 0;
              } else if (updated.completionType === 'multistate') {
                updated.completed = updated.currentValue === 3 || updated.stateLabel === 'Done';
              }
            } else {
              const completedDates = Array.isArray(updated.completedDates) ? [...updated.completedDates] : [];
              const allKeys = new Set([
                ...Object.keys(updated.dailyProgress || {}),
                ...Object.keys(updated.dailySubtasks || {}),
                ...completedDates
              ]);

              const nextCompletedDates = [];
              for (const dateKey of allKeys) {
                let isDone = false;
                if (updated.completionType === 'quantity') {
                  const val = updated.dailyProgress?.[dateKey] || 0;
                  isDone = val >= (updated.targetValue || 10);
                } else if (updated.completionType === 'duration') {
                  const val = updated.dailyProgress?.[dateKey] || 0;
                  isDone = val >= (updated.targetValue || 30);
                } else if (updated.completionType === 'subtasks') {
                  const subList = updated.dailySubtasks?.[dateKey] || updated.subtasks || [];
                  isDone = Array.isArray(subList) && subList.length > 0 && subList.every(s => s.completed);
                } else if (updated.completionType === 'scale') {
                  const val = updated.dailyProgress?.[dateKey] || 0;
                  isDone = val > 0;
                } else if (updated.completionType === 'multistate') {
                  const val = updated.dailyProgress?.[dateKey];
                  isDone = val === 3;
                } else {
                  isDone = completedDates.includes(dateKey);
                }

                if (isDone) {
                  nextCompletedDates.push(dateKey);
                }
              }
              updated.completedDates = nextCompletedDates;
            }

            return updated;
          }),
          updatedAt
        };
      });

      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  const updateGoal = (goalId, updates) => {
    const updatedAt = new Date().toISOString();
    setGoals((current) => {
      const nextGoals = current.map((goal) =>
        goal.id === goalId ? { ...goal, ...updates, updatedAt } : goal
      );
      persistGoals(nextGoals);
      return nextGoals;
    });
  };

  // ── Delete handlers ─────────────────────────────────────────────
  const deleteGoal = useCallback((goalId) => {
    setGoals(current => {
      const deletedGoal = current.find(g => g.id === goalId);
      const nextGoals = current.filter(g => g.id !== goalId);
      persistGoals(nextGoals);
      if (deletedGoal) {
        setUndoAction({
          message: `"${deletedGoal.name}" deleted`,
          undo: () => {
            setGoals(c => {
              const restored = [deletedGoal, ...c];
              persistGoals(restored);
              return restored;
            });
          }
        });
      }
      return nextGoals;
    });
    if (selectedGoalId === goalId) setSelectedGoalId(null);
  }, [persistGoals, selectedGoalId]);

  const deleteTask = useCallback((goalId, taskId) => {
    setGoals(current => {
      let deletedTask = null;
      const nextGoals = current.map(g => {
        if (g.id !== goalId) return g;
        deletedTask = g.tasks.find(t => t.id === taskId);
        return { ...g, tasks: g.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() };
      });
      persistGoals(nextGoals);
      if (deletedTask) {
        setUndoAction({
          message: `"${deletedTask.title}" deleted`,
          undo: () => {
            setGoals(c => {
              const restored = c.map(g => {
                if (g.id !== goalId) return g;
                return { ...g, tasks: [deletedTask, ...g.tasks] };
              });
              persistGoals(restored);
              return restored;
            });
          }
        });
      }
      return nextGoals;
    });
  }, [persistGoals]);

  const deletePhase = useCallback((goalId, phaseId) => {
    setGoals(current => {
      const nextGoals = current.map(g => {
        if (g.id !== goalId || !g.roadmap?.phases) return g;
        return {
          ...g,
          roadmap: { ...g.roadmap, phases: g.roadmap.phases.filter(p => p.id !== phaseId) },
          updatedAt: new Date().toISOString()
        };
      });
      persistGoals(nextGoals);
      return nextGoals;
    });
  }, [persistGoals]);

  const requestDeleteGoal = useCallback((goalId, goalName) => {
    setConfirmDialog({
      title: 'Delete Goal',
      message: `Are you sure you want to delete "${goalName}"? All tasks and progress will be lost.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: () => {
        deleteGoal(goalId);
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  }, [deleteGoal]);

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
    
    setFocusSessions(prev => [...prev, {
      date: todayKey,
      goalId,
      taskId,
      duration
    }]);

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

  const deleteFocusSession = useCallback((sessionIndex) => {
    setFocusSessions(prev => {
      const session = prev[sessionIndex];
      if (!session) return prev;

      const { goalId, taskId, duration } = session;
      if (goalId) {
        setGoals((current) => {
          const nextGoals = current.map((g) => {
            if (g.id !== goalId) return g;
            const nextTasks = g.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const nextProgress = Math.max(0, (task.progressMinutes || 0) - duration);
              return { ...task, progressMinutes: nextProgress, updatedAt: new Date().toISOString() };
            });
            const nextGoal = { 
              ...g, 
              tasks: nextTasks, 
              focusMinutes: Math.max(0, (g.focusMinutes || 0) - duration),
              updatedAt: new Date().toISOString() 
            };
            return nextGoal;
          });
          persistGoals(nextGoals);
          return nextGoals;
        });
      }
      return prev.filter((_, idx) => idx !== sessionIndex);
    });
  }, [persistGoals]);

  // ── Weekly review adjustment ─────────────────────────────────────
  const adjustGoal = useCallback((goalId, adjustmentType, assessment) => {
    setGoals(current => {
      const nextGoals = current.map(g => {
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
      });
      persistGoals(nextGoals);
      return nextGoals;
    });
  }, [todayKey, persistGoals]);

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

  // ── Data import ─────────────────────────────────────────────────
  const importData = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.goals)) setGoals(data.goals);
        if (Array.isArray(data.focusSessions)) setFocusSessions(data.focusSessions);
        if (typeof data.streak === 'number') setStreak(data.streak);
        if (data.lastActiveDate) setLastActiveDate(data.lastActiveDate);
      } catch (err) {
        console.warn('Failed to import data:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  if (isHydrating) {
    return (
      <AppShell $themeMode={theme}>
        <AuroraLayer $variant={theme === 'dark' ? 'space' : 'dawn'} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          gap: '24px',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          background: 'var(--bg)'
        }}>
          <style>{`
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.6; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1.02); }
            }
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .skeleton-pill {
              height: 12px;
              border-radius: 6px;
              background: linear-gradient(90deg, var(--line) 25%, var(--bg-2) 50%, var(--line) 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite linear;
            }
          `}</style>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'var(--panel-strong)',
            border: '1px solid var(--line)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}>
            <span style={{ fontSize: '2.5rem' }}>🎯</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>Gola Workspace</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Hydrating cloud parameters...</span>
          </div>

          <div style={{
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '12px',
            padding: '20px',
            background: 'var(--panel)',
            borderRadius: '16px',
            border: '1px solid var(--line)'
          }}>
            <div className="skeleton-pill" style={{ width: '40%', height: '16px' }} />
            <div className="skeleton-pill" style={{ width: '85%' }} />
            <div className="skeleton-pill" style={{ width: '70%' }} />
            <div className="skeleton-pill" style={{ width: '90%' }} />
          </div>
        </div>
      </AppShell>
    );
  }

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
        onChangePage={handlePageChange} 
      />
      <GlobalTimerWidget activePage={activePage} setActivePage={handlePageChange} />

      <MainPanel $focusMode={activePage === 'Focus'}>
        <TopBar
          date={today}
          activePage={pageLabel}
          user={user}
          onOpenProfile={() => navigate('/profile')}
          onOpenSettings={() => handlePageChange('Settings')}
          onLogout={onLogout}
        />
        {!isOnline && <div className="offline-badge">📡 Offline Mode</div>}
        
        <Suspense fallback={<div className="spinner">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="today" replace />} />
            <Route
              path="today"
              element={
                <ErrorBoundary componentName="TasksPage">
                  <TasksPage
                    user={user}
                    goals={goals}
                    setActivePage={handlePageChange}
                    activeTasksToday={activeTasksToday}
                    today={today}
                    getActiveTasksForDate={getActiveTasksForDate}
                    isTaskActiveOnDate={isTaskActiveOnDate}
                    isTaskDoneForDate={isTaskDoneForDate}
                    toggleTaskCompletion={toggleTaskCompletion}
                    toggleTaskDoneForToday={toggleTaskDoneForToday}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                    getRecurrenceText={recurrenceText}
                    prettyDate={prettyDate}
                    streak={streak}
                    completionRate={completionRate}
                    aiEnabled={aiEnabled}
                    focusMinutesToday={focusMinutesToday}
                    todayScore={todayScore}
                    weeklyScores={weeklyScores}
                    onStartFocus={(taskId, goalId) => {
                      setActiveTask(taskId);
                      navigate('/app/focus');
                    }}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="goals"
              element={
                <ErrorBoundary componentName="GoalsPage">
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
                    deleteTask={deleteTask}
                    deleteGoal={requestDeleteGoal}
                    deletePhase={deletePhase}
                    addPhaseToGoal={addPhaseToGoal}
                    movePhase={movePhase}
                    completeGoal={completeGoal}
                    aiEnabled={aiEnabled}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="calendar"
              element={
                <CalendarPage
                  goals={goals}
                  weekDays={WEEK_DAYS}
                  todayKey={todayKey}
                  compactCalendar={settings.compactCalendar}
                  isTaskDoneForDate={isTaskDoneForDate}
                  toggleTaskCompletion={toggleTaskCompletion}
                />
              }
            />
            <Route
              path="focus"
              element={
                <FocusWrap>
                  <FocusPage 
                    goals={goals}
                    focusSessions={focusSessions}
                    activeTasksToday={activeTasksToday} 
                    toggleTaskDoneForToday={toggleTaskDoneForToday}
                    setActivePage={handlePageChange}
                    logFocusSession={logFocusSession}
                    deleteFocusSession={deleteFocusSession}
                    focusMinutesToday={focusMinutesToday}
                  />
                </FocusWrap>
              }
            />
            <Route
              path="review"
              element={
                <ReviewPage
                  goals={goals}
                  focusSessions={focusSessions}
                  onAdjustGoal={adjustGoal}
                  updateGoal={updateGoal}
                  today={today}
                  aiEnabled={aiEnabled}
                  isTaskActiveOnDate={isTaskActiveOnDate}
                  isTaskDoneForDate={isTaskDoneForDate}
                />
              }
            />
            <Route
              path="settings"
              element={
                <SettingsPage
                  theme={theme}
                  setTheme={setTheme}
                  aiEnabled={aiEnabled}
                  setAiEnabled={setAiEnabled}
                  exportData={exportData}
                  importData={importData}
                  onOpenProfile={() => navigate('/profile')}
                  settings={settings}
                  onToggleSetting={toggleSetting}
                />
              }
            />
          </Routes>
        </Suspense>
      </MainPanel>

      <MobileBottomNav activePage={activePage} setActivePage={handlePageChange} />

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

      {/* Undo toast */}
      {undoAction && (
        <UndoToast
          message={undoAction.message}
          onUndo={() => { undoAction.undo(); setUndoAction(null); }}
          onDismiss={() => setUndoAction(null)}
        />
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* End of Day Modal */}
      <EndOfDayModal
        isOpen={showEndOfDay}
        onClose={() => setShowEndOfDay(false)}
        onSave={handleEndOfDaySave}
        todayScore={todayScore}
        tasksCompleted={completedToday}
        totalTasks={activeTasksToday.length}
        focusMinutes={focusMinutesToday}
        streak={streak}
        theme={theme}
      />

      {/* Goal Autopsy */}
      {staleGoal && (
        <GoalAutopsy
          isOpen={true}
          goal={staleGoal.goal}
          daysSinceActivity={staleGoal.daysSinceActivity}
          onArchive={handleArchiveGoal}
          onRecommit={handleRecommitGoal}
          onDismiss={() => {
            setDismissedAutopsies(prev => [...prev, staleGoal.goal.id]);
            setStaleGoal(null);
          }}
        />
      )}

      {/* Phase Completion Modal */}
      <PhaseCompleteModal
        isOpen={!!completedPhaseInfo}
        onClose={() => setCompletedPhaseInfo(null)}
        goalName={completedPhaseInfo?.goalName}
        completedPhase={completedPhaseInfo?.completedPhase}
        nextPhase={completedPhaseInfo?.nextPhase}
        theme={theme}
      />
    </AppShell>
  );
}

export default DashboardWorkspace;
