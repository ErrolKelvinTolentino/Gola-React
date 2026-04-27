import React, { useState, useRef, useEffect } from 'react';
import { Target, X, Maximize, RotateCcw, Settings, StepForward, Headphones } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useNoise } from '../context/NoiseContext';

function FocusPage({ activeTasksToday, toggleTaskDoneForToday, logFocusSession, focusMinutesToday }) {
  const { 
    timeLeft, isActive, toggleTimer, mode, setCustomMode, skipTimer,
    activeTask, setActiveTask, 
    workDur, setWorkDur, shortDur, setShortDur, longDur, setLongDur,
    sessionCompleted, clearSessionCompleted
  } = useTimer();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const containerRef = useRef(null);

  // Audio state (global — persists across pages)
  const { activeNoise, toggleNoise } = useNoise();

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
        borderRadius: document.fullscreenElement ? '0' : '20px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden', 
        fontFamily: '"Outfit", "Inter", sans-serif',
        boxShadow: document.fullscreenElement ? 'none' : 'var(--shadow)',
        transition: 'border-radius 0.3s ease, background 0.5s ease',
        border: '1px solid var(--glass-border)',
        background: 'var(--panel)'
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

      {/* Top Active Task Pill */}
      <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Today's Focus: <span style={{ color: 'var(--text)' }}>{focusMinutesToday}m</span>
        </span>
      </div>

      <div style={{ position: 'absolute', top: '32px', display: 'flex', justifyContent: 'center', width: '100%', zIndex: 10, pointerEvents: 'none' }}>
        {currentTaskObj ? (
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--panel-strong)', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', backdropFilter: 'blur(20px)' }}>
             <button onClick={() => { toggleTaskDoneForToday(currentTaskObj.goalId, currentTaskObj.task.id); setActiveTask(null); }} style={{ background: 'transparent', border: `2px solid ${accentColor}`, borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', outline: 'none' }} title="Mark Done" />
             <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>{currentTaskObj.task.title}</span>
             <button onClick={() => setActiveTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, marginLeft: '8px', outline: 'none' }}>
               <X size={16} />
             </button>
          </div>
        ) : (
          <select 
            value="" 
            onChange={(e) => setActiveTask(e.target.value)}
            style={{ pointerEvents: 'auto', padding: '10px 20px', fontSize: '0.95rem', cursor: 'pointer', background: 'var(--panel-strong)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '12px', outline: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', backdropFilter: 'blur(20px)', maxWidth: '400px' }}
          >
            <option value="" disabled hidden>-- Select a task to focus on --</option>
            {activeTasksToday.filter(t => !t.completed).map((t, idx) => (
              <option key={idx} value={t.task.id}>{t.task.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Reduced Ticking Dial */}
      <div style={{ position: 'relative', width: '380px', height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg width="380" height="380" viewBox="0 0 380 380" style={{ position: 'absolute', top: 0, left: 0 }}>
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
        <div style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: 'clamp(3.5rem, 15vw, 5rem)', fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' }}>
            {formatTime(timeLeft)}
          </div>
          
          <button onClick={toggleTimer} style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)', padding: '8px 32px', borderRadius: '99px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', outline: 'none', boxShadow: isActive ? `0 0 25px ${accentColor}40` : 'var(--shadow)' }}>
            {isActive ? 'Pause' : 'Start'}
          </button>
        </div>
      </div>

      {/* Floating Settings/Music Configurations */}
      {showSettings && (
        <div style={{ position: 'absolute', bottom: '100px', padding: '12px 20px', display: 'flex', gap: '20px', background: 'var(--panel-strong)', border: '1px solid var(--line)', borderRadius: '16px', boxShadow: 'var(--shadow)', zIndex: 10, animation: 'floatUpFade 0.2s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em' }}>Work</span>
            <input type="number" value={workDur} onChange={e => { setWorkDur(Number(e.target.value) || 1); if(mode==='work') setCustomMode('work'); }} style={{ width: '72px', padding: '10px 4px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '1.3rem', outline: 'none' }} />
          </div>
          <div style={{ width: '1px', background: 'var(--line)', height: '24px', alignSelf: 'center' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em' }}>Rest</span>
            <input type="number" value={shortDur} onChange={e => { setShortDur(Number(e.target.value) || 1); if(mode==='shortBreak') setCustomMode('shortBreak'); }} style={{ width: '72px', padding: '10px 4px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '1.3rem', outline: 'none' }} />
          </div>
        </div>
      )}

      {showMusic && (
        <div style={{ position: 'absolute', bottom: '100px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--panel-strong)', border: '1px solid var(--line)', borderRadius: '16px', boxShadow: 'var(--shadow)', zIndex: 10, animation: 'floatUpFade 0.2s ease forwards' }}>
           <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, padding: '4px 12px' }}>Acoustic Noise Gen</span>
           {['White Noise', 'Pink Noise', 'Brown Noise'].map(noise => (
             <button key={noise} onClick={() => toggleNoise(noise)} className="ghost-btn" style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '8px', fontSize: '0.9rem', color: activeNoise === noise ? accentColor : 'var(--text)', fontWeight: activeNoise === noise ? 600 : 400 }}>
               {noise} {activeNoise === noise && ' (Active)'}
             </button>
           ))}
        </div>
      )}

      {/* Minimalist Bottom Toolbar matching the screenshot exactly */}
      <div style={{ position: 'absolute', bottom: '32px', left: '16px', right: '16px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px, 5vw, 48px)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        
        <button onClick={handleFullscreen} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
          <Maximize size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>Fullscreen</span>
        </button>

        <button onClick={() => { setShowSettings(!showSettings); setShowMusic(false); }} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
          <Settings size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>Timer Mode</span>
        </button>
        
        <button onClick={() => { setShowMusic(!showMusic); setShowSettings(false); }} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
          <Headphones size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>White Noise</span>
        </button>

        <button onClick={skipTimer} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text)'} onMouseOut={e => e.currentTarget.style.color='var(--muted)'}>
          <StepForward size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>Skip Phase</span>
        </button>

      </div>

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
