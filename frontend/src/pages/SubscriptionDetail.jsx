import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, list } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Badge, Button, Card, Error_, Notice, PageHeader, Spinner, Table, date, label, money, useFetch } from "../ui.jsx";
import { STATUSES } from "./Subscriptions.jsx";

export default function SubscriptionDetail() {
  const { id } = useParams();
  const { isTeam } = useAuth();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const { data, error, loading, reload } = useFetch(async () => {
    const [s, inv] = await Promise.all([
      api.get(`/subscriptions/${id}`),
      list("/invoices", { subscription: id, sort: "-periodStart", limit: 50 }),
    ]);
    return { s: s.data.data, invoices: inv.rows };
  }, [id]);

  const act = async (action, ok, method = "patch") => {
    setErr("");
    setMsg("");
    try {
      if (method === "post") await api.post(`/invoices`, { subscription: id });
      else await api.patch(`/subscriptions/${id}/${action}`);
      setMsg(ok);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <Error_>{error}</Error_>;
  const s = data.s;
  const plan = s.plan || {};
  const stepIndex = STATUSES.indexOf(s.status);

  return (
    <div>
      <PageHeader title={`Subscription ${s.number}`}>
        {isTeam && s.status === "draft" && <Button onClick={() => act("send-quotation", "Quotation sent.")}>Send quotation</Button>}
        {s.status === "quotation" && <Button onClick={() => act("confirm", "Subscription confirmed.")}>Confirm</Button>}
        {isTeam && s.status === "confirmed" && <Button onClick={() => act("activate", "Subscription activated.")}>Activate</Button>}
        {s.status === "active" && !s.paused && plan.allowPause && <Button variant="secondary" onClick={() => act("pause", "Paused.")}>Pause</Button>}
        {s.status === "active" && s.paused && <Button variant="secondary" onClick={() => act("resume", "Resumed.")}>Resume</Button>}
        {s.status === "active" && plan.allowRenew && <Button variant="secondary" onClick={() => act("renew", "Renewed.")}>Renew</Button>}
        {s.status === "active" && plan.allowEarlyClose && (
          <Button variant="danger" onClick={() => confirm("Close this subscription?") && act("close", "Subscription closed.")}>Close</Button>
        )}
        {isTeam && ["active"].includes(s.status) && !s.paused && <Button variant="secondary" onClick={() => act("", "Invoice created for next period.", "post")}>Create invoice</Button>}
      </PageHeader>
      <Error_>{err || error}</Error_>
      <Notice>{msg}</Notice>

      <div className="mb-4 flex flex-wrap gap-1 text-xs">
        {STATUSES.map((st, i) => (
          <span key={st} className={`rounded-full px-3 py-1 capitalize ${i <= stepIndex ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            {st}
          </span>
        ))}
        {s.paused && <Badge value="paused" />}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card title="Details">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Customer</dt><dd>{s.customer?.name} {s.customer?.company && `(${s.customer.company})`}</dd>
            <dt className="text-slate-500">Plan</dt><dd>{plan.name} - {money(plan.price)} / {plan.billingPeriod}</dd>
            <dt className="text-slate-500">Start date</dt><dd>{date(s.startDate)}</dd>
            <dt className="text-slate-500">Expiry date</dt><dd>{date(s.expiryDate)}</dd>
            <dt className="text-slate-500">Payment terms</dt><dd className="capitalize">{label(s.paymentTerms)}</dd>
            <dt className="text-slate-500">Status</dt><dd><Badge value={s.status} /></dd>
          </dl>
        </Card>
        <Card title="Per-period amount">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Plan fee</dt><dd>{money(s.planPrice)}</dd>
            <dt className="text-slate-500">Subtotal</dt><dd>{money(s.subtotal)}</dd>
            <dt className="text-slate-500">Taxes</dt><dd>{money(s.taxTotal)}</dd>
            <dt className="font-semibold">Total</dt><dd className="font-semibold">{money(s.total)}</dd>
          </dl>
          <p className="mt-2 text-xs text-slate-500">Discounts are applied automatically on invoices.</p>
        </Card>
      </div>

      <Card title="Lines" className="mb-4">
        <Table
          columns={[
            { header: "Product", render: (r) => <div>{r.productName || r.product?.name}{r.variantLabel && <div className="text-xs text-slate-500">{r.variantLabel}</div>}</div> },
            { header: "Qty", key: "quantity" },
            { header: "Unit price", render: (r) => money(r.unitPrice) },
            { header: "Taxes", render: (r) => (r.taxes || []).map((t) => t.name).join(", ") || "-" },
            { header: "Amount", right: true, render: (r) => money(r.amount) },
          ]}
          rows={s.lines}
        />
      </Card>

      <Card title="Invoices">
        <Table
          columns={[
            { header: "Number", render: (r) => <Link className="text-indigo-600" to={`/invoices/${r._id}`}>{r.number}</Link> },
            { header: "Period", render: (r) => `${date(r.periodStart)} - ${date(r.periodEnd)}` },
            { header: "Due", render: (r) => date(r.dueDate) },
            { header: "Status", render: (r) => <Badge value={r.status} /> },
            { header: "Total", right: true, render: (r) => money(r.total) },
          ]}
          rows={data.invoices}
          empty="No invoices yet."
        />
      </Card>
    </div>
  );
}
