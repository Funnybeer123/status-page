export type CircleAnswer = {
  id: string;
  teller: string;
  body: string;
  href: string;
};

export type CirclePrompt = {
  id: string;
  title: string;
  body?: string | null;
  answers: CircleAnswer[];
};

export function isStoryCircle(answers: unknown[]) {
  return answers.length >= 2;
}

export function storyCircleHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This prompt";
  if (!count) return `Story circle · ${name}`;
  if (count === 1) return `Story circle · ${name} · 1 voice`;
  return `Story circle · ${name} · ${count} voices`;
}

export function storyCirclesHeading(count: number) {
  if (!count) return "No story circles yet";
  if (count === 1) return "1 story circle";
  return `${count} story circles`;
}

export function missingCircleHeading(count: number) {
  if (!count) return "Every prompt has a circle of voices";
  if (count === 1) return "1 prompt still needs a second voice";
  return `${count} prompts still need a second voice`;
}

export function oneVoiceHeading(count: number) {
  if (!count) return "No prompt is waiting on a second voice";
  if (count === 1) return "1 prompt has only one voice";
  return `${count} prompts have only one voice`;
}

export function compileStoryCircles(prompts: CirclePrompt[]) {
  return prompts
    .filter((prompt) => isStoryCircle(prompt.answers))
    .map((prompt) => ({
      ...prompt,
      heading: storyCircleHeading(prompt.title, prompt.answers.length),
    }))
    .sort((a, b) => b.answers.length - a.answers.length || a.title.localeCompare(b.title));
}

export function compileOneVoicePrompts(prompts: CirclePrompt[]) {
  return prompts
    .filter((prompt) => prompt.answers.length === 1)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function compileMissingCircles(prompts: CirclePrompt[]) {
  return prompts
    .filter((prompt) => prompt.answers.length < 2)
    .sort((a, b) => a.answers.length - b.answers.length || a.title.localeCompare(b.title));
}
