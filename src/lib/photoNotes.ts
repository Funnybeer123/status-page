export type StickyNote = {
  id: string;
  text: string;
  x?: number | null;
  y?: number | null;
};

export function photoNoteStyle(note: Pick<StickyNote, "x" | "y">) {
  return {
    left: `${note.x ?? 12}%`,
    top: `${note.y ?? 12}%`,
  };
}

export function photoNoteHeading(count: number) {
  if (count === 1) return "1 sticky note";
  return `${count} sticky notes`;
}
