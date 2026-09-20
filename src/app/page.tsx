import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-sans text-xs uppercase tracking-[0.28em] text-gold">A private family archive</p>
      <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">Family Lineage</h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-bark">
        Each family keeps its own tree, places, stories, and letters. Ask how the grandparents met, and the
        answer comes from their correspondence — not from the public web.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        {session ? (
          <Link href="/tree" className="rounded-full bg-seal px-6 py-3 font-sans text-cream">
            Open your families
          </Link>
        ) : (
          <>
            <Link href="/login?demo=1" className="rounded-full bg-seal px-6 py-3 font-sans text-cream">
              Try the Hart family
            </Link>
            <Link href="/signup" className="rounded-full border border-bark/20 px-6 py-3 font-sans">
              Create an account
            </Link>
          </>
        )}
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {[
          ["People and tree", "Generations, maiden names, the places they lived, and how two people are related."],
          ["Timeline and dates", "Life events, letters, and photographs in order — plus birthdays the family still keeps."],
          ["Stories and Ask", "Oral notes sit beside letters. A grandchild-style question is answered from this archive."],
        ].map(([title, copy]) => (
          <article key={title} className="paper-card p-6">
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-3 text-bark">{copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
