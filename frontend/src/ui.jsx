import { useCallback, useEffect, useState } from "react";

export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);
export const date = (d) => (d ? new Date(d).toLocaleDateString() : "-");
export const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const label = (s) => (s || "").replace(/_/g, " ");

// ---------- data hook ----------
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return fn()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, loading, reload: load };
}

// ---------- basic pieces ----------
const btnStyles = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-indigo-600 hover:bg-indigo-50",
};
export function Button({ variant = "primary", className = "", ...p }) {
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${btnStyles[variant]} ${className}`}
    />
  );
}

export function Card({ title, actions, children, className = "" }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const badgeColors = {
  draft: "bg-slate-100 text-slate-700",
  quotation: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  paused: "bg-orange-100 text-orange-800",
};
export function Badge({ value }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        badgeColors[value] || "bg-slate-100 text-slate-700"
      }`}
    >
      {label(value)}
    </span>
  );
}

export const Error_ = ({ children }) =>
  children ? (
    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </div>
  ) : null;
export const Notice = ({ children }) =>
  children ? (
    <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {children}
    </div>
  ) : null;

export const Spinner = () => <p className="p-4 text-sm text-slate-500">Loading...</p>;

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`mt-8 w-full rounded-lg bg-white shadow-xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ---------- form inputs ----------
const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
export function Field({ label: l, children, hint }) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{l}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
export const Input = ({ className = "", ...p }) => <input {...p} className={`${inputCls} ${className}`} />;
export const Textarea = (p) => <textarea rows={3} {...p} className={inputCls} />;
export function Select({ options = [], placeholder, value, ...p }) {
  return (
    <select {...p} value={value ?? ""} className={inputCls}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---------- table + pagination ----------
export function Table({ columns, rows, empty = "Nothing here yet.", onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-3 py-2 font-medium ${c.right ? "text-right" : ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r._id || i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`border-b last:border-0 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-2 ${c.right ? "text-right" : ""}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------- order lines (product + variant + qty) ----------
export function LinesEditor({ lines, setLines, products }) {
  const upd = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  return (
    <div className="mb-3">
      <span className="mb-1 block text-sm font-medium">Lines</span>
      {lines.map((l, i) => {
        const prod = products.find((p) => p._id === l.product);
        return (
          <div key={i} className="mb-2 grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Select
                placeholder="Product"
                value={l.product}
                onChange={(e) => upd(i, { product: e.target.value, variant: "" })}
                options={products.map((p) => ({ value: p._id, label: `${p.name} (${money(p.salesPrice)})` }))}
              />
            </div>
            <div className="col-span-4">
              <Select
                placeholder="No variant"
                value={l.variant}
                onChange={(e) => upd(i, { variant: e.target.value })}
                options={(prod?.variants || []).map((v) => ({
                  value: v._id,
                  label: `${v.attribute}: ${v.value}${v.extraPrice ? ` (+${v.extraPrice})` : ""}`,
                }))}
              />
            </div>
            <div className="col-span-2">
              <Input type="number" min="1" value={l.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} />
            </div>
            <button
              className="col-span-1 text-red-600"
              onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        );
      })}
      <Button variant="ghost" onClick={() => setLines([...lines, { product: "", variant: "", quantity: 1 }])}>
        + Add line
      </Button>
    </div>
  );
}
// Remove empty optional values before sending lines to the API
export const cleanLines = (lines) =>
  lines.map((l) => ({
    product: l.product,
    quantity: Number(l.quantity) || 1,
    ...(l.variant ? { variant: l.variant } : {}),
  }));
