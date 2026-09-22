export type ElderQuestion = { key: string; question: string };

export const ELDER_QUESTIONS: ElderQuestion[] = [
  { key: "name", question: "What is your full name, and who named you?" },
  { key: "house", question: "Where were you born, and what do you remember of that house?" },
  { key: "meet", question: "How did you meet the person you married?" },
  { key: "work", question: "What work did you do, and who taught you?" },
  { key: "sunday", question: "What happened at Sunday dinner in your house?" },
  { key: "hard", question: "Where were you when the hard years came?" },
  { key: "children", question: "What should the grandchildren never forget?" },
  { key: "keep", question: "What song, prayer, or recipe should stay in the family?" },
];

export function interviewQuestion(key: string) {
  return ELDER_QUESTIONS.find((item) => item.key === key) ?? null;
}
