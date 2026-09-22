import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { missingRulesHeading } from "@/lib/familyRules";

export default async function MissingRulesPage() {
  const ctx = await requireFamily();
  const custom = Boolean(ctx.family.rulesText?.trim());
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-rules-heading">
        {custom ? "The family has written its own rules" : missingRulesHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/rules" className="text-seal">Family rules</Link>
      </p>
    </AppShell>
  );
}
