"use client";

import { useState } from "react";

export function ShareLinkButton({
  kind,
  entityId,
}: {
  kind: "memorial" | "album";
  entityId: string;
}) {
  const [href, setHref] = useState("");
  const [error, setError] = useState("");
  async function create() {
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, entityId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not make a share link.");
      return;
    }
    setHref(payload.href);
  }
  return (
    <div className="mt-4" data-testid="share-link">
      <button type="button" onClick={create} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        Family-only share link
      </button>
      {href ? (
        <p className="mt-2 font-sans text-sm">
          <a href={href} className="text-seal">{href}</a>
        </p>
      ) : null}
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}
