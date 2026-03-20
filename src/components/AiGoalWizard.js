import React, { useState, useEffect } from 'react';
import { Target, Loader2, Cpu, LayoutList, Calendar as CalendarIcon, FileText } from 'lucide-react';

function AiGoalWizard({ goalName, setGoalName, goalVision, setGoalVision, onCancel, onSaveWithTasks }) {
  const [step, setStep] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  
  // Multi-question state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  
  // Fake roadmap data generator
  const [generatedTasks, setGeneratedTasks] = useState([]);

  useEffect(() => {
    if (step === 3) {
      // AI Clarification (Loading & Generating questions)
      setResponses({});
      setCurrentQuestionIndex(0);
      const t = setTimeout(() => {
        setQuestions([
          {
            text: `To properly construct the roadmap for "${goalName || 'this target'}", how aggressive is your timeline based on your deadline?`,
            options: ['Very aggressive (heavy daily workload)', 'Moderate & steady (balanced weekly tasks)', 'Long-term marathon (light, consistent steps)']
          },
          {
            text: `What is the most likely bottleneck or challenge you'll face pursuing this goal?`,
            options: ['Time & Scheduling constraints', 'Knowledge or Skill gaps', 'Motivation & Energy', 'External dependencies/resources']
          },
          {
            text: `How do you prefer to pace your execution workflows?`,
            options: ['Front-load the hardest tasks early', 'Evenly spread tiny daily habits', 'Work into weekly deep-focus bursts']
          }
        ]);
        setStep(4);
      }, 1500);
      return () => clearTimeout(t);
    }
    if (step === 5) {
      // Goal Analysis 
      const t = setTimeout(() => {
        // Generate simulated roadmap Step 6 based on responses
        const pacing = responses[2] || '';
        let mockRoadmap = [];
        
        if (pacing.includes('habits')) {
          mockRoadmap = [
            { id: Date.now()+1, title: 'Environment Setup & Foundation', recurrenceType: 'one-time', deadline: deadline, timeEstimate: '30m', energy: 'Low', completed: false, completedDates: [] },
            { id: Date.now()+2, title: 'Daily 15-Min Execution Core', recurrenceType: 'daily', deadline: '', timeEstimate: '15m', energy: 'High', completed: false, completedDates: [] },
            { id: Date.now()+3, title: 'Weekly Micro-Review', recurrenceType: 'weekly', deadline: '', timeEstimate: '15m', energy: 'Low', completed: false, completedDates: [] }
          ];
        } else if (pacing.includes('bursts')) {
          mockRoadmap = [
            { id: Date.now()+1, title: 'Initial Research Block', recurrenceType: 'one-time', deadline: deadline, timeEstimate: '1h', energy: 'High', completed: false, completedDates: [] },
            { id: Date.now()+2, title: 'Deep Work Session (2 hours)', recurrenceType: 'weekly', deadline: '', timeEstimate: '2h+', energy: 'High', completed: false, completedDates: [] },
            { id: Date.now()+3, title: 'End-of-Week Retro', recurrenceType: 'weekly', deadline: '', timeEstimate: '30m', energy: 'Low', completed: false, completedDates: [] }
          ];
        } else {
          mockRoadmap = [
            { id: Date.now()+1, title: 'Heavy Subtask 1', recurrenceType: 'one-time', deadline: deadline, timeEstimate: '1h', energy: 'High', completed: false, completedDates: [] },
            { id: Date.now()+2, title: 'Heavy Subtask 2', recurrenceType: 'one-time', deadline: deadline, timeEstimate: '1h', energy: 'Medium', completed: false, completedDates: [] },
            { id: Date.now()+3, title: 'Maintenance Operations', recurrenceType: 'weekly', deadline: '', timeEstimate: '30m', energy: 'Low', completed: false, completedDates: [] }
          ];
        }

        setGeneratedTasks(mockRoadmap);
        setStep(6);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [step, goalName, deadline, responses]);

  const handleNext = () => setStep(step + 1);

  return (
    <div className="ai-wizard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
         <div>
           <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>
             {step <= 2 ? 'Goal Parameterization' : step === 3 || step === 4 ? 'AI Clarification' : step === 5 ? 'Goal Analysis' : 'Generated Roadmap'}
           </h3>
           <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Powered by AI planning models.</p>
         </div>
         <span style={{ fontSize: '0.85rem', background: 'var(--bg-2)', color: 'var(--accent)', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>Step {Math.min(step, 6)} / 6</span>
      </div>
      
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Start by entering the core definition of what you want to achieve.</p>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
            Goal Name
            <input type="text" placeholder="E.g., Launch SaaS MVP" value={goalName} onChange={e => setGoalName(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
            Goal Description
            <textarea rows="3" placeholder="What does success look like? Describe your vision..." value={goalVision} onChange={e => setGoalVision(e.target.value)} />
          </label>
          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary-btn">Next Step</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Add optional timeline constraints or specific notes before the AI builds your plan.</p>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
            Target Deadline (Optional)
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500 }}>
            Additional Notes & Constraints
            <textarea rows="3" placeholder="Any specific requirements or limitations?" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="ghost-btn" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="primary-btn">Initialize AI Analysis <Cpu size={16} style={{marginLeft: '8px'}} /></button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 className="spinner" size={40} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Brainstorming clarifying questions...</p>
        </div>
      )}

      {step === 4 && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'linear-gradient(145deg, var(--panel), var(--bg-2))', borderRadius: '12px', border: '1px solid var(--accent)' }}>
            <p style={{ margin: 0, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', lineHeight: '1.4' }}>
              <Cpu size={24} color="var(--accent)" style={{ flexShrink: 0 }} /> 
              {questions[currentQuestionIndex].text}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Select the response that best matches your capability.</p>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Q{currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions[currentQuestionIndex].options.map(opt => {
              const isActive = responses[currentQuestionIndex] === opt;
              return (
                <button 
                  key={opt}
                  type="button" 
                  className={`ghost-btn ${isActive ? 'active' : ''}`}
                  style={{ 
                    textAlign: 'left', 
                    borderColor: isActive ? 'var(--accent)' : '',
                    background: isActive ? 'rgba(124, 58, 237, 0.05)' : ''
                  }}
                  onClick={() => setResponses({...responses, [currentQuestionIndex]: opt})}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="ghost-btn" onClick={() => {
              if (currentQuestionIndex > 0) {
                 setCurrentQuestionIndex(currentQuestionIndex - 1);
              } else {
                 setStep(2); // Go back to parameterization
              }
            }}>Back</button>
            <button type="button" className="primary-btn" disabled={!responses[currentQuestionIndex]} onClick={() => {
              if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
              } else {
                handleNext(); // goes to step 5 (Goal Analysis)
              }
            }}>
               {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Submit Responses'}
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 className="spinner" size={40} color="var(--accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Compiling inputs & constructing your roadmap...</p>
        </div>
      )}

      {step === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>The AI has accurately constructed the following tactical roadmap based on your parameters.</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: '8px' }}>
            {generatedTasks.map((t, idx) => (
              <li key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Target size={16} color="var(--accent)" />
                <div style={{ display: 'grid' }}>
                  <span style={{ fontWeight: 500 }}>{t.title}</span>
                  {t.deadline && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Due: {t.deadline}</span>}
                </div>
                <span className="meta-chip" style={{ marginLeft: 'auto' }}>
                  {t.recurrenceType}
                </span>
              </li>
            ))}
          </ul>

          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="ghost-btn" onClick={onCancel}>Discard</button>
            <button type="button" className="primary-btn" onClick={() => {
              // Create full structured data for addGoal 
              if (notes) setGoalVision(goalVision + '\\n\\nNotes: ' + notes);
              onSaveWithTasks(generatedTasks);
            }}>Adopt Roadmap <LayoutList size={16} style={{marginLeft: '8px'}} /></button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `\n        @keyframes spin { 100% { transform: rotate(360deg); } }\n      `}} />
    </div>
  );
}

export default AiGoalWizard;
