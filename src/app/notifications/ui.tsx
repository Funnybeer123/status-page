"use client";

import { useRouter } from "next/navigation";

export function MarkRead() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="mt-4 rounded-full border border-bark/20 px-4 py-2 font-sans text-sm"
      onClick={async () => {
        await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        router.refresh();
      }}
    >
      Mark all read
    </button>
  );
}
