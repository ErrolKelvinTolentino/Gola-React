/* ─────────────────────────────────────────────────────────────
   Groq AI Service Layer
   Handles all communication with the Groq OpenAI-compatible API.
   Every function has try/catch + returns structured JSON.
   Callers should always wrap in try/catch and fall back gracefully.
───────────────────────────────────────────────────────────── */

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('GROQ API Key present:', Boolean(GROQ_API_KEY));
}
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];
const GROQ_ENDPOINT_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES_PER_MODEL = 2;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const safeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const next = value.trim();
  return next || fallback;
};

const normalizeMood = (value) => {
  const allowed = ['motivated', 'focused', 'gentle', 'celebratory'];
  return allowed.includes(value) ? value : 'focused';
};

const normalizeStatus = (value) => {
  const allowed = ['on_track', 'at_risk', 'behind'];
  return allowed.includes(value) ? value : 'at_risk';
};

function extractJsonPayload(rawText) {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }
    throw new Error('Groq returned invalid JSON.');
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Auto-distributes weekly tasks across different days when the AI
 * clusters too many weekly tasks on the same weekday.
 */
function autoSpreadWeeklyTasks(phases) {
  const safePhases = Array.isArray(phases) ? phases : [];
  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun
  let dayIndex = 0;

  const weeklyTasks = [];
  safePhases.forEach((phase) => {
    const phaseTasks = Array.isArray(phase?.tasks) ? phase.tasks : [];
    phaseTasks.forEach((task) => {
      if (task?.recurrenceType === 'weekly') {
        weeklyTasks.push(task);
      }
    });
  });

  if (weeklyTasks.length <= 5) {
    const spreadDays = weeklyTasks.length === 1 ? [1]
      : weeklyTasks.length === 2 ? [1, 4]
        : weeklyTasks.length === 3 ? [1, 3, 5]
          : weeklyTasks.length === 4 ? [1, 2, 4, 5]
            : [1, 2, 4, 5, 6];

    weeklyTasks.forEach((task, index) => {
      task.weeklyDay = spreadDays[index];
    });
  } else {
    weeklyTasks.forEach((task) => {
      task.weeklyDay = days[dayIndex % days.length];
      dayIndex += 1;
    });
  }

  return safePhases;
}

function parseGroqError(errorText) {
  try {
    const parsed = JSON.parse(errorText);
    const apiError = parsed?.error || {};
    return {
      message: safeString(apiError.message, errorText),
      status: safeString(apiError.status, ''),
      raw: parsed
    };
  } catch (_error) {
    return {
      message: errorText,
      status: '',
      raw: null
    };
  }
}

function isHardQuotaExhausted(statusCode, parsedMessage, parsedStatus) {
  if (statusCode !== 429) return false;

  const composite = `${parsedStatus} ${parsedMessage}`.toLowerCase();
  return (
    composite.includes('resource_exhausted') ||
    composite.includes('quota exceeded') ||
    composite.includes('limit: 0')
  );
}

function toFriendlyGroqError(statusCode, modelName, parsedMessage, parsedStatus) {
  const msg = (parsedMessage || '').toLowerCase();

  if (isHardQuotaExhausted(statusCode, parsedMessage, parsedStatus)) {
    return new Error(
      `Groq quota exceeded for ${modelName}. This API key/project currently has no available request quota. Ensure your Groq account has available quota, then retry.`
    );
  }

  if (statusCode === 503 || parsedStatus === 'UNAVAILABLE') {
    return new Error(`Groq is temporarily overloaded (${modelName}). Please retry in a few seconds.`);
  }

  if (statusCode === 429 && msg.includes('retry')) {
    return new Error(`Groq is rate-limited (${modelName}). Please retry shortly.`);
  }

  return new Error(`Groq API error ${statusCode} (${modelName}): ${parsedMessage}`);
}

/**
 * Base wrapper for Groq API calls.
 * Sends a structured prompt with system instruction and returns parsed JSON.
 */
export async function callGroq(prompt, systemInstruction) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Groq API key not configured');
  }

  let lastError = null;

  for (const modelName of GROQ_MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const requestBody = {
          model: modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4096
        };

        const response = await fetch(GROQ_ENDPOINT_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          const parsed = parseGroqError(errorText);
          const quotaExhausted = isHardQuotaExhausted(response.status, parsed.message, parsed.status);
          const canRetry = RETRYABLE_STATUS_CODES.includes(response.status);

          if (!quotaExhausted && canRetry && attempt < MAX_RETRIES_PER_MODEL) {
            const backoffMs = 500 * Math.pow(2, attempt);
            await wait(backoffMs);
            continue;
          }

          lastError = toFriendlyGroqError(response.status, modelName, parsed.message, parsed.status);

          if (quotaExhausted) {
            throw lastError;
          }

          break;
        }

        const data = await response.json();
        const rawText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output_text;

        if (!rawText) {
          throw new Error(`Empty response from Groq API (${modelName}).`);
        }

        return extractJsonPayload(rawText);
      } catch (error) {
        if (error.name === 'AbortError') {
          if (attempt < MAX_RETRIES_PER_MODEL) {
            const backoffMs = 500 * Math.pow(2, attempt);
            await wait(backoffMs);
            continue;
          }
          lastError = new Error(`Groq request timed out (${modelName}).`);
        } else {
          lastError = error;
          if (attempt < MAX_RETRIES_PER_MODEL) {
            const backoffMs = 500 * Math.pow(2, attempt);
            await wait(backoffMs);
            continue;
          }
        }
        break;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError || new Error('Groq request failed across all configured models.');
}

/**
 * Generate a single adaptive clarifying question for goal planning.
 * Questions should be contextual to the goal domain, not generic.
 */
export async function generateClarifyingQuestions(
  goalName,
  goalVision,
  deadline,
  notes,
  previousAnswers = {},
  askedQuestions = []
) {
  const systemInstruction = `You are Gola, an AI goal planning assistant. Your job is to ask DOMAIN-SPECIFIC clarifying questions about a user's goal.

RULES:
- Ask exactly 1 question that is specific to the goal's domain
- Each question must have exactly 3 options
- Questions should build on previous answers and avoid repeating past questions
- Do NOT ask generic productivity questions like "How much time do you have?" or "What's your biggest bottleneck?"
- For "Learn guitar" ask about guitar type, music style, practice setup
- For "Launch a SaaS" ask about tech stack, target market, monetization strategy
- For "Get fit" ask about fitness level, preferred exercise types, equipment access

Return JSON with this exact schema:
{
  "questions": [
    { "text": "question text", "options": ["option1", "option2", "option3"] }
  ]
}`;

  const prompt = `Goal: "${goalName}"
Vision: "${goalVision || 'Not specified'}"
Deadline: "${deadline || 'Flexible'}"
Additional notes: "${notes || 'None'}"

Previous answers:
${JSON.stringify(previousAnswers)}

Questions already asked:
${askedQuestions.length ? askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None'}

Generate the next most helpful clarifying question.`;

  const response = await callGroq(prompt, systemInstruction);
  const questions = Array.isArray(response?.questions) ? response.questions.slice(0, 1) : [];

  if (questions.length === 0) {
    throw new Error('Groq returned no clarifying questions.');
  }

  return {
    questions: questions.map((question, index) => ({
      text: safeString(question?.text, `Clarifying question ${index + 1}`),
      options: Array.isArray(question?.options) && question.options.length > 0
        ? question.options.slice(0, 3).map((option, optionIndex) => safeString(option, `Option ${optionIndex + 1}`))
        : ['Option 1', 'Option 2', 'Option 3']
    }))
  };
}

/**
 * Generate a full roadmap with 4-6 phases and domain-specific tasks.
 * Tasks should be concrete and actionable, not generic.
 */
export async function generateRoadmap(goalName, goalVision, deadline, notes, responses) {
  const responsesText = Object.entries(responses)
    .map(([idx, answer]) => `Q${parseInt(idx) + 1}: ${answer}`)
    .join('\n');

  const systemInstruction = `You are Gola, an AI goal planning assistant. Generate a detailed, actionable roadmap for the user's goal.

CRITICAL RULES — YOU MUST FOLLOW ALL OF THEM:

1. CREATE EXACTLY 5-6 PHASES. Each phase represents a stage of progression. Phases should build on each other.

2. MIX RECURRENCE TYPES within and across phases:
   - "one-time" = milestones, setup tasks, assessments, research sprints
   - "daily" = core practice habits (MAXIMUM 2 TOTAL)
   - "weekly" = review sessions, planning, check-ins, practice sessions

3. MAXIMUM 2 DAILY TASKS TOTAL across the entire roadmap.

4. FOR WEEKLY TASKS, SPREAD THEM ACROSS DIFFERENT DAYS:
   - Set "weeklyDay" to distribute tasks across the week
   - 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
   - NEVER put more than 2 weekly tasks on the same day
   - Spread them out: some on Monday, some on Wednesday, some on Friday
   - If you have 5 weekly tasks, put 1-2 on Monday, 1 on Wednesday, 1 on Thursday, 1 on Friday
   - This prevents overwhelming the user

5. TASKS MUST BE DOMAIN-SPECIFIC AND CONCRETE:
   - GOOD: "Memorize 50 most common Spanish verbs with flashcards"
   - BAD: "Practice Spanish" or "Learn vocabulary"

6. EACH TASK MUST INCLUDE A DETAILED DESCRIPTION:
   - Use the task 'description' field to explain the next steps, provide a mini-tutorial, or suggest learning resources.
   - Avoid generic wording like "Research X" without concrete guidance.
   - Good examples: "Read this article ... then summarize key concepts" or "Watch a tutorial on ... and practice with ...".

7. THE FIRST TWO PHASES must contain one-time setup/milestone tasks.
   The middle phases should have a mix.
   The final phase should have assessment/delivery tasks.

7. ENERGY LEVELS:
   - "High" = Learning new concepts, intense practice, assessments
   - "Medium" = Regular practice, review
   - "Low" = Maintenance, light review, planning

8. TIME ESTIMATES:
   - "15m" = Quick tasks, review, light practice
   - "30m" = Standard practice sessions
   - "1h" = Deep learning, comprehensive review
   - "2h+" = Intensive sessions, major milestones

EXAMPLE OF A WELL-DISTRIBUTED WEEK:
- Weekly task 1: weeklyDay=1 (Monday)
- Weekly task 2: weeklyDay=3 (Wednesday)
- Weekly task 3: weeklyDay=5 (Friday)
- NOT all on weeklyDay=1

Return JSON with this exact schema:
{
  "summary": {
    "headline": "string",
    "description": "string",
    "keyResults": ["string", "string", "string", "string"],
    "moodColor": "#hex"
  },
  "phases": [
    {
      "label": "string",
      "theme": "string",
      "description": "string",
      "color": "#hex",
      "tasks": [
        {
          "title": "string",
          "description": "string",
          "recurrenceType": "one-time|daily|weekly",
          "timeEstimate": "15m|30m|1h|2h+",
          "energy": "Low|Medium|High",
          "deadline": "YYYY-MM-DD or empty string",
          "oneTimeDate": "YYYY-MM-DD or empty string",
          "weeklyDay": 0
        }
      ]
    }
  ]
}`;

  const prompt = `Goal: "${goalName}"
Vision: "${goalVision || 'Not specified'}"
Deadline: "${deadline || 'Flexible'}"
Additional notes: "${notes || 'None'}"

User's responses to clarifying questions:
${responsesText || 'No responses provided'}

REMEMBER: Maximum 2 daily tasks total. Mix one-time milestones, daily habits (max 2), and weekly reviews. Create 5-6 progressive phases where each phase builds on the previous one. All tasks must be domain-specific to "${goalName}".

Generate a personalized, domain-specific roadmap for this goal NOW.`;

  const response = await callGroq(prompt, systemInstruction);

  if (!Array.isArray(response?.phases) || response.phases.length === 0) {
    throw new Error('Groq roadmap is missing phases.');
  }

  // Validate: if there are more than 2 daily tasks, force retry
  const allGeneratedTasks = response.phases.flatMap(p => p.tasks || []);
  const dailyCount = allGeneratedTasks.filter(t => t.recurrenceType === 'daily').length;
  if (dailyCount > 2) {
    console.warn(`Groq returned ${dailyCount} daily tasks. Retrying with stricter prompt...`);
    throw new Error('Too many daily tasks — roadmap needs restructuring.');
  }

  const allWeeklyTasks = response.phases.flatMap((phase) =>
    (phase.tasks || []).filter((task) => task?.recurrenceType === 'weekly')
  );
  const dayCounts = {};
  allWeeklyTasks.forEach((task) => {
    const rawDay = typeof task?.weeklyDay === 'number' ? task.weeklyDay : 1;
    const day = Math.min(6, Math.max(0, rawDay));
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const overloadedDay = Object.entries(dayCounts).find(([, count]) => count > 3);
  if (overloadedDay) {
    console.warn(`Day ${overloadedDay[0]} has ${overloadedDay[1]} weekly tasks — too many. Retrying...`);
    throw new Error('Task distribution too dense — retry with better spacing.');
  }

  // Auto-fix task distribution to keep weekly load balanced.
  response.phases = autoSpreadWeeklyTasks(response.phases);

  return response;
}

/**
 * Generate a personalized morning briefing based on today's tasks and progress.
 */
export async function generateMorningBriefing(todayTasks, goals, completionRate, streak) {
  const taskSummary = todayTasks.slice(0, 10).map(t => 
    `- "${t.task.title}" (${t.goalName}, ${t.task.energy || 'Medium'} energy, ${t.task.timeEstimate || '30m'})`
  ).join('\n');

  const goalSummary = goals.slice(0, 5).map(g => 
    `- "${g.name}" (${g.tasks.length} tasks)`
  ).join('\n');

  const systemInstruction = `You are Gola, a warm and motivating AI productivity coach. Generate a personalized morning briefing.

RULES:
- Write a 3-5 sentence briefing that feels personal and encouraging
- Acknowledge today's task load realistically
- If the user has a streak going, celebrate it subtly
- Suggest which task to tackle first based on energy levels (start with easy tasks in morning or high-energy depending on context)
- Set an appropriate mood: "motivated" for busy days, "focused" for moderate days, "gentle" for light days, "celebratory" for high streaks or high completion
- Keep the greeting contextual (time of day, workload)

Return JSON with this exact schema:
{
  "greeting": "Good morning",
  "briefing": "3-5 sentence briefing text",
  "suggestedFirstTask": "task title or null",
  "mood": "motivated|focused|gentle|celebratory"
}`;

  const prompt = `Today's tasks (${todayTasks.length} total):
${taskSummary || 'No tasks scheduled today'}

Active goals:
${goalSummary || 'No active goals'}

Stats:
- Completion rate: ${completionRate}%
- Current streak: ${streak} days

Generate a morning briefing for this user.`;

  const response = await callGroq(prompt, systemInstruction);

  return {
    greeting: safeString(response?.greeting, 'Hello'),
    briefing: safeString(response?.briefing, 'Ready to make progress today.'),
    suggestedFirstTask: typeof response?.suggestedFirstTask === 'string' ? response.suggestedFirstTask : null,
    mood: normalizeMood(response?.mood)
  };
}

/**
 * Generate a weekly review with per-goal insights and adjustment suggestions.
 */
export async function generateWeeklyReview(goalsWithStats) {
  const goalDetails = goalsWithStats.map(g => 
    `- "${g.name}": ${g.tasksCompleted}/${g.totalTasks} tasks completed this week, ${g.focusMinutes || 0} focus minutes`
  ).join('\n');

  const systemInstruction = `You are Gola, an AI productivity coach conducting a weekly review. Analyze the user's weekly performance and provide actionable insights.

RULES:
- Provide an overall assessment paragraph (2-3 sentences)
- For each goal, assign a status: "on_track", "at_risk", or "behind"
  - on_track: ≥70% tasks completed
  - at_risk: 40-69% completed
  - behind: <40% completed
- Write a specific insight paragraph for each goal (what went well, what needs attention)
- Suggest one concrete adjustment per goal that is at_risk or behind
- Adjustment types: "extend_timeline", "reduce_scope", "keep_current"

Return JSON with this exact schema:
{
  "overallAssessment": "string",
  "goalInsights": [
    {
      "goalId": number,
      "goalName": "string",
      "status": "on_track|at_risk|behind",
      "insight": "string",
      "suggestion": "string"
    }
  ],
  "recommendedAdjustments": [
    {
      "goalId": number,
      "type": "extend_timeline|reduce_scope|keep_current",
      "message": "string"
    }
  ]
}`;

  const prompt = `Weekly performance:
${goalDetails || 'No goal data available'}

Generate a weekly review with insights and adjustment suggestions.`;

  const response = await callGroq(prompt, systemInstruction);
  const goalInsights = Array.isArray(response?.goalInsights) ? response.goalInsights : [];
  const recommendedAdjustments = Array.isArray(response?.recommendedAdjustments) ? response.recommendedAdjustments : [];

  return {
    overallAssessment: safeString(response?.overallAssessment, 'Progress is mixed this week. Keep momentum and adjust scope where needed.'),
    goalInsights: goalInsights.map((item) => ({
      goalId: typeof item?.goalId === 'number' ? item.goalId : null,
      goalName: safeString(item?.goalName, 'Goal'),
      status: normalizeStatus(item?.status),
      insight: safeString(item?.insight, 'No detailed insight available.'),
      suggestion: safeString(item?.suggestion, '')
    })).filter((item) => item.goalId !== null),
    recommendedAdjustments: recommendedAdjustments.map((item) => ({
      goalId: typeof item?.goalId === 'number' ? item.goalId : null,
      type: safeString(item?.type, 'keep_current'),
      message: safeString(item?.message, '')
    })).filter((item) => item.goalId !== null)
  };
}

/**
 * Maps AI-generated roadmap response to the app's task schema.
 * Adds unique IDs, validates fields, ensures compatibility with buildRoadmap output.
 */
export function mapAiRoadmapToAppSchema(aiResponse, deadline) {
  let idSeed = Date.now();
  const uid = () => ++idSeed;

  const validRecurrenceTypes = ['one-time', 'daily', 'weekly', 'specific-days'];
  const validTimeEstimates = ['15m', '30m', '1h', '2h+'];
  const validEnergies = ['Low', 'Medium', 'High'];

  const phases = (aiResponse.phases || []).map((phase, phaseIdx) => {
    const phaseId = `p${phaseIdx + 1}`;
    const tasks = (phase.tasks || []).map((task, taskIdx) => ({
      id: uid(),
      title: task.title || 'Untitled task',
      description: safeString(task.description, ''),
      recurrenceType: validRecurrenceTypes.includes(task.recurrenceType) ? task.recurrenceType : 'one-time',
      oneTimeDate: task.oneTimeDate || deadline || '',
      deadline: task.deadline || deadline || '',
      weeklyDay: typeof task.weeklyDay === 'number' ? task.weeklyDay : 1,
      specificDays: Array.isArray(task.specificDays) ? task.specificDays : [],
      timeEstimate: validTimeEstimates.includes(task.timeEstimate) ? task.timeEstimate : '30m',
      energy: validEnergies.includes(task.energy) ? task.energy : 'Medium',
      progressMinutes: 0,
      order: taskIdx,
      phaseId,
      completed: false,
      completedDates: []
    }));

    return {
      id: phaseId,
      label: phase.label || `Phase ${phaseIdx + 1}`,
      theme: phase.theme || 'Execution',
      color: phase.color || '#8b5cf6',
      description: phase.description || '',
      tasks
    };
  });

  const allTasks = phases.flatMap(p => p.tasks);

  const stats = {
    totalTasks: allTasks.length,
    oneTimeTasks: allTasks.filter(t => t.recurrenceType === 'one-time').length,
    dailyTasks: allTasks.filter(t => t.recurrenceType === 'daily').length,
    weeklyTasks: allTasks.filter(t => t.recurrenceType === 'weekly').length,
    phases: phases.length
  };

  const summary = aiResponse.summary || {
    headline: 'AI-Generated Roadmap',
    description: 'Your personalized execution plan.',
    keyResults: [],
    moodColor: '#8b5cf6'
  };

  return { summary, phases, allTasks, stats, isAiGenerated: true };
}

/**
 * Check if Groq API is available and configured.
 */
export function isGroqAvailable() {
  const key = typeof GROQ_API_KEY === 'string' ? GROQ_API_KEY.trim() : '';
  return Boolean(key && key !== 'your_groq_api_key_here');
}
