import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { InterviewAnswerForm } from "@/app/interviews/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { ELDER_QUESTIONS } from "@/lib/interviews";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  });
  const personId = params.personId && people.some((person) => person.id === params.personId)
    ? params.personId
    : people[0]?.id;
  const person = people.find((item) => item.id === personId);
  const answers = personId
    ? await prisma.interviewAnswer.findMany({
        where: { familyId: ctx.family.id, personId },
        include: { story: true },
      })
    : [];
  const byKey = new Map(answers.map((answer) => [answer.promptKey, answer]));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="interviews-heading">Elder interview</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A checklist of questions. Each answer is saved as a story in that relative’s own words.
      </p>
      <div className="mt-6 flex flex-wrap gap-2" data-testid="interview-people">
        {people.map((item) => (
          <Link
            key={item.id}
            href={`/interviews?personId=${item.id}`}
            className={`rounded-full px-3 py-1 font-sans text-sm ${item.id === personId ? "bg-seal text-cream" : "border border-bark/15"}`}
          >
            {item.displayName}
          </Link>
        ))}
      </div>
      {person ? <p className="mt-6 font-display text-2xl" data-testid="interview-person">{person.displayName}</p> : null}
      <ol className="mt-8 space-y-4" data-testid="interview-list">
        {ELDER_QUESTIONS.map((question) => {
          const answer = byKey.get(question.key);
          return (
            <li key={question.key} className="paper-card p-5">
              <p className="font-display text-2xl">{question.question}</p>
              {answer ? (
                <div className="mt-3">
                  <Link href={`/stories/${answer.story.id}`} className="text-seal">{answer.story.title}</Link>
                  <p className="mt-2 text-bark" data-testid={`interview-story-${question.key}`}>{answer.story.body}</p>
                </div>
              ) : canWrite(ctx.role) && personId ? (
                <InterviewAnswerForm personId={personId} promptKey={question.key} />
              ) : (
                <p className="mt-2 text-bark">No answer yet.</p>
              )}
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
