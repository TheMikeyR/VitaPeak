export async function apiFetch<T>(
  path: string,
  init: RequestInit & { jwt?: string | null } = {},
): Promise<T> {
  const { jwt, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function getJwt(): Promise<string | null> {
  try {
    const res = await fetch('/auth/token', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}
