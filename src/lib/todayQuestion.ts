export function todayQuestionHeading(title?: string | null) {
  const question = title?.trim();
  return question ? `Today’s question · ${question}` : "Today’s question";
}

export function todayAnswerSavedLine(title: string) {
  return `Saved as a story · ${title.trim() || "Today’s question"}`;
}

export function unansweredQuestionsHeading(count: number) {
  if (!count) return "Every family question has an answer";
  if (count === 1) return "1 question still needs an answer";
  return `${count} questions still need an answer`;
}

export function pickTodayQuestion<T extends { id: string; answers?: unknown[] | null }>(
  prompts: T[],
  on: Date = new Date(),
) {
  if (!prompts.length) return null;
  const unanswered = prompts.filter((prompt) => !(prompt.answers && prompt.answers.length));
  const pool = unanswered.length ? unanswered : prompts;
  const day = Math.floor(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()) / 86_400_000);
  return pool[Math.abs(day) % pool.length] ?? null;
}
