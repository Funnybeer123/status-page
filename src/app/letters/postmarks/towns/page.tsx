import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePostmarkMap, compilePostmarkTowns, postmarkTownsHeading } from "@/lib/postmarkMap";

export default async function PostmarkTownsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { asset: { include: { place: true } } },
  });
  const { placed } = compilePostmarkMap(
    letters.map((letter) => ({
      ...letter,
      place: letter.asset?.place || null,
    })),
  );
  const towns = compilePostmarkTowns(placed);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="postmark-towns-heading">
        {postmarkTownsHeading(towns.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/map/postmarks" className="text-seal">Postmark map</Link>
      </p>
      <div className="mt-10 space-y-6" data-testid="postmark-towns">
        {towns.map((group) => (
          <section key={group.town} className="paper-card p-5">
            <h2 className="font-display text-2xl">{group.town}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-seal">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!towns.length ? <p className="text-bark">{postmarkTownsHeading(0)}</p> : null}
      </div>
    </AppShell>
  );
}
