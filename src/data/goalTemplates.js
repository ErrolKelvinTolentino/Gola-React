export const GOAL_TEMPLATES = [
  {
    name: 'Learn a Language',
    vision: 'Become conversational in 3 months.',
    tasks: [
      { title: 'Complete 1 language lesson', recurrenceType: 'daily', timeEstimate: '15m', energy: 'Medium' },
      { title: 'Watch 1 video in the target language', recurrenceType: 'weekly', timeEstimate: '30m', energy: 'Low', weeklyDay: 3 }
    ]
  },
  {
    name: 'Get Fit',
    vision: 'Exercise 4x per week and improve stamina.',
    tasks: [
      { title: '30 min workout', recurrenceType: 'daily', timeEstimate: '30m', energy: 'High' },
      { title: 'Meal prep for the week', recurrenceType: 'weekly', timeEstimate: '1h', energy: 'Medium', weeklyDay: 0 }
    ]
  },
  {
    name: 'Build a Portfolio',
    vision: 'Launch a polished portfolio site in 4 weeks.',
    tasks: [
      { title: 'Outline site sections and content', recurrenceType: 'one-time', timeEstimate: '30m', energy: 'Medium' },
      { title: 'Publish the portfolio site', recurrenceType: 'one-time', timeEstimate: '1h', energy: 'High' }
    ]
  },
  {
    name: 'Write a Book',
    vision: 'Draft the first 10 chapters in 90 days.',
    tasks: [
      { title: 'Write 500 words', recurrenceType: 'daily', timeEstimate: '30m', energy: 'Medium' },
      { title: 'Outline next chapter', recurrenceType: 'weekly', timeEstimate: '30m', energy: 'Low', weeklyDay: 5 }
    ]
  },
  {
    name: 'Financial Reset',
    vision: 'Build a 3-month budget and cut unnecessary spending.',
    tasks: [
      { title: 'Track spending for the day', recurrenceType: 'daily', timeEstimate: '15m', energy: 'Low' },
      { title: 'Review budget categories', recurrenceType: 'weekly', timeEstimate: '30m', energy: 'Low', weeklyDay: 6 }
    ]
  }
];
