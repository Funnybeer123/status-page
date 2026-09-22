import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  conversationId: z.string(),
  saved: z.boolean().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const conversations = await prisma.askConversation.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id, saved: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a conversation to keep." }, { status: 400 });
  const existing = await prisma.askConversation.findFirst({
    where: { id: body.data.conversationId, familyId: ctx.family.id, userId: ctx.session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const conversation = await prisma.askConversation.update({
    where: { id: existing.id },
    data: { saved: body.data.saved ?? true },
  });
  return NextResponse.json({ conversation });
}
