import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isSecretLocked, lockedSecretsHeading, secretUntilLine } from "@/lib/secretUntil";

export default async function LockedSecretsPage() {
  const ctx = await requireFamily();
  const [letters, journals] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, secretUntil: { not: null } },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: ctx.session.user.id, secretUntil: { not: null } },
    }),
  ]);
  const items = [
    ...letters.filter((letter) => isSecretLocked(letter.secretUntil)).map((letter) => ({
      id: letter.id,
      title: letter.title,
      line: secretUntilLine(letter.secretUntil),
      href: `/letters/${letter.id}`,
    })),
    ...journals.filter((entry) => isSecretLocked(entry.secretUntil)).map((entry) => ({
      id: entry.id,
      title: entry.title,
      line: secretUntilLine(entry.secretUntil),
      href: "/journal",
    })),
  ];
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="locked-secrets-heading">
        {lockedSecretsHeading(items.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="locked-secrets">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-4">
            <Link href={item.href} className="font-display text-xl text-seal">
              {item.title}
            </Link>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{lockedSecretsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
