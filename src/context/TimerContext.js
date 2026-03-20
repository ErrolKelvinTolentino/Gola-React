import React, { createContext, useState, useEffect, useContext } from 'react';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [workDur, setWorkDur] = useState(25);
  const [shortDur, setShortDur] = useState(5);
  const [longDur, setLongDur] = useState(15);
  
  const [timeLeft, setTimeLeft] = useState(workDur * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [activeTask, setActiveTask] = useState(null);

  const playAlarm = () => {
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
  };

  const skipTimer = () => {
    setIsActive(false);
    if (mode === 'work') {
      setMode('shortBreak');
      setTimeLeft(shortDur * 60);
    } else {
      setMode('work');
      setTimeLeft(workDur * 60);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      playAlarm();
      
      if (mode === 'work') {
        setMode('shortBreak');
        setTimeLeft(shortDur * 60);
      } else {
        setMode('work');
        setTimeLeft(workDur * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, workDur, shortDur]);

  const toggleTimer = () => setIsActive(!isActive);

  const setCustomMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === 'work') setTimeLeft(workDur * 60);
    if (newMode === 'shortBreak') setTimeLeft(shortDur * 60);
    if (newMode === 'longBreak') setTimeLeft(longDur * 60);
  };

  return (
    <TimerContext.Provider value={{
      timeLeft, setTimeLeft, isActive, toggleTimer, mode, setCustomMode, skipTimer,
      activeTask, setActiveTask, 
      workDur, setWorkDur, shortDur, setShortDur, longDur, setLongDur
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
