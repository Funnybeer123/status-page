"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };

function FieldError({ error }: { error: string }) {
  return error ? <p className="font-sans text-sm text-seal">{error}</p> : null;
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function BeeForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/bees", {
      title: data.get("title"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that quilting bee.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="bee-form">
      <input name="title" placeholder="Harvest ring bee" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm parlor" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a quilting bee
      </button>
    </form>
  );
}

export function BeeBlockForm({
  people,
  bees,
  beeId,
}: {
  people: Person[];
  bees?: { id: string; title: string }[];
  beeId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/bees", {
      beeId: beeId || data.get("beeId"),
      personId: data.get("personId"),
      block: data.get("block"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that block.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="bee-block-form">
      {!beeId && bees ? (
        <select name="beeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which bee</option>
          {bees.map((bee) => (
            <option key={bee.id} value={bee.id}>{bee.title}</option>
          ))}
        </select>
      ) : null}
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who came</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="block" placeholder="Ohio star" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record a block
      </button>
    </form>
  );
}

export function BellForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/bells", {
      personId: data.get("personId"),
      service: data.get("service"),
      rangOn: data.get("rangOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record who rang the bell.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="bell-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who rang</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="service" placeholder="Sunday morning" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="rangOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the ringer
      </button>
    </form>
  );
}

export function SocialForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/socials", {
      buyerId: data.get("buyerId"),
      sellerId: data.get("sellerId"),
      heldOn: data.get("heldOn"),
      price: data.get("price"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that pairing.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="social-form">
      <select name="buyerId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who bought</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="sellerId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose box</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="price" placeholder="35 cents" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the pairing
      </button>
    </form>
  );
}

export function MailRouteForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/mail", {
      name: data.get("name"),
      days: data.get("days"),
      carrierId: data.get("carrierId") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that route.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="mail-route-form">
      <input name="name" placeholder="Rural Route 2" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="days" placeholder="Tue Thu Sat" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="carrierId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who carried</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a rural route
      </button>
    </form>
  );
}

export function MailBoxForm({
  people,
  routes,
}: {
  people: Person[];
  routes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/mail", {
      routeId: data.get("routeId"),
      personId: data.get("personId"),
      boxNumber: data.get("boxNumber"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that box.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="mail-box-form">
      <select name="routeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which route</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>{route.name}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose box</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="boxNumber" placeholder="14" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a mailbox
      </button>
    </form>
  );
}

export function WashForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/wash", {
      personId: data.get("personId"),
      weekday: data.get("weekday"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that wash day.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="wash-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose household</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="weekday" placeholder="Monday" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Set the wash day
      </button>
    </form>
  );
}

export function SeedForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/seeds", {
      personId: data.get("personId"),
      variety: data.get("variety"),
      quantity: data.get("quantity"),
      supplier: data.get("supplier"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that seed order.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="seed-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who ordered</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="variety" placeholder="Early Ohio potatoes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="quantity" placeholder="2 sacks" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="supplier" placeholder="Iowa Seed Co." className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1952" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the seed order
      </button>
    </form>
  );
}

export function BarnForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/barns", {
      title: data.get("title"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that barn raising.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="barn-form">
      <input name="title" placeholder="North-farm barn" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a barn raising
      </button>
    </form>
  );
}

export function BarnCrewForm({
  people,
  barns,
  raisingId,
}: {
  people: Person[];
  barns?: { id: string; title: string }[];
  raisingId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/barns", {
      raisingId: raisingId || data.get("raisingId"),
      personId: data.get("personId"),
      job: data.get("job"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that neighbor.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="barn-crew-form">
      {!raisingId && barns ? (
        <select name="raisingId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which raising</option>
          {barns.map((barn) => (
            <option key={barn.id} value={barn.id}>{barn.title}</option>
          ))}
        </select>
      ) : null}
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who worked</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="job" placeholder="frame" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the crew
      </button>
    </form>
  );
}

export function ConfirmationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/confirmations", {
      church: data.get("church"),
      year: data.get("year"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that class.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="confirmation-form">
      <input name="church" placeholder="St. John's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1945" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a confirmation class
      </button>
    </form>
  );
}

export function ConfirmationPupilForm({
  people,
  classes,
  classId,
}: {
  people: Person[];
  classes?: { id: string; label: string }[];
  classId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/confirmations", {
      classId: classId || data.get("classId"),
      personId: data.get("personId"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that confirmand.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="confirmation-pupil-form">
      {!classId && classes ? (
        <select name="classId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which class</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>{row.label}</option>
          ))}
        </select>
      ) : null}
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who stood</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the roll
      </button>
    </form>
  );
}

export function WatchForm({
  people,
  deceased,
}: {
  people: Person[];
  deceased?: Person[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/watches", {
      deceasedId: data.get("deceasedId"),
      personId: data.get("personId"),
      watchedOn: data.get("watchedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that deathwatch.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  const funerals = deceased?.length ? deceased : people;
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="watch-form">
      <select name="deceasedId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose night</option>
        {funerals.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who sat</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="watchedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the deathwatch
      </button>
    </form>
  );
}

export function ButterForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/butter", {
      personId: data.get("personId"),
      store: data.get("store"),
      account: data.get("account"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that account.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="butter-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose account</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="store" placeholder="Market Street store" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="account" placeholder="Whitaker 3" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1961" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the butter-and-egg book
      </button>
    </form>
  );
}

export function WellForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/wells", {
      personId: data.get("personId"),
      place: data.get("place"),
      depth: data.get("depth"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that well.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="well-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who dug it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="depth" placeholder="42 feet" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1949" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the well
      </button>
    </form>
  );
}

export function OrganForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/organs", {
      personId: data.get("personId"),
      title: data.get("title"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that organ.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="organ-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who played</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="title" placeholder="Cottage organ" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="place" placeholder="North-farm parlor" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the player
      </button>
    </form>
  );
}

export function PinForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/sunday-pins", {
      personId: data.get("personId"),
      year: data.get("year"),
      church: data.get("church"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that pin.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="pin-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who earned it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="year" type="number" placeholder="1996" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="church" placeholder="St. John's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the Sunday-school pin
      </button>
    </form>
  );
}
