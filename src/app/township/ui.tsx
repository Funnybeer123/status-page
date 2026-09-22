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

function PeopleSelect({ name, label, people }: { name: string; label: string; people: Person[] }) {
  return (
    <select name={name} className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
      <option value="">{label}</option>
      {people.map((person) => (
        <option key={person.id} value={person.id}>{person.displayName}</option>
      ))}
    </select>
  );
}

export function FenceForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/fences", {
      personId: data.get("personId"),
      neighbors: data.get("neighbors"),
      walkedOn: data.get("walkedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that appointment.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="fence-form">
      <PeopleSelect name="personId" label="Who walked" people={people} />
      <input name="neighbors" placeholder="Whitaker and Chen" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="walkedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the walk
      </button>
    </form>
  );
}

export function RoadTaxForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/road-tax", {
      personId: data.get("personId"),
      road: data.get("road"),
      days: data.get("days"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save those days.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="road-tax-form">
      <PeopleSelect name="personId" label="Who worked" people={people} />
      <input name="road" placeholder="North township road" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="days" type="number" placeholder="3" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1952" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the road tax
      </button>
    </form>
  );
}

export function CreameryForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/creamery", {
      personId: data.get("personId"),
      pounds: data.get("pounds"),
      amount: data.get("amount"),
      paidOn: data.get("paidOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that check.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="creamery-form">
      <PeopleSelect name="personId" label="Whose cream" people={people} />
      <input name="pounds" placeholder="40 pounds" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="amount" placeholder="$8.20" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="paidOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the creamery check
      </button>
    </form>
  );
}

export function RodForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/rods", {
      personId: data.get("personId"),
      building: data.get("building"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that installer.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="rod-form">
      <PeopleSelect name="personId" label="Who installed" people={people} />
      <input name="building" placeholder="North-farm barn" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1949" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the installer
      </button>
    </form>
  );
}

export function MapleForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/maple", {
      personId: data.get("personId"),
      gallons: data.get("gallons"),
      year: data.get("year") || undefined,
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that camp.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="maple-form">
      <PeopleSelect name="personId" label="Who boiled" people={people} />
      <input name="gallons" placeholder="12 gallons" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="place" placeholder="North-farm grove" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="year" type="number" placeholder="1951" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the maple camp
      </button>
    </form>
  );
}

export function HuskingForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/husking", {
      ownerId: data.get("ownerId"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that husking bee.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="husking-form">
      <PeopleSelect name="ownerId" label="Whose field" people={people} />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a husking bee
      </button>
    </form>
  );
}

export function HuskingGuestForm({
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
    const response = await postJson("/api/husking", {
      beeId: beeId || data.get("beeId"),
      personId: data.get("personId"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record who came.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="husking-guest-form">
      {!beeId && bees ? (
        <select name="beeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which field</option>
          {bees.map((bee) => (
            <option key={bee.id} value={bee.id}>{bee.title}</option>
          ))}
        </select>
      ) : null}
      <PeopleSelect name="personId" label="Who came" people={people} />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record who came
      </button>
    </form>
  );
}

export function MidwifeForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/midwives", {
      midwifeId: data.get("midwifeId"),
      motherId: data.get("motherId"),
      childId: data.get("childId") || undefined,
      attendedOn: data.get("attendedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that midwife.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="midwife-form">
      <PeopleSelect name="midwifeId" label="Who attended" people={people} />
      <PeopleSelect name="motherId" label="Mother" people={people} />
      <select name="childId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Child (optional)</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="attendedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the midwife
      </button>
    </form>
  );
}

export function CarverForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/carvers", {
      carverId: data.get("carverId"),
      personId: data.get("personId"),
      yard: data.get("yard"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that carver.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="carver-form">
      <PeopleSelect name="carverId" label="Who carved" people={people} />
      <PeopleSelect name="personId" label="Whose stone" people={people} />
      <input name="yard" placeholder="Fairview" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the carver
      </button>
    </form>
  );
}

export function CharivariForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/charivari", {
      title: data.get("title"),
      heldOn: data.get("heldOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that charivari.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="charivari-form">
      <input name="title" placeholder="Chen wedding" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a charivari
      </button>
    </form>
  );
}

export function CharivariGuestForm({
  people,
  events,
  charivariId,
}: {
  people: Person[];
  events?: { id: string; title: string }[];
  charivariId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/charivari", {
      charivariId: charivariId || data.get("charivariId"),
      personId: data.get("personId"),
      noise: data.get("noise"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that noise.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="charivari-guest-form">
      {!charivariId && events ? (
        <select name="charivariId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which wedding</option>
          {events.map((row) => (
            <option key={row.id} value={row.id}>{row.title}</option>
          ))}
        </select>
      ) : null}
      <PeopleSelect name="personId" label="Who came" people={people} />
      <input name="noise" placeholder="a tin pan" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the noise
      </button>
    </form>
  );
}

export function BrandForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/brands", {
      personId: data.get("personId"),
      mark: data.get("mark"),
      startedOn: data.get("startedOn"),
      endedOn: data.get("endedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that brand.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="brand-form">
      <PeopleSelect name="personId" label="Whose stock" people={people} />
      <input name="mark" placeholder="H-bar" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the brand
      </button>
    </form>
  );
}

export function SorghumForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/sorghum", {
      personId: data.get("personId"),
      gallons: data.get("gallons"),
      year: data.get("year") || undefined,
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that boiling.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="sorghum-form">
      <PeopleSelect name="personId" label="Who boiled" people={people} />
      <input name="gallons" placeholder="8 gallons" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="year" type="number" placeholder="1950" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the sorghum boil
      </button>
    </form>
  );
}

export function SickForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/sick", {
      sickId: data.get("sickId"),
      personId: data.get("personId"),
      satOn: data.get("satOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that sick-watch.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="sick-form">
      <PeopleSelect name="sickId" label="Who was sick" people={people} />
      <PeopleSelect name="personId" label="Who sat up" people={people} />
      <input name="satOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the sick-watch
      </button>
    </form>
  );
}

export function BoardForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/boards", {
      personId: data.get("personId"),
      office: data.get("office"),
      startedOn: data.get("startedOn"),
      endedOn: data.get("endedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that term.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="board-form">
      <PeopleSelect name="personId" label="Who served" people={people} />
      <input name="office" placeholder="director" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the term
      </button>
    </form>
  );
}
