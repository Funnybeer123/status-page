import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ConsentForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { isLivingAdult } from "@/lib/privacy";
import { consentHeading, grantedConsentIds, livingAdultsNeedingConsent } from "@/lib/consent";
import { formatDate } from "@/lib/dates";

export default async function ConsentPage() {
  const ctx = await requireFamily();
  const [people, consents] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { displayName: "asc" },
    }),
    prisma.shareConsent.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const adults = people.filter((person) => isLivingAdult(person));
  const missing = livingAdultsNeedingConsent(adults, consents);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="consent-heading">Share consent</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A living adult is not included on a family share link until they have a consent record. {consentHeading(missing.length)}.
      </p>
      {canWrite(ctx.role) ? (
        <ConsentForm people={adults.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <section className="mt-10" data-testid="consent-missing">
        <h2 className="font-display text-2xl">Still needs consent</h2>
        <ul className="mt-4 space-y-2">
          {missing.map((person) => (
            <li key={person.id} className="paper-card p-4">
              <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
            </li>
          ))}
          {!missing.length ? <li className="text-bark">Everyone living has been asked.</li> : null}
        </ul>
      </section>
      <ul className="mt-10 space-y-3" data-testid="consent-list">
        {consents.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.person.displayName}</p>
            <p className="text-bark">
              {row.granted ? "Granted" : "Not granted"}
              {row.grantedOn ? ` · ${formatDate(row.grantedOn)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <p className="sr-only">{grantedConsentIds(consents).join(",")}</p>
    </AppShell>
  );
}
