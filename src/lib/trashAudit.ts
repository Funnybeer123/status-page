import { formatDate } from "@/lib/dates";

export function trashAuditHeading(count: number) {
  if (!count) return "No one has put anything in the trash";
  if (count === 1) return "1 thing put in the trash";
  return `${count} things put in the trash`;
}

export function emptyAuditHeading() {
  return "The trash audit is empty";
}

export function trashAuditLine(
  actor?: string | null,
  title?: string | null,
  when?: Date | string | null,
  action?: string | null,
) {
  const who = actor?.trim() || "A relative";
  const what = title?.trim() || "something";
  const verb = action === "restore" ? "restored" : "put in the trash";
  return `${who} ${verb} ${what} · ${formatDate(when, "Date unknown")}`;
}

export function compileTrashAudit<
  T extends {
    id: string;
    title: string;
    action: string;
    createdAt?: Date | string | null;
    actor?: { name?: string | null } | null;
  },
>(rows: T[]) {
  return [...rows]
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).toISOString() : "9999-";
      const right = b.createdAt ? new Date(b.createdAt).toISOString() : "9999-";
      return right.localeCompare(left);
    })
    .map((row) => ({
      ...row,
      line: trashAuditLine(row.actor?.name, row.title, row.createdAt, row.action),
    }));
}
