import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AskBox } from "@/components/AskBox";
import { BilingualToggle } from "@/app/story-circle/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bilingualAskHeading } from "@/lib/ask";

export default async function BilingualAskPage() {
  const ctx = await requireFamily();
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { askPreferTranslation: true },
  });
  const on = Boolean(user?.askPreferTranslation);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bilingual-ask-heading">
        {bilingualAskHeading(true)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Prefer the translation when one exists. The usual Ask page still uses the original wording unless you turn this on.{" "}
        <Link href="/ask" className="text-seal">Ask</Link>
        {" · "}
        <Link href="/ask/bilingual/missing" className="text-seal">Letters without a translation</Link>
      </p>
      <BilingualToggle on={on} />
      <div className="mt-8" data-testid="bilingual-ask">
        <AskBox suggested="How did grandma meet grandpa?" action="/api/ask" bilingual />
      </div>
    </AppShell>
  );
}
