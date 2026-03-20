import { addDays, getDateKey } from '../utils/dateUtils';

export const NAV_ITEMS = ['Home', 'Tasks', 'Focus', 'Goals', 'Calendar', 'Settings'];
export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const INITIAL_GOALS = [
  {
    id: 1,
    name: 'Build Gola Web Launch',
    vision: 'Ship a polished release with daily traction.',
    tasks: [
      {
        id: 101,
        title: 'Sync morning planning',
        recurrenceType: 'daily',
        weeklyDay: '',
        specificDays: [],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      },
      {
        id: 102,
        title: 'Sprint review call',
        recurrenceType: 'weekly',
        weeklyDay: 5,
        specificDays: [],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      },
      {
        id: 103,
        title: 'Launch page QA',
        recurrenceType: 'one-time',
        weeklyDay: '',
        specificDays: [],
        oneTimeDate: getDateKey(new Date()),
        deadline: getDateKey(addDays(new Date(), 2)),
        completed: false,
        completedDates: []
      }
    ]
  },
  {
    id: 2,
    name: 'Personal Growth',
    vision: 'Sustain energy, focus, and creativity.',
    tasks: [
      {
        id: 201,
        title: 'Deep work block',
        recurrenceType: 'specific-days',
        weeklyDay: '',
        specificDays: [1, 2, 4],
        oneTimeDate: '',
        deadline: '',
        completed: false,
        completedDates: []
      }
    ]
  }
];

export const DEFAULT_TASK_FORM = {
  title: '',
  recurrenceType: 'one-time',
  oneTimeDate: getDateKey(new Date()),
  weeklyDay: 1,
  specificDays: [1, 3, 5],
  deadline: '',
  timeEstimate: '30m',
  energy: 'Medium'
};

export const DEFAULT_SETTINGS = {
  notifications: true,
  focusMode: false,
  compactCalendar: false
};
