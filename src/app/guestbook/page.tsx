import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GuestBookForm } from "@/app/then-now/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyGuestBookHeading, guestBookHeading, guestBookLine } from "@/lib/guestBook";

export default async function GuestBookPage() {
  const ctx = await requireFamily();
  const notes = await prisma.homeGuestBook.findMany({
    where: { familyId: ctx.family.id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="guestbook-home-heading">
        {notes.length ? guestBookHeading(notes.length) : emptyGuestBookHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Visiting relatives leave a note on the family home. This is not the memorial guest book.
      </p>
      <GuestBookForm />
      <ul className="mt-10 space-y-3" data-testid="home-guestbook">
        {notes.map((note) => (
          <li key={note.id} className="paper-card p-5">
            <p className="text-bark">{guestBookLine(note.author.name, note.body)}</p>
          </li>
        ))}
        {!notes.length ? <li className="text-bark">{emptyGuestBookHeading()}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/" className="text-seal">Family home</Link>
      </p>
    </AppShell>
  );
}
