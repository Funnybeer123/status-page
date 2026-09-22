export function shouldSkipAsk(row?: { keepOutOfAsk?: boolean | null } | null) {
  return Boolean(row?.keepOutOfAsk);
}

export function keepOutHeading(count: number) {
  if (!count) return "Ask can read every story, letter, and journal";
  if (count === 1) return "1 item is kept out of Ask";
  return `${count} items are kept out of Ask`;
}

export function keepOutLine(title: string, keptOut: boolean) {
  const name = title.trim() || "This record";
  return keptOut ? `${name} · kept out of Ask` : `${name} · Ask can find this`;
}

export function keepOutBadge(keptOut: boolean) {
  return keptOut ? "Kept out of Ask" : "Ask can find this";
}
