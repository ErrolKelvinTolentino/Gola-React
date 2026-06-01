import React, { useState, useRef, useEffect } from 'react';
import { Target, X, Maximize, Settings, StepForward, Headphones, History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useNoise } from '../context/NoiseContext';
import { getTaskLockStatus, isTaskDoneForDate } from '../utils/dateUtils';

function FocusPage({ goals = [], focusSessions = [], activeTasksToday = [], toggleTaskDoneForToday, logFocusSession, deleteFocusSession, focusMinutesToday }) {
  const { 
    timeLeft, setTimeLeft, isActive, toggleTimer, mode, setCustomMode, skipTimer,
    activeTask, setActiveTask, 
    workDur, setWorkDur, shortDur, setShortDur, longDur, setLongDur,
    sessionCompleted, clearSessionCompleted
  } = useTimer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const containerRef = useRef(null);

  // Audio state (global — persists across pages)
  const { activeNoise, toggleNoise } = useNoise();

  const [showHistory, setShowHistory] = useState(false);

  const getSessionMeta = (goalId, taskId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { goalName: 'General Focus', taskTitle: 'Untitled Task' };
    const task = goal.tasks.find(t => t.id === taskId);
    return {
      goalName: goal.name,
      taskTitle: task ? task.title : 'Focus Session'
    };
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => {
    if (mode === 'work') return workDur * 60;
    if (mode === 'shortBreak') return shortDur * 60;
    if (mode === 'longBreak') return longDur * 60;
    return 25 * 60;
  };
  
  const progressRatio = (getTotalTime() - timeLeft) / getTotalTime();

  const applyPreset = (work, short, long) => {
    setWorkDur(work);
    setShortDur(short);
    setLongDur(long);
    setCustomMode('work', work, short, long);
  };

  const getAccentRGB = () => {
    if (mode === 'work') return '139, 92, 246'; // Violet
    if (mode === 'shortBreak') return '236, 72, 153'; // Pink
    return '59, 130, 246'; // Blue
  };

  const accentRGB = getAccentRGB();
  const accentColor = `rgb(${accentRGB})`;
  
  const currentTaskObj = activeTasksToday.find(t => t.task.id.toString() === activeTask?.toString());

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState(null);

  useEffect(() => {
    if (sessionCompleted) {
      setCompletedSessionData(sessionCompleted);
      setShowCompletionModal(true);
      clearSessionCompleted();
    }
  }, [sessionCompleted, clearSessionCompleted]);

  const handleLogSession = (markDone) => {
    if (currentTaskObj) {
      logFocusSession({
        goalId: currentTaskObj.goalId,
        taskId: currentTaskObj.task.id,
        duration: completedSessionData.duration
      });
      if (markDone) {
        toggleTaskDoneForToday(currentTaskObj.goalId, currentTaskObj.task.id);
        setActiveTask(null);
      }
    } else {
      logFocusSession({
        goalId: null,
        taskId: null,
        duration: completedSessionData.duration
      });
    }
    setShowCompletionModal(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        minHeight: '100%',
        borderRadius: document.fullscreenElement ? '0' : '20px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '24px 20px',
        overflowY: 'auto', 
        fontFamily: '"Outfit", "Inter", sans-serif',
        boxShadow: document.fullscreenElement ? 'none' : 'var(--shadow)',
        transition: 'border-radius 0.3s ease, background 0.5s ease',
        border: '1px solid var(--glass-border)',
        background: 'var(--panel)',
        gap: '24px'
      }}
    >
      
      <style>{`
        @keyframes slowDrift {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(120px, -80px) scale(1.15); }
          66% { transform: translate(-80px, 120px) scale(0.85); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes slowDriftReverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-100px, 120px) scale(0.85); }
          66% { transform: translate(120px, -60px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        /* Hide number spinners to prevent clipping */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Animated Floating Glow Orbs mapping seamlessly to the active timer block */}
      <div style={{ position: 'absolute', width: '90vw', height: '90vw', maxWidth: '900px', maxHeight: '900px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${accentRGB}, 0.25) 0%, rgba(0,0,0,0) 60%)`, top: '-30%', left: '-20%', filter: 'blur(45px)', animation: 'slowDrift 16s infinite ease-in-out', pointerEvents: 'none', zIndex: 0, transition: 'background 2s ease' }} />
      <div style={{ position: 'absolute', width: '80vw', height: '80vw', maxWidth: '800px', maxHeight: '800px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${accentRGB}, 0.18) 0%, rgba(0,0,0,0) 60%)`, bottom: '-30%', right: '-20%', filter: 'blur(45px)', animation: 'slowDriftReverse 20s infinite ease-in-out', pointerEvents: 'none', zIndex: 0, transition: 'background 2s ease' }} />

      {/* Top Header Section */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        zIndex: 10, 
        flexWrap: 'wrap-reverse', 
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--line)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Today's Focus: <span style={{ color: 'var(--text)' }}>{focusMinutesToday}m</span>
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', flex: 1, minWidth: '240px', maxWidth: '100%' }}>
          {currentTaskObj ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--panel-strong)', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--line)', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', backdropFilter: 'blur(20px)' }}>
               <button onClick={() => { toggleTaskDoneForToday(currentTaskObj.goalId, currentTaskObj.task.id); setActiveTask(null); }} style={{ background: 'transparent', border: `2px solid ${accentColor}`, borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', outline: 'none' }} title="Mark Done" />
               <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{currentTaskObj.task.title}</span>
               <button onClick={() => setActiveTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, marginLeft: '8px', outline: 'none' }}>
                 <X size={14} />
               </button>
            </div>
          ) : (
            <select 
              value="" 
              onChange={(e) => setActiveTask(e.target.value)}
              style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', background: 'var(--panel-strong)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '10px', outline: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', backdropFilter: 'blur(20px)', width: '100%', maxWidth: '320px' }}
            >
              <option value="" disabled hidden>-- Select a task to focus on --</option>
              {activeTasksToday.filter(t => {
                const isDone = isTaskDoneForDate(t.task, new Date());
                if (isDone) return false;
                const goal = goals.find(g => g.id === t.goalId);
                const lockStatus = getTaskLockStatus(t.task, goal, new Date());
                return !lockStatus.isLocked;
              }).map((t, idx) => (
                <option key={idx} value={t.task.id}>{t.task.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Focus Block (Centered vertically with auto margins) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 1, gap: '20px', margin: 'auto 0' }}>
        
        {/* Reduced Ticking Dial */}
        <div style={{ position: 'relative', width: 'clamp(240px, 70vw, 360px)', height: 'clamp(240px, 70vw, 360px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="100%" height="100%" viewBox="0 0 380 380" style={{ position: 'absolute', top: 0, left: 0 }}>
             {Array.from({ length: 100 }).map((_, i) => {
               const rotation = (i / 100) * 360;
               const isFilled = (i / 100) < progressRatio;
               const color = isFilled ? accentColor : 'var(--line)';
               const isMajor = i % 10 === 0;

               return (
                 <line 
                   key={i} 
                   x1="190" y1={isMajor ? "16" : "24"} 
                   x2="190" y2="38" 
                   stroke={color} 
                   strokeWidth={isMajor ? "3" : "2"} 
                   strokeLinecap="round"
                   transform={`rotate(${rotation} 190 190)`} 
                   style={{ transition: 'stroke 0.5s ease' }}
                 />
               );
             })}
          </svg>

          {/* Center Typography & Controls */}
          <div style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' }}>
              {formatTime(timeLeft)}
            </div>
            
            <button onClick={toggleTimer} style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', padding: '8px 28px', borderRadius: '99px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', outline: 'none', boxShadow: isActive ? `0 0 25px ${accentColor}40` : 'var(--shadow)' }}>
              {isActive ? 'Pause' : 'Start'}
            </button>
          </div>
        </div>

        {/* Preset Session Selector */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '6px', 
            background: 'var(--panel-strong)', 
            border: '1px solid var(--line)', 
            padding: '6px', 
            borderRadius: '16px', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(20px)',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {[
            { name: 'Pomodoro', work: 25, short: 5, long: 15, label: '25/5' },
            { name: 'Deep Work', work: 50, short: 10, long: 20, label: '50/10' },
            { name: 'Ultra', work: 90, short: 20, long: 30, label: '90/20' }
          ].map((preset) => {
            const isActivePreset = workDur === preset.work && shortDur === preset.short && longDur === preset.long;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.work, preset.short, preset.long)}
                style={{
                  background: isActivePreset ? `rgba(${accentRGB}, 0.12)` : 'transparent',
                  border: isActivePreset ? `1px solid rgba(${accentRGB}, 0.3)` : '1px solid transparent',
                  color: isActivePreset ? accentColor : 'var(--muted)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: isActivePreset ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  if (!isActivePreset) {
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.background = 'var(--bg-2)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActivePreset) {
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>{preset.name}</span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  opacity: 0.8,
                  background: isActivePreset ? `rgba(${accentRGB}, 0.15)` : 'var(--line)',
                  color: isActivePreset ? accentColor : 'var(--muted)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease'
                }}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Section (Settings/Noise controls and Dock toolbar stacked cleanly) */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 10, marginTop: 'auto', paddingBottom: '8px' }}>
        
        {/* Floating Settings/Music Configurations inside flow */}
        {showSettings && (
          <div style={{ 
            padding: '12px 20px', 
            display: 'flex', 
            gap: '20px', 
            background: 'var(--panel-strong)', 
            border: '1px solid var(--line)', 
            borderRadius: '16px', 
            boxShadow: 'var(--shadow)', 
            animation: 'floatUpFade 0.2s ease forwards',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em' }}>Work</span>
              <input type="number" value={workDur} onChange={e => { const val = Number(e.target.value) || 1; setWorkDur(val); if(mode==='work' && !isActive) setTimeLeft(val * 60); }} style={{ width: '60px', padding: '8px 4px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '1.1rem', outline: 'none' }} />
            </div>
            <div style={{ width: '1px', background: 'var(--line)', height: '20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em' }}>Rest</span>
              <input type="number" value={shortDur} onChange={e => { const val = Number(e.target.value) || 1; setShortDur(val); if(mode==='shortBreak' && !isActive) setTimeLeft(val * 60); }} style={{ width: '60px', padding: '8px 4px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '1.1rem', outline: 'none' }} />
            </div>
          </div>
        )}

        {showMusic && (
          <div style={{ 
            padding: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px', 
            background: 'var(--panel-strong)', 
            border: '1px solid var(--line)', 
            borderRadius: '16px', 
            boxShadow: 'var(--shadow)', 
            animation: 'floatUpFade 0.2s ease forwards',
            minWidth: '200px'
          }}>
             <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, padding: '4px 12px', textAlign: 'center' }}>Acoustic Noise Gen</span>
             {['White Noise', 'Pink Noise', 'Brown Noise'].map(noise => (
               <button key={noise} onClick={() => toggleNoise(noise)} className="ghost-btn" style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '8px', fontSize: '0.85rem', color: activeNoise === noise ? accentColor : 'var(--text)', fontWeight: activeNoise === noise ? 600 : 400, border: 'none', background: 'transparent', minHeight: '32px' }}>
                 {noise} {activeNoise === noise && ' (Active)'}
               </button>
             ))}
          </div>
        )}

        {/* Minimalist Floating Bottom Toolbar Dock */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 'clamp(12px, 4vw, 36px)', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          background: 'var(--panel-strong)',
          border: '1px solid var(--line)',
          padding: '10px 20px',
          borderRadius: '20px',
          maxWidth: '460px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
          backdropFilter: 'blur(20px)'
        }}>
          
          <button onClick={handleFullscreen} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s', minWidth: '50px', padding: '4px 8px' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
            <Maximize size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em' }}>Fullscreen</span>
          </button>

          <button onClick={() => { setShowSettings(!showSettings); setShowMusic(false); }} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s', minWidth: '50px', padding: '4px 8px' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
            <Settings size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em' }}>Timer Mode</span>
          </button>
          
          <button onClick={() => { setShowMusic(!showMusic); setShowSettings(false); }} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s', minWidth: '50px', padding: '4px 8px' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
            <Headphones size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em' }}>White Noise</span>
          </button>

          <button onClick={skipTimer} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s', minWidth: '50px', padding: '4px 8px' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
            <StepForward size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em' }}>Skip Phase</span>
          </button>

        </div>
      </div>

      {/* ── Focus History Section ────────────────────────────────── */}
      {!document.fullscreenElement && focusSessions.length > 0 && (
        <div style={{
          width: '90%',
          maxWidth: '480px',
          marginTop: '20px',
          marginBottom: '80px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="ghost-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              width: '100%',
              borderRadius: '12px',
              background: 'var(--panel-strong)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            <History size={15} />
            {showHistory ? 'Hide Session History' : `Show Session History (${focusSessions.length})`}
            {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showHistory && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '4px',
              background: 'var(--panel-strong)',
              borderRadius: '16px',
              border: '1px solid var(--line)',
              animation: 'floatUpFade 0.2s ease forwards'
            }}>
              {focusSessions.map((session, idx) => {
                const { goalName, taskTitle } = getSessionMeta(session.goalId, session.taskId);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'left' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {taskTitle}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={11} /> {goalName} • {session.date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent)' }}>
                        {session.duration}m
                      </span>
                      {deleteFocusSession && (
                        <button
                          onClick={() => deleteFocusSession(idx)}
                          title="Delete session"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            opacity: 0.6,
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--line)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', textAlign: 'center', animation: 'floatUpFade 0.3s ease forwards' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(139, 92, 246, 0.2)', color: 'rgb(139, 92, 246)', marginBottom: '16px' }}>
              <Target size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px', color: 'var(--text)' }}>Session Complete</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 24px', fontSize: '0.95rem' }}>
              You focused for {completedSessionData?.duration} minutes. {currentTaskObj ? `Did you finish "${currentTaskObj.task.title}"?` : 'Great job!'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentTaskObj && (
                <button 
                  onClick={() => handleLogSession(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'rgb(16, 185, 129)', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Yes, Mark Task Done
                </button>
              )}
              <button 
                onClick={() => handleLogSession(false)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--bg-2)', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {currentTaskObj ? 'No, Just Log Time' : 'Log Time'}
              </button>
              <button 
                onClick={() => setShowCompletionModal(false)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Discard Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default FocusPage;
