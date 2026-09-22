import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { RulesForm } from "@/app/family-hour/ui";
import { requireFamily } from "@/lib/family";
import { canWrite } from "@/lib/roles";
import { Role } from "@prisma/client";
import { defaultFamilyRules, familyRulesHeading } from "@/lib/familyRules";

export default async function FamilyRulesPage() {
  const ctx = await requireFamily();
  const custom = Boolean(ctx.family.rulesText?.trim());
  const text = ctx.family.rulesText?.trim() || defaultFamilyRules();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="family-rules-heading">
        {familyRulesHeading(custom)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        How this family keeps living people private, and what Ask may use. Everyone can read these. Only owners can change them.{" "}
        <Link href="/rules/missing" className="text-seal">Still the usual ones</Link>
      </p>
      <article className="paper-card mt-10 whitespace-pre-wrap p-6 text-lg leading-relaxed" data-testid="family-rules">
        {text}
      </article>
      {ctx.role === Role.owner && canWrite(ctx.role) ? <RulesForm rules={ctx.family.rulesText} /> : null}
      <CiteBlock title={familyRulesHeading(custom)} path="/rules" />
    </AppShell>
  );
}
