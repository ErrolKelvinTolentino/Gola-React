import { getDateKey } from '../utils/dateUtils';

export const NAV_ITEMS = ['Today', 'Goals', 'Focus', 'Calendar', 'Review'];
export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const INITIAL_GOALS = [];

export const DEFAULT_TASK_FORM = {
  title: '',
  recurrenceType: 'one-time',
  oneTimeDate: getDateKey(new Date()),
  weeklyDay: 1,
  specificDays: [1, 3, 5],
  deadline: '',
  timeEstimate: '30m',
  energy: 'Medium',
  phaseId: ''
};

export const DEFAULT_SETTINGS = {
  compactCalendar: false
};
