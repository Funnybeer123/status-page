"use client";

import Link from "next/link";
import { useState } from "react";

export function QuizReveal({
  answer,
  href,
  sourceTitle,
}: {
  answer: string;
  href: string;
  sourceTitle: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        data-testid="quiz-reveal"
      >
        {open ? "Shown" : "Show the answer"}
      </button>
      {open ? (
        <div className="mt-3" data-testid="quiz-answer">
          <p className="text-bark">{answer}</p>
          <p className="mt-2 font-sans text-sm">
            From{" "}
            <Link href={href} className="text-seal">{sourceTitle}</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
