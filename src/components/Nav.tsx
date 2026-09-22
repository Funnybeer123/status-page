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
  { href: "/map/photos", label: "Photo map" },
  { href: "/archive", label: "Archive" },
  { href: "/albums", label: "Albums" },
  { href: "/clippings", label: "Clippings" },
  { href: "/recipes", label: "Cookbook" },
  { href: "/heirlooms", label: "Heirlooms" },
  { href: "/stories", label: "Stories" },
  { href: "/book", label: "Book" },
  { href: "/dates", label: "Dates" },
  { href: "/duplicates", label: "Duplicates" },
  { href: "/surnames", label: "Surnames" },
  { href: "/places", label: "Places" },
  { href: "/places/tree", label: "Place tree" },
  { href: "/places/gaps", label: "Place gaps" },
  { href: "/letters/duplicates", label: "Letter duplicates" },
  { href: "/milestones", label: "Milestones" },
  { href: "/anniversaries", label: "Anniversaries" },
  { href: "/cousins/worksheet", label: "Cousin worksheet" },
  { href: "/dates/ranges", label: "Date ranges" },
  { href: "/adoptions", label: "Adoptions" },
  { href: "/start", label: "Start here" },
  { href: "/start/progress", label: "Start progress" },
  { href: "/year", label: "This year" },
  { href: "/year/photos", label: "Yearbook" },
  { href: "/assigned", label: "Assigned" },
  { href: "/search/sounds", label: "Sounds like" },
  { href: "/city-directory", label: "City directory" },
  { href: "/classes", label: "Class lists" },
  { href: "/there", label: "I was there" },
  { href: "/military/papers", label: "Draft papers" },
  { href: "/needed", label: "Still needed" },
  { href: "/sources", label: "Sources" },
  { href: "/obituaries", label: "Obituaries" },
  { href: "/wills", label: "Wills" },
  { href: "/traditions", label: "Traditions" },
  { href: "/tasks", label: "Tasks" },
  { href: "/decades", label: "Decades" },
  { href: "/weddings", label: "Weddings" },
  { href: "/census", label: "Census" },
  { href: "/households", label: "Households" },
  { href: "/census/compare", label: "Census compare" },
  { href: "/registers", label: "Registers" },
  { href: "/tax", label: "Tax lists" },
  { href: "/extracts", label: "Extracts" },
  { href: "/searches", label: "Saved searches" },
  { href: "/photos/notes", label: "Photo notes" },
  { href: "/consent", label: "Share consent" },
  { href: "/tree/poster", label: "Tree poster" },
  { href: "/stats", label: "Stats" },
  { href: "/research", label: "Research" },
  { href: "/shared", label: "Shared" },
  { href: "/related", label: "Related" },
  { href: "/me", label: "This is me" },
  { href: "/missing", label: "Missing" },
  { href: "/conflicts", label: "Conflicts" },
  { href: "/compare", label: "Compare" },
  { href: "/prompts", label: "Prompts" },
  { href: "/trash", label: "Trash" },
  { href: "/cousins", label: "Cousins" },
  { href: "/living", label: "Living" },
  { href: "/directory", label: "Directory" },
  { href: "/longevity", label: "Longevity" },
  { href: "/fan", label: "Fan" },
  { href: "/correspondence", label: "Correspondence" },
  { href: "/years", label: "Years" },
  { href: "/unidentified", label: "Unidentified" },
  { href: "/photographed", label: "Photographed" },
  { href: "/undated", label: "Undated" },
  { href: "/capsules", label: "Capsules" },
  { href: "/interviews", label: "Interviews" },
  { href: "/branches", label: "Branches" },
  { href: "/cemeteries", label: "Cemeteries" },
  { href: "/pairs", label: "Then & now" },
  { href: "/bibliography", label: "Bibliography" },
  { href: "/voyages", label: "Voyages" },
  { href: "/schools", label: "Schools" },
  { href: "/reunions", label: "Reunions" },
  { href: "/occupations", label: "Occupations" },
  { href: "/godparents", label: "Godparents" },
  { href: "/congregations", label: "Congregations" },
  { href: "/land", label: "Land" },
  { href: "/military", label: "Military" },
  { href: "/bibles", label: "Bibles" },
  { href: "/mottos", label: "Mottos" },
  { href: "/passports", label: "Passports" },
  { href: "/ask", label: "Ask" },
  { href: "/ask/saved", label: "Saved questions" },
  { href: "/ocr", label: "OCR review" },
  { href: "/custody", label: "Custody" },
  { href: "/businesses", label: "Businesses" },
  { href: "/awards", label: "Awards" },
  { href: "/clubs", label: "Clubs" },
  { href: "/probate", label: "Probate" },
  { href: "/naturalizations", label: "Naturalization" },
  { href: "/addresses", label: "Addresses" },
  { href: "/apprentices", label: "Apprentices" },
  { href: "/mentions", label: "Mentions" },
  { href: "/pets", label: "Pets" },
  { href: "/quilts", label: "Quilts" },
  { href: "/dna", label: "DNA" },
  { href: "/group-sheets", label: "Group sheets" },
  { href: "/ask/grandchild", label: "Ask a grandchild" },
  { href: "/quiz", label: "Quiz" },
  { href: "/loans", label: "Loans" },
  { href: "/homes", label: "Homes" },
  { href: "/homes/duplicates", label: "Duplicate homes" },
  { href: "/homes/merge", label: "Merge homes" },
  { href: "/suggestions", label: "Corrections" },
  { href: "/lives", label: "Two lives" },
  { href: "/calendar/subscribe", label: "Family calendar" },
  { href: "/journal", label: "Journal" },
  { href: "/scans/missing", label: "Missing scans" },
  { href: "/manifests/missing", label: "Missing manifests" },
  { href: "/digitize", label: "Digitize" },
  { href: "/handwriting", label: "Handwriting" },
  { href: "/handwriting/compare", label: "Compare hands" },
  { href: "/inscriptions", label: "Inscriptions" },
  { href: "/holidays", label: "Holidays" },
  { href: "/marriages", label: "Marriages" },
  { href: "/correspondents", label: "Correspondents" },
  { href: "/deaths", label: "Deaths" },
  { href: "/nicknames", label: "Nicknames" },
  { href: "/plots", label: "Plots" },
  { href: "/witnesses", label: "Witnesses" },
  { href: "/oral", label: "Oral history" },
  { href: "/worksheets", label: "Worksheets" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/to-interview", label: "To interview" },
  { href: "/ages", label: "Age at death" },
  { href: "/inventory", label: "Letter inventory" },
  { href: "/this-month", label: "This month" },
  { href: "/photos/unplaced", label: "Unplaced photos" },
  { href: "/uncited", label: "Uncited" },
  { href: "/quotes", label: "Quotes" },
  { href: "/packets", label: "Packets" },
  { href: "/children", label: "Children" },
  { href: "/spoken", label: "Spoken" },
  { href: "/potluck", label: "Potluck" },
  { href: "/quality", label: "Source quality" },
  { href: "/pronounce", label: "Pronounce" },
  { href: "/week", label: "This week" },
  { href: "/photos/unlocated", label: "Unlocated faces" },
  { href: "/inbox", label: "Needs review" },
  { href: "/tomorrow", label: "Tomorrow" },
  { href: "/cemeteries/map", label: "Cemetery map" },
  { href: "/films", label: "Films" },
  { href: "/abstracts", label: "Land abstracts" },
  { href: "/baptisms", label: "Baptisms" },
  { href: "/causes", label: "Causes" },
  { href: "/hymns", label: "Hymns" },
  { href: "/farms", label: "Farms" },
  { href: "/languages", label: "Languages" },
  { href: "/firsts", label: "Firsts" },
  { href: "/import", label: "Import" },
  { href: "/letters/new", label: "Letters" },
  { href: "/families", label: "Families" },
];

type FamilyOption = { id: string; name: string; role: Role };

export function Nav({
  families,
  activeFamilyId,
  userName,
  unread = 0,
}: {
  families: FamilyOption[];
  activeFamilyId?: string;
  userName?: string | null;
  unread?: number;
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
          <Link href="/notifications" className="hover:text-seal" data-testid="nav-notifications">
            Notices{unread ? ` (${unread})` : ""}
          </Link>
          <SearchBox />
          <FamilySwitcher families={families} activeFamilyId={activeFamilyId} />
          <span className="hidden text-bark/70 sm:inline">{userName}</span>
          <SignOut />
        </div>
      </div>
    </header>
  );
}
