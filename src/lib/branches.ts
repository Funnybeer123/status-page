export function memberIdsForBranch(
  branches: { id: string; members: { personId: string }[] }[],
  branchId?: string | null,
) {
  if (!branchId) return null;
  const branch = branches.find((item) => item.id === branchId);
  if (!branch) return [];
  return branch.members.map((member) => member.personId);
}

export function peopleInBranch<T extends { id: string }>(people: T[], memberIds: string[] | null) {
  if (!memberIds) return people;
  const set = new Set(memberIds);
  return people.filter((person) => set.has(person.id));
}

export function relationshipsInBranch<T extends { fromPersonId: string; toPersonId: string }>(
  relationships: T[],
  memberIds: string[] | null,
) {
  if (!memberIds) return relationships;
  const set = new Set(memberIds);
  return relationships.filter((rel) => set.has(rel.fromPersonId) && set.has(rel.toPersonId));
}
