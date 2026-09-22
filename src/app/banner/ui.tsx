"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BannerForm({ bannerText, bannerNote }: { bannerText?: string | null; bannerNote?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bannerText: data.get("bannerText"),
        bannerNote: data.get("bannerNote"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the banner.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-4 grid gap-3 p-5" data-testid="banner-form">
      <input
        name="bannerText"
        defaultValue={bannerText || ""}
        placeholder="The Harts of Cedar Falls"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <input
        name="bannerNote"
        defaultValue={bannerNote || ""}
        placeholder="A line the family still says"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Hang the banner
      </button>
    </form>
  );
}
