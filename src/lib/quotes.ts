export type QuoteRow = {
  id: string;
  title: string;
  line: string;
  href: string;
};

function pickLine(body: string) {
  const sentences = body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 24);
  const favored = sentences.find((sentence) =>
    /\b(cider|cottonwood|hatband|millinery|rolls|grange|cedar|dance)\b/i.test(sentence),
  );
  return favored || sentences[0] || body.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function compileQuotes(
  sources: { id: string; title: string; body: string; href: string }[],
): QuoteRow[] {
  return sources
    .filter((source) => source.body.trim())
    .map((source) => ({
      id: source.id,
      title: source.title,
      line: pickLine(source.body),
      href: source.href,
    }))
    .filter((row) => row.line.length > 12)
    .slice(0, 12);
}
