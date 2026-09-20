import { Role } from "@prisma/client";

const rank: Record<Role, number> = {
  viewer: 1,
  contributor: 2,
  owner: 3,
};

export function canWrite(role: Role) {
  return rank[role] >= rank.contributor;
}

export function canInvite(role: Role) {
  return role === Role.owner;
}

export function hasAtLeast(role: Role, needed: Role) {
  return rank[role] >= rank[needed];
}
