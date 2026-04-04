/**
 * Base da API para `fetch` no browser.
 * - `NEXT_PUBLIC_API_URL`: URL explícita (precisa estar definida no build para ir no bundle).
 * - Produção sem essa var: `/api-backend` → rewrite em `next.config.ts` se `API_URL` estiver no build.
 * - Dev local: fallback `http://localhost:3001` (API Nest; front usa porta 4000).
 */
export function getApiBase() {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;
  if (process.env.NODE_ENV === "production") {
    return "/api-backend";
  }
  return "http://localhost:3001";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  });
  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (typeof body.message === "string") {
        message = body.message;
      } else if (text) {
        message = text;
      }
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
