const BASE = "/api/v1".replace(/\/$/, "");

export const getToken = () => localStorage.getItem("token");
export const setToken = (t) =>
  t ? localStorage.setItem("token", t) : localStorage.removeItem("token");

async function request(method, path, body, raw) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (raw) {
    if (!res.ok) throw new Error("Request failed");
    return res.text();
  }
  if (res.status === 204) return null;
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/users/login")) {
      setToken(null);
      window.location.href = "/login";
    }
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b ?? {}),
  patch: (p, b) => request("PATCH", p, b ?? {}),
  del: (p) => request("DELETE", p),
  text: (p) => request("GET", p, undefined, true),
};

// Turn { a: 1, b: undefined } into "?a=1"
export const qs = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// List endpoints -> { rows, total }
export const list = async (path, params) => {
  const r = await api.get(path + qs(params));
  return { rows: r.data.data, total: r.total ?? r.data.data.length };
};
