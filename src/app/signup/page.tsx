"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const invite = params.get("invite") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, invite, familyName }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setBusy(false);
      setError(payload.error || "Could not create the account.");
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push(invite ? "/tree" : "/families");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="font-display text-3xl">
        Family Lineage
      </Link>
      <h1 className="mt-8 font-display text-4xl">Create an account</h1>
      <form onSubmit={onSubmit} className="paper-card mt-8 space-y-4 p-6">
        <label className="block font-sans text-sm">
          Your name
          <input className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block font-sans text-sm">
          Email
          <input className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block font-sans text-sm">
          Password
          <input className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        {invite ? (
          <p className="font-sans text-sm text-moss">You are joining a family with an invite.</p>
        ) : (
          <label className="block font-sans text-sm">
            Start a family (optional)
            <input className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Hart family" />
          </label>
        )}
        {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
        <button type="submit" disabled={busy} data-testid="signup-submit" className="w-full rounded-full bg-seal py-2.5 font-sans text-cream">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 font-sans text-sm text-bark">
        Already have an account? <Link href="/login" className="text-seal">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
