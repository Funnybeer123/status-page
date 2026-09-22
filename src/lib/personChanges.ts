import { prisma } from "@/lib/prisma";

export function isoDay(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export type ChangeRow = { field: string; before: string | null; after: string | null };

export async function recordPersonChanges(input: {
  familyId: string;
  personId: string;
  actorId: string;
  changes: ChangeRow[];
}) {
  const rows = input.changes.filter((change) => (change.before ?? "") !== (change.after ?? ""));
  if (!rows.length) return [];
  await prisma.personChange.createMany({
    data: rows.map((change) => ({
      familyId: input.familyId,
      personId: input.personId,
      actorId: input.actorId,
      field: change.field,
      before: change.before,
      after: change.after,
    })),
  });
  return rows;
}

export async function recordRelationshipChange(input: {
  familyId: string;
  actorId: string;
  fromPersonId: string;
  toPersonId: string;
  fromName: string;
  toName: string;
  summary: string;
}) {
  await recordPersonChanges({
    familyId: input.familyId,
    personId: input.fromPersonId,
    actorId: input.actorId,
    changes: [{ field: "relationship", before: null, after: `${input.summary} ${input.toName}` }],
  });
  await recordPersonChanges({
    familyId: input.familyId,
    personId: input.toPersonId,
    actorId: input.actorId,
    changes: [{ field: "relationship", before: null, after: `${input.summary} ${input.fromName}` }],
  });
}
