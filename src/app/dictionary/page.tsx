import Link from "next/link";
import { NameKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { dictionaryHeading, nicknameUseLine } from "@/lib/nicknameDictionary";
import { NicknameNotesForm } from "@/app/funeral/ui";

export default async function DictionaryPage() {
  const ctx = await requireFamily();
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, kind: NameKind.nickname },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="dictionary-heading">{dictionaryHeading(names.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Nicknames, and how the family still uses them.</p>
      <ul className="mt-10 space-y-3" data-testid="dictionary-list">
        {names.map((name) => (
          <li key={name.id} className="paper-card p-5">
            <p className="font-display text-2xl">{name.name}</p>
            <p className="text-bark">{nicknameUseLine(name.name, name.person.displayName, name.notes)}</p>
            <Link href={`/people/${name.personId}`} className="font-sans text-sm text-seal">{name.person.displayName}</Link>
            {canWrite(ctx.role) ? <NicknameNotesForm nameId={name.id} notes={name.notes} /> : null}
          </li>
        ))}
        {!names.length ? <li className="text-bark">The family dictionary has no nicknames yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/dictionary/unused" className="text-seal">Nicknames still missing how they are used</Link>
        {" · "}
        <Link href="/nicknames" className="text-seal">Simple nickname list</Link>
      </p>
    </AppShell>
  );
}
