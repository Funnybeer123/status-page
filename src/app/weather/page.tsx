import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { weatherNoteLine, weatherNotesHeading } from "@/lib/weatherNote";

export default async function WeatherNotesPage() {
  const ctx = await requireFamily();
  const [photos, letters] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, weather: { not: null } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, weather: { not: null } },
      orderBy: { writtenAt: "asc" },
    }),
  ]);
  const items = [
    ...photos.map((photo) => ({
      id: photo.id,
      title: photo.title || "Untitled photograph",
      line: weatherNoteLine(photo.weather, photo.capturedAt),
      href: `/archive/${photo.id}`,
    })),
    ...letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      line: weatherNoteLine(letter.weather, letter.writtenAt),
      href: `/letters/${letter.id}`,
    })),
  ];
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="weather-heading">
        {weatherNotesHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        What the family remembered about that day.{" "}
        <Link href="/weather/missing" className="text-seal">
          Still missing a weather note
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="weather-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{weatherNotesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
