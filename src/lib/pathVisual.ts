import type { RelatedResult, RelatedStep } from "@/lib/related";

export type PathNode = { id: string; name: string };

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function pathNodes(result: RelatedResult): PathNode[] {
  if (!result.found) return [];
  if (!result.steps.length) {
    return result.fromId ? [{ id: result.fromId, name: result.sentence.replace(/ is the same person\.$/, "") }] : [];
  }
  const nodes: PathNode[] = [{ id: result.steps[0]!.fromId, name: result.steps[0]!.fromName }];
  for (const step of result.steps) {
    nodes.push({ id: step.toId, name: step.toName });
  }
  return nodes;
}

export function pathChainLabel(result: RelatedResult) {
  const nodes = pathNodes(result);
  if (!nodes.length) return result.sentence;
  return nodes.map((node) => node.name).join(" → ");
}

export function renderPathSvg(nodes: PathNode[], steps: RelatedStep[] = []) {
  const width = Math.max(360, nodes.length * 170);
  const height = 150;
  const cy = 52;
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Relationship path">`,
  ];
  nodes.forEach((node, index) => {
    const x = 80 + index * 170;
    if (index > 0) {
      const prev = 80 + (index - 1) * 170;
      const label = steps[index - 1]?.label ?? "";
      parts.push(`<line x1="${prev + 26}" y1="${cy}" x2="${x - 26}" y2="${cy}" stroke="#8b5a2b" stroke-width="2"/>`);
      if (label) {
        parts.push(
          `<text x="${(prev + x) / 2}" y="${cy - 14}" text-anchor="middle" font-size="11" fill="#8b5a2b">${escapeXml(label)}</text>`,
        );
      }
    }
    parts.push(`<circle cx="${x}" cy="${cy}" r="24" fill="#7a2e2e"/>`);
    parts.push(
      `<text x="${x}" y="${cy + 48}" text-anchor="middle" font-size="14" fill="#2b2118">${escapeXml(node.name)}</text>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
}
