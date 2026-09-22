import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { photoNoteHeading } from "@/lib/photoNotes";

export default async function PhotoNotesPage() {
  const ctx = await requireFamily();
  const notes = await prisma.photoNote.findMany({
    where: { familyId: ctx.family.id },
    include: { asset: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="photo-notes-heading">Sticky notes on photographs</h1>
      <p className="mt-3 max-w-2xl text-bark">{photoNoteHeading(notes.length)}. A relative’s scribble stays on the picture.</p>
      <ul className="mt-10 space-y-3" data-testid="photo-notes-list">
        {notes.map((note) => (
          <li key={note.id} className="paper-card p-5">
            <Link href={`/archive/${note.assetId}`} className="font-display text-2xl text-seal">
              {note.asset.title || "Photograph"}
            </Link>
            <p className="mt-2 text-bark">{note.text}</p>
          </li>
        ))}
        {!notes.length ? <li className="text-bark">No sticky notes yet.</li> : null}
      </ul>
    </AppShell>
  );
}
