import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Zap, Coffee, Target, Star, Loader2, Play } from 'lucide-react';
import { generateMorningBriefing, isGroqAvailable } from '../services/groqService';

const MOOD_ICONS = {
  motivated: Zap,
  focused: Target,
  gentle: Coffee,
  celebratory: Star
};

const MOOD_COLORS = {
  motivated: '#f59e0b',
  focused: '#8b5cf6',
  gentle: '#3b82f6',
  celebratory: '#10b981'
};

function MorningBriefing({ todayTasks, goals, completionRate, streak, aiEnabled, onStartTask }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const taskSignature = useMemo(
    () => JSON.stringify((todayTasks || []).map((item) => ({
      id: item?.task?.id,
      title: item?.task?.title,
      completed: item?.task?.completed,
      completedDatesLen: Array.isArray(item?.task?.completedDates) ? item.task.completedDates.length : 0,
      energy: item?.task?.energy,
      timeEstimate: item?.task?.timeEstimate
    }))),
    [todayTasks]
  );

  const goalSignature = useMemo(
    () => JSON.stringify((goals || []).map((goal) => ({
      id: goal?.id,
      name: goal?.name,
      tasksCount: Array.isArray(goal?.tasks) ? goal.tasks.length : 0
    }))),
    [goals]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchBriefing = async () => {
      // Try AI first if enabled
      if (aiEnabled && isGroqAvailable() && (todayTasks.length > 0 || goals.length > 0)) {
        setLoading(true);
        try {
          const aiResult = await generateMorningBriefing(todayTasks, goals, completionRate, streak);
          if (!cancelled) {
            setBriefing(aiResult);
            setIsAiGenerated(true);
            setLoading(false);
          }
          return;
        } catch (error) {
          console.warn('AI briefing failed, using fallback:', error);
        }
      }

      // Fallback: rule-based briefing
      if (!cancelled) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        
        let mood = 'focused';
        let briefingText = '';
        let suggestedFirst = null;

        if (todayTasks.length === 0) {
          mood = 'gentle';
          briefingText = "No tasks scheduled for today. This is a great opportunity to plan ahead, review your goals, or simply recharge. You've earned it.";
        } else if (streak >= 7) {
          mood = 'celebratory';
          briefingText = `You're on a ${streak}-day streak — incredible consistency! You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} today. Keep the momentum alive by starting with something manageable.`;
        } else if (todayTasks.length >= 5) {
          mood = 'motivated';
          briefingText = `Big day ahead with ${todayTasks.length} tasks across your goals. Start with a quick win to build momentum, then tackle the heavy hitters when your energy peaks.`;
        } else {
          mood = 'focused';
          briefingText = `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} lined up today. A focused session can make these happen.${streak > 0 ? ` Current streak: ${streak} day${streak > 1 ? 's' : ''}.` : ''}`;
        }

        // Suggest first task: prefer Low energy for morning, or shortest time
        const pending = todayTasks.filter(t => !t.task?.completed);
        if (pending.length > 0) {
          const lowEnergy = pending.find(t => t.task.energy === 'Low');
          const quick = pending.find(t => t.task.timeEstimate === '15m');
          suggestedFirst = (lowEnergy || quick || pending[0])?.task?.title || null;
        }

        setBriefing({
          greeting,
          briefing: briefingText,
          suggestedFirstTask: suggestedFirst,
          mood
        });
        setIsAiGenerated(false);
        setLoading(false);
      }
    };

    fetchBriefing();
    return () => { cancelled = true; };
  // Signature-based dependencies prevent redundant AI calls on parent rerenders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskSignature, goalSignature, completionRate, streak, aiEnabled]);

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        background: 'var(--panel-strong)',
        border: '1px solid var(--line)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
        animation: 'floatUpFade 0.4s ease forwards',
        opacity: 0
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Sparkles size={20} color="#fff" style={{ animation: 'pulse 1.5s ease infinite' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <span style={{ fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 600 }}>Preparing your briefing…</span>
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!briefing) return null;

  const MoodIcon = MOOD_ICONS[briefing.mood] || Zap;
  const moodColor = MOOD_COLORS[briefing.mood] || '#8b5cf6';

  const handleStartTaskClick = () => {
    if (!onStartTask || !briefing?.suggestedFirstTask) return;
    const taskTitle = briefing.suggestedFirstTask;
    const matched = (todayTasks || []).find(item => item?.task?.title === taskTitle);
    if (matched) {
      onStartTask(matched.task.id, matched.goalId);
    } else {
      const partialMatched = (todayTasks || []).find(item => 
        item?.task?.title && (
          item.task.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
          taskTitle.toLowerCase().includes(item.task.title.toLowerCase())
        )
      );
      if (partialMatched) {
        onStartTask(partialMatched.task.id, partialMatched.goalId);
      }
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: 'var(--panel-strong)',
      border: '1px solid var(--line)',
      borderRadius: '20px',
      display: 'grid',
      gap: '16px',
      marginBottom: '20px',
      animation: 'floatUpFade 0.5s ease forwards',
      opacity: 0,
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${moodColor}, ${moodColor}aa)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 8px 20px ${moodColor}30`
        }}>
          <MoodIcon size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              {briefing.greeting}
            </h3>
            {isAiGenerated && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: '6px',
                background: `${moodColor}15`,
                color: moodColor,
                border: `1px solid ${moodColor}25`
              }}>
                AI-generated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Briefing text */}
      <p style={{
        margin: 0,
        fontSize: '0.95rem',
        color: 'var(--text)',
        lineHeight: 1.6,
        opacity: 0.9
      }}>
        {briefing.briefing}
      </p>

      {/* Suggested first task */}
      {briefing.suggestedFirstTask && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: `${moodColor}08`,
          border: `1px solid ${moodColor}20`,
          borderRadius: '12px'
        }}>
          <Play size={14} color={moodColor} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 500 }}>
            Start with:
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 700 }}>
            {briefing.suggestedFirstTask}
          </span>
          {onStartTask && (
            <button
              onClick={handleStartTaskClick}
              className="ghost-btn"
              style={{
                marginLeft: 'auto',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '8px',
                background: `${moodColor}12`,
                color: moodColor,
                border: `1px solid ${moodColor}25`
              }}
            >
              Focus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MorningBriefing;
