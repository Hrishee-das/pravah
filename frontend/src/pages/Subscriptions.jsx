import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, list } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Badge, Button, Error_, Field, Input, LinesEditor, Modal, PageHeader, Pager, Select, Table, cleanLines, date, label, money, useFetch } from "../ui.jsx";

export const STATUSES = ["draft", "quotation", "confirmed", "active", "closed"];
const TERMS = ["immediate", "15_days", "30_days", "45_days", "60_days"];

export default function Subscriptions() {
  const { isTeam } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const limit = 20;
  const { data, error } = useFetch(
    () => list("/subscriptions", { page, limit, sort: "-createdAt", status }),
    [page, status]
  );

  return (
    <div>
      <PageHeader title={isTeam ? "Subscriptions" : "My subscriptions"}>
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />
        {isTeam && <Button onClick={() => setModal(true)}>+ New subscription</Button>}
      </PageHeader>
      <Error_>{error}</Error_>
      <div className="rounded-lg border bg-white">
        <Table
          onRowClick={(r) => nav(`/subscriptions/${r._id}`)}
          columns={[
            { header: "Number", render: (r) => <span className="font-medium text-indigo-600">{r.number}</span> },
            ...(isTeam ? [{ header: "Customer", render: (r) => r.customer?.name }] : []),
            { header: "Plan", render: (r) => r.plan?.name },
            { header: "Start", render: (r) => date(r.startDate) },
            { header: "Expiry", render: (r) => date(r.expiryDate) },
            { header: "Status", render: (r) => (<span className="flex gap-1"><Badge value={r.status} />{r.paused && <Badge value="paused" />}</span>) },
            { header: "Total", right: true, render: (r) => money(r.total) },
          ]}
          rows={data?.rows || []}
        />
      </div>
      <Pager page={page} limit={limit} total={data?.total || 0} onPage={setPage} />
      {modal && <NewSubscription onClose={() => setModal(false)} onCreated={(id) => nav(`/subscriptions/${id}`)} />}
    </div>
  );
}

function NewSubscription({ onClose, onCreated }) {
  const [f, setF] = useState({ customer: "", template: "", plan: "", startDate: "", expiryDate: "", paymentTerms: "immediate" });
  const [lines, setLines] = useState([]);
  const [err, setErr] = useState("");
  const { data } = useFetch(async () => {
    const [c, t, p, pr] = await Promise.all([
      list("/users", { role: "customer", limit: 500, sort: "name" }),
      list("/quotation-templates", { limit: 200, active: true }),
      list("/plans", { limit: 200, active: true }),
      list("/products", { limit: 500, active: true }),
    ]);
    return { customers: c.rows, templates: t.rows, plans: p.rows, products: pr.rows };
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setErr("");
    try {
      const body = { customer: f.customer, startDate: f.startDate, paymentTerms: f.paymentTerms };
      if (f.expiryDate) body.expiryDate = f.expiryDate;
      if (f.template) body.template = f.template;
      if (f.plan) body.plan = f.plan;
      const l = cleanLines(lines.filter((x) => x.product));
      if (l.length) body.lines = l;
      const r = await api.post("/subscriptions", body);
      onCreated(r.data.data._id);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Modal title="New subscription" onClose={onClose} wide>
      <Error_>{err}</Error_>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Customer">
          <Select placeholder="Select customer" value={f.customer} onChange={set("customer")} options={(data?.customers || []).map((c) => ({ value: c._id, label: `${c.name} (${c.email})` }))} />
        </Field>
        <Field label="Start from quotation template" hint="Fills in plan and lines for you.">
          <Select placeholder="None" value={f.template} onChange={set("template")} options={(data?.templates || []).map((t) => ({ value: t._id, label: t.name }))} />
        </Field>
        {!f.template && (
          <Field label="Plan">
            <Select placeholder="Select plan" value={f.plan} onChange={set("plan")} options={(data?.plans || []).map((p) => ({ value: p._id, label: `${p.name} - ${money(p.price)}/${p.billingPeriod}` }))} />
          </Field>
        )}
        <Field label="Start date"><Input type="date" value={f.startDate} onChange={set("startDate")} /></Field>
        <Field label="Expiry date (optional)"><Input type="date" value={f.expiryDate} onChange={set("expiryDate")} /></Field>
        <Field label="Payment terms">
          <Select value={f.paymentTerms} onChange={set("paymentTerms")} options={TERMS.map((t) => ({ value: t, label: label(t) }))} />
        </Field>
      </div>
      {!f.template && <LinesEditor lines={lines} setLines={setLines} products={data?.products || []} />}
      {f.template && <p className="mb-3 text-sm text-slate-500">Lines will be copied from the template.</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={!f.customer || !f.startDate}>Create draft</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
