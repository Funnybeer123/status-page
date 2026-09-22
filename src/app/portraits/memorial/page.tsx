import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { loadPortraitWall } from "@/lib/portraitLoad";
import { memorialMissingHeading, memorialWallHeading } from "@/lib/portraits";
import { PortraitWallView } from "@/app/portraits/wall";

export default async function MemorialPortraitsPage() {
  const ctx = await requireFamily();
  const wall = await loadPortraitWall(ctx.family.id, ctx.role, "memorial");
  return (
    <AppShell>
      <PortraitWallView
        familyName={ctx.family.name}
        heading={memorialWallHeading(wall.portraits)}
        testId="memorial-wall-heading"
        intro={
          <>
            People who have died, one portrait each, separate from the living wall.{" "}
            <Link href="/portraits/living" className="text-seal">Living portraits</Link>
            {" · "}
            <Link href="/portraits" className="text-seal">Everyone</Link>
            {" · "}
            <Link href="/portraits/memorial/missing" className="text-seal">{memorialMissingHeading(wall.missing.length)}</Link>.
          </>
        }
        rows={wall.rows}
      />
    </AppShell>
  );
}
