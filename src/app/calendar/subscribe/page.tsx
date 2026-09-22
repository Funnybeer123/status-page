import { AppShell } from "@/components/AppShell";
import { CalendarTokenForm } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { canWrite } from "@/lib/roles";
import { webcalHeading, webcalHref } from "@/lib/webcal";

export default async function CalendarSubscribePage() {
  const ctx = await requireFamily();
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://familylineage.app";
  const href = ctx.family.calendarToken ? webcalHref(ctx.family.calendarToken, origin) : null;
  const httpHref = ctx.family.calendarToken ? `/api/cal/${ctx.family.calendarToken}` : null;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="webcal-heading">
        {webcalHeading(ctx.family.name)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Subscribe in a calendar app. Living birthdays stay hidden the way a viewer would see them.
      </p>
      {href && httpHref ? (
        <div className="paper-card mt-8 p-5" data-testid="webcal-link">
          <p className="font-display text-2xl">Subscribe</p>
          <p className="mt-2 break-all font-sans text-sm text-seal">{href}</p>
          <p className="mt-2">
            <a href={httpHref} className="text-seal">Download the dates</a>
          </p>
        </div>
      ) : (
        <p className="mt-8 text-bark">No calendar address yet.</p>
      )}
      {canWrite(ctx.role) ? <CalendarTokenForm hasToken={Boolean(ctx.family.calendarToken)} /> : null}
    </AppShell>
  );
}
