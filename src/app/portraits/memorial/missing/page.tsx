import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { loadPortraitWall } from "@/lib/portraitLoad";
import { memorialMissingHeading } from "@/lib/portraits";

export default async function MemorialMissingPage() {
  const ctx = await requireFamily();
  const wall = await loadPortraitWall(ctx.family.id, ctx.role, "memorial");
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="memorial-missing-heading">
        {memorialMissingHeading(wall.missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        People who have died and still need a portrait on the memorial wall.{" "}
        <Link href="/portraits/memorial" className="text-seal">Memorial wall</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="memorial-missing-list">
        {wall.missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!wall.missing.length ? <li className="text-bark">Every memorial has a portrait.</li> : null}
      </ul>
    </AppShell>
  );
}
