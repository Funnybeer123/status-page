import Link from "next/link";
import type { ReactNode } from "react";
import type { PortraitRow } from "@/lib/portraits";

export function PortraitWallView({
  familyName,
  heading,
  intro,
  testId,
  rows,
  extra,
}: {
  familyName: string;
  heading: string;
  intro: ReactNode;
  testId: string;
  rows: PortraitRow[];
  extra?: ReactNode;
}) {
  return (
    <>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{familyName}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid={testId}>
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">{intro}</p>
      {extra}
      {rows.map((row) => (
        <section key={row.generation} className="mt-10">
          <h2 className="font-display text-2xl">{row.heading}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {row.people.map((person) => (
              <li key={person.id} className="paper-card overflow-hidden">
                <Link href={`/people/${person.id}`}>
                  {person.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.profileUrl} alt={person.displayName} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-paper text-bark">No portrait yet</div>
                  )}
                  <p className="p-4 font-display text-xl text-seal">{person.displayName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
