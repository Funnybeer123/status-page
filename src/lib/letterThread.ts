export type ThreadLetter = {
  id: string;
  title: string;
  transcript: string;
  writtenAt?: Date | string | null;
  replyToId?: string | null;
  people?: string[];
};

export type ThreadTurn = ThreadLetter & {
  side: "left" | "right";
  rootId: string;
};

export function threadRootId(letters: ThreadLetter[], startId: string) {
  const byId = new Map(letters.map((letter) => [letter.id, letter]));
  let current = byId.get(startId);
  const seen = new Set<string>();
  while (current?.replyToId && byId.has(current.replyToId) && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.replyToId);
  }
  return current?.id ?? startId;
}

export function compileLetterThread(letters: ThreadLetter[], startId: string): ThreadTurn[] {
  const rootId = threadRootId(letters, startId);
  const byParent = new Map<string | null, ThreadLetter[]>();
  for (const letter of letters) {
    const key = letter.replyToId || null;
    byParent.set(key, [...(byParent.get(key) ?? []), letter]);
  }
  const ordered: ThreadLetter[] = [];
  const queue = [rootId];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const letter = letters.find((item) => item.id === id);
    if (!letter) continue;
    ordered.push(letter);
    const children = (byParent.get(id) ?? []).sort((a, b) => String(a.writtenAt || "").localeCompare(String(b.writtenAt || "")));
    queue.push(...children.map((child) => child.id));
  }
  return ordered.map((letter, index) => ({
    ...letter,
    rootId,
    side: index % 2 === 0 ? "left" : "right",
  }));
}
