export function tableTentHeading(reunion?: string | null, motto?: string | null) {
  const gathering = reunion?.trim() || "This reunion";
  const words = motto?.trim();
  return words ? `Table tent · ${gathering} · ${words}` : `Table tent · ${gathering}`;
}

export function tableTentsHeading(count: number) {
  if (!count) return "No table tents yet";
  if (count === 1) return "1 reunion table tent";
  return `${count} reunion table tents`;
}

export function missingTentHeading(count: number) {
  if (!count) return "Every reunion has a table tent";
  if (count === 1) return "1 reunion still needs a table tent";
  return `${count} reunions still need a table tent`;
}

export function tentMottoLine(motto?: string | null) {
  return motto?.trim() || "The family has not chosen a motto yet";
}
