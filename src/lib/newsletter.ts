import { formatDate } from "@/lib/dates";

export type NewsletterItem = {
  id: string;
  title: string;
  summary?: string | null;
  href: string;
  when?: Date | string | null;
  kind: string;
};

export function monthKey(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(`${value}-01T00:00:00Z`) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function inMonth(value: Date | string | null | undefined, month: string) {
  if (!value || !month) return false;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return false;
  return monthKey(date) === month;
}

export function compileNewsletter(items: NewsletterItem[], month: string) {
  const rows = items.filter((item) => inMonth(item.when, month));
  return {
    month,
    heading: headingFor(month),
    items: rows,
    counts: {
      people: rows.filter((item) => item.kind === "person").length,
      letters: rows.filter((item) => item.kind === "letter" || item.kind === "document").length,
      photos: rows.filter((item) => item.kind === "photo" || item.kind === "asset").length,
      other: rows.filter((item) => !["person", "letter", "document", "photo", "asset"].includes(item.kind)).length,
    },
  };
}

function headingFor(month: string) {
  const [year, mm] = month.split("-");
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[Number(mm) - 1] || month} ${year} family newsletter`;
}

export function newsletterLine(item: NewsletterItem) {
  return `${item.title}${item.when ? ` · ${formatDate(item.when)}` : ""}`;
}
