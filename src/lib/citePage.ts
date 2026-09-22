import { formatDate } from "@/lib/dates";

export function citeThisHeading() {
  return "Cite this page";
}

export function citeThisPage(input: { title: string; url: string; accessedOn?: Date | string | null }) {
  const accessed = formatDate(input.accessedOn ?? new Date(), "Date unknown");
  const title = input.title.trim() || "A family page";
  const url = input.url.trim();
  return {
    heading: citeThisHeading(),
    line: `${title}. Family Lineage. ${url}. Accessed ${accessed}.`,
    url,
    accessed,
  };
}
