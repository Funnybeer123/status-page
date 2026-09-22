import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SocialForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { boxSocialLine, boxSocialsHeading, compileSocials } from "@/lib/boxSocial";

export default async function SocialsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.boxSocial.findMany({ where: { familyId: ctx.family.id }, include: { buyer: true, seller: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSocials(
    rows.map((row) => ({
      id: row.id,
      buyer: row.buyer.displayName,
      seller: row.seller.displayName,
      heldOn: row.heldOn,
      price: row.price,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="socials-heading">
        {boxSocialsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who bought whose box at the social.{" "}
        <Link href="/socials/missing" className="text-seal">Missing pairing</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SocialForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="socials-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{boxSocialLine(row.buyer, row.seller, row.price)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{boxSocialsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={boxSocialsHeading(compiled.length)} path="/socials" />
    </AppShell>
  );
}
