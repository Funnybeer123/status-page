import Link from "next/link";
import { Relationship } from "@prisma/client";
import { buildGenerations, TreePerson } from "@/lib/tree";
import { lifespan } from "@/lib/dates";
import { childMarks, isPartnerRel, siblingKind } from "@/lib/rels";
import { formatYear } from "@/lib/dates";

export function TreeView({
  people,
  relationships,
}: {
  people: TreePerson[];
  relationships: Relationship[];
}) {
  const { rows } = buildGenerations(people, relationships);
  const generations = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const partnerEnd = new Map<string, string>();
  for (const rel of relationships) {
    if (!isPartnerRel(rel.type) || !rel.endedKind) continue;
    const label = `${rel.endedKind}${rel.endedAt ? ` ${formatYear(rel.endedAt)}` : ""}`;
    partnerEnd.set([rel.fromPersonId, rel.toPersonId].sort().join(":"), label);
  }
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
                {group.length > 1 && partnerEnd.get(group.map((person) => person.id).sort().join(":")) ? (
                  <p className="w-full text-center font-sans text-xs uppercase tracking-wide text-gold">
                    {partnerEnd.get(group.map((person) => person.id).sort().join(":"))}
                  </p>
                ) : null}
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
                      {childMarks(person.id, relationships).length ? (
                        <div className="mt-1 font-sans text-xs uppercase tracking-wide text-gold">
                          {childMarks(person.id, relationships).join(" · ")}
                        </div>
                      ) : null}
                      {people.some((other) => siblingKind(person.id, other.id, relationships) === "half") ? (
                        <div className="mt-1 font-sans text-xs text-gold">
                          half sibling of{" "}
                          {people
                            .filter((other) => siblingKind(person.id, other.id, relationships) === "half")
                            .map((other) => names.get(other.id))
                            .filter(Boolean)
                            .slice(0, 2)
                            .join(", ")}
                        </div>
                      ) : null}
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
