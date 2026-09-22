export type QuizSource = {
  id: string;
  title: string;
  kind: string;
  body: string;
  href: string;
};

export type QuizItem = {
  id: string;
  question: string;
  answer: string;
  sourceTitle: string;
  href: string;
  kind: string;
};

function excerpt(body: string, length = 220) {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

function has(body: string, pattern: RegExp) {
  return pattern.test(body);
}

export function compileGrandchildQuiz(sources: QuizSource[]): QuizItem[] {
  const items: QuizItem[] = [];
  for (const source of sources) {
    const body = source.body || "";
    if (!body.trim()) continue;
    if (has(body, /\b(met|meet|dance|millinery|hatband)\b/i)) {
      items.push({
        id: `${source.id}-meet`,
        question: "How did grandma meet grandpa?",
        answer: excerpt(body),
        sourceTitle: source.title,
        href: source.href,
        kind: source.kind,
      });
    }
    if (has(body, /\b(cider|cottonwood|rolls|hatband|cedar)\b/i)) {
      const word = body.match(/\b(cider|cottonwood|rolls|hatband|cedar)\b/i)?.[1] || "that";
      items.push({
        id: `${source.id}-detail`,
        question: `What does the family still say about the ${word.toLowerCase()}?`,
        answer: excerpt(body),
        sourceTitle: source.title,
        href: source.href,
        kind: source.kind,
      });
    }
    if (!items.some((item) => item.id.startsWith(`${source.id}-`))) {
      items.push({
        id: `${source.id}-what`,
        question: `What does “${source.title}” remember?`,
        answer: excerpt(body),
        sourceTitle: source.title,
        href: source.href,
        kind: source.kind,
      });
    }
  }
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.question}:${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}
