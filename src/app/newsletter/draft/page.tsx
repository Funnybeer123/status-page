import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { monthKey } from "@/lib/newsletter";
import { draftHeading, draftStatus, unpublishedDraftsHeading } from "@/lib/newsletterDraft";
import { NewsletterDraftForm } from "@/app/hunt/ui";

export default async function NewsletterDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const month = params.month || monthKey(new Date());
  const drafts = await prisma.newsletterDraft.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { month: "desc" },
  });
  const draft = drafts.find((row) => row.month === month) ?? null;
  const unpublished = drafts.filter((row) => !row.publishedAt);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="newsletter-draft-heading">{draftHeading(month)}</h1>
      <p className="mt-3 text-bark" data-testid="newsletter-draft-status">{draftStatus(draft?.publishedAt)}</p>
      {canWrite(ctx.role) ? <NewsletterDraftForm month={month} body={draft?.body || ""} /> : null}
      {draft ? (
        <article className="paper-card mt-8 whitespace-pre-wrap p-5 text-lg leading-relaxed" data-testid="newsletter-draft-body">
          {draft.body}
        </article>
      ) : null}
      <h2 className="mt-10 font-display text-2xl">{unpublishedDraftsHeading(unpublished.length)}</h2>
      <p className="mt-8 font-sans text-sm">
        <Link href="/newsletter" className="text-seal">Compiled newsletter</Link>
      </p>
    </AppShell>
  );
}
