import { useState } from "react";
import { api, list } from "../api.js";
import { useAuth } from "../auth.jsx";
import {
  Badge, Button, Error_, Field, Input, LinesEditor, Modal, PageHeader, Pager, Select, Table, Textarea,
  cleanLines, date, dateInput, label, money, useFetch,
} from "../ui.jsx";

// Generic list + create/edit/archive page. Only admin can change things.
function Crud({ title, path, columns, blank, form, toBody, fromRow, extra }) {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | {id?, values}
  const [err, setErr] = useState("");
  const limit = 20;
  const { data, error, reload } = useFetch(
    () => list(path, { page, limit, sort: "-createdAt", active: true }),
    [page]
  );
  const ctx = useFetch(() => (extra ? extra() : Promise.resolve({})), []);

  const open = (row) => {
    setErr("");
    setModal(row ? { id: row._id, values: fromRow ? fromRow(row) : row } : { values: blank });
  };
  const set = (patch) => setModal({ ...modal, values: { ...modal.values, ...patch } });
  const save = async () => {
    setErr("");
    try {
      const body = toBody ? toBody(modal.values) : modal.values;
      if (modal.id) await api.patch(`${path}/${modal.id}`, body);
      else await api.post(path, body);
      setModal(null);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };
  const archive = async (row) => {
    if (!confirm("Archive this record? Existing subscriptions and invoices keep working.")) return;
    try {
      await api.del(`${path}/${row._id}`);
      reload();
    } catch (e) {
      alert(e.message);
    }
  };

  const cols = [...columns(ctx.data || {})];
  if (isAdmin)
    cols.push({
      header: "",
      right: true,
      render: (r) => (
        <span className="whitespace-nowrap">
          <Button variant="ghost" onClick={() => open(r)}>Edit</Button>
          <Button variant="ghost" className="!text-red-600" onClick={() => archive(r)}>Archive</Button>
        </span>
      ),
    });

  return (
    <div>
      <PageHeader title={title}>{isAdmin && <Button onClick={() => open()}>+ New</Button>}</PageHeader>
      {!isAdmin && <p className="mb-3 text-sm text-slate-500">Only the admin can change these.</p>}
      <Error_>{error}</Error_>
      <div className="rounded-lg border bg-white">
        <Table columns={cols} rows={data?.rows || []} />
      </div>
      <Pager page={page} limit={limit} total={data?.total || 0} onPage={setPage} />
      {modal && (
        <Modal title={`${modal.id ? "Edit" : "New"} ${title.toLowerCase().replace(/s$/, "")}`} onClose={() => setModal(null)} wide>
          <Error_>{err}</Error_>
          {form(modal.values, set, ctx.data || {})}
          <div className="mt-2 flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const T = ({ l, v, set, k, ...p }) => (
  <Field label={l}><Input value={v[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} {...p} /></Field>
);
const Check = ({ l, v, set, k }) => (
  <label className="mb-2 flex items-center gap-2 text-sm">
    <input type="checkbox" checked={!!v[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {l}
  </label>
);
const loadTaxes = async () => ({ taxes: (await list("/taxes", { limit: 200, active: true })).rows });
const loadProducts = async () => ({ products: (await list("/products", { limit: 500, active: true })).rows });
const num = (x) => (x === "" || x === undefined ? undefined : Number(x));

// ---------------- Products (with variants) ----------------
export function Products() {
  return (
    <Crud
      title="Products"
      path="/products"
      extra={loadTaxes}
      blank={{ name: "", type: "software", salesPrice: "", costPrice: "", notes: "", variants: [], taxes: [] }}
      fromRow={(r) => ({ ...r, taxes: (r.taxes || []).map((t) => t._id || t) })}
      toBody={(v) => ({
        name: v.name, type: v.type, notes: v.notes, taxes: v.taxes,
        salesPrice: Number(v.salesPrice), costPrice: Number(v.costPrice) || 0,
        variants: v.variants.map((x) => ({ ...(x._id ? { _id: x._id } : {}), attribute: x.attribute, value: x.value, extraPrice: Number(x.extraPrice) || 0 })),
      })}
      columns={() => [
        { header: "Name", key: "name" },
        { header: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
        { header: "Sales price", render: (r) => money(r.salesPrice) },
        { header: "Cost", render: (r) => money(r.costPrice) },
        { header: "Variants", render: (r) => r.variants?.length || 0 },
      ]}
      form={(v, set, ctx) => (
        <>
          <div className="grid grid-cols-2 gap-x-3">
            <T l="Name" k="name" v={v} set={set} />
            <Field label="Type">
              <Select value={v.type} onChange={(e) => set({ type: e.target.value })} options={["software", "add-on", "service", "other"].map((x) => ({ value: x, label: x }))} />
            </Field>
            <T l="Sales price" k="salesPrice" type="number" v={v} set={set} />
            <T l="Cost price" k="costPrice" type="number" v={v} set={set} />
          </div>
          <Field label="Notes"><Textarea value={v.notes || ""} onChange={(e) => set({ notes: e.target.value })} /></Field>
          <Field label="Taxes (hold Ctrl/Cmd to pick several)">
            <select multiple className="w-full rounded-md border border-slate-300 p-1 text-sm" value={v.taxes}
              onChange={(e) => set({ taxes: [...e.target.selectedOptions].map((o) => o.value) })}>
              {(ctx.taxes || []).map((t) => <option key={t._id} value={t._id}>{t.name} ({t.type === "percentage" ? `${t.value}%` : t.value})</option>)}
            </select>
          </Field>
          <div className="mb-3">
            <span className="mb-1 block text-sm font-medium">Variants (e.g. Brand: Odoo, +560)</span>
            {v.variants.map((x, i) => (
              <div key={i} className="mb-2 grid grid-cols-12 gap-2">
                <div className="col-span-4"><Input placeholder="Attribute" value={x.attribute} onChange={(e) => set({ variants: v.variants.map((y, j) => j === i ? { ...y, attribute: e.target.value } : y) })} /></div>
                <div className="col-span-4"><Input placeholder="Value" value={x.value} onChange={(e) => set({ variants: v.variants.map((y, j) => j === i ? { ...y, value: e.target.value } : y) })} /></div>
                <div className="col-span-3"><Input type="number" placeholder="Extra price" value={x.extraPrice} onChange={(e) => set({ variants: v.variants.map((y, j) => j === i ? { ...y, extraPrice: e.target.value } : y) })} /></div>
                <button className="col-span-1 text-red-600" onClick={() => set({ variants: v.variants.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => set({ variants: [...v.variants, { attribute: "Brand", value: "", extraPrice: 0 }] })}>+ Add variant</Button>
          </div>
        </>
      )}
    />
  );
}

// ---------------- Plans ----------------
export function Plans() {
  return (
    <Crud
      title="Plans"
      path="/plans"
      blank={{ name: "", price: "", billingPeriod: "monthly", minQuantity: 1, startDate: "", endDate: "", autoClose: false, allowEarlyClose: false, allowPause: false, allowRenew: false, description: "" }}
      fromRow={(r) => ({ ...r, startDate: dateInput(r.startDate), endDate: dateInput(r.endDate) })}
      toBody={(v) => ({
        name: v.name, description: v.description, billingPeriod: v.billingPeriod,
        price: Number(v.price), minQuantity: Number(v.minQuantity) || 1,
        startDate: v.startDate, endDate: v.endDate || undefined,
        autoClose: v.autoClose, allowEarlyClose: v.allowEarlyClose, allowPause: v.allowPause, allowRenew: v.allowRenew,
      })}
      columns={() => [
        { header: "Name", key: "name" },
        { header: "Price", render: (r) => money(r.price) },
        { header: "Billing", render: (r) => <span className="capitalize">{r.billingPeriod}</span> },
        { header: "Min qty", key: "minQuantity" },
        { header: "Available", render: (r) => `${date(r.startDate)} → ${r.endDate ? date(r.endDate) : "open"}` },
        { header: "Options", render: (r) => [r.autoClose && "auto-close", r.allowEarlyClose && "early close", r.allowPause && "pause", r.allowRenew && "renew"].filter(Boolean).join(", ") || "-" },
      ]}
      form={(v, set) => (
        <>
          <div className="grid grid-cols-2 gap-x-3">
            <T l="Name" k="name" v={v} set={set} />
            <T l="Price" k="price" type="number" v={v} set={set} />
            <Field label="Billing period">
              <Select value={v.billingPeriod} onChange={(e) => set({ billingPeriod: e.target.value })} options={["daily", "weekly", "monthly", "yearly"].map((x) => ({ value: x, label: x }))} />
            </Field>
            <T l="Minimum quantity" k="minQuantity" type="number" v={v} set={set} />
            <T l="Available from" k="startDate" type="date" v={v} set={set} />
            <T l="Available until (optional)" k="endDate" type="date" v={v} set={set} />
          </div>
          <T l="Description" k="description" v={v} set={set} />
          <Check l="Close automatically when the plan ends" k="autoClose" v={v} set={set} />
          <Check l="Allow early close" k="allowEarlyClose" v={v} set={set} />
          <Check l="Allow pause" k="allowPause" v={v} set={set} />
          <Check l="Allow renew" k="allowRenew" v={v} set={set} />
        </>
      )}
    />
  );
}

// ---------------- Taxes ----------------
export function Taxes() {
  return (
    <Crud
      title="Taxes"
      path="/taxes"
      blank={{ name: "", type: "percentage", value: "", description: "" }}
      toBody={(v) => ({ name: v.name, type: v.type, value: Number(v.value), description: v.description })}
      columns={() => [
        { header: "Name", key: "name" },
        { header: "Rule", render: (r) => (r.type === "percentage" ? `${r.value}%` : `${money(r.value)} fixed`) },
        { header: "Description", render: (r) => r.description || "-" },
      ]}
      form={(v, set) => (
        <>
          <T l="Name" k="name" v={v} set={set} />
          <Field label="Type"><Select value={v.type} onChange={(e) => set({ type: e.target.value })} options={[{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed amount" }]} /></Field>
          <T l="Value" k="value" type="number" v={v} set={set} />
          <T l="Description" k="description" v={v} set={set} />
        </>
      )}
    />
  );
}

// ---------------- Discounts ----------------
export function Discounts() {
  return (
    <Crud
      title="Discounts"
      path="/discounts"
      extra={loadProducts}
      blank={{ name: "", type: "percentage", value: "", minPurchase: 0, minQuantity: 0, startDate: "", endDate: "", usageLimit: "", appliesTo: "subscription", products: [] }}
      fromRow={(r) => ({ ...r, startDate: dateInput(r.startDate), endDate: dateInput(r.endDate), usageLimit: r.usageLimit ?? "", products: (r.products || []).map((p) => p._id || p) })}
      toBody={(v) => ({
        name: v.name, type: v.type, value: Number(v.value), appliesTo: v.appliesTo,
        minPurchase: Number(v.minPurchase) || 0, minQuantity: Number(v.minQuantity) || 0,
        startDate: v.startDate, endDate: v.endDate, usageLimit: num(v.usageLimit) ?? null,
        products: v.appliesTo === "product" ? v.products : [],
      })}
      columns={() => [
        { header: "Name", key: "name" },
        { header: "Value", render: (r) => (r.type === "percentage" ? `${r.value}%` : money(r.value)) },
        { header: "Applies to", render: (r) => <span className="capitalize">{r.appliesTo}</span> },
        { header: "Valid", render: (r) => `${date(r.startDate)} → ${date(r.endDate)}` },
        { header: "Used", render: (r) => `${r.usedCount}${r.usageLimit ? ` / ${r.usageLimit}` : ""}` },
      ]}
      form={(v, set, ctx) => (
        <>
          <div className="grid grid-cols-2 gap-x-3">
            <T l="Name" k="name" v={v} set={set} />
            <Field label="Type"><Select value={v.type} onChange={(e) => set({ type: e.target.value })} options={[{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed amount" }]} /></Field>
            <T l="Value" k="value" type="number" v={v} set={set} />
            <Field label="Applies to"><Select value={v.appliesTo} onChange={(e) => set({ appliesTo: e.target.value })} options={[{ value: "subscription", label: "Whole subscriptions" }, { value: "product", label: "Specific products" }]} /></Field>
            <T l="Minimum purchase" k="minPurchase" type="number" v={v} set={set} />
            <T l="Minimum quantity" k="minQuantity" type="number" v={v} set={set} />
            <T l="Start date" k="startDate" type="date" v={v} set={set} />
            <T l="End date" k="endDate" type="date" v={v} set={set} />
            <T l="Usage limit (blank = unlimited)" k="usageLimit" type="number" v={v} set={set} />
          </div>
          {v.appliesTo === "product" && (
            <Field label="Products (hold Ctrl/Cmd to pick several)">
              <select multiple className="w-full rounded-md border border-slate-300 p-1 text-sm" value={v.products}
                onChange={(e) => set({ products: [...e.target.selectedOptions].map((o) => o.value) })}>
                {(ctx.products || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
          )}
        </>
      )}
    />
  );
}

// ---------------- Quotation templates ----------------
export function Templates() {
  return (
    <Crud
      title="Quotation templates"
      path="/quotation-templates"
      extra={async () => ({
        ...(await loadProducts()),
        plans: (await list("/plans", { limit: 200, active: true })).rows,
      })}
      blank={{ name: "", plan: "", validityDays: 30, notes: "", lines: [{ product: "", variant: "", quantity: 1 }] }}
      fromRow={(r) => ({
        ...r, plan: r.plan?._id || r.plan,
        lines: r.lines.map((l) => ({ product: l.product?._id || l.product, variant: l.variant || "", quantity: l.quantity })),
      })}
      toBody={(v) => ({ name: v.name, plan: v.plan, validityDays: Number(v.validityDays) || 30, notes: v.notes, lines: cleanLines(v.lines) })}
      columns={(ctx) => [
        { header: "Name", key: "name" },
        { header: "Plan", render: (r) => (ctx.plans || []).find((p) => p._id === (r.plan?._id || r.plan))?.name || "-" },
        { header: "Valid for", render: (r) => `${r.validityDays} days` },
        { header: "Lines", render: (r) => r.lines?.length },
      ]}
      form={(v, set, ctx) => (
        <>
          <div className="grid grid-cols-2 gap-x-3">
            <T l="Name" k="name" v={v} set={set} />
            <Field label="Plan"><Select placeholder="Select plan" value={v.plan} onChange={(e) => set({ plan: e.target.value })} options={(ctx.plans || []).map((p) => ({ value: p._id, label: `${p.name} (${p.billingPeriod})` }))} /></Field>
            <T l="Valid for (days)" k="validityDays" type="number" v={v} set={set} />
            <T l="Notes" k="notes" v={v} set={set} />
          </div>
          <LinesEditor lines={v.lines} setLines={(lines) => set({ lines })} products={ctx.products || []} />
        </>
      )}
    />
  );
}
