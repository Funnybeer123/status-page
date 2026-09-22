"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function FieldError({ error }: { error: string }) {
  return error ? <p className="font-sans text-sm text-seal">{error}</p> : null;
}

export function MarginNoteForm({ letterId }: { letterId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/margins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line: data.get("line"), body: data.get("body") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not pin that note.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="margin-form">
      <input name="line" type="number" min={1} placeholder="Line number" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="body" placeholder="Mother still told it this way." className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Pin a margin note
      </button>
    </form>
  );
}

export function WillWitnessForm({
  people,
  wills,
}: {
  people: { id: string; displayName: string }[];
  wills: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/wills/witnesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: data.get("documentId"),
        personId: data.get("personId"),
        stoodOn: data.get("stoodOn"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that witness.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="will-witness-form">
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which will</option>
        {wills.map((will) => (
          <option key={will.id} value={will.id}>{will.title}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who stood</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="stoodOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record a will witness
      </button>
    </form>
  );
}

export function NamedByForm({
  people,
}: {
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        kind: data.get("kind") || "birth",
        name: data.get("name"),
        namedById: data.get("namedById") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save who named them.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="named-by-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">The child</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="name" placeholder="Lily" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" defaultValue="birth">
        <option value="birth">Birth name</option>
        <option value="nickname">Nickname</option>
        <option value="aka">Also known as</option>
        <option value="maiden">Maiden name</option>
      </select>
      <select name="namedById" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who named them</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember who named them
      </button>
    </form>
  );
}

export function CrestForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/crests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        blazon: data.get("blazon"),
        tincture: data.get("tincture"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that crest.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="crest-form">
      <input name="title" placeholder="Hart arms" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="blazon" placeholder="Argent, a cottonwood proper" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="tincture" placeholder="Azure and or" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the crest
      </button>
    </form>
  );
}

export function HolderForm({
  people,
  letters,
}: {
  people: { id: string; displayName: string }[];
  letters: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/originals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: data.get("documentId"), personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save who holds it.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="holder-form">
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which original</option>
        {letters.map((letter) => (
          <option key={letter.id} value={letter.id}>{letter.title}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who holds it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the holder
      </button>
    </form>
  );
}

export function PhraseForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/phrases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phrase: data.get("phrase"),
        meaning: data.get("meaning"),
        language: data.get("language"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that phrase.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="phrase-form">
      <input name="phrase" placeholder="He called me Whitaker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="meaning" placeholder="A compliment" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="language" placeholder="English" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a family phrase
      </button>
    </form>
  );
}

export function ProgramForm({
  reunionId,
  people,
}: {
  reunionId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/reunions/${reunionId}/program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        startsAt: data.get("startsAt"),
        personId: data.get("personId") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that program item.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="program-form">
      <input name="title" placeholder="Grace" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="startsAt" placeholder="noon" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who leads it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the program
      </button>
    </form>
  );
}

export function SitterForm({
  people,
  photos,
}: {
  people: { id: string; displayName: string }[];
  photos: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/sitters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: data.get("assetId"), personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the sitter.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="sitter-form">
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which portrait</option>
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>{photo.title}</option>
        ))}
      </select>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who sat</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the sitter
      </button>
    </form>
  );
}

export function MiddleNameForm({
  people,
}: {
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personId = String(data.get("personId") || "");
    const response = await fetch(`/api/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ middleName: data.get("middleName") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that middle name.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="middle-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="middleName" placeholder="Mae" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the middle name
      </button>
    </form>
  );
}

export function PaperPickForm({
  letters,
}: {
  letters: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const letterId = String(data.get("documentId") || "");
    const response = await fetch(`/api/letters/${letterId}/paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperMill: data.get("paperMill") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the paper mill.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="paper-pick-form">
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which letter</option>
        {letters.map((letter) => (
          <option key={letter.id} value={letter.id}>{letter.title}</option>
        ))}
      </select>
      <input name="paperMill" placeholder="Crane & Co., Dalton" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the paper mill
      </button>
    </form>
  );
}

export function PaperMillForm({ letterId, paperMill }: { letterId: string; paperMill?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperMill: data.get("paperMill") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the paper mill.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="paper-form">
      <input
        name="paperMill"
        defaultValue={paperMill || ""}
        placeholder="Crane & Co., Dalton"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <FieldError error={error} />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the paper mill
      </button>
    </form>
  );
}
