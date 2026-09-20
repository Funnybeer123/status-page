"use client";

import { useRouter } from "next/navigation";

export function FamilySwitcher({
  families,
  activeFamilyId,
}: {
  families: { id: string; name: string; role: string }[];
  activeFamilyId?: string;
}) {
  const router = useRouter();
  if (!families.length) return null;
  return (
    <select
      className="rounded-full border border-bark/15 bg-paper px-3 py-1.5 text-ink"
      value={activeFamilyId ?? families[0]?.id}
      onChange={async (event) => {
        await fetch("/api/families/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ familyId: event.target.value }),
        });
        router.refresh();
      }}
    >
      {families.map((family) => (
        <option key={family.id} value={family.id}>
          {family.name}
        </option>
      ))}
    </select>
  );
}
