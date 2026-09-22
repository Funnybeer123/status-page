import type { LifeChapterView } from "@/lib/chapters";

export type ReadingParagraph = { id: string; heading: string; body: string };

export function lifeReadingHeading(name: string) {
  return `The life of ${name}`;
}

export function compileLifeReading(name: string, chapters: LifeChapterView[]) {
  const paragraphs: ReadingParagraph[] = [];
  for (const chapter of chapters) {
    const lines = [
      chapter.notes?.trim() || "",
      ...chapter.items.map((item) => (item.body?.trim() || item.title).trim()),
    ].filter(Boolean);
    if (!lines.length) continue;
    paragraphs.push({
      id: chapter.id,
      heading: chapter.title,
      body: lines.join("\n\n"),
    });
  }
  const text = paragraphs.map((paragraph) => `${paragraph.heading}\n\n${paragraph.body}`).join("\n\n");
  return {
    title: lifeReadingHeading(name),
    paragraphs,
    text,
  };
}
