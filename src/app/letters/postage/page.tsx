import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { postageHeading, postageLine } from "@/lib/postage";

export default async function PostagePage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, postage: { not: null } },
    orderBy: { writtenAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="postage-heading">
        {postageHeading(letters.length)}
      </h1>
      <p className="mt-3 text-bark">
        What the stamp cost, kept next to the postmark.{" "}
        <Link href="/letters/postmarks" className="text-seal">Postmarks</Link>
        {" · "}
        <Link href="/letters/postage/missing" className="text-seal">Letters without postage</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="postage-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
            <p className="text-bark">{postageLine(letter.postage)}</p>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">{postageHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
