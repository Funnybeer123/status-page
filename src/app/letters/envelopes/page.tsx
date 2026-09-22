import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { envelopeLine, envelopesHeading, hasEnvelope } from "@/lib/envelope";

export default async function EnvelopesPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const envelopes = letters.filter(hasEnvelope);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="envelopes-heading">{envelopesHeading(envelopes.length)}</h1>
      <p className="mt-3 text-bark">
        <Link href="/letters/envelopes/missing" className="text-seal">Letters without an envelope</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="envelopes-list">
        {envelopes.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/envelope`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="text-bark">{envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt)}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
