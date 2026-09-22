import Link from "next/link";
import { Role } from "@prisma/client";
import { FamilySwitcher } from "@/components/FamilySwitcher";
import { SearchBox } from "@/components/SearchBox";
import { SignOut } from "@/components/SignOut";

const links = [
  { href: "/", label: "Home" },
  { href: "/tree", label: "Tree" },
  { href: "/timeline", label: "Timeline" },
  { href: "/today", label: "On this day" },
  { href: "/activity", label: "Activity" },
  { href: "/map", label: "Map" },
  { href: "/archive", label: "Archive" },
  { href: "/albums", label: "Albums" },
  { href: "/stories", label: "Stories" },
  { href: "/book", label: "Book" },
  { href: "/dates", label: "Dates" },
  { href: "/related", label: "Related" },
  { href: "/import", label: "Import" },
  { href: "/letters/new", label: "Letters" },
  { href: "/ask", label: "Ask" },
  { href: "/families", label: "Families" },
];

type FamilyOption = { id: string; name: string; role: Role };

export function Nav({
  families,
  activeFamilyId,
  userName,
}: {
  families: FamilyOption[];
  activeFamilyId?: string;
  userName?: string | null;
}) {
  return (
    <header className="border-b border-bark/10 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-tight">
          Family Lineage
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-sans text-bark">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-seal">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3 font-sans text-sm">
          <SearchBox />
          <FamilySwitcher families={families} activeFamilyId={activeFamilyId} />
          <span className="hidden text-bark/70 sm:inline">{userName}</span>
          <SignOut />
        </div>
      </div>
    </header>
  );
}
