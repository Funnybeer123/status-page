import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasPostmark, postmarksHeading, postmarkWrittenLine } from "@/lib/postmark";

export default async function PostmarksPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const items = letters.filter(hasPostmark);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="postmarks-heading">
        {postmarksHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The stamp or postmark, kept separate from the date written on the letter.{" "}
        <Link href="/letters/postmarks/missing" className="text-seal">Letters still without a postmark</Link>
        {" · "}
        <Link href="/letters/postmarks/undated-written" className="text-seal">Postmarks without a written date</Link>
        {" · "}
        <Link href="/map/postmarks" className="text-seal">Postmark map</Link>
        {" · "}
        <Link href="/letters/postage" className="text-seal">Postage</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="postmarks-list">
        {items.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="mt-2 text-bark">{postmarkWrittenLine(letter.writtenAt, letter.stampText, letter.postmarkedAt)}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{postmarksHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
