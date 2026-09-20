import Link from "next/link";
import { Relationship } from "@prisma/client";
import { buildGenerations, TreePerson } from "@/lib/tree";
import { lifespan } from "@/lib/dates";

export function TreeView({
  people,
  relationships,
}: {
  people: TreePerson[];
  relationships: Relationship[];
}) {
  const { rows } = buildGenerations(people, relationships);
  const generations = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <div className="space-y-10">
      {generations.map(([gen, groups]) => (
        <section key={gen}>
          <p className="mb-4 font-sans text-xs uppercase tracking-[0.2em] text-gold">
            Generation {gen + 1}
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {groups.map((group) => (
              <div key={group.map((person) => person.id).join("-")} className="flex flex-wrap items-stretch justify-center gap-4">
                {group.map((person) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    className="paper-card w-44 overflow-hidden text-center transition hover:-translate-y-0.5"
                  >
                    <div className="aspect-[4/5] bg-cedar/10">
                      {person.profileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.profileUrl} alt={person.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display text-3xl text-gold">
                          {person.displayName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-3">
                      <div className="font-display text-base leading-tight">{person.displayName}</div>
                      <div className="mt-1 font-sans text-xs text-bark/70">{lifespan(person.birthDate, person.deathDate)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          {gen < generations.length - 1 ? <div className="rule mx-auto mt-10 max-w-xl" /> : null}
        </section>
      ))}
    </div>
  );
}
