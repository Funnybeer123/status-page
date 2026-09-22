"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };

function FormError({ error }: { error: string }) {
  return error ? <p className="font-sans text-sm text-seal">{error}</p> : null;
}

export function HouseholdForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: data.get("year"),
        place: data.get("place"),
        street: data.get("street"),
        groupKey: data.get("groupKey"),
        notes: data.get("notes"),
        people: data.getAll("personIds").map((personId) => ({ personId: String(personId) })),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that household.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="household-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="year" required placeholder="1950" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="place" required placeholder="Cedar Falls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="street" placeholder="North farm road" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="groupKey" placeholder="hart-cedar-falls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="Notes from the schedule" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Who was counted</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <label key={person.id} className="rounded-full border border-bark/15 px-3 py-1">
              <input type="checkbox" name="personIds" value={person.id} className="mr-2" />
              {person.displayName}
            </label>
          ))}
        </div>
      </fieldset>
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the household
      </button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        church: data.get("church"),
        place: data.get("place"),
        startedOn: data.get("startedOn") || undefined,
        endedOn: data.get("endedOn") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that register.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="register-form">
      <input name="church" required placeholder="St. John's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="Cedar Falls, Iowa" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="Parish notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the register
      </button>
    </form>
  );
}

export function RegisterLineForm({ registerId, people }: { registerId: string; people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/registers/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registerId,
        kind: data.get("kind"),
        happenedOn: data.get("happenedOn") || undefined,
        text: data.get("text"),
        personId: data.get("personId") || undefined,
        otherPersonId: data.get("otherPersonId") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that line.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="register-line-form">
      <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="baptism">Baptism</option>
        <option value="marriage">Marriage</option>
        <option value="burial">Burial</option>
      </select>
      <input name="happenedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="text" required placeholder="The line as the clerk wrote it" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Linked person</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="otherPersonId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Second person (marriage)</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the extract line
      </button>
    </form>
  );
}

export function TaxForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/tax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: data.get("place"),
        year: data.get("year"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that tax list.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="tax-form">
      <input name="place" required placeholder="Cedar Falls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="year" required placeholder="1950" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Assessor notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the tax list
      </button>
    </form>
  );
}

export function TaxNameForm({ listId, people }: { listId: string; people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/tax/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listId,
        name: data.get("name"),
        personId: data.get("personId") || undefined,
        amount: data.get("amount"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that name.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="tax-name-form">
      <input name="name" required placeholder="Samuel Hart" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Link to a person</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="amount" placeholder="$42.00" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the name
      </button>
    </form>
  );
}

export function PassengerForm({ voyageId, people }: { voyageId: string; people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/voyages/passengers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voyageId,
        personId: data.get("personId"),
        age: data.get("age") || undefined,
        role: data.get("role"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that passenger.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="passenger-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who sailed</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="age" placeholder="Age on the list" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="role" placeholder="passenger" defaultValue="passenger" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Cabin, ticket, notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the passenger list
      </button>
    </form>
  );
}

export function SavedSearchForm({ query = "" }: { query?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        query: data.get("query"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that search.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
    router.push("/searches");
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="saved-search-form">
      <input name="title" placeholder="A name for this search" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="query" required defaultValue={query} placeholder="harvest dance" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save this search
      </button>
    </form>
  );
}

export function PhotoNoteForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/photo-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        text: data.get("text"),
        x: data.get("x") || undefined,
        y: data.get("y") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that sticky note.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="photo-note-form">
      <input name="text" required placeholder="Mother cuts the Sunday rolls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="x" placeholder="Left % (12)" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="y" placeholder="Top % (20)" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Stick a note on the photo
      </button>
    </form>
  );
}

export function ConsentForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        granted: data.get("granted") === "yes",
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that consent.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="consent-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Living adult</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="granted" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="yes">They consent to appear on a share link</option>
        <option value="no">Do not include them on share links</option>
      </select>
      <input name="notes" placeholder="How they said yes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FormError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record consent
      </button>
    </form>
  );
}
