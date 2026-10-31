import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, list } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Badge, Button, Card, Error_, Field, Input, Modal, Notice, PageHeader, Select, Spinner, Table, Textarea, date, label, money, useFetch } from "../ui.jsx";
import { METHODS } from "./Payments.jsx";

export default function InvoiceDetail() {
  const { id } = useParams();
  const { isTeam } = useAuth();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pay, setPay] = useState(null);

  const { data, error, loading, reload } = useFetch(async () => {
    const [i, p] = await Promise.all([api.get(`/invoices/${id}`), list("/payments", { invoice: id, sort: "-paymentDate", limit: 100 })]);
    return { inv: i.data.data, payments: p.rows };
  }, [id]);

  const run = async (fn, ok) => {
    setErr("");
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const print = async () => {
    try {
      const html = await api.text(`/invoices/${id}/print`);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const w = window.open(url, "_blank");
      if (w) w.addEventListener("load", () => w.print());
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <Error_>{error}</Error_>;
  const inv = data.inv;
  const c = inv.customerDetails || {};
  const overdue = inv.isOverdue;

  return (
    <div>
      <PageHeader title={`Invoice ${inv.number}`}>
        {isTeam && inv.status === "draft" && <Button onClick={() => run(() => api.patch(`/invoices/${id}/confirm`), "Invoice confirmed.")}>Confirm</Button>}
        {isTeam && ["draft", "confirmed"].includes(inv.status) && (
          <Button variant="danger" onClick={() => confirm("Cancel this invoice?") && run(() => api.patch(`/invoices/${id}/cancel`), "Invoice cancelled.")}>Cancel</Button>
        )}
        {isTeam && inv.status !== "cancelled" && inv.status !== "draft" && (
          <Button variant="secondary" onClick={() => run(() => api.post(`/invoices/${id}/send`), "Invoice emailed to the customer.")}>Send</Button>
        )}
        <Button variant="secondary" onClick={print}>Print</Button>
        {isTeam && inv.status === "confirmed" && <Button onClick={() => setPay({ method: "bank_transfer", amount: inv.amountDue, paymentDate: new Date().toISOString().slice(0, 10), note: "" })}>Record payment</Button>}
      </PageHeader>
      <Error_>{err || error}</Error_>
      <Notice>{msg}</Notice>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card title="Invoice">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Badge value={overdue ? "overdue" : inv.status} /></dd>
            <dt className="text-slate-500">Subscription</dt><dd>{inv.subscription?._id ? <Link className="text-indigo-600" to={`/subscriptions/${inv.subscription._id}`}>{inv.subscription.number}</Link> : "-"}</dd>
            <dt className="text-slate-500">Issued</dt><dd>{date(inv.issueDate)}</dd>
            <dt className="text-slate-500">Due</dt><dd>{date(inv.dueDate)}</dd>
            <dt className="text-slate-500">Period</dt><dd>{date(inv.periodStart)} - {date(inv.periodEnd)}</dd>
            <dt className="text-slate-500">Payment terms</dt><dd className="capitalize">{label(inv.paymentTerms)}</dd>
          </dl>
        </Card>
        <Card title="Bill to">
          <div className="text-sm">
            <div className="font-medium">{c.name}</div>
            {c.company && <div>{c.company}</div>}
            <div>{c.email}</div>
            {c.phone && <div>{c.phone}</div>}
            {c.address && <div>{c.address}</div>}
          </div>
        </Card>
      </div>

      <Card title="Lines" className="mb-4">
        <Table
          columns={[
            { header: "Description", key: "description" },
            { header: "Qty", key: "quantity" },
            { header: "Unit price", render: (r) => money(r.unitPrice) },
            { header: "Discount", render: (r) => (r.discountAmount ? `-${money(r.discountAmount)}` : "-") },
            { header: "Tax", render: (r) => money(r.taxAmount) },
            { header: "Total", right: true, render: (r) => money(r.total) },
          ]}
          rows={inv.lines}
        />
        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <Row l="Subtotal" v={money(inv.subtotal)} />
          {(inv.discounts || []).map((d, i) => <Row key={i} l={`Discount: ${d.name}`} v={`-${money(d.amount)}`} />)}
          <Row l="Taxes" v={money(inv.taxTotal)} />
          <Row l="Total" v={money(inv.total)} bold />
          <Row l="Paid" v={money(inv.amountPaid)} />
          <Row l="Amount due" v={money(inv.amountDue)} bold />
        </div>
      </Card>

      <Card title="Payments">
        <Table
          columns={[
            { header: "Date", render: (r) => date(r.paymentDate) },
            { header: "Method", render: (r) => <span className="capitalize">{label(r.method)}</span> },
            { header: "Note", render: (r) => r.note || "-" },
            { header: "Amount", right: true, render: (r) => money(r.amount) },
          ]}
          rows={data.payments}
          empty="No payments recorded."
        />
      </Card>

      {pay && (
        <Modal title="Record payment" onClose={() => setPay(null)}>
          <Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} options={METHODS.map((m) => ({ value: m, label: label(m) }))} /></Field>
          <Field label="Amount" hint={`Amount due: ${money(inv.amountDue)}`}><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Payment date"><Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></Field>
          <Field label="Note"><Textarea value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
          <Button
            onClick={async () => {
              await run(() => api.post("/payments", { invoice: id, ...pay, amount: Number(pay.amount) }), "Payment recorded.");
              setPay(null);
            }}
          >
            Save payment
          </Button>
        </Modal>
      )}
    </div>
  );
}

const Row = ({ l, v, bold }) => (
  <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
    <span>{l}</span>
    <span>{v}</span>
  </div>
);
