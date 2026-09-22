import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { postageLedgerHeading, postageLine } from "@/lib/postage";

export default async function PostageLedgerPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, postage: { not: null } },
    orderBy: { writtenAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable postage ledger</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="postage-ledger-heading">
        {postageLedgerHeading(letters.length)}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        <Link href="/letters/postage" className="text-seal">Postage costs</Link>
      </p>
      <table className="mt-10 w-full text-left" data-testid="postage-ledger">
        <thead>
          <tr className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
            <th className="pb-3">Letter</th>
            <th className="pb-3">Written</th>
            <th className="pb-3">Postage</th>
          </tr>
        </thead>
        <tbody>
          {letters.map((letter) => (
            <tr key={letter.id} className="border-t border-bark/10">
              <td className="py-3">
                <Link href={`/letters/${letter.id}`} className="text-seal">
                  {letter.title}
                </Link>
              </td>
              <td className="py-3 text-bark">{formatDate(letter.writtenAt, "Undated")}</td>
              <td className="py-3">{postageLine(letter.postage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!letters.length ? <p className="mt-6 text-bark">{postageLedgerHeading(0)}</p> : null}
    </AppShell>
  );
}
