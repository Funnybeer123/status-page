export function phoneTreeHeading(count: number) {
  if (!count) return "The family phone tree is empty";
  if (count === 1) return "1 person to call when news spreads";
  return `${count} people to call when news spreads`;
}

export function emptyPhoneTreeHeading() {
  return "No one is on the phone tree yet";
}

export function missingPhoneHeading(count: number) {
  if (!count) return "Every living relative has a number on the phone tree";
  if (count === 1) return "1 living person still needs a phone number";
  return `${count} living people still need a phone number`;
}

export function phoneTreeLine(name?: string | null, phone?: string | null, order?: number | null) {
  const who = name?.trim() || "A relative";
  const number = phone?.trim() || "No number yet";
  const slot = order && order > 0 ? `Call ${order}` : "Call next";
  return `${slot} · ${who} · ${number}`;
}

export function sortPhoneTree<T extends { callOrder?: number | null; personName?: string | null; displayName?: string | null }>(
  contacts: T[],
) {
  return [...contacts].sort((a, b) => {
    const order = (a.callOrder ?? 9999) - (b.callOrder ?? 9999);
    if (order) return order;
    const left = a.personName || a.displayName || "";
    const right = b.personName || b.displayName || "";
    return left.localeCompare(right);
  });
}
