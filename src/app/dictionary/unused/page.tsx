import Link from "next/link";
import { NameKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unusedNicknamesHeading } from "@/lib/nicknameDictionary";

export default async function UnusedNicknamesPage() {
  const ctx = await requireFamily();
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, kind: NameKind.nickname, OR: [{ notes: null }, { notes: "" }] },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unused-nicknames-heading">{unusedNicknamesHeading(names.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="unused-nicknames">
        {names.map((name) => (
          <li key={name.id} className="paper-card p-5">
            <Link href={`/dictionary`} className="font-display text-2xl text-seal">{name.name}</Link>
            <p className="text-bark">{name.person.displayName}</p>
          </li>
        ))}
        {!names.length ? <li className="text-bark">Every nickname already says how it is used.</li> : null}
      </ul>
    </AppShell>
  );
}
