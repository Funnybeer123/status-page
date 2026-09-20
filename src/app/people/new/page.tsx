import { AppShell } from "@/components/AppShell";
import { PersonForm } from "@/app/people/new/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function NewPersonPage() {
  const ctx = await requireFamily();
  if (!canWrite(ctx.role)) redirect("/tree");
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { displayName: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl">Add a person</h1>
      <PersonForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
    </AppShell>
  );
}
