import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StyleForm } from "@/app/style/ui";
import { requireFamily } from "@/lib/family";
import {
  dateStyleLabel,
  formatStyledDate,
  formatStyledName,
  nameStyleLabel,
  styleExampleLine,
  styleSheetHeading,
} from "@/lib/styleSheet";
import { canWrite } from "@/lib/roles";

export default async function StylePage() {
  const ctx = await requireFamily();
  const sample = { displayName: "Eleanor Hart", givenName: "Eleanor", familyName: "Hart" };
  const example = styleExampleLine(
    formatStyledName(sample, ctx.family.nameStyle),
    formatStyledDate("1948-06-14", ctx.family.dateStyle),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="style-heading">
        {styleSheetHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        How names and dates are written in the family book and group sheets.{" "}
        <Link href="/book" className="text-seal">Family book</Link>
        {" · "}
        <Link href="/group-sheets" className="text-seal">Group sheets</Link>.
      </p>
      <section className="mt-8 paper-card p-5" data-testid="style-example">
        <p className="font-display text-2xl">{example}</p>
        <p className="mt-2 font-sans text-sm text-bark">
          {nameStyleLabel(ctx.family.nameStyle)} · {dateStyleLabel(ctx.family.dateStyle)}
        </p>
      </section>
      {canWrite(ctx.role) ? (
        <StyleForm nameStyle={ctx.family.nameStyle} dateStyle={ctx.family.dateStyle} />
      ) : null}
    </AppShell>
  );
}
