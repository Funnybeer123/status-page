import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isOralHistory } from "@/lib/oralPlaylist";
import { compileOralCredits, oralCreditsHeading } from "@/lib/spokenBy";

export default async function OralCreditsPage() {
  const ctx = await requireFamily();
  const recordings = (
    await prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      include: { spokenBy: true, uploadedBy: { select: { name: true } } },
      orderBy: { title: "asc" },
    })
  ).filter((asset) => isOralHistory(asset) && asset.spokenById);
  const credits = compileOralCredits(recordings);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="oral-credits-heading">
        {oralCreditsHeading(credits.length)}
      </h1>
      <p className="mt-3 text-bark">
        Who spoke, kept separate from who uploaded the recording.{" "}
        <Link href="/oral" className="text-seal">Oral history</Link>
        {" · "}
        <Link href="/oral/uncredited" className="text-seal">Still uncredited</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="oral-credits-list">
        {credits.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!credits.length ? <li className="text-bark">{oralCreditsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
