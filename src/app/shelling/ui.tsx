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

export function ShellingForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/shelling", {
      ownerId: data.get("ownerId"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that corn-shelling bee.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="shelling-form">
      <PeopleSelect name="ownerId" label="Whose crib" people={people} />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a corn-shelling bee
      </button>
    </form>
  );
}

export function ShellingGuestForm({
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
    const response = await postJson("/api/shelling", {
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
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="shelling-guest-form">
      {!beeId && bees ? (
        <select name="beeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which crib</option>
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

export function TeamForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/teams", {
      lenderId: data.get("lenderId"),
      borrowerId: data.get("borrowerId"),
      purpose: data.get("purpose"),
      loanedOn: data.get("loanedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that team.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="team-form">
      <PeopleSelect name="lenderId" label="Who loaned" people={people} />
      <PeopleSelect name="borrowerId" label="Who borrowed" people={people} />
      <input name="purpose" placeholder="harvest hauling" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="loanedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the team
      </button>
    </form>
  );
}

export function SmokehouseForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/smokehouse", {
      personId: data.get("personId"),
      item: data.get("item"),
      hungOn: data.get("hungOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that inventory.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="smokehouse-form">
      <PeopleSelect name="personId" label="Whose meat" people={people} />
      <input name="item" placeholder="hams" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="hungOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record what was hanging
      </button>
    </form>
  );
}

export function AssessmentForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/assessments", {
      company: data.get("company"),
      loss: data.get("loss"),
      assessedOn: data.get("assessedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that assessment.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="assessment-form">
      <input name="company" placeholder="Cedar Falls Farmers Mutual" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="loss" placeholder="barn fire" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="assessedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start an assessment
      </button>
    </form>
  );
}

export function AssessmentMemberForm({
  people,
  assessments,
  assessmentId,
}: {
  people: Person[];
  assessments?: { id: string; title: string }[];
  assessmentId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/assessments", {
      assessmentId: assessmentId || data.get("assessmentId"),
      personId: data.get("personId"),
      paid: data.get("paid"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that payment.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="assessment-member-form">
      {!assessmentId && assessments ? (
        <select name="assessmentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which assessment</option>
          {assessments.map((row) => (
            <option key={row.id} value={row.id}>{row.title}</option>
          ))}
        </select>
      ) : null}
      <PeopleSelect name="personId" label="Who paid" people={people} />
      <input name="paid" placeholder="$4.50" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record what they paid
      </button>
    </form>
  );
}

export function CellarForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/cellars", {
      storm: data.get("storm"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that cellar list.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="cellar-form">
      <input name="storm" placeholder="1947 tornado" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a cellar list
      </button>
    </form>
  );
}

export function CellarGuestForm({
  people,
  cellars,
  cellarId,
}: {
  people: Person[];
  cellars?: { id: string; title: string }[];
  cellarId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/cellars", {
      cellarId: cellarId || data.get("cellarId"),
      personId: data.get("personId"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record who sheltered.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="cellar-guest-form">
      {!cellarId && cellars ? (
        <select name="cellarId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which storm</option>
          {cellars.map((row) => (
            <option key={row.id} value={row.id}>{row.title}</option>
          ))}
        </select>
      ) : null}
      <PeopleSelect name="personId" label="Who sheltered" people={people} />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record who sheltered
      </button>
    </form>
  );
}

export function CakeForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/cakes", {
      cutterId: data.get("cutterId"),
      couple: data.get("couple"),
      wedding: data.get("wedding"),
      cutOn: data.get("cutOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that cake.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="cake-form">
      <PeopleSelect name="cutterId" label="Who cut" people={people} />
      <input name="couple" placeholder="Margaret and Wei Chen" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="wedding" placeholder="Chen wedding" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="cutOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record who cut the cake
      </button>
    </form>
  );
}

export function DistrictForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/districts", {
      personId: data.get("personId"),
      district: data.get("district"),
      startedOn: data.get("startedOn"),
      endedOn: data.get("endedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that district.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="district-form">
      <PeopleSelect name="personId" label="Overseer" people={people} />
      <input name="district" placeholder="District 4" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
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

export function ButcheringForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/butchering", {
      title: data.get("title"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that hog day.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="butchering-form">
      <input name="title" placeholder="North-farm hog day" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a hog-butchering crew
      </button>
    </form>
  );
}

export function ButcheringWorkerForm({
  people,
  crews,
  crewId,
}: {
  people: Person[];
  crews?: { id: string; title: string }[];
  crewId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/butchering", {
      crewId: crewId || data.get("crewId"),
      personId: data.get("personId"),
      job: data.get("job"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that job.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="butchering-worker-form">
      {!crewId && crews ? (
        <select name="crewId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
          <option value="">Which hog day</option>
          {crews.map((row) => (
            <option key={row.id} value={row.id}>{row.title}</option>
          ))}
        </select>
      ) : null}
      <PeopleSelect name="personId" label="Who came" people={people} />
      <input name="job" placeholder="stick" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the job
      </button>
    </form>
  );
}

export function RecitalForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/recitals", {
      personId: data.get("personId"),
      piece: data.get("piece"),
      kind: data.get("kind"),
      heldOn: data.get("heldOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that part.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="recital-form">
      <PeopleSelect name="personId" label="Who recited or sang" people={people} />
      <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="recited">recited</option>
        <option value="sang">sang</option>
      </select>
      <input name="piece" placeholder="Silent Night" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="heldOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="St. John's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the part
      </button>
    </form>
  );
}

export function PeddlerForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/peddlers", {
      peddler: data.get("peddler"),
      goods: data.get("goods"),
      buyerId: data.get("buyerId"),
      visitedOn: data.get("visitedOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that visit.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="peddler-form">
      <input name="peddler" placeholder="Watkins" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="goods" placeholder="vanilla" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <PeopleSelect name="buyerId" label="Sold to" people={people} />
      <input name="visitedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the visit
      </button>
    </form>
  );
}

export function StrayForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/strays", {
      personId: data.get("personId"),
      animal: data.get("animal"),
      postedOn: data.get("postedOn"),
      place: data.get("place"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that notice.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="stray-form">
      <PeopleSelect name="personId" label="Who posted" people={people} />
      <input name="animal" placeholder="a sow" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="postedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="North township road" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the notice
      </button>
    </form>
  );
}

export function ShowForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/shows", {
      personId: data.get("personId"),
      item: data.get("item"),
      show: data.get("show"),
      boughtOn: data.get("boughtOn"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that purchase.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="show-form">
      <PeopleSelect name="personId" label="Who bought" people={people} />
      <input name="item" placeholder="a tonic" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="show" placeholder="Cedar Falls medicine show" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="boughtOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the purchase
      </button>
    </form>
  );
}

export function MoldForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await postJson("/api/molds", {
      personId: data.get("personId"),
      mark: data.get("mark"),
      notes: data.get("notes"),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that mark.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="mold-form">
      <PeopleSelect name="personId" label="Whose mold" people={people} />
      <input name="mark" placeholder="H" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the mark
      </button>
    </form>
  );
}
