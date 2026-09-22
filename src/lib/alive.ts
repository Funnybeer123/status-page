export const alive = { deletedAt: null } as const;

export function isTrashed(row?: { deletedAt?: Date | string | null } | null) {
  return Boolean(row?.deletedAt);
}
