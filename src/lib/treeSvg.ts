import { buildGenerations, TreePerson } from "@/lib/tree";
import { Relationship } from "@prisma/client";
import { lifespan } from "@/lib/dates";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTreeSvg(
  people: TreePerson[],
  relationships: Relationship[],
  familyName = "Family tree",
) {
  const { rows } = buildGenerations(people, relationships);
  const generations = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  const cardW = 168;
  const cardH = 88;
  const gapX = 24;
  const gapY = 48;
  const pad = 36;
  const genWidths = generations.map(([, groups]) => {
    const count = groups.reduce((sum, group) => sum + group.length, 0) || 1;
    return count * cardW + Math.max(0, count - 1) * gapX;
  });
  const width = Math.max(640, ...(genWidths.length ? genWidths : [640])) + pad * 2;
  const height = Math.max(240, generations.length * (cardH + gapY) + pad);
  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(familyName)}">`,
    `<rect width="${width}" height="${height}" fill="#faf6ee"/>`,
    `<text x="${pad}" y="28" fill="#8f3d2c" font-family="Georgia, serif" font-size="18">${escapeXml(familyName)}</text>`,
  ];
  generations.forEach(([gen, groups], rowIndex) => {
    const cards = groups.flat();
    const rowWidth = cards.length * cardW + Math.max(0, cards.length - 1) * gapX;
    let x = pad + Math.max(0, (width - pad * 2 - rowWidth) / 2);
    const y = 48 + rowIndex * (cardH + gapY);
    parts.push(
      `<text x="${pad}" y="${y - 10}" fill="#6b5344" font-family="sans-serif" font-size="11">Generation ${gen + 1}</text>`,
    );
    for (const person of cards) {
      const years = lifespan(person.birthDate, person.deathDate);
      parts.push(
        `<g data-person="${escapeXml(person.id)}">`,
        `<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="8" fill="#fffaf0" stroke="#c4b39a"/>`,
        `<text x="${x + 12}" y="${y + 32}" fill="#2b2118" font-family="Georgia, serif" font-size="14">${escapeXml(person.displayName)}</text>`,
        years
          ? `<text x="${x + 12}" y="${y + 56}" fill="#6b5344" font-family="sans-serif" font-size="11">${escapeXml(years)}</text>`
          : "",
        `</g>`,
      );
      x += cardW + gapX;
    }
  });
  if (!people.length) {
    parts.push(`<text x="${pad}" y="80" fill="#6b5344" font-family="Georgia, serif" font-size="16">No people on the tree yet.</text>`);
  }
  parts.push(`</svg>`);
  return parts.filter(Boolean).join("\n");
}

export function treeSvgFilename(familyName: string) {
  const slug = familyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "family";
  return `${slug}-tree.svg`;
}
