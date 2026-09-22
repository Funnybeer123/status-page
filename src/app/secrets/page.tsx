import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isSecretLocked, secretUntilLine, secretsHeading } from "@/lib/secretUntil";

export default async function SecretsPage() {
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
    ...letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      line: secretUntilLine(letter.secretUntil),
      locked: isSecretLocked(letter.secretUntil),
      href: `/letters/${letter.id}`,
    })),
    ...journals.map((entry) => ({
      id: entry.id,
      title: entry.title,
      line: secretUntilLine(entry.secretUntil),
      locked: isSecretLocked(entry.secretUntil),
      href: "/journal",
    })),
  ];
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="secrets-heading">
        {secretsHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Journals and letters that stay closed until a date.{" "}
        <Link href="/secrets/locked" className="text-seal">
          Still locked
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="secrets-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{secretsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
