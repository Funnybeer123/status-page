import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isNight, nightQuietHeading, nightSettingsHeading } from "@/lib/nightMode";
import { isQuiet, quietHomeHeading } from "@/lib/quietMode";

const schema = z.object({
  night: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { nightMode: true, quietMode: true },
  });
  return NextResponse.json({
    night: isNight(user),
    quiet: isQuiet(user),
    heading: nightSettingsHeading(isNight(user)),
    homeHeading: isQuiet(user) && isNight(user) ? nightQuietHeading() : quietHomeHeading(),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say whether night mode should be on." }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: ctx.session.user.id },
    data: { nightMode: body.data.night },
    select: { nightMode: true, quietMode: true },
  });
  return NextResponse.json({
    night: isNight(user),
    quiet: isQuiet(user),
    heading: nightSettingsHeading(isNight(user)),
    homeHeading: isQuiet(user) && isNight(user) ? nightQuietHeading() : quietHomeHeading(),
  });
}
