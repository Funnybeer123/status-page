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

export function PallbearerForm({
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
    const response = await postJson("/api/pallbearers", {
      deceasedId: data.get("deceasedId"),
      personId: data.get("personId"),
      role: data.get("role"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that pallbearer.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  const funerals = deceased?.length ? deceased : people;
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="pallbearer-form">
      <select name="deceasedId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose funeral</option>
        {funerals.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who carried</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="role" placeholder="head, left, right, honorary" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record a pallbearer
      </button>
    </form>
  );
}

export function GownForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/gowns", {
      title: data.get("title"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that gown.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="gown-form">
      <input name="title" placeholder="Hart christening gown" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the gown
      </button>
    </form>
  );
}

export function GownWearForm({
  people,
  gowns,
  gownId,
}: {
  people: Person[];
  gowns?: { id: string; title: string }[];
  gownId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/gowns", {
      gownId: gownId || data.get("gownId"),
      personId: data.get("personId"),
      wornOn: data.get("wornOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record who wore the gown.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="gown-wear-form">
      {!gownId && gowns ? (
        <select name="gownId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which gown</option>
          {gowns.map((gown) => (
            <option key={gown.id} value={gown.id}>{gown.title}</option>
          ))}
        </select>
      ) : null}
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who wore it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="wornOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a wearer
      </button>
    </form>
  );
}

export function IceForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/ice", {
      personId: data.get("personId"),
      year: data.get("year"),
      place: data.get("place"),
      role: data.get("role"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that crew member.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="ice-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who worked the ice</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="year" type="number" placeholder="1947" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="place" placeholder="Cedar River" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="role" placeholder="pike" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the ice-harvest crew
      </button>
    </form>
  );
}

export function CameraForm({
  people,
  photos,
}: {
  people: Person[];
  photos: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/cameras", {
      assetId: data.get("assetId"),
      personId: data.get("personId"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not credit who held the camera.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="camera-form">
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which photograph</option>
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>{photo.title}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who held the camera</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the photographer
      </button>
    </form>
  );
}

export function SpellingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/spellings", {
      surname: data.get("surname"),
      variant: data.get("variant"),
      source: data.get("source"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that spelling.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="spelling-form">
      <input name="surname" placeholder="Whitaker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="variant" placeholder="Whiticker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="source" placeholder="1930 census" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record a spelling
      </button>
    </form>
  );
}

export function ThreshingForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/threshing", {
      personId: data.get("personId"),
      year: data.get("year"),
      place: data.get("place"),
      role: data.get("role"),
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
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="threshing-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who worked the ring</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="year" type="number" placeholder="1948" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="role" placeholder="bundle pitcher" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the threshing ring
      </button>
    </form>
  );
}

export function LastSeenForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/last-seen", {
      personId: data.get("personId"),
      lastSeenOn: data.get("lastSeenOn"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that last-seen date.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="last-seen-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="lastSeenOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the last time we saw them
      </button>
    </form>
  );
}

export function TeacherForm({
  people,
  classes,
}: {
  people: Person[];
  classes: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/teachers", {
      classId: data.get("classId"),
      personId: data.get("personId"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not name that teacher.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="teacher-form">
      <select name="classId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which class</option>
        {classes.map((row) => (
          <option key={row.id} value={row.id}>{row.label}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who taught</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Name the schoolteacher
      </button>
    </form>
  );
}

export function VehicleForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/vehicles", {
      name: data.get("name"),
      kind: data.get("kind"),
      personId: data.get("personId") || undefined,
      startedOn: data.get("startedOn"),
      endedOn: data.get("endedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that vehicle.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="vehicle-form">
      <input name="name" placeholder="North-farm truck" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="kind" placeholder="truck" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who kept it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a family vehicle
      </button>
    </form>
  );
}

export function PartyLineForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/party-lines", {
      exchange: data.get("exchange"),
      number: data.get("number"),
      personIds: data.getAll("personIds"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that party line.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="party-line-form">
      <input name="exchange" placeholder="Cedar Falls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="number" placeholder="4-218" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Who shared the line</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <label key={person.id} className="rounded-full border border-bark/15 px-3 py-1">
              <input type="checkbox" name="personIds" value={person.id} className="mr-2" />
              {person.displayName}
            </label>
          ))}
        </div>
      </fieldset>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Write down the party line
      </button>
    </form>
  );
}

export function MilkRouteForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/milk", {
      name: data.get("name"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that milk route.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="milk-route-form">
      <input name="name" placeholder="Cedar Falls dairy" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1961" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a milk route
      </button>
    </form>
  );
}

export function MilkStopForm({
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
    const response = await postJson("/api/milk", {
      routeId: data.get("routeId"),
      personId: data.get("personId"),
      stopOrder: data.get("stopOrder"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that stop.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="milk-stop-form">
      <select name="routeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which route</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>{route.name}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose stop</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="stopOrder" type="number" min={1} placeholder="1" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a milk stop
      </button>
    </form>
  );
}

export function PewForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/pews", {
      personId: data.get("personId"),
      church: data.get("church"),
      pewNumber: data.get("pewNumber"),
      startedOn: data.get("startedOn"),
      endedOn: data.get("endedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that pew.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="pew-form">
      <input name="church" placeholder="St. John's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="pewNumber" placeholder="12" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who rented it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record a rented pew
      </button>
    </form>
  );
}

export function BlanketForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/blankets", {
      personId: data.get("personId"),
      monthDay: data.get("monthDay"),
      placedById: data.get("placedById") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that grave blanket.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="blanket-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose grave</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="monthDay" placeholder="December 24" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="placedById" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who places it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a grave-blanket date
      </button>
    </form>
  );
}

export function ElevatorForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/elevators", {
      personId: data.get("personId"),
      elevator: data.get("elevator"),
      account: data.get("account"),
      year: data.get("year") || undefined,
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that elevator account.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="elevator-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Whose account</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="elevator" placeholder="Cedar Falls Co-op" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="account" placeholder="Hart 14" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="year" type="number" placeholder="1952" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the elevator account
      </button>
    </form>
  );
}
