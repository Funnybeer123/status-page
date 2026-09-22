import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { TeacherForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { classHeading } from "@/lib/cityDirectory";
import { compileTeachers, teacherLine, teachersHeading } from "@/lib/schoolteacher";

export default async function TeachersPage() {
  const ctx = await requireFamily();
  const [classes, people] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { familyId: ctx.family.id },
      include: { teacher: true },
      orderBy: [{ year: "desc" }, { school: "asc" }],
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const rows = compileTeachers(
    classes
      .filter((row) => row.teacher)
      .map((row) => ({
        id: row.id,
        teacher: row.teacher!.displayName,
        school: row.school,
        year: row.year,
      })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="teachers-heading">
        {teachersHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who taught one school year, separate from the class list of pupils.{" "}
        <Link href="/classes" className="text-seal">Class lists</Link>
        {" · "}
        <Link href="/teachers/missing" className="text-seal">Classes still needing a teacher</Link>
      </p>
      {canWrite(ctx.role) ? (
        <TeacherForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          classes={classes.map((row) => ({ id: row.id, label: classHeading(row.school, row.year) }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="teachers-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/classes/${row.id}`} className="font-display text-2xl text-seal">
              {teacherLine(row.teacher, row.school, row.year)}
            </Link>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{teachersHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={teachersHeading(rows.length)} path="/teachers" />
    </AppShell>
  );
}
