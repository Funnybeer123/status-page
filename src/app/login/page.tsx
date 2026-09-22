"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const demo = params.get("demo") === "1";
  const [email, setEmail] = useState(demo ? "demo@familylineage.app" : "");
  const [password, setPassword] = useState(demo ? "harvest-dance" : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      setError("Those credentials were not recognized.");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="font-display text-3xl">
        Family Lineage
      </Link>
      <h1 className="mt-8 font-display text-4xl">Sign in</h1>
      <p className="mt-3 text-bark">
        Demo family: <span className="text-ink">demo@familylineage.app</span> /{" "}
        <span className="text-ink">harvest-dance</span>
      </p>
      <form onSubmit={onSubmit} className="paper-card mt-8 space-y-4 p-6">
        <label className="block font-sans text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block font-sans text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
        <button type="submit" disabled={busy} data-testid="login-submit" className="w-full rounded-full bg-seal py-2.5 font-sans text-cream">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 font-sans text-sm text-bark">
        New here? <Link href="/signup" className="text-seal">Create an account</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
