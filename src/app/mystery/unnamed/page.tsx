import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mysteryGuessLine, unnamedGuessHeading } from "@/lib/photoMystery";

export default async function UnnamedGuessesPage() {
  const ctx = await requireFamily();
  const guesses = (await prisma.photoGuess.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, user: { select: { name: true } }, asset: true },
    orderBy: { createdAt: "desc" },
  })).filter((guess) => !guess.personId && !guess.name);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unnamed-guess-heading">
        {unnamedGuessHeading(guesses.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/mystery" className="text-seal">Photo mystery queue</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="unnamed-guess-list">
        {guesses.map((guess) => (
          <li key={guess.id} className="paper-card p-5">
            <Link href={`/archive/${guess.assetId}`} className="font-display text-2xl text-seal">
              {guess.asset.title || "Untitled photograph"}
            </Link>
            <p className="text-bark">{mysteryGuessLine(guess.name, guess.user.name)}</p>
          </li>
        ))}
        {!guesses.length ? <li className="text-bark">{unnamedGuessHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
