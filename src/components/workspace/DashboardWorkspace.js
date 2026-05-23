import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';
import TopBar from '../layout/TopBar';
import HomePage from '../../pages/HomePage';
import TasksPage from '../../pages/TasksPage';
import GoalsPage from '../../pages/GoalsPage';
import CalendarPage from '../../pages/CalendarPage';
import SettingsPage from '../../pages/SettingsPage';
import FocusPage from '../../pages/FocusPage';
import GlobalTimerWidget from '../GlobalTimerWidget';
import { AppShell, AuroraLayer, MainPanel, FocusWrap } from '../../styles/AppLayout';
import { DEFAULT_SETTINGS, INITIAL_GOALS, NAV_ITEMS, WEEK_DAYS } from '../../data/appData';
import {
  buildCalendarCells,
  getDateKey,
  getRecurrenceText,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  prettyDate
} from '../../utils/dateUtils';

let uniqueIdSeed = Date.now();
const createUniqueId = () => {
  uniqueIdSeed += 1;
  return uniqueIdSeed;
};

function DashboardWorkspace({ user, onLogout, theme, setTheme }) {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('Home');
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalVision, setGoalVision] = useState('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
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

  const getActiveTasksForDate = (date) =>
    goals.flatMap((goal) =>
      goal.tasks
        .filter((task) => isTaskActiveOnDate(task, date))
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
      id: createUniqueId(),
      name: finalName,
      vision: (visionOverride ?? goalVision).trim() || 'A clear target worth showing up for.',
      tasks: generatedTasks,
      roadmap: roadmapOverride || roadmapData || null
    };

    setGoals((currentGoals) => [newGoal, ...currentGoals]);
    setSelectedGoalId(newGoal.id);
    closeGoalModal();
  };

  const addTaskToGoal = (goalId, form) => {
    if (!form?.title?.trim()) return;
    if (form.recurrenceType === 'specific-days' && (form.specificDays || []).length === 0) return;

    const newTask = {
      id: createUniqueId(),
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
      completed: false,
      completedDates: []
    };

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, tasks: [newTask, ...goal.tasks] } : goal
      )
    );
  };

  const toggleTaskDoneForDate = (goalId, taskId, dateInput) => {
    const dateKey = getDateKey(dateInput || today);

    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
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
      })
    );
  };

  const toggleTaskDoneForToday = (goalId, taskId) => {
    toggleTaskDoneForDate(goalId, taskId, today);
  };

  const toggleSetting = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const addPhaseToGoal = (goalId, phase) => {
    setGoals(current => current.map(g => {
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
    }));
  };

  const movePhase = (goalId, phaseIndex, direction) => {
    setGoals(current => current.map(g => {
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
    }));
  };

  const updateTask = (goalId, taskId, payload) => {
    const updatedAt = payload?.updatedAt || new Date().toISOString();
    setGoals(current => current.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...payload, updatedAt } : t),
        updatedAt
      };
    }));
  };

  const completeGoal = (goalId, assessment) => {
    const completedAt = new Date().toISOString();
    setGoals(current => current.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, status: 'completed', assessment, completedAt, updatedAt: completedAt };
    }));
  };

  const recurrenceText = (task) => getRecurrenceText(task, WEEK_DAYS);

  const renderActivePage = () => {
    if (activePage === 'Tasks') {
      return (
        <TasksPage
          goals={goals}
          today={today}
          getActiveTasksForDate={getActiveTasksForDate}
          isTaskActiveOnDate={isTaskActiveOnDate}
          isTaskDoneForDate={isTaskDoneForDate}
          toggleTaskDoneForDate={toggleTaskDoneForDate}
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
          isTaskDoneForDate={isTaskDoneForDate}
          today={today}
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
        activeTasksToday={activeTasksToday}
        goals={goals}
        aiEnabled={false}
        onNavigate={(page) => setActivePage(page)}
        onStartFocus={(taskId, goalId) => setActivePage('Focus')}
        onStartTask={() => setActivePage('Focus')}
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

export default DashboardWorkspace;
