import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [workDur, setWorkDur] = useState(25);
  const [shortDur, setShortDur] = useState(5);
  const [longDur, setLongDur] = useState(15);
  
  const [timeLeft, setTimeLeft] = useState(workDur * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [activeTask, setActiveTask] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);

  const timerStartRef = useRef(null);
  const initialTimeLeftRef = useRef(null);

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, time, type='sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.6);
      osc.stop(ctx.currentTime + time + 0.6);
    };

    playTone(523.25, 0);
    playTone(659.25, 0.15);
    playTone(783.99, 0.3);
    playTone(1046.50, 0.45);
  }, [soundEnabled]);

  const notifySessionComplete = useCallback((completedMode) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const message = completedMode === 'work' ? 'Time for a break.' : 'Break over. Ready to focus?';
    new Notification('Timer Complete!', { body: message });
  }, []);

  const completeSession = useCallback((completedMode, completedDur) => {
    let nextMode = 'work';
    let nextCount = completedWorkSessions;

    if (completedMode === 'work') {
      nextCount = completedWorkSessions + 1;
      setCompletedWorkSessions(nextCount);
      nextMode = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    }

    const nextDuration = nextMode === 'work' ? workDur : nextMode === 'shortBreak' ? shortDur : longDur;

    setMode(nextMode);
    setTimeLeft(Math.max(1, nextDuration) * 60);

    if (completedMode === 'work') {
      setSessionCompleted({ mode: completedMode, duration: completedDur });
    }

    notifySessionComplete(completedMode);

    if (autoStartNext) {
      setIsActive(true);
    }
  }, [autoStartNext, notifySessionComplete, shortDur, workDur, longDur, completedWorkSessions]);

  const skipTimer = () => {
    setIsActive(false);

    const totalTime = mode === 'work' ? workDur * 60 : mode === 'shortBreak' ? shortDur * 60 : longDur * 60;
    const elapsedMinutes = Math.max(1, Math.round((totalTime - timeLeft) / 60));
    completeSession(mode, elapsedMinutes);
  };

  useEffect(() => {
    if (isActive) {
      timerStartRef.current = Date.now();
      initialTimeLeftRef.current = timeLeft;
    } else {
      timerStartRef.current = null;
      initialTimeLeftRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        if (timerStartRef.current !== null && initialTimeLeftRef.current !== null) {
          const elapsedSeconds = Math.floor((Date.now() - timerStartRef.current) / 1000);
          const nextTimeLeft = Math.max(0, initialTimeLeftRef.current - elapsedSeconds);
          setTimeLeft(nextTimeLeft);

          if (nextTimeLeft === 0) {
            setIsActive(false);
            playAlarm();
            const completedDur = mode === 'work' ? workDur : mode === 'shortBreak' ? shortDur : longDur;
            completeSession(mode, completedDur);
          }
        }
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      playAlarm();

      const completedDur = mode === 'work' ? workDur : mode === 'shortBreak' ? shortDur : longDur;
      completeSession(mode, completedDur);
    }
    return () => clearInterval(interval);
  }, [completeSession, isActive, mode, playAlarm, timeLeft, workDur, shortDur, longDur]);

  const toggleTimer = () => setIsActive(!isActive);

  const setCustomMode = useCallback((newMode, workDurOverride, shortDurOverride, longDurOverride) => {
    setIsActive(false);
    setMode(newMode);
    const w = workDurOverride !== undefined ? workDurOverride : workDur;
    const s = shortDurOverride !== undefined ? shortDurOverride : shortDur;
    const l = longDurOverride !== undefined ? longDurOverride : longDur;
    if (newMode === 'work') setTimeLeft(Math.max(1, w) * 60);
    if (newMode === 'shortBreak') setTimeLeft(Math.max(1, s) * 60);
    if (newMode === 'longBreak') setTimeLeft(Math.max(1, l) * 60);
  }, [workDur, shortDur, longDur]);

  const clearSessionCompleted = () => setSessionCompleted(null);

  return (
    <TimerContext.Provider value={{
      timeLeft, setTimeLeft, isActive, toggleTimer, mode, setCustomMode, skipTimer,
      activeTask, setActiveTask, 
      workDur, setWorkDur, shortDur, setShortDur, longDur, setLongDur,
      sessionCompleted, clearSessionCompleted,
      soundEnabled, setSoundEnabled,
      autoStartNext, setAutoStartNext
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
