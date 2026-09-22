"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Related = {
  relation: string;
  sentence: string;
  found: boolean;
  fromId?: string;
  toId?: string;
  steps: { fromId: string; fromName: string; toId: string; toName: string; label: string }[];
};

export function RelatedForm({
  people,
  fromId,
  toId,
  result,
  pathSvg,
  pathLabel,
}: {
  people: { id: string; displayName: string }[];
  fromId?: string;
  toId?: string;
  result?: Related | null;
  pathSvg?: string;
  pathLabel?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(fromId || people[0]?.id || "");
  const [to, setTo] = useState(toId || people[1]?.id || "");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/related?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  const nodes = result?.steps.length
    ? [{ id: result.steps[0]!.fromId, name: result.steps[0]!.fromName }, ...result.steps.map((step) => ({ id: step.toId, name: step.toName }))]
    : [];

  return (
    <div>
      <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-4 p-6 md:grid-cols-2">
        <label className="font-sans text-sm">
          This person
          <select value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="related-from">
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </label>
        <label className="font-sans text-sm">
          And this person
          <select value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="related-to">
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </label>
        <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream md:col-span-2" type="submit">
          How are we related?
        </button>
      </form>
      {result ? (
        <article className="paper-card mt-8 p-6" data-testid="related-result">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{result.relation}</p>
          <p className="mt-3 font-display text-3xl">{result.sentence}</p>
          {pathLabel ? <p className="mt-3 font-sans text-sm text-bark" data-testid="related-path-label">{pathLabel}</p> : null}
          {nodes.length ? (
            <ol className="mt-6 flex flex-wrap items-center gap-3" data-testid="related-path">
              {nodes.map((node, index) => (
                <li key={`${node.id}-${index}`} className="flex items-center gap-3">
                  {index ? (
                    <span className="font-sans text-xs uppercase tracking-wide text-gold">
                      {result.steps[index - 1]?.label}
                    </span>
                  ) : null}
                  <a href={`/people/${node.id}`} className="rounded-2xl bg-seal px-4 py-3 font-display text-xl text-cream">
                    {node.name}
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
          {pathSvg ? (
            <div className="mt-6 overflow-x-auto" data-testid="related-path-svg" dangerouslySetInnerHTML={{ __html: pathSvg }} />
          ) : null}
          {result.steps.length ? (
            <ol className="mt-6 space-y-2 text-bark">
              {result.steps.map((step, index) => (
                <li key={`${step.fromName}-${step.toName}-${index}`}>
                  {step.fromName} is the {step.label} {step.toName}
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
