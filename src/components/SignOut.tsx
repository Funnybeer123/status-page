"use client";

import { signOut } from "next-auth/react";

export function SignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-bark/15 px-3 py-1.5 text-bark hover:border-seal hover:text-seal"
    >
      Sign out
    </button>
  );
}
