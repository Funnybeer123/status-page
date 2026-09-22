const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function draftHeading(month: string) {
  const [year, mm] = month.split("-");
  const name = MONTHS[Number(mm) - 1] || month;
  return `Draft of the ${name} ${year} family newsletter`;
}

export function draftStatus(publishedAt?: Date | string | null) {
  return publishedAt ? "Sent to the family" : "Draft — edit before it goes out";
}

export function unpublishedDraftsHeading(count: number) {
  if (!count) return "No newsletter drafts waiting";
  if (count === 1) return "1 newsletter draft waiting to go out";
  return `${count} newsletter drafts waiting to go out`;
}

export function withDraft<T extends object>(compiled: T, draft?: { id: string; month: string; body: string; publishedAt?: Date | string | null } | null) {
  return {
    ...compiled,
    draft: draft
      ? {
          id: draft.id,
          month: draft.month,
          body: draft.body,
          publishedAt: draft.publishedAt ?? null,
          heading: draftHeading(draft.month),
          status: draftStatus(draft.publishedAt),
        }
      : null,
  };
}
