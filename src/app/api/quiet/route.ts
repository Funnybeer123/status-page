import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isQuiet, quietHomeHeading, quietNavLinks, quietSettingsHeading } from "@/lib/quietMode";

const schema = z.object({
  quiet: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { quietMode: true },
  });
  return NextResponse.json({
    quiet: isQuiet(user),
    heading: quietSettingsHeading(isQuiet(user)),
    homeHeading: quietHomeHeading(),
    links: isQuiet(user) ? quietNavLinks() : null,
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say whether quiet mode should be on." }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: ctx.session.user.id },
    data: { quietMode: body.data.quiet },
    select: { quietMode: true },
  });
  return NextResponse.json({
    quiet: isQuiet(user),
    heading: quietSettingsHeading(isQuiet(user)),
    homeHeading: quietHomeHeading(),
    links: isQuiet(user) ? quietNavLinks() : null,
  });
}
