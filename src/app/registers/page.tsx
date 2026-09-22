import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { registerHeading } from "@/lib/registerExtract";

export default async function RegistersPage() {
  const ctx = await requireFamily();
  const registers = await prisma.churchRegister.findMany({
    where: { familyId: ctx.family.id },
    include: { _count: { select: { lines: true } } },
    orderBy: { church: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="registers-heading">Church registers</h1>
      <p className="mt-3 max-w-2xl text-bark">Baptism, marriage, and burial lines copied from one parish book, linked to people.</p>
      {canWrite(ctx.role) ? <RegisterForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="registers-list">
        {registers.map((register) => (
          <li key={register.id} className="paper-card p-5">
            <Link href={`/registers/${register.id}`} className="font-display text-2xl text-seal">
              {registerHeading(register.church, register._count.lines)}
            </Link>
            {register.place ? <p className="text-bark">{register.place}</p> : null}
          </li>
        ))}
        {!registers.length ? <li className="text-bark">No church registers yet.</li> : null}
      </ul>
    </AppShell>
  );
}
