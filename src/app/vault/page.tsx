import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { VaultForm } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyVaultHeading, vaultDenied, vaultHeading, vaultLine } from "@/lib/vault";

export default async function VaultPage() {
  const ctx = await requireFamily();
  if (ctx.role !== Role.owner) {
    return (
      <AppShell>
        <h1 className="font-display text-4xl" data-testid="vault-heading">{vaultDenied()}</h1>
        <p className="mt-3 max-w-2xl text-bark">Shared account notes stay with the family owners.</p>
      </AppShell>
    );
  }
  const notes = await prisma.familyVaultNote.findMany({
    where: { familyId: ctx.family.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="vault-heading">
        {notes.length ? vaultHeading(notes.length) : emptyVaultHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Shared account notes. Only owners can open this vault.</p>
      <VaultForm />
      <ul className="mt-10 space-y-3" data-testid="vault-list">
        {notes.map((note) => (
          <li key={note.id} className="paper-card p-5">
            <p className="font-display text-2xl">{vaultLine(note.title)}</p>
            <p className="mt-2 whitespace-pre-wrap text-bark">{note.body}</p>
            <p className="mt-2 font-sans text-sm text-gold">{note.createdBy.name}</p>
          </li>
        ))}
        {!notes.length ? <li className="text-bark">{emptyVaultHeading()}</li> : null}
      </ul>
    </AppShell>
  );
}
