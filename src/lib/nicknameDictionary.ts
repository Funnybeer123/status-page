export function dictionaryHeading(count: number) {
  if (!count) return "The family dictionary has no nicknames yet";
  if (count === 1) return "1 nickname in the family dictionary";
  return `${count} nicknames in the family dictionary`;
}

export function nicknameUseLine(nickname: string, displayName: string, notes?: string | null) {
  const name = nickname.trim() || "A nickname";
  const who = displayName.trim() || "someone in the family";
  const use = notes?.trim();
  return use ? `${name} · used for ${who} · ${use}` : `${name} · used for ${who}`;
}

export function unusedNicknamesHeading(count: number) {
  if (!count) return "Every nickname says how it is used";
  if (count === 1) return "1 nickname still needs how it is used";
  return `${count} nicknames still need how they are used`;
}
