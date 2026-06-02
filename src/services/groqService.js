/* ─────────────────────────────────────────────────────────────
   Groq AI Service Layer
   Handles all communication with the Groq OpenAI-compatible API.
   Every function has try/catch + returns structured JSON.
   Callers should always wrap in try/catch and fall back gracefully.
───────────────────────────────────────────────────────────── */
import { isTaskDoneForDate } from '../utils/dateUtils';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('GROQ API Key present:', Boolean(GROQ_API_KEY));
}
const GROQ_MODELS = [
  'openai/gpt-oss-120b'
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
  if (!allowed.includes(value)) {
    console.warn(`[GroqService] Unexpected mood value: "${value}". Defaulting to "focused".`);
    return 'focused';
  }
  return value;
};

const normalizeStatus = (value) => {
  const allowed = ['on_track', 'at_risk', 'behind'];
  if (!allowed.includes(value)) {
    console.warn(`[GroqService] Unexpected status value: "${value}". Defaulting to "at_risk".`);
    return 'at_risk';
  }
  return value;
};

function extractJsonPayload(rawText) {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let firstError = null;

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    firstError = error;
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      const jsonCandidate = cleaned.slice(objectStart, objectEnd + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerError) {
        try {
          const sanitized = jsonCandidate
            // Remove single-line comments
            .replace(/(?:^|[^\\:])\/\/.*$/gm, '')
            // Remove trailing commas before } or ]
            .replace(/,\s*([\]}])/g, '$1')
            // Replace literal raw newlines/tabs inside JSON string values.
            .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
              return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
            });

          return JSON.parse(sanitized);
        } catch (cleanError) {
          console.error('[extractJsonPayload] Initial parse error:', firstError.message);
          console.error('[extractJsonPayload] Fallback parse error:', innerError.message);
          console.error('[extractJsonPayload] Clean parse error:', cleanError.message);
          console.error('[extractJsonPayload] Raw text (first 500 chars):', rawText.slice(0, 500));
          
          throw new Error(
            `Groq returned invalid JSON. Parse errors: "${firstError.message}" then "${innerError.message}". ` +
            `Raw preview: ${rawText.slice(0, 200)}...`
          );
        }
      }
    }
    
    console.error('[extractJsonPayload] No JSON object found. Raw text:', rawText.slice(0, 500));
    throw new Error(`Groq returned invalid JSON: ${firstError.message}. Raw preview: ${rawText.slice(0, 200)}...`);
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

const MAX_PROMPT_LENGTH = 8000;

function truncatePrompt(prompt, maxLength = MAX_PROMPT_LENGTH) {
  if (prompt.length <= maxLength) return prompt;
  const truncated = prompt.slice(0, maxLength - 100) + 
    '\n\n[... Content truncated to stay within model limits ...]';
  console.warn(`[GroqService] Prompt truncated from ${prompt.length} to ${maxLength} chars`);
  return truncated;
}

/**
 * In-flight request deduplication map.
 * If the same prompt+instruction is called concurrently, they share one request.
 */
const inflightRequests = new Map();

/**
 * Base wrapper for Groq API calls.
 * Sends a structured prompt with system instruction and returns parsed JSON.
 */
export async function callGroq(prompt, systemInstruction) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Groq API key not configured');
  }

  // Deduplication key — same prompt+instruction shares one in-flight request
  const dedupeKey = `${systemInstruction.slice(0, 80)}::${prompt.slice(0, 120)}`;
  if (inflightRequests.has(dedupeKey)) {
    return inflightRequests.get(dedupeKey);
  }

  let lastError = null;

  const requestPromise = (async () => {
    for (const modelName of GROQ_MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const safePrompt = truncatePrompt(prompt);
          const safeSystem = truncatePrompt(systemInstruction, 4000);
          
          const requestBody = {
            model: modelName,
            messages: [
              { role: 'system', content: safeSystem },
              { role: 'user', content: safePrompt }
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
          const isQuotaError = error.message && (
            error.message.includes('quota exceeded') ||
            error.message.includes('Quota Exceeded') ||
            error.message.includes('limit: 0') ||
            error.message.includes('resource_exhausted')
          );
          if (isQuotaError) {
            lastError = error;
            break; // Stop retrying on quota exhausted errors
          }
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

    const finalError = lastError || new Error('Groq request failed across all configured models.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gola-api-error', { 
        detail: { 
          message: finalError.message,
          status: finalError.status || (finalError.message.includes('quota') ? 429 : 500)
        } 
      }));
    }
    throw finalError;
  })();

  // Store and clean up deduplication entry
  inflightRequests.set(dedupeKey, requestPromise);
  requestPromise.finally(() => inflightRequests.delete(dedupeKey)).catch(() => {});

  return requestPromise;
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
  const systemInstruction = `You are Gola, an AI goal planning assistant. Ask 1 domain-specific clarifying question with exactly 3 options as a JSON object.

RULES:
1. Ask exactly 1 question specific to the goal's domain (e.g., guitar style, SaaS monetization, fitness equipment).
2. Avoid generic productivity questions. Build on previous answers.

JSON SCHEMA:
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

  const systemInstruction = `You are Gola, an AI goal planning assistant. Generate a detailed, actionable roadmap for the user's goal as a JSON object.

CRITICAL RULES:
1. CREATE EXACTLY 5-6 PHASES building on each other. First two phases must be setup/milestones. Middle phases a mix. Final phase assessment.
2. MIX RECURRENCE TYPES: "one-time" (setup/milestones), "daily" (MAX 2 TOTAL across roadmap), "weekly" (reviews, check-ins).
3. SPREAD WEEKLY TASKS across different "weeklyDay" values (0=Sun, 1=Mon... 6=Sat) to avoid putting >2 on the same day.
4. TASK COMPLETION TYPES:
   - "binary" (default checkbox).
   - "quantity" (count-based; set positive integer "targetValue").
   - "subtasks" (nested steps; define "subtasks" array of strings).
   - "scale" (qualitative 1-10 rating).
   - "multistate" (Todo->Progress->Blocked->Done).
5. TASKS must be concrete/domain-specific. LIMIT each phase to MAXIMUM 3 tasks. Keep task descriptions extremely short and concise (under 20 words max). Limit 'subtasks' checklist items to maximum 3 strings.
6. FIELDS: "energy" (Low|Medium|High), "timeEstimate" (15m|30m|1h|2h+), "targetCount" (graduation completions count), "endDate"/"deadline" (YYYY-MM-DD or ""), "isPriority" (boolean), "predecessorTitle"/"evolvedFrom"/"evolvesTo" (exact title of matching task or empty string).

JSON SCHEMA:
{
  "summary": { "headline": "string", "description": "string", "keyResults": ["string"], "moodColor": "#hex" },
  "phases": [{
    "label": "string", "theme": "string", "description": "string", "color": "#hex",
    "tasks": [{
      "title": "string", "description": "string", "recurrenceType": "one-time|daily|weekly",
      "timeEstimate": "15m|30m|1h|2h+", "energy": "Low|Medium|High",
      "deadline": "YYYY-MM-DD|", "oneTimeDate": "YYYY-MM-DD|", "weeklyDay": 0-6,
      "completionType": "binary|quantity|subtasks|scale|multistate", "targetValue": null|number,
      "subtasks": ["string"], "targetCount": null|number, "endDate": "YYYY-MM-DD|",
      "isPriority": boolean, "predecessorTitle": "string", "evolvedFrom": "string", "evolvesTo": "string"
    }]
  }]
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
  const todayDate = new Date();
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const taskSummary = todayTasks.slice(0, 10).map(t => {
    const isCompleted = isTaskDoneForDate(t.task, todayDate);
    const status = isCompleted ? 'COMPLETED' : 'PENDING';
    return `- "${t.task.title}" [Status: ${status}] (${t.goalName}, ${t.task.energy || 'Medium'} energy, ${t.task.timeEstimate || '30m'})`;
  }).join('\n');

  const goalSummary = goals.slice(0, 5).map(g => 
    `- "${g.name}" (${g.tasks.length} tasks)`
  ).join('\n');

  const systemInstruction = `You are Gola, a motivating AI productivity coach. Generate a daily briefing as a JSON object.

RULES:
1. Write greeting (contextual to time/completion) and a 3-5 sentence briefing (realistic, encouraging, celebrating streaks).
2. If tasks remain, suggest the first task to tackle based on energy levels.
3. If all tasks are completed (100% completion), set suggestedFirstTask to null, and mood to "celebratory".
4. Set mood: "motivated" (busy), "focused" (moderate), "gentle" (light), "celebratory" (high completion/streaks).

JSON SCHEMA:
{
  "greeting": "string",
  "briefing": "string",
  "suggestedFirstTask": "string|null",
  "mood": "motivated|focused|gentle|celebratory"
}`;

  const prompt = `Today is ${todayLabel}.

Today's tasks (${todayTasks.length} total):
${taskSummary || 'No tasks scheduled today'}

Active goals:
${goalSummary || 'No active goals'}

Stats:
- Completion rate: ${completionRate}%
- Current streak: ${streak} days

Generate a briefing for this user.`;

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

  const systemInstruction = `You are Gola, an AI productivity coach. Analyze the user's weekly performance and return a JSON object.

RULES:
1. Provide overallAssessment paragraph (2-3 sentences).
2. For each goal, determine status: "on_track" (≥70% completed), "at_risk" (40-69%), "behind" (<40%).
3. Write goal-specific insight (what went well/needs attention) and suggestion.
4. For goals at_risk/behind, recommend an adjustment type: "extend_timeline", "reduce_scope", or "keep_current" with a short message.

JSON SCHEMA:
{
  "overallAssessment": "string",
  "goalInsights": [{ "goalId": number, "goalName": "string", "status": "on_track|at_risk|behind", "insight": "string", "suggestion": "string" }],
  "recommendedAdjustments": [{ "goalId": number, "type": "extend_timeline|reduce_scope|keep_current", "message": "string" }]
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
  if (!aiResponse) {
    throw new Error('AI response is empty or invalid');
  }
  let idSeed = Date.now();
  const uid = () => ++idSeed;

  const validRecurrenceTypes = ['one-time', 'daily', 'weekly', 'specific-days'];
  const validTimeEstimates = ['15m', '30m', '1h', '2h+'];
  const validEnergies = ['Low', 'Medium', 'High'];
  const validCompletionTypes = ['binary', 'quantity', 'subtasks', 'scale', 'multistate'];

  const phases = (aiResponse.phases || [])
    .filter(Boolean)
    .map((phase, phaseIdx) => {
      const phaseId = `p${phaseIdx + 1}`;
      const tasks = (phase.tasks || [])
        .filter(Boolean)
        .map((task, taskIdx) => {
          const cType = validCompletionTypes.includes(task.completionType) ? task.completionType : 'binary';
          const subtaskArray = cType === 'subtasks' && Array.isArray(task.subtasks)
            ? task.subtasks.filter(Boolean).map((st, stIdx) => ({
                id: `sub-${uid()}-${stIdx}`,
                title: typeof st === 'string' ? st.trim() : (st?.title || 'Subtask').trim(),
                completed: false
              }))
            : [];

          return {
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
            completionType: cType,
            targetValue: cType === 'quantity' 
              ? (Number(task.targetValue) || 10)
              : null,
            currentValue: 0,
            subtasks: subtaskArray,
            dailyProgress: {},
            progressMinutes: 0,
            order: taskIdx,
            phaseId,
            targetCount: typeof task.targetCount === 'number' ? task.targetCount : null,
            endDate: task.endDate || null,
            isPriority: !!task.isPriority,
            predecessorTitle: task.predecessorTitle || null,
            evolvedFrom: task.evolvedFrom || null,
            evolvesTo: task.evolvesTo || null,
            completed: false,
            completedDates: []
          };
        });

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

  // Resolve IDs based on titles
  for (const task of allTasks) {
    if (task.predecessorTitle) {
      const pTask = allTasks.find(t => t.title.toLowerCase() === task.predecessorTitle.toLowerCase());
      if (pTask) task.predecessorId = pTask.id;
      delete task.predecessorTitle;
    }
    if (task.evolvedFrom) {
      const pTask = allTasks.find(t => t.title.toLowerCase() === task.evolvedFrom.toLowerCase());
      if (pTask) task.evolvedFromId = pTask.id;
      delete task.evolvedFrom;
    }
    if (task.evolvesTo) {
      const pTask = allTasks.find(t => t.title.toLowerCase() === task.evolvesTo.toLowerCase());
      if (pTask) task.evolvesToId = pTask.id;
      delete task.evolvesTo;
    }
  }

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
 * Generate an adaptive replan for a specific goal based on current progress.
 * Returns phase/task-level adjustments: reschedule, remove, add, adjust.
 */
export async function generateAdaptiveReplan(goal, progressSummary) {
  const phases = goal.roadmap?.phases || [];
  const tasks = goal.tasks || [];

  const phaseDetails = phases.map((phase, idx) => {
    const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
    const done = phaseTasks.filter(t => t.completed || (t._graduated) || (Array.isArray(t.completedDates) && t.completedDates.length > 0));
    return `Phase ${idx + 1}: "${phase.label}" — ${done.length}/${phaseTasks.length} tasks complete`;
  }).join('\n');

  const taskDetails = tasks.slice(0, 20).map(t => {
    const completions = Array.isArray(t.completedDates) ? t.completedDates.length : 0;
    const status = t.completed || t._graduated ? 'DONE' : completions > 0 ? `IN_PROGRESS (${completions} completions)` : 'NOT_STARTED';
    return `- "${t.title}" [${t.recurrenceType}] [${status}] energy=${t.energy || 'Medium'} time=${t.timeEstimate || '30m'}`;
  }).join('\n');

  const systemInstruction = `You are Gola, an AI goal replanning coach. Analyze progress and return actionable adjustments as a JSON object.

RULES:
1. Suggest 3-5 adjustments (types: reschedule, reduce_scope, add_checkpoint, graduate_habit, reorder).
2. Provide a 2-3 sentence summary assessment and specify overall health and completion adjustment.

JSON SCHEMA:
{
  "summary": "string",
  "suggestions": [{
    "type": "reschedule|reduce_scope|add_checkpoint|graduate_habit|reorder",
    "taskTitle": "string|null",
    "phaseLabel": "string|null",
    "rationale": "string",
    "action": "string"
  }],
  "overallHealth": "on_track|at_risk|behind",
  "estimatedCompletionAdjustment": "string"
}`;

  const prompt = `Goal: "${goal.name}"
Vision: "${goal.vision || 'Not specified'}"
Original deadline: "${goal.deadline || 'Flexible'}"

Phase progress:
${phaseDetails || 'No phases'}

Task details:
${taskDetails || 'No tasks'}

Overall stats:
${progressSummary || 'No additional stats'}

Analyze this goal and suggest adjustments to get back on track or optimize progress.`;

  const response = await callGroq(prompt, systemInstruction);

  const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];

  return {
    summary: safeString(response?.summary, 'Your goal progress has been analyzed.'),
    suggestions: suggestions.map(s => ({
      type: safeString(s?.type, 'reschedule'),
      taskTitle: typeof s?.taskTitle === 'string' ? s.taskTitle : null,
      phaseLabel: typeof s?.phaseLabel === 'string' ? s.phaseLabel : null,
      rationale: safeString(s?.rationale, ''),
      action: safeString(s?.action, '')
    })),
    overallHealth: ['on_track', 'at_risk', 'behind'].includes(response?.overallHealth) ? response.overallHealth : 'at_risk',
    estimatedCompletionAdjustment: safeString(response?.estimatedCompletionAdjustment, 'no change')
  };
}

/**
 * Check if Groq API is available and configured.
 */
export function isGroqAvailable() {
  const key = typeof GROQ_API_KEY === 'string' ? GROQ_API_KEY.trim() : '';
  return Boolean(key && key !== 'your_groq_api_key_here');
}
