import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, hideResidenceForViewer } from "@/lib/privacy";
import { addressCardHeading, addressCardLine, sortResidences } from "@/lib/residenceMap";

export default async function AddressCardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: true } } },
  });
  if (!person || hideMinorDetails(ctx.role, person) || hideResidenceForViewer(ctx.role, person)) notFound();
  const latest = sortResidences(person.residences).at(-1);
  return (
    <AppShell>
      <article className="mx-auto max-w-xl print:max-w-none" data-testid="address-card">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Address card</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="address-card-heading">{addressCardHeading(person.displayName)}</h1>
        <p className="mt-6 text-xl" data-testid="address-card-line">{addressCardLine(person.displayName, latest?.place)}</p>
        <p className="mt-10 font-sans text-sm print:hidden">
          <Link href={`/people/${person.id}/card`} className="text-seal">Index card</Link>
        </p>
      </article>
    </AppShell>
  );
}
