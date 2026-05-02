import React, { useState, useEffect } from 'react';
import { 
  Flame, Clock, Target as TargetIcon, TrendingUp, 
  Sparkles, ArrowRight, Zap, CheckCircle2, Calendar,
  ChevronRight, Play, Trophy
} from 'lucide-react';
import MorningBriefing from '../components/MorningBriefing';

function HomePage({ 
  goalsCount, allTaskCount, activeTasksCount, completionRate, completedToday, 
  selectedGoal, today, streak, focusMinutesToday, activeTasksToday, goals, aiEnabled,
  onNavigate,
  onStartFocus
}) {
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
      setTimeOfDay('morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
      setTimeOfDay('afternoon');
    } else {
      setGreeting('Good evening');
      setTimeOfDay('evening');
    }
  }, []);

  // Calculate today's priority tasks (first 3 active tasks)
  const priorityTasks = (activeTasksToday || []).slice(0, 3);
  const hasCompletedAll = activeTasksCount > 0 && completedToday === activeTasksCount;
  const hasNoTasks = activeTasksCount === 0;

  // Find the most urgent goal (closest deadline or highest progress)
  const urgentGoal = goals
    ?.filter(g => g.status !== 'completed')
    ?.sort((a, b) => {
      const aProgress = a.tasks.length > 0 
        ? a.tasks.filter(t => t.completed || (t.completedDates?.length > 0)).length / a.tasks.length 
        : 0;
      const bProgress = b.tasks.length > 0 
        ? b.tasks.filter(t => t.completed || (t.completedDates?.length > 0)).length / b.tasks.length 
        : 0;
      return aProgress - bProgress; // Lower progress = more urgent
    })[0];

  // Today's date formatted nicely
  const dateFormatted = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <section className="page page-enter" style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION — Context + Immediate Action
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ 
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', 
              letterSpacing: '-0.03em', 
              marginBottom: '4px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--text) 0%, var(--muted) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {greeting}{timeOfDay === 'morning' ? ' ☀️' : timeOfDay === 'afternoon' ? ' 👋' : ' 🌙'}
            </h1>
            <p className="lead" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted)' }}>
              {dateFormatted}
            </p>
          </div>

          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {hasNoTasks ? (
              <button 
                className="primary-btn" 
                onClick={() => onNavigate?.('Goals')}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '0.92rem', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
                }}
              >
                <TargetIcon size={18} />
                Create Your First Goal
              </button>
            ) : hasCompletedAll ? (
              <button 
                className="primary-btn" 
                onClick={() => onNavigate?.('Review')}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '0.92rem', 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Trophy size={18} />
                All Done! Review Week
              </button>
            ) : (
              <button 
                className="primary-btn" 
                onClick={() => onNavigate?.('Today')}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '0.92rem', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
                }}
              >
                <Play size={18} />
                Start Today's Tasks
              </button>
            )}
            <button 
              className="ghost-btn" 
              onClick={() => onNavigate?.('Focus')}
              style={{ padding: '12px 20px', fontSize: '0.88rem', fontWeight: 600 }}
            >
              <Zap size={16} style={{ marginRight: '6px' }} />
              Focus Mode
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MORNING BRIEFING — AI Coach
      ═══════════════════════════════════════════════════════════ */}
      <MorningBriefing
        todayTasks={activeTasksToday || []}
        goals={goals || []}
        completionRate={completionRate}
        streak={streak || 0}
        aiEnabled={aiEnabled}
      />

      {/* ═══════════════════════════════════════════════════════════
          COMPLETION CELEBRATION BANNER
      ═══════════════════════════════════════════════════════════ */}
      {hasCompletedAll && (
        <div style={{
          padding: '20px 24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          animation: 'elegantFadeIn 0.4s ease forwards'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
          }}>
            <Trophy size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginBottom: '2px' }}>
              All tasks completed! 🎉
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              You crushed it today. Take a moment to reflect or plan ahead.
            </p>
          </div>
          <button 
            className="ghost-btn"
            onClick={() => onNavigate?.('Review')}
            style={{ 
              padding: '10px 18px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              color: '#10b981',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              flexShrink: 0
            }}
          >
            Weekly Review <ChevronRight size={14} style={{ marginLeft: '4px' }} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TOP METRICS — At a Glance
      ═══════════════════════════════════════════════════════════ */}
      <div className="cards-grid" style={{ marginBottom: '20px' }}>
        
        {/* Today's Execution */}
        <article className="card premium-surface" style={{ 
          padding: '22px', 
          background: hasCompletedAll 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : completionRate >= 50
              ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)'
              : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
          color: 'white', 
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative ring */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Today's Progress
                </p>
                <h2 style={{ color: 'white', fontSize: '2.4rem', margin: 0, fontWeight: 700, lineHeight: 1 }}>
                  {completionRate}%
                </h2>
              </div>
              {hasCompletedAll && <CheckCircle2 size={28} color="rgba(255,255,255,0.9)" />}
            </div>
            
            {/* Mini progress bar */}
            <div style={{ 
              marginTop: '14px', 
              height: '4px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '99px', 
              overflow: 'hidden' 
            }}>
              <div style={{ 
                width: `${completionRate}%`, 
                height: '100%', 
                background: 'rgba(255,255,255,0.8)', 
                borderRadius: '99px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: '10px 0 0', fontSize: '0.85rem', fontWeight: '500' }}>
              {completedToday} of {activeTasksCount || 0} tasks done
            </p>
          </div>
        </article>

        {/* Streak Card */}
        <article className="card premium-surface" style={{ padding: '22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: streak >= 7 
              ? 'radial-gradient(circle, rgba(245, 158, 11, 0.15), transparent 70%)'
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="eyebrow" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Streak
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ 
                fontSize: '2.4rem', 
                margin: 0, 
                fontWeight: 700,
                color: streak >= 7 ? '#f59e0b' : 'var(--text)'
              }}>
                {streak || 0}
              </h2>
              <span style={{ color: 'var(--muted)', fontWeight: '500', fontSize: '1rem' }}>days</span>
            </div>
            
            {/* Streak visualization */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} style={{
                  width: '8px',
                  height: '24px',
                  borderRadius: '4px',
                  background: i < (streak % 7) 
                    ? 'linear-gradient(180deg, #f59e0b, #ef4444)'
                    : 'var(--line)',
                  transition: 'background 0.3s ease'
                }} />
              ))}
            </div>
            
            {streak >= 7 && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '0.78rem', 
                fontWeight: 700, 
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Flame size={14} /> On fire! Keep it going.
              </div>
            )}
          </div>
        </article>

        {/* Urgent Goal */}
        <article 
          className="card premium-surface" 
          onClick={() => urgentGoal && onNavigate?.('Goals')}
          style={{ 
            padding: '22px', 
            cursor: urgentGoal ? 'pointer' : 'default',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => { if (urgentGoal) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { if (urgentGoal) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="eyebrow" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Priority Goal
            </p>
            {urgentGoal ? (
              <>
                <h2 style={{ 
                  fontSize: '1.15rem', 
                  margin: 0, 
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--text)'
                }}>
                  {urgentGoal.name}
                </h2>
                <div style={{ 
                  marginTop: '10px', 
                  height: '4px', 
                  background: 'var(--line)', 
                  borderRadius: '99px', 
                  overflow: 'hidden' 
                }}>
                  <div style={{ 
                    width: `${urgentGoal.tasks.length > 0 
                      ? Math.round((urgentGoal.tasks.filter(t => t.completed || t.completedDates?.length > 0).length / urgentGoal.tasks.length) * 100) 
                      : 0}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', 
                    borderRadius: '99px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '8px'
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>
                    {urgentGoal.tasks.filter(t => t.completed || t.completedDates?.length > 0).length}/{urgentGoal.tasks.length} tasks
                  </span>
                  <ChevronRight size={16} color="var(--muted)" />
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--muted)' }}>
                <p style={{ margin: '4px 0', fontSize: '0.92rem' }}>No active goals yet</p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Create one to get started</p>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TODAY'S PRIORITY TASKS — Quick View
      ═══════════════════════════════════════════════════════════ */}
      {priorityTasks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '12px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)'
              }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                Today's Priority Tasks
              </h3>
              <span style={{ 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                color: 'var(--muted)',
                background: 'var(--bg-2)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {priorityTasks.length} of {activeTasksCount}
              </span>
            </div>
            <button 
              className="ghost-btn" 
              onClick={() => onNavigate?.('Today')}
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.8rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {priorityTasks.map((item, idx) => (
              <div 
                key={`${item.goalId}-${item.task.id}`}
                className="card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.task.energy === 'High' ? '#ec4899' : 
                               item.task.energy === 'Medium' ? '#8b5cf6' : '#3b82f6',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.task.title}
                    </div>
                    {item.task.description && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: 'var(--muted)',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {item.task.description}
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '4px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <TargetIcon size={10} /> {item.goalName}
                      </span>
                      {item.task.timeEstimate && (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          color: 'var(--accent)',
                          background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}>
                          {item.task.timeEstimate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  className="primary-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartFocus?.(item.task.id, item.goalId);
                  }}
                  style={{ 
                    padding: '8px 14px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    borderRadius: '8px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Zap size={12} />
                  Focus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          EMPTY STATE — When no tasks exist
      ═══════════════════════════════════════════════════════════ */}
      {hasNoTasks && goalsCount > 0 && (
        <div className="card premium-surface" style={{
          padding: '32px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          border: '2px dashed var(--line)'
        }}>
          <Calendar size={40} color="var(--muted)" />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              No tasks scheduled for today
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', maxWidth: '400px' }}>
              You have {goalsCount} active goal{goalsCount > 1 ? 's' : ''} but nothing due today. 
              Open a goal to add tasks or enjoy the breather.
            </p>
          </div>
          <button 
            className="primary-btn" 
            onClick={() => onNavigate?.('Goals')}
            style={{ marginTop: '8px' }}
          >
            View My Goals
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          EMPTY STATE — No goals at all
      ═══════════════════════════════════════════════════════════ */}
      {goalsCount === 0 && (
        <div className="card premium-surface" style={{
          padding: '40px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center',
          border: '2px dashed var(--line)',
          background: 'linear-gradient(180deg, color-mix(in oklab, var(--accent) 5%, var(--panel)), var(--panel-strong))'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(124, 58, 237, 0.3)'
          }}>
            <TargetIcon size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Welcome to Gola! 👋
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '420px', lineHeight: 1.6 }}>
              I'm your AI-powered goal coach. Tell me what you want to achieve — like "Learn Spanish" or "Launch my SaaS" — and I'll build you a personalized roadmap with daily tasks, milestones, and weekly reviews.
            </p>
          </div>
          <button 
            className="primary-btn" 
            onClick={() => onNavigate?.('Goals')}
            style={{ 
              marginTop: '8px', 
              padding: '14px 28px', 
              fontSize: '0.95rem', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 28px rgba(124, 58, 237, 0.35)'
            }}
          >
            <Sparkles size={18} />
            Create Your First Goal
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS ROW
      ═══════════════════════════════════════════════════════════ */}
      {goalsCount > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'rgba(245, 158, 11, 0.12)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              <Flame size={18} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                {streak || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Day Streak
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'rgba(139, 92, 246, 0.12)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              <Clock size={18} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                {focusMinutesToday || 0}m
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Focus Today
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'rgba(16, 185, 129, 0.12)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                {goalsCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Goals
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default HomePage;