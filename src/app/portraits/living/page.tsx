import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { loadPortraitWall } from "@/lib/portraitLoad";
import { livingWallHeading } from "@/lib/portraits";
import { PortraitWallView } from "@/app/portraits/wall";

export default async function LivingPortraitsPage() {
  const ctx = await requireFamily();
  const wall = await loadPortraitWall(ctx.family.id, ctx.role, "living");
  return (
    <AppShell>
      <PortraitWallView
        familyName={ctx.family.name}
        heading={livingWallHeading(wall.portraits)}
        testId="living-wall-heading"
        intro={
          <>
            Living relatives, one portrait each, separate from the memorial wall.{" "}
            <Link href="/portraits/memorial" className="text-seal">Memorial portraits</Link>
            {" · "}
            <Link href="/portraits" className="text-seal">Everyone</Link>.
          </>
        }
        rows={wall.rows}
      />
    </AppShell>
  );
}
