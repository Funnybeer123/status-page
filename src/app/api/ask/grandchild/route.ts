import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { answerGrandchildQuestion } from "@/lib/grandchildAsk";

const schema = z.object({ question: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  return NextResponse.json(await answerGrandchildQuestion(ctx.family.id, body.data.question));
}
