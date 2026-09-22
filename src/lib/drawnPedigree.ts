import { buildPedigree, flattenPedigree, type PedigreeNode, type PedigreePerson } from "@/lib/pedigree";
import { lifespan } from "@/lib/dates";

export function drawnPedigreeHeading(name: string) {
  return `Hand-drawn pedigree of ${name.trim() || "this person"}`;
}

export function missingPedigreeHeading(count: number) {
  if (!count) return "Every person has parents on a pedigree";
  if (count === 1) return "1 person still needs parents for a pedigree";
  return `${count} people still need parents for a pedigree`;
}

function inkPath(x1: number, y1: number, x2: number, y2: number) {
  const midY = (y1 + y2) / 2 + 6;
  const wobble = 8;
  return `M ${x1} ${y1} C ${x1 + wobble} ${midY}, ${x2 - wobble} ${midY}, ${x2} ${y2}`;
}

export function drawnPedigreeSvg(root: PedigreeNode | null, width = 900, height = 640) {
  const rows = flattenPedigree(root);
  if (!rows.length || !root) {
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><text x="40" y="80" fill="#5c4634" font-size="22">Add parents to draw this pedigree.</text></svg>`;
  }
  const cards: { id: string; name: string; dates: string; x: number; y: number; gen: number }[] = [];
  const links: { from: string; to: string }[] = [];
  const maxGen = Math.max(...rows.map(([gen]) => gen));
  const rowH = Math.max(120, (height - 80) / (maxGen + 1));
  rows.forEach(([gen, people]) => {
    const gap = width / (people.length + 1);
    people.forEach((person, index) => {
      cards.push({
        id: person.id,
        name: person.displayName,
        dates: lifespan(person.birthDate, person.deathDate),
        x: gap * (index + 1),
        y: 70 + gen * rowH,
        gen,
      });
    });
  });
  function walk(node: PedigreeNode) {
    for (const parent of node.parents) {
      links.push({ from: node.person.id, to: parent.person.id });
      walk(parent);
    }
  }
  walk(root);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const paths = links
    .map((link) => {
      const from = byId.get(link.from);
      const to = byId.get(link.to);
      if (!from || !to) return "";
      return `<path d="${inkPath(from.x, from.y - 28, to.x, to.y + 28)}" fill="none" stroke="#8f3d2c" stroke-width="2.2" stroke-linecap="round" />`;
    })
    .join("");
  const boxes = cards
    .map(
      (card) =>
        `<g><rect x="${card.x - 86}" y="${card.y - 28}" width="172" height="56" rx="6" fill="#fffaf0" stroke="#3d2b1f" stroke-width="1.6" /><text x="${card.x}" y="${card.y - 4}" text-anchor="middle" fill="#2b2118" font-size="14">${escapeXml(card.name)}</text><text x="${card.x}" y="${card.y + 16}" text-anchor="middle" fill="#6b5344" font-size="11">${escapeXml(card.dates)}</text></g>`,
    )
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" data-testid="drawn-pedigree">${paths}${boxes}</svg>`;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function compileDrawnPedigree(
  personId: string,
  people: PedigreePerson[],
  relationships: { type: string; fromPersonId: string; toPersonId: string }[],
) {
  const root = buildPedigree(personId, people, relationships, 4);
  return {
    root,
    heading: drawnPedigreeHeading(root?.person.displayName || "this person"),
    svg: drawnPedigreeSvg(root),
  };
}
