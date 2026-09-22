"use client";

import { useRouter } from "next/navigation";

export function TrashRestore({
  type,
  id,
  restore,
}: {
  type: "person" | "photo" | "letter";
  id: string;
  restore?: boolean;
}) {
  const router = useRouter();
  async function run() {
    await fetch("/api/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, restore: Boolean(restore) }),
    });
    router.refresh();
  }
  return (
    <button type="button" onClick={run} className="font-sans text-sm text-seal" data-testid={restore ? "trash-restore" : "trash-move"}>
      {restore ? "Restore" : "Move to trash"}
    </button>
  );
}
