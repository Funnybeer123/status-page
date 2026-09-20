export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export class ApiClient {
  cookies = new Map<string, string>();

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  absorb(response: Response) {
    const list =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    for (const raw of list) {
      const pair = raw.split(";", 1)[0];
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (raw.toLowerCase().includes("max-age=0") || value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const cookie = this.header();
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
    this.absorb(response);
    return response;
  }

  async json<T = Record<string, unknown>>(path: string, init: RequestInit = {}) {
    const response = await this.request(path, init);
    const text = await response.text();
    let body: T | { error?: string } = {} as T;
    try {
      body = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      body = { error: text } as T;
    }
    return { status: response.status, body: body as T & { error?: string }, response };
  }

  async html(path: string) {
    const response = await this.request(path);
    return { status: response.status, text: await response.text(), response };
  }

  async signup(input: { name: string; email: string; password: string; familyName?: string; invite?: string }) {
    return this.json("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async signIn(email: string, password: string) {
    const csrf = await this.json<{ csrfToken: string }>("/api/auth/csrf");
    const form = new URLSearchParams({
      csrfToken: csrf.body.csrfToken,
      email,
      password,
      callbackUrl: `${BASE_URL}/tree`,
      json: "true",
    });
    const response = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const session = await this.json<{ user?: { id: string; email: string; name?: string } }>("/api/auth/session");
    return { status: response.status, session: session.body };
  }

  async session() {
    return this.json<{ user?: { id: string; email: string; name?: string } }>("/api/auth/session");
  }
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@familylineage.test`;
}
