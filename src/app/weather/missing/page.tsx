import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWeatherHeading } from "@/lib/weatherNote";

export default async function MissingWeatherPage() {
  const ctx = await requireFamily();
  const [photos, letters] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, capturedAt: { not: null }, OR: [{ weather: null }, { weather: "" }] },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, writtenAt: { not: null }, OR: [{ weather: null }, { weather: "" }] },
    }),
  ]);
  const items = [
    ...photos.map((photo) => ({ id: photo.id, title: photo.title || "Untitled photograph", href: `/archive/${photo.id}` })),
    ...letters.map((letter) => ({ id: letter.id, title: letter.title, href: `/letters/${letter.id}` })),
  ];
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-weather-heading">
        {missingWeatherHeading(items.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-weather">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-4">
            <Link href={item.href} className="font-display text-xl text-seal">
              {item.title}
            </Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{missingWeatherHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
