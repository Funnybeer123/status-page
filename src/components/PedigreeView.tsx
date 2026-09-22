import Link from "next/link";
import { lifespan } from "@/lib/dates";
import { flattenPedigree, type PedigreeNode } from "@/lib/pedigree";

const labels = ["This person", "Parents", "Grandparents", "Great-grandparents"];

export function PedigreeView({ tree }: { tree: PedigreeNode | null }) {
  const rows = flattenPedigree(tree);
  if (!tree) return <p className="text-bark">Add people and parent links to see ancestors.</p>;
  return (
    <div className="space-y-8" data-testid="pedigree-chart">
      {rows.map(([generation, people]) => (
        <section key={generation}>
          <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-gold">
            {labels[generation] || `Generation +${generation}`}
          </p>
          <div className="flex flex-wrap gap-4">
            {people.map((person) => (
              <Link key={person.id} href={`/people/${person.id}`} className="paper-card min-w-40 px-4 py-3">
                <p className="font-display text-xl">{person.displayName}</p>
                <p className="font-sans text-xs text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
