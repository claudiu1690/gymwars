const API_URL =
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.PROD ? "/api" : "http://localhost:4101");

export function getToken() {
  return localStorage.getItem("gw_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("gw_token", token);
  else localStorage.removeItem("gw_token");
}

/**
 * Fetch wrapper: attaches the JWT, parses JSON, throws Error(message) on
 * non-2xx. A 401 clears the stored token so the router bounces to /login.
 */
export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("gw:logout"));
  }
  if (!res.ok) {
    const err = new Error(
      data?.message || data?.error || `Request failed (${res.status})`,
    );
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}
