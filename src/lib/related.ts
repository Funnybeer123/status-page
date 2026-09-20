import { RelType, type Relationship } from "@prisma/client";

export type RelatedPerson = { id: string; displayName: string };

export type RelatedStep = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  label: string;
};

export type RelatedResult = {
  fromId: string;
  toId: string;
  relation: string;
  sentence: string;
  steps: RelatedStep[];
  found: boolean;
};

type Edge = { to: string; label: string };

const RELATION_LABELS: Record<string, string> = {
  "parent of": "parent",
  "child of": "child",
  "partner of": "partner",
  "parent of|parent of": "grandparent",
  "child of|child of": "grandchild",
  "child of|parent of": "sibling",
  "parent of|child of": "co-parent",
  "parent of|parent of|parent of": "great-grandparent",
  "child of|child of|child of": "great-grandchild",
  "child of|parent of|parent of": "aunt or uncle",
  "parent of|parent of|child of": "nibling's other parent",
  "child of|child of|parent of": "niece or nephew",
  "child of|child of|parent of|parent of": "first cousin",
  "parent of|parent of|child of|child of": "first cousin",
  "child of|partner of": "stepchild",
  "partner of|parent of": "step-parent",
  "parent of|partner of": "parent-in-law",
  "partner of|child of": "child-in-law",
  "child of|parent of|partner of": "sibling-in-law",
  "partner of|child of|parent of": "sibling-in-law",
};

export function buildRelationGraph(relationships: Pick<Relationship, "fromPersonId" | "toPersonId" | "type">[]) {
  const edges = new Map<string, Edge[]>();
  const add = (from: string, to: string, label: string) => {
    const list = edges.get(from) ?? [];
    if (!list.some((edge) => edge.to === to && edge.label === label)) {
      list.push({ to, label });
      edges.set(from, list);
    }
  };
  for (const rel of relationships) {
    if (rel.type === RelType.parent) {
      add(rel.fromPersonId, rel.toPersonId, "parent of");
      add(rel.toPersonId, rel.fromPersonId, "child of");
    } else {
      add(rel.fromPersonId, rel.toPersonId, "partner of");
      add(rel.toPersonId, rel.fromPersonId, "partner of");
    }
  }
  return edges;
}

export function relationFromLabels(labels: string[]) {
  if (!labels.length) return "the same person";
  return RELATION_LABELS[labels.join("|")] ?? `related through ${labels.join(", then ")}`;
}

export function howRelated(
  people: RelatedPerson[],
  relationships: Pick<Relationship, "fromPersonId" | "toPersonId" | "type">[],
  fromId: string,
  toId: string,
): RelatedResult {
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const fromName = names.get(fromId) ?? "Someone";
  const toName = names.get(toId) ?? "someone";

  if (fromId === toId) {
    return {
      fromId,
      toId,
      relation: "the same person",
      sentence: `${fromName} is the same person.`,
      steps: [],
      found: true,
    };
  }

  const edges = buildRelationGraph(relationships);
  const visited = new Set<string>([fromId]);
  const queue: { id: string; labels: string[]; path: string[] }[] = [{ id: fromId, labels: [], path: [fromId] }];

  let match: { labels: string[]; path: string[] } | null = null;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.path.length > 8) continue;
    for (const edge of edges.get(current.id) ?? []) {
      if (visited.has(edge.to)) continue;
      const labels = [...current.labels, edge.label];
      const path = [...current.path, edge.to];
      if (edge.to === toId) {
        match = { labels, path };
        queue.length = 0;
        break;
      }
      visited.add(edge.to);
      queue.push({ id: edge.to, labels, path });
    }
  }

  if (!match) {
    return {
      fromId,
      toId,
      relation: "unrelated in this tree",
      sentence: `No recorded path connects ${fromName} and ${toName} yet.`,
      steps: [],
      found: false,
    };
  }

  const steps: RelatedStep[] = [];
  for (let i = 0; i < match.labels.length; i += 1) {
    const start = match.path[i];
    const end = match.path[i + 1];
    steps.push({
      fromId: start,
      fromName: names.get(start) ?? start,
      toId: end,
      toName: names.get(end) ?? end,
      label: match.labels[i],
    });
  }

  const relation = relationFromLabels(match.labels);
  const article = /^(aunt|uncle|niece|nephew|first)/.test(relation) ? "" : "the ";
  return {
    fromId,
    toId,
    relation,
    sentence: `${fromName} is ${article}${relation} of ${toName}.`,
    steps,
    found: true,
  };
}
