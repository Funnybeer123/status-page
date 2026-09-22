import { RelType } from "@prisma/client";

export type RelRow = {
  fromPersonId: string;
  toPersonId: string;
  type: RelType | string;
  endedAt?: Date | string | null;
  endedKind?: string | null;
};

export function isParentRel(type: RelType | string) {
  return type === RelType.parent || type === RelType.adoptive || type === RelType.step || type === "parent" || type === "adoptive" || type === "step";
}

export function isPartnerRel(type: RelType | string) {
  return type === RelType.partner || type === "partner";
}

export function parentKindLabel(type: RelType | string) {
  if (type === RelType.adoptive || type === "adoptive") return "adoptive";
  if (type === RelType.step || type === "step") return "step";
  return "parent";
}

export function parentEdgeLabel(type: RelType | string) {
  if (type === RelType.adoptive || type === "adoptive") return "adoptive parent of";
  if (type === RelType.step || type === "step") return "step-parent of";
  return "parent of";
}

export function childEdgeLabel(type: RelType | string) {
  if (type === RelType.adoptive || type === "adoptive") return "adopted child of";
  if (type === RelType.step || type === "step") return "stepchild of";
  return "child of";
}

export function parentsOf(personId: string, relationships: RelRow[]) {
  return relationships.filter((rel) => isParentRel(rel.type) && rel.toPersonId === personId);
}

export function siblingKind(aId: string, bId: string, relationships: RelRow[]): "full" | "half" | "step" | null {
  if (aId === bId) return null;
  const parentsA = new Set(parentsOf(aId, relationships).map((rel) => rel.fromPersonId));
  const parentsB = new Set(parentsOf(bId, relationships).map((rel) => rel.fromPersonId));
  const shared = [...parentsA].filter((id) => parentsB.has(id));
  if (shared.length >= 2) return "full";
  if (shared.length === 1) return "half";
  const partners = new Set<string>();
  for (const rel of relationships) {
    if (!isPartnerRel(rel.type)) continue;
    partners.add(`${rel.fromPersonId}:${rel.toPersonId}`);
    partners.add(`${rel.toPersonId}:${rel.fromPersonId}`);
  }
  for (const parentA of parentsA) {
    for (const parentB of parentsB) {
      if (partners.has(`${parentA}:${parentB}`)) return "step";
    }
  }
  return null;
}

export function halfSiblingsOf(personId: string, people: { id: string; displayName: string }[], relationships: RelRow[]) {
  return people.filter((person) => person.id !== personId && siblingKind(personId, person.id, relationships) === "half");
}

export function childMarks(personId: string, relationships: RelRow[]) {
  const incoming = parentsOf(personId, relationships);
  const marks: string[] = [];
  if (incoming.some((rel) => rel.type === RelType.adoptive || rel.type === "adoptive")) marks.push("adopted");
  if (incoming.some((rel) => rel.type === RelType.step || rel.type === "step")) marks.push("step");
  return marks;
}
